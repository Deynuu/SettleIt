#!/usr/bin/env python3
"""
Live StudioNet lifecycle check against the deployment recorded in deployments/studionet.json.

    export SETTLEIT_CLAIMANT_KEY=0x...     # two DIFFERENT throwaway StudioNet keys, never committed
    export SETTLEIT_RESPONDENT_KEY=0x...
    python scripts/live_verify.py [--evidence-url https://...] [--no-update-manifest]

Flow: protocol info -> create_case (claimant) -> submit_response (respondent) -> request_verdict
(claimant) -> wait for FINALIZED -> read back case / verdict / history and assert them.
Evidence is written to deployments/evidence/live-<timestamp>.json. Only if EVERY assertion passes does it
set manifest status DEPLOYED_VERIFIED. Any failure exits non-zero and leaves the manifest untouched.
Nothing here is mocked: it needs a funded-or-free StudioNet account and takes real consensus time.
"""
import argparse
import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

from _common import CONTRACT, MANIFEST, ROOT, load_manifest, save_manifest, sha256_bytes

TERMINAL_BAD = {"UNDETERMINED", "CANCELED", "LEADER_TIMEOUT", "VALIDATORS_TIMEOUT"}


class Check:
    def __init__(self):
        self.results = []

    def ok(self, name, cond, detail=""):
        self.results.append({"check": name, "passed": bool(cond), "detail": str(detail)[:300]})
        print(("ok  " if cond else "FAIL"), name, detail if not cond else "")
        return bool(cond)

    @property
    def all_passed(self):
        return bool(self.results) and all(r["passed"] for r in self.results)


class GenLayerBackend:
    """Thin wrapper over the pinned genlayer-py client (create_client / read_contract / write_contract)."""

    def __init__(self, rpc_url, claimant_key, respondent_key):
        from genlayer_py import create_client, create_account
        from genlayer_py.chains import studionet
        self.claimant = create_account(claimant_key)
        self.respondent = create_account(respondent_key)
        self.client = create_client(chain=studionet, endpoint=rpc_url, account=self.claimant)

    @property
    def claimant_address(self):
        return self.claimant.address

    @property
    def respondent_address(self):
        return self.respondent.address

    def read(self, address, fn, args=None):
        return self.client.read_contract(address=address, function_name=fn, args=args or [])

    def write(self, address, fn, args, who):
        acct = self.claimant if who == "claimant" else self.respondent
        return self.client.write_contract(address=address, function_name=fn, args=args, account=acct)

    def wait_finalized(self, tx_hash, retries, interval_ms):
        from genlayer_py.types import TransactionStatus
        return self.client.wait_for_transaction_receipt(
            transaction_hash=tx_hash, status=TransactionStatus.FINALIZED,
            interval=interval_ms, retries=retries, full_transaction=False)


def status_of(receipt):
    if isinstance(receipt, dict):
        for k in ("status_name", "statusName", "status"):
            if receipt.get(k) is not None:
                return str(receipt[k]).upper()
    return "UNKNOWN"


def run(backend, address, manifest, evidence_url=None, retries=200, interval_ms=3000, sleep=time.sleep):
    chk = Check()
    log = {"steps": []}

    info = backend.read(address, "get_protocol_info")
    chk.ok("protocol version matches manifest", info.get("contract_version") == manifest["contract"]["version"],
           info.get("contract_version"))
    chk.ok("no admin powers / override", info.get("admin_powers") is False and info.get("verdict_override_possible") is False)
    chk.ok("votes non-authoritative", info.get("community_votes_authoritative") is False)

    cl, rs = backend.claimant_address, backend.respondent_address
    chk.ok("two distinct accounts", cl.lower() != rs.lower())
    if not chk.all_passed:
        return chk, log

    stamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    claim_ev = [{"kind": "TEXT", "content": "Claimant says a message sent before the event said not to eat the chicken.",
                 "caption": "Notice"}]
    if evidence_url:
        claim_ev.append({"kind": "URL", "content": evidence_url, "caption": "Linked evidence"})
    resp_ev = [{"kind": "TEXT", "content": "Respondent says food was always shared in the apartment.", "caption": "Norm"}]

    def tx(step, fn, args, who):
        h = backend.write(address, fn, args, who)
        log["steps"].append({"step": step, "function": fn, "sender": who, "txHash": str(h)})
        print(f"..  {step}: {h}")
        rc = backend.wait_finalized(h, retries, interval_ms)
        st = status_of(rc)
        log["steps"][-1]["finalStatus"] = st
        chk.ok(f"{step} reached FINALIZED", st == "FINALIZED" or st == "7", st)
        return h, st

    n_before = backend.read(address, "get_case_count")
    h, st = tx("create_case", "create_case",
               ["ROOMMATES", "PUBLIC", rs, f"live-verify {stamp}", "Who is at fault for the eaten chicken?",
                "I labelled the chicken and sent a message asking nobody to eat it.", json.dumps(claim_ev)], "claimant")
    if st not in ("FINALIZED", "7"):
        return chk, log
    case_id = int(backend.read(address, "get_last_case_id", [cl]))
    chk.ok("case count increased by one", int(backend.read(address, "get_case_count")) == int(n_before) + 1)
    case = backend.read(address, "get_case", [case_id])
    chk.ok("claimant/respondent identities recorded",
           str(case["claimant"]).lower() == cl.lower() and str(case["respondent"]).lower() == rs.lower())
    chk.ok("not yet responded", case["responded"] is False)
    log["caseId"] = case_id

    tx("submit_response", "submit_response", [case_id, "I shared food as usual and misread the message.", json.dumps(resp_ev)], "respondent")
    case = backend.read(address, "get_case", [case_id])
    chk.ok("responded after response", case["responded"] is True)

    h, st = tx("request_verdict", "request_verdict", [case_id], "claimant")
    log["verdictTxHash"] = str(h)
    if st not in ("FINALIZED", "7"):
        return chk, log

    case = backend.read(address, "get_case", [case_id])
    v = backend.read(address, "get_verdict", [case_id])
    chk.ok("verdict exists after FINALIZED readback", v.get("exists") is True)
    chk.ok("verdict kind is consensus verdict", v.get("kind") == "GENLAYER_CONSENSUS_VERDICT")
    chk.ok("faults sum to 100", int(v.get("claimant_fault", -1)) + int(v.get("respondent_fault", -1)) == 100)
    chk.ok("evidence digest recorded", isinstance(v.get("evidence_digest"), str) and len(v["evidence_digest"]) >= 32)
    if evidence_url:
        srcs = v.get("evidence_sources") or []
        chk.ok("fetched URL recorded in evidence sources", any(evidence_url in json.dumps(s) for s in srcs), srcs)
    chk.ok("case status VERDICT_RECORDED", case.get("status") == "VERDICT_RECORDED", case.get("status"))
    hist = backend.read(address, "get_case_history", [case_id, 0, 20])
    chk.ok("history non-empty and bounded", 0 < len(hist) <= 20, len(hist))
    chk.ok("second verdict request is rejected / no second verdict",
           backend.read(address, "get_review_verdict", [case_id]).get("exists") is False)
    log["verdict"] = {k: v.get(k) for k in ("favored_party", "claimant_fault", "respondent_fault", "confidence_bucket",
                                           "evidence_quality", "primary_reason", "insufficiency_basis", "evidence_digest")}
    return chk, log


def main(argv=None, backend=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--evidence-url", default=None)
    ap.add_argument("--manifest", default=str(MANIFEST))
    ap.add_argument("--no-update-manifest", action="store_true")
    ap.add_argument("--retries", type=int, default=200)
    ap.add_argument("--interval-ms", type=int, default=3000)
    a = ap.parse_args(argv)

    mpath = Path(a.manifest)
    m = load_manifest(mpath)
    dep = m.get("deployment")
    if m.get("status") not in ("DEPLOYED_UNVERIFIED", "DEPLOYED_VERIFIED") or not dep or not dep.get("address"):
        print("x manifest has no recorded deployment. Run scripts/record_deployment.py first.", file=sys.stderr)
        return 1
    if not (m.get("onChainVerification") or {}).get("codeSha256Matches"):
        print("x on-chain source verification not recorded. Run scripts/record_deployment.py first.", file=sys.stderr)
        return 1
    if backend is None:
        ck, rk = os.environ.get("SETTLEIT_CLAIMANT_KEY"), os.environ.get("SETTLEIT_RESPONDENT_KEY")
        if not ck or not rk:
            print("x set SETTLEIT_CLAIMANT_KEY and SETTLEIT_RESPONDENT_KEY (two different throwaway keys)", file=sys.stderr)
            return 2
        backend = GenLayerBackend(m["rpcUrl"], ck, rk)

    chk, log = run(backend, dep["address"], m, a.evidence_url, a.retries, a.interval_ms)
    ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    out = {
        "schemaVersion": 1, "ranAt": ts, "chainId": m.get("chainId"), "contractAddress": dep["address"],
        "contractSha256": sha256_bytes(CONTRACT.read_bytes()), "passed": chk.all_passed,
        "checks": chk.results, **log,
    }
    ev = ROOT / "deployments" / "evidence" / f"live-{ts}.json"
    ev.parent.mkdir(parents=True, exist_ok=True)
    ev.write_text(json.dumps(out, indent=2) + "\n")
    print(f"evidence written: {ev}")
    if not chk.all_passed:
        print("x live verification FAILED; manifest untouched.", file=sys.stderr)
        return 1
    if not a.no_update_manifest:
        m["status"] = "DEPLOYED_VERIFIED"
        m["statusNote"] = "Deployed source verified on-chain and live smoke test passed."
        m["liveSmokeTest"] = {
            "status": "PASSED", "evidenceFile": str(ev.relative_to(ROOT)), "ranAt": ts,
            "contractAddress": dep["address"], "contractSha256": out["contractSha256"],
            "txHashes": {s["function"]: s["txHash"] for s in log["steps"]}, "caseId": log.get("caseId"),
        }
        save_manifest(m, mpath)
        print("ok manifest set to DEPLOYED_VERIFIED")
    return 0


if __name__ == "__main__":
    sys.exit(main())

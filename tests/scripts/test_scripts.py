"""Unit tests for scripts/record_deployment.py and scripts/live_verify.py using fakes (no network)."""
import base64
import json
import shutil
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))

import _common  # noqa: E402
import live_verify  # noqa: E402
import record_deployment  # noqa: E402

ADDR = "0x" + "ab" * 20
TX = "0x" + "cd" * 32
COMMIT = "e" * 40


@pytest.fixture
def env(tmp_path, monkeypatch):
    m = json.loads((ROOT / "deployments" / "studionet.json").read_text())
    mp = tmp_path / "studionet.json"
    mp.write_text(json.dumps(m))
    monkeypatch.setattr(record_deployment, "ROOT", tmp_path)
    monkeypatch.setattr(live_verify, "ROOT", tmp_path)
    src = (ROOT / "contracts" / "settleit.py").read_bytes()
    return tmp_path, mp, src


def fake_rpc(src, code=None, schema_same=True, tx=None):
    code = src if code is None else code

    def call(url, method, params):
        if method == "gen_getContractCode":
            return base64.b64encode(code).decode()
        if method == "gen_getContractSchema":
            return json.dumps({"a": 1})
        if method == "gen_getContractSchemaForCode":
            return json.dumps({"a": 1 if schema_same else 2})
        if method == "eth_getTransactionByHash":
            return tx if tx is not None else {"hash": TX, "blockNumber": "0x10", "timestamp": 1700000000,
                                              "from": "0x" + "11" * 20}
        raise AssertionError(method)
    return call


def rec(mp, call, *extra):
    return record_deployment.main(["--address", ADDR, "--tx-hash", TX, "--manifest", str(mp),
                                   "--source-commit", COMMIT, *extra], call=call)


def test_record_writes_unverified_not_verified(env):
    _, mp, src = env
    assert rec(mp, fake_rpc(src)) == 0
    m = json.loads(mp.read_text())
    assert m["status"] == "DEPLOYED_UNVERIFIED"
    assert m["deployment"]["address"] == ADDR and m["deployment"]["blockNumber"] == 16
    assert m["onChainVerification"]["codeSha256Matches"] is True


def test_record_refuses_code_mismatch(env):
    _, mp, src = env
    before = mp.read_text()
    assert rec(mp, fake_rpc(src, code=src + b"#")) == 1
    assert mp.read_text() == before


def test_record_refuses_schema_mismatch(env):
    _, mp, src = env
    before = mp.read_text()
    assert rec(mp, fake_rpc(src, schema_same=False)) == 1
    assert mp.read_text() == before


def test_record_refuses_unknown_tx_and_other_created_address(env):
    _, mp, src = env
    assert rec(mp, fake_rpc(src, tx={})) == 1
    other = {"hash": TX, "blockNumber": 1, "timestamp": 1, "contract_address": "0x" + "99" * 20}
    assert rec(mp, fake_rpc(src, tx=other)) == 1


def test_record_needs_block_info_never_guesses(env):
    _, mp, src = env
    bare = {"hash": TX}
    assert rec(mp, fake_rpc(src, tx=bare)) == 1
    assert rec(mp, fake_rpc(src, tx=bare), "--block-number", "5", "--block-time", "2026-01-01T00:00:00Z") == 0
    assert json.loads(mp.read_text())["deployment"]["manuallySupplied"] == ["blockNumber", "blockTimestamp"]


def test_record_rejects_bad_args(env):
    _, mp, src = env
    assert record_deployment.main(["--address", "0x1", "--tx-hash", TX, "--manifest", str(mp)], call=fake_rpc(src)) == 2


class FakeBackend:
    claimant_address = "0x" + "01" * 20
    respondent_address = "0x" + "02" * 20

    def __init__(self, final="FINALIZED", version=None, same=False, evidence=True):
        self.final, self.version, self.evidence = final, version, evidence
        self.cases, self.responded, self.verdict = 0, False, False
        if same:
            self.respondent_address = self.claimant_address

    def read(self, address, fn, args=None):
        if fn == "get_protocol_info":
            return {"contract_version": self.version or json.loads(
                (ROOT / "deployments/studionet.json").read_text())["contract"]["version"],
                "admin_powers": False, "verdict_override_possible": False, "community_votes_authoritative": False}
        if fn == "get_case_count":
            return self.cases
        if fn == "get_last_case_id":
            return self.cases
        if fn == "get_case":
            return {"claimant": self.claimant_address, "respondent": self.respondent_address,
                    "responded": self.responded, "status": "VERDICT_RECORDED" if self.verdict else "READY"}
        if fn == "get_verdict":
            if not self.verdict:
                return {"exists": False}
            return {"exists": True, "kind": "GENLAYER_CONSENSUS_VERDICT", "claimant_fault": 30, "respondent_fault": 70,
                    "evidence_digest": "d" * 64 if self.evidence else ""}
        if fn == "get_case_history":
            return [{"e": 1}]
        if fn == "get_review_verdict":
            return {"exists": False}
        raise AssertionError(fn)

    def write(self, address, fn, args, who):
        if fn == "create_case":
            self.cases += 1
        elif fn == "submit_response":
            self.responded = True
        elif fn == "request_verdict":
            self.verdict = True
        return "0x" + fn.encode().hex().ljust(64, "0")[:64]

    def wait_finalized(self, h, retries, interval_ms):
        return {"status_name": self.final}


def deployed(mp):
    m = json.loads(mp.read_text())
    m["status"] = "DEPLOYED_UNVERIFIED"
    m["deployment"] = {"address": ADDR}
    m["onChainVerification"] = {"codeSha256Matches": True}
    mp.write_text(json.dumps(m))


def test_live_verify_happy_path_sets_verified(env):
    tmp, mp, _ = env
    deployed(mp)
    assert live_verify.main(["--manifest", str(mp)], backend=FakeBackend()) == 0
    m = json.loads(mp.read_text())
    assert m["status"] == "DEPLOYED_VERIFIED" and m["liveSmokeTest"]["status"] == "PASSED"
    assert set(m["liveSmokeTest"]["txHashes"]) == {"create_case", "submit_response", "request_verdict"}
    assert (tmp / m["liveSmokeTest"]["evidenceFile"]).exists()


@pytest.mark.parametrize("kw", [{"final": "UNDETERMINED"}, {"version": "0.0.1"}, {"same": True}, {"evidence": False}])
def test_live_verify_failure_leaves_manifest(env, kw):
    _, mp, _ = env
    deployed(mp)
    before = mp.read_text()
    assert live_verify.main(["--manifest", str(mp)], backend=FakeBackend(**kw)) == 1
    assert mp.read_text() == before


def test_live_verify_requires_recorded_deployment(env):
    _, mp, _ = env
    assert live_verify.main(["--manifest", str(mp)], backend=FakeBackend()) == 1


def test_live_verify_requires_keys(env, monkeypatch):
    _, mp, _ = env
    deployed(mp)
    monkeypatch.delenv("SETTLEIT_CLAIMANT_KEY", raising=False)
    monkeypatch.delenv("SETTLEIT_RESPONDENT_KEY", raising=False)
    assert live_verify.main(["--manifest", str(mp)]) == 2

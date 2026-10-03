#!/usr/bin/env python3
"""
Record + verify a StudioNet deployment of contracts/settleit.py.

    python scripts/record_deployment.py --address 0x... --tx-hash 0x...

It refuses to write the manifest unless the chain actually reports the same source:
  1. repo source sha256 == deployments/studionet.json contract.sha256
  2. gen_getContractCode(address) is byte-identical to the repo source
  3. gen_getContractSchema(address) == gen_getContractSchemaForCode(repo source)
  4. the deployment transaction exists on the RPC and does not name a different created address

Block number / time are taken from the RPC transaction record when it provides them; otherwise pass
--block-number and --block-time (copy them from the explorer) and the manifest records that they were
supplied manually. Nothing is ever guessed. The result is status DEPLOYED_UNVERIFIED; run
scripts/live_verify.py to complete the smoke test and reach DEPLOYED_VERIFIED.
"""
import argparse
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

from _common import (CONTRACT, MANIFEST, ROOT, decode_code, git_head_for_file, load_manifest, normalize_schema,
                     rpc, save_manifest, sha256_bytes)

ADDR = re.compile(r"^0x[0-9a-fA-F]{40}$")
HASH = re.compile(r"^0x[0-9a-fA-F]{64}$")
BLOCK_KEYS = ("blockNumber", "block_number", "blockHeight")
TIME_KEYS = ("blockTimestamp", "block_timestamp", "timestamp", "created_at", "createdAt")
FROM_KEYS = ("from", "from_address", "sender")
CREATED_KEYS = ("contract_address", "contractAddress", "created_contract_address")


def deep_find(obj, keys):
    """First matching non-empty key anywhere in a nested transaction record."""
    if isinstance(obj, dict):
        for k in keys:
            if obj.get(k) not in (None, ""):
                return obj[k]
        for x in obj.values():
            r = deep_find(x, keys)
            if r is not None:
                return r
    elif isinstance(obj, list):
        for x in obj:
            r = deep_find(x, keys)
            if r is not None:
                return r
    return None


def to_int(v):
    if v is None:
        return None
    if isinstance(v, int):
        return v
    s = str(v)
    try:
        return int(s, 16) if s.lower().startswith("0x") else int(s)
    except ValueError:
        return None


def verify_onchain(rpc_url: str, address: str, source: bytes, call=rpc) -> dict:
    code = decode_code(call(rpc_url, "gen_getContractCode", [address]))
    chain_schema = normalize_schema(call(rpc_url, "gen_getContractSchema", [address]))
    repo_schema = normalize_schema(call(rpc_url, "gen_getContractSchemaForCode", ["0x" + source.hex()]))
    return {
        "codeSha256Matches": code == source,
        "chainCodeSha256": sha256_bytes(code),
        "schemaMatches": chain_schema == repo_schema,
    }


def main(argv=None, call=rpc, now=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--address", required=True)
    ap.add_argument("--tx-hash", required=True)
    ap.add_argument("--rpc", default=None)
    ap.add_argument("--deployer", default=None)
    ap.add_argument("--block-number", type=int, default=None)
    ap.add_argument("--block-time", default=None, help="ISO-8601 time from the explorer if the RPC omits it")
    ap.add_argument("--source-commit", default=None, help="defaults to the last commit touching the contract file")
    ap.add_argument("--manifest", default=str(MANIFEST))
    ap.add_argument("--contract", default=str(CONTRACT))
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args(argv)

    if not ADDR.match(a.address) or not HASH.match(a.tx_hash):
        print("x --address must be 0x+40 hex and --tx-hash 0x+64 hex", file=sys.stderr)
        return 2
    mpath = Path(a.manifest)
    m = load_manifest(mpath)
    rpc_url = a.rpc or m["rpcUrl"]
    source = Path(a.contract).read_bytes()

    if sha256_bytes(source) != m["contract"]["sha256"]:
        print("x repo source does not match manifest.contract.sha256; update the manifest first", file=sys.stderr)
        return 1

    v = verify_onchain(rpc_url, a.address, source, call)
    print(json.dumps(v, indent=2))
    if not (v["codeSha256Matches"] and v["schemaMatches"]):
        print("x the deployed contract is NOT the repository source. Manifest left untouched.", file=sys.stderr)
        return 1

    tx = call(rpc_url, "eth_getTransactionByHash", [a.tx_hash])
    if not tx:
        print("x RPC has no transaction with that hash. Manifest left untouched.", file=sys.stderr)
        return 1
    created = deep_find(tx, CREATED_KEYS)
    if created and str(created).lower() != a.address.lower() and ADDR.match(str(created)):
        print(f"x transaction created {created}, not {a.address}", file=sys.stderr)
        return 1
    block = to_int(deep_find(tx, BLOCK_KEYS))
    btime = deep_find(tx, TIME_KEYS)
    manual = []
    if block is None and a.block_number is not None:
        block = a.block_number
        manual.append("blockNumber")
    if btime is None and a.block_time:
        btime = a.block_time
        manual.append("blockTimestamp")
    if block is None or btime is None:
        print("x the RPC transaction record has no block number / time. Re-run with --block-number and "
              "--block-time copied from the explorer. Manifest left untouched.", file=sys.stderr)
        return 1

    commit = a.source_commit
    if not commit:
        commit = git_head_for_file(Path(a.contract)) if Path(a.contract).resolve() == CONTRACT.resolve() else None
    if not commit:
        print("x pass --source-commit (40-hex git sha of the commit whose source was deployed)", file=sys.stderr)
        return 1
    stamp = (now or (lambda: datetime.now(timezone.utc).isoformat(timespec="seconds")))()
    m["status"] = "DEPLOYED_UNVERIFIED"
    m["statusNote"] = ("Deployed; source, schema and deploy tx verified against the chain. Not yet DEPLOYED_VERIFIED: "
                       "run scripts/live_verify.py for the live smoke test.")
    m["deployment"] = {
        "address": a.address, "txHash": a.tx_hash, "blockNumber": block, "blockTimestamp": str(btime),
        "deployer": a.deployer or deep_find(tx, FROM_KEYS),
        "sourceCommit": commit, "recordedAt": stamp, "manuallySupplied": manual,
    }
    m["onChainVerification"] = {
        "codeSha256Matches": True, "schemaMatches": True, "protocolInfoMatches": None,
        "chainCodeSha256": v["chainCodeSha256"], "verifiedAt": stamp, "tool": "scripts/record_deployment.py",
    }
    if a.dry_run:
        print("dry run: nothing written")
        return 0
    raw = ROOT / "deployments" / "evidence" / f"deploy-tx-{a.tx_hash[:10]}.json"
    raw.parent.mkdir(parents=True, exist_ok=True)
    raw.write_text(json.dumps(tx, indent=2, default=str) + "\n")
    save_manifest(m, mpath)
    print(f"ok manifest updated ({mpath}); raw tx saved to {raw}")
    print("Next: set NEXT_PUBLIC_CONTRACT_ADDRESS in Vercel + frontend/.env.production, add the address to the README, "
          "run scripts/live_verify.py.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

"""Shared helpers for the deployment / verification scripts (stdlib only)."""
import base64
import hashlib
import json
import subprocess
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MANIFEST = ROOT / "deployments" / "studionet.json"
CONTRACT = ROOT / "contracts" / "settleit.py"


def sha256_bytes(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()


def load_manifest(path: Path = MANIFEST) -> dict:
    return json.loads(Path(path).read_text())


def save_manifest(m: dict, path: Path = MANIFEST) -> None:
    Path(path).write_text(json.dumps(m, indent=2) + "\n")


def rpc(url: str, method: str, params: list, timeout: int = 60):
    """Minimal JSON-RPC 2.0 call. Raises RuntimeError on an RPC error object."""
    body = json.dumps({"jsonrpc": "2.0", "id": 1, "method": method, "params": params}).encode()
    req = urllib.request.Request(url, data=body, headers={"content-type": "application/json"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        out = json.loads(resp.read().decode())
    if "error" in out and out["error"]:
        raise RuntimeError(f"{method}: {out['error']}")
    return out.get("result")


def git_head_for_file(path: Path) -> str:
    """The last commit that touched `path` (the commit whose source was deployed)."""
    out = subprocess.run(
        ["git", "log", "-n1", "--format=%H", "--", str(Path(path).relative_to(ROOT))],
        cwd=ROOT, capture_output=True, text=True, check=True,
    )
    return out.stdout.strip()


def decode_code(result) -> bytes:
    """gen_getContractCode returns base64 text on StudioNet."""
    if isinstance(result, dict):
        result = result.get("code", result)
    if not isinstance(result, str):
        raise RuntimeError(f"unexpected gen_getContractCode result type {type(result).__name__}")
    return base64.b64decode(result)


def normalize_schema(s):
    """Schemas arrive as JSON text or objects; compare structurally."""
    if isinstance(s, (bytes, bytearray)):
        s = s.decode()
    if isinstance(s, str):
        try:
            s = json.loads(s)
        except ValueError:
            return s
    return json.dumps(s, sort_keys=True)

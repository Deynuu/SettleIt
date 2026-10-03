import { test } from "node:test";
import assert from "node:assert/strict";
import { ensureWriteReady, switchToStudionet, WalletGuardError, type Eip1193 } from "./wallet";

const A = "0x" + "a".repeat(40);
const B = "0x" + "b".repeat(40);

interface Opts { chain?: string; accounts?: string[]; unknownChain?: boolean; rejectSwitch?: boolean; switchSticks?: boolean }
function fakeWallet(o: Opts = {}) {
  const state = { chain: o.chain ?? "0xf22f", accounts: o.accounts ?? [A] };
  const calls: string[] = [];
  const p: Eip1193 = {
    async request({ method, params }) {
      calls.push(method);
      switch (method) {
        case "eth_chainId": return state.chain;
        case "eth_accounts": return state.accounts;
        case "wallet_switchEthereumChain": {
          if (o.rejectSwitch) throw Object.assign(new Error("User rejected"), { code: 4001 });
          if (o.unknownChain && state.chain !== "0xf22f" && !calls.includes("wallet_addEthereumChain")) throw Object.assign(new Error("Unrecognized chain"), { code: 4902 });
          if (o.switchSticks !== false) state.chain = (params as { chainId: string }[])[0].chainId;
          return null;
        }
        case "wallet_addEthereumChain": return null;
        default: throw new Error("unexpected " + method);
      }
    },
  };
  return { p, state, calls };
}

test("ready: right chain + same account passes without switching", async () => {
  const w = fakeWallet();
  assert.equal(await ensureWriteReady(A, w.p), A);
  assert.ok(!w.calls.includes("wallet_switchEthereumChain"));
});
test("account comparison is case-insensitive", async () => {
  const w = fakeWallet({ accounts: [A.toUpperCase().replace("0X", "0x")] });
  await ensureWriteReady(A, w.p);
});
test("wrong chain is switched to 61999 before the check passes", async () => {
  const w = fakeWallet({ chain: "0x1" });
  await ensureWriteReady(A, w.p);
  assert.equal(w.state.chain, "0xf22f");
  assert.ok(w.calls.includes("wallet_switchEthereumChain"));
  assert.ok(!w.calls.includes("wallet_addEthereumChain"));
});
test("unknown chain (4902) triggers wallet_addEthereumChain then a second switch", async () => {
  const w = fakeWallet({ chain: "0x1", unknownChain: true });
  await ensureWriteReady(A, w.p);
  assert.deepEqual(w.calls.filter((c) => c.startsWith("wallet_")), ["wallet_switchEthereumChain", "wallet_addEthereumChain", "wallet_switchEthereumChain"]);
});
test("user rejecting the switch is surfaced, never retried with add-chain", async () => {
  const w = fakeWallet({ chain: "0x1", rejectSwitch: true });
  await assert.rejects(() => ensureWriteReady(A, w.p), (e: { code?: number }) => e.code === 4001);
  assert.ok(!w.calls.includes("wallet_addEthereumChain"));
});
test("a wallet that stays on the wrong chain after switching is refused", async () => {
  const w = fakeWallet({ chain: "0x1", switchSticks: false });
  await assert.rejects(() => ensureWriteReady(A, w.p), (e: WalletGuardError) => e.kind === "WRONG_CHAIN");
});
test("stale account: the wallet's live account differs from the page's", async () => {
  const w = fakeWallet({ accounts: [B] });
  await assert.rejects(() => ensureWriteReady(A, w.p), (e: WalletGuardError) => e.kind === "ACCOUNT_CHANGED");
});
test("no connected account is refused", async () => {
  const w = fakeWallet({ accounts: [] });
  await assert.rejects(() => ensureWriteReady(A, w.p), (e: WalletGuardError) => e.kind === "NO_ACCOUNT");
});
test("account switching mid-flow is caught on the second check", async () => {
  const w = fakeWallet();
  await ensureWriteReady(A, w.p); // preflight
  w.state.accounts = [B]; // user switches account while reading the confirmation card
  await assert.rejects(() => ensureWriteReady(A, w.p), (e: WalletGuardError) => e.kind === "ACCOUNT_CHANGED"); // pre-sign re-check
});
test("no provider", async () => {
  await assert.rejects(() => ensureWriteReady(A, null), (e: WalletGuardError) => e.kind === "NO_WALLET");
  await assert.rejects(() => switchToStudionet(null), (e: WalletGuardError) => e.kind === "NO_WALLET");
});

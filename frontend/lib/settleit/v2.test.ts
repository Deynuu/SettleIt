import { test } from "node:test";
import assert from "node:assert/strict";
import { validateUrl, validateEvidence, validateGrounds, validateReviewEvidence } from "./validation";
import { parseVerdict, parseCaseDetail, parseHistory, parseProtocolInfo, parseVoteSummary } from "./normalize";
import { humanizeError } from "./errors";
import { LIFECYCLE_CONFIRM, LIFECYCLE_PREFLIGHT, lifecycleFromStatus, trackerStates } from "./protocol";

const BAD = [
  "http://example.com/a", "ftp://example.com", "javascript:alert(1)", "https://u:p@example.com/", "https://example.com@evil.com/",
  "https://example.com:8443/", "https://localhost/", "https://a.localhost/", "https://127.0.0.1/", "https://10.0.0.1/", "https://[::1]/",
  "https://printer.local/", "https://db.internal/", "https://intranet/", "https://exa mple.com/", "https://-x.example.com/", "https://x-.example.com/",
  "https://exa_mple.com/", "https://example..com/", "https://" + "a".repeat(64) + ".com/", "https://example.com/" + "a".repeat(300), "", "https://",
];
test("validateUrl rejects the same URLs the contract rejects", () => {
  for (const u of BAD) assert.ok(validateUrl(u), `should reject ${JSON.stringify(u.slice(0, 40))}`);
});
test("validateUrl accepts public https links", () => {
  for (const u of ["https://example.com/a?b=1#c", "https://Sub.Example.co.uk/x", "https://example.com"]) assert.equal(validateUrl(u), null, u);
});
test("validateEvidence applies URL rules and counts", () => {
  assert.ok(validateEvidence([{ kind: "URL", content: "http://example.com", caption: "" }]));
  assert.equal(validateEvidence([{ kind: "URL", content: "https://example.com/p", caption: "" }]), null);
  assert.ok(validateEvidence(Array.from({ length: 6 }, () => ({ kind: "TEXT" as const, content: "x", caption: "" }))));
});
test("review needs 1..3 new evidence items and grounds", () => {
  assert.ok(validateReviewEvidence([]));
  assert.ok(validateReviewEvidence(Array.from({ length: 4 }, () => ({ kind: "TEXT" as const, content: "x", caption: "" }))));
  assert.equal(validateReviewEvidence([{ kind: "TEXT", content: "new", caption: "" }]), null);
  assert.ok(validateGrounds(""));
  assert.ok(validateGrounds("x".repeat(601)));
  assert.equal(validateGrounds("fine"), null);
});

test("parseVerdict separates consensus-bound from leader-written fields", () => {
  const v = parseVerdict({
    exists: true, round: 2, favored_party: "INCONCLUSIVE", claimant_fault: 50, respondent_fault: 50, confidence_bucket: "LOW",
    evidence_quality: "WEAK", primary_reason: "INSUFFICIENT_INFORMATION", insufficiency_basis: "MISSING_EVIDENCE",
    evidence_digest: "ab".repeat(32), evidence_sources: [{ url: "https://example.com/x", sha256: "cd".repeat(32) }],
    secondary_reason_codes: ["EVIDENCE_INCONCLUSIVE"], summary: "s", remedy: "r", non_authoritative_fields: ["summary", "remedy", "secondary_reason_codes"],
  });
  assert.equal(v.round, 2);
  assert.equal(v.primaryReason, "INSUFFICIENT_INFORMATION");
  assert.equal(v.insufficiencyBasis, "MISSING_EVIDENCE");
  assert.equal(v.evidenceDigest.length, 64);
  assert.deepEqual(v.secondaryReasonCodes, ["EVIDENCE_INCONCLUSIVE"]);
  assert.deepEqual(v.nonAuthoritativeFields, ["summary", "remedy", "secondary_reason_codes"]);
});
test("parseVerdict tolerates garbage without throwing", () => {
  for (const g of [null, undefined, 5, "x", [], { exists: true, favored_party: "NOPE", confidence_bucket: 3 }]) {
    const v = parseVerdict(g);
    assert.equal(typeof v.exists, "boolean");
    assert.ok(Array.isArray(v.evidenceSources));
  }
  assert.equal(parseVerdict({ exists: false, round: 1 }).exists, false);
});
test("parseCaseDetail reads v2 fields and defaults safely", () => {
  const c = parseCaseDetail({ id: 3, status: "EXPIRED", has_review: false, response_deadline: 1767830400, evidence_total: 2, review_requested_by: "RESPONDENT" });
  assert.equal(c.status, "EXPIRED");
  assert.equal(c.responseDeadline, 1767830400);
  assert.equal(c.reviewRequestedBy, "RESPONDENT");
  assert.equal(parseCaseDetail({ status: "WAT" }).status, "AWAITING_RESPONSE");
});
test("history + protocol info + votes parse", () => {
  assert.deepEqual(parseHistory([{ seq: 1, action: "CASE_CREATED", actor: "0xa", at: "t", detail: "d" }]).map((e) => e.action), ["CASE_CREATED"]);
  assert.equal(parseHistory("nope").length, 0);
  const p = parseProtocolInfo({ contract_version: "2.0.0", admin_powers: false, verdict_override_possible: false, community_votes_authoritative: false, response_window_seconds: 604800 });
  assert.equal(p.adminPowers, false);
  // missing/garbled info must NOT be read as "no admin powers"
  assert.equal(parseProtocolInfo({}).adminPowers, true);
  assert.equal(parseVoteSummary({ authoritative: true }).authoritative, true);
  assert.equal(parseVoteSummary({}).authoritative, false);
});
test("new contract error codes have human copy", () => {
  for (const c of ["INVALID_URL", "RESPONSE_WINDOW_CLOSED", "CASE_EXPIRED", "DEADLINE_NOT_REACHED", "REVIEW_EXISTS", "REVIEW_NEEDS_NEW_EVIDENCE", "EVIDENCE_UNAVAILABLE", "EVIDENCE_EMPTY", "OUTPUT_TOO_LARGE"]) {
    assert.doesNotMatch(humanizeError(new Error(`EXPECTED:${c}`)), /Something went wrong/, c);
  }
});
test("lifecycle: every network status maps to a distinct honest state", () => {
  const stage = (s: string) => lifecycleFromStatus(s).stage;
  assert.equal(stage("PENDING"), "processing");
  assert.equal(stage("ACCEPTED"), "accepted");
  assert.equal(stage("FINALIZED"), "finalized");
  assert.equal(stage("UNDETERMINED"), "undetermined");
  assert.equal(stage("CANCELED"), "canceled");
  assert.equal(lifecycleFromStatus("ACCEPTED").finalized, false);
  assert.equal(lifecycleFromStatus("ACCEPTED").provisional, true);
  assert.equal(lifecycleFromStatus("FINALIZED").finalized, true);
});
test("pre-sign stages never mark any tracker step as done", () => {
  for (const l of [LIFECYCLE_PREFLIGHT, LIFECYCLE_CONFIRM]) {
    assert.ok(trackerStates(l).every((s) => s.state === "todo"));
  }
});

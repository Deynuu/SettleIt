import { test } from "node:test";
import assert from "node:assert/strict";
import { humanizeError } from "./errors";
import { compareHumansToJury } from "./compare";
import { validateRespondent, validateEvidence, evidenceToJson } from "./validation";

const votes = (c: number, r: number, s: number, i: number) => ({
  claimant: c, respondent: r, split: s, insufficient: i, total: c + r + s + i, juryMatchPct: null,
});

test("humanizeError maps contract codes", () => {
  assert.match(humanizeError(new Error("EXPECTED:NOT_RESPONDENT")), /named respondent/);
  assert.match(humanizeError({ code: 4001 }), /cancelled/);
  assert.match(humanizeError(new Error("boom")), /Something went wrong/);
});
test("compare labels", () => {
  assert.equal(compareHumansToJury(votes(3, 1, 0, 0), "CLAIMANT").label, "Humans + Jury Agree");
  assert.equal(compareHumansToJury(votes(1, 3, 0, 0), "CLAIMANT").label, "The Internet Disagrees");
  assert.equal(compareHumansToJury(votes(2, 2, 0, 0), "CLAIMANT").label, "Split Decision");
  assert.equal(compareHumansToJury(votes(0, 0, 0, 3), "CLAIMANT").label, "Nobody Knows What Happened 😭");
  assert.equal(compareHumansToJury(votes(0, 0, 0, 0), "CLAIMANT").kind, "PENDING");
});
test("validation", () => {
  const a = "0x" + "a".repeat(40);
  assert.equal(validateRespondent(a, "0x" + "b".repeat(40)), null);
  assert.ok(validateRespondent(a, a.toUpperCase().replace("0X", "0x")));
  assert.ok(validateRespondent("0x" + "0".repeat(40)));
  assert.ok(validateRespondent("nope"));
  assert.ok(validateEvidence([{ kind: "URL", content: "javascript:x", caption: "" }]));
  assert.equal(JSON.parse(evidenceToJson([{ kind: "TEXT", content: " hi ", caption: "" }]))[0].content, "hi");
});

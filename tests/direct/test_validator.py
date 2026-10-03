"""
Equivalence-principle tests.

Flow per test: the leader runs for real through request_verdict() with LLM mock A.
Then we swap the mocks to B ("what an independent validator would answer") and call
vm.run_validator(), which executes the contract's validator_fn against the leader's
result. True == the validator would agree.
"""

import json

import pytest

from tests.direct.conftest import MARKER, verdict_dict

LEADER_DEFAULT = verdict_dict()  # CLAIMANT 20/80, HIGH, STRONG


def _leader_then_validator(court, leader, validator):
    cid = court.ready_case()
    court.mock(leader)
    court.vm.sender = court.alice
    court.c.request_verdict(cid)
    court.mock(validator)
    return court.vm.run_validator()


def agree(court, validator, leader=None):
    return _leader_then_validator(court, LEADER_DEFAULT if leader is None else leader, validator)


# -- agreement ----------------------------------------------------------------


def test_identical_result_agrees(court):
    assert agree(court, verdict_dict()) is True


def test_nearby_scores_agree(court):
    assert agree(court, verdict_dict(claimant_fault=28, respondent_fault=72)) is True
    assert agree(court, verdict_dict(claimant_fault=10, respondent_fault=90)) is True


def test_prose_differences_do_not_cause_rejection(court):
    other = verdict_dict(
        summary="Totally different wording about the fridge, the text message and the roommate.",
        remedy="Buy the next takeaway.",
    )
    assert agree(court, other) is True


def test_adjacent_evidence_quality_and_confidence_agree(court):
    assert agree(court, verdict_dict(evidence_quality="MIXED", confidence_bucket="MEDIUM")) is True


def test_secondary_reason_codes_are_not_consensus_bound(court):
    other = verdict_dict(reason_codes=["CLAIM_CORROBORATED", "MATERIAL_ADMISSION"])
    assert agree(court, other) is True


def test_different_primary_reason_rejected(court):
    other = verdict_dict(primary_reason="CLAIM_CORROBORATED")
    assert agree(court, other) is False


# -- disagreement -------------------------------------------------------------


def test_opposite_favored_party_rejected(court):
    other = verdict_dict(favored_party="RESPONDENT", claimant_fault=80, respondent_fault=20)
    assert agree(court, other) is False


def test_score_outside_tolerance_rejected(court):
    # both CLAIMANT, but 20 vs 35 claimant fault (delta 15 > 10)
    assert agree(court, verdict_dict(claimant_fault=35, respondent_fault=65)) is False


def test_score_exactly_at_tolerance_agrees(court):
    assert agree(court, verdict_dict(claimant_fault=30, respondent_fault=70)) is True


def test_no_primary_reason_match_rejected(court):
    other = verdict_dict(primary_reason="CLAIM_CORROBORATED", reason_codes=["MATERIAL_ADMISSION"])
    assert agree(court, other) is False


def test_evidence_quality_two_steps_apart_rejected(court):
    assert agree(court, verdict_dict(evidence_quality="WEAK")) is False


def test_confidence_two_steps_apart_rejected(court):
    assert agree(court, verdict_dict(confidence_bucket="LOW")) is False


# -- SPLIT / INCONCLUSIVE -----------------------------------------------------

SPLIT_A = verdict_dict(
    favored_party="SPLIT",
    claimant_fault=45,
    respondent_fault=55,
    confidence_bucket="MEDIUM",
    evidence_quality="MIXED",
    reason_codes=["BOTH_CONTRIBUTED"],
)
INCONCLUSIVE_A = verdict_dict(
    favored_party="INCONCLUSIVE",
    claimant_fault=50,
    respondent_fault=50,
    confidence_bucket="LOW",
    evidence_quality="WEAK",
    reason_codes=["INSUFFICIENT_INFORMATION"],
    insufficiency_basis="MISSING_EVIDENCE",
)


def test_split_vs_split_agrees(court):
    other = verdict_dict(**{**SPLIT_A, "claimant_fault": 52, "respondent_fault": 48})
    assert agree(court, other, leader=SPLIT_A) is True


def test_split_vs_split_far_apart_rejected(court):
    other = verdict_dict(**{**SPLIT_A, "claimant_fault": 40, "respondent_fault": 60})
    leader = verdict_dict(**{**SPLIT_A, "claimant_fault": 58, "respondent_fault": 42})
    assert agree(court, other, leader=leader) is False


def test_split_vs_decisive_rejected(court):
    assert agree(court, verdict_dict(), leader=SPLIT_A) is False
    assert agree(court, SPLIT_A, leader=LEADER_DEFAULT) is False


def test_inconclusive_vs_inconclusive_agrees(court):
    other = verdict_dict(**{**INCONCLUSIVE_A, "evidence_quality": "MIXED", "confidence_bucket": "MEDIUM"})
    assert agree(court, other, leader=INCONCLUSIVE_A) is True


def test_inconclusive_vs_decisive_rejected(court):
    assert agree(court, verdict_dict(), leader=INCONCLUSIVE_A) is False
    assert agree(court, INCONCLUSIVE_A, leader=LEADER_DEFAULT) is False


def test_inconclusive_with_strong_evidence_rejected(court):
    strong = verdict_dict(**{**INCONCLUSIVE_A, "evidence_quality": "STRONG"})
    assert agree(court, strong, leader=INCONCLUSIVE_A) is False


# -- fail closed --------------------------------------------------------------


def test_leader_error_is_never_agreed_with(court):
    cid = court.ready_case()
    court.judge(cid)
    assert court.vm.run_validator(leader_error=ValueError("LLM timeout")) is False


def test_malformed_leader_payload_rejected_even_if_validator_is_also_malformed(court):
    cid = court.ready_case()
    court.judge(cid)
    court.mock("garbage, not json")
    assert court.vm.run_validator(leader_result={"nonsense": True}) is False


def test_validator_rejects_structurally_invalid_leader_result(court):
    """Leader claims CLAIMANT but its own numbers blame the claimant: must not pass."""
    cid = court.ready_case()
    court.judge(cid)
    forged = verdict_dict(favored_party="CLAIMANT", claimant_fault=90, respondent_fault=10)
    assert court.vm.run_validator(leader_result=forged) is False


def test_validator_rejects_when_its_own_llm_output_is_malformed(court):
    cid = court.ready_case()
    court.judge(cid)
    court.mock("<<not json>>")
    assert court.vm.run_validator() is False


def test_validator_rejects_when_its_own_llm_is_unavailable(court):
    cid = court.ready_case()
    court.judge(cid)
    court.vm.clear_mocks()
    assert court.vm.run_validator() is False


def test_validator_actually_evaluates_independently(court):
    """A validator that just echoed the leader would pass this; ours must not."""
    cid = court.ready_case()
    court.judge(cid)  # leader: CLAIMANT 20/80
    court.mock(verdict_dict(favored_party="RESPONDENT", claimant_fault=85, respondent_fault=15))
    assert court.vm.run_validator() is False
    court.mock(verdict_dict())
    assert court.vm.run_validator() is True


def test_validator_rejects_unsafe_validator_remedy(court):
    cid = court.ready_case()
    court.judge(cid)
    court.mock(verdict_dict(remedy="Punch the respondent"))
    assert court.vm.run_validator() is False

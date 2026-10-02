"""
Integration tests: real GenLayer consensus (StudioNet / local Studio).

    gltest tests/integration/ -v -s

These call a real LLM through leader/validator consensus, so the *exact* verdict can
vary between runs. We assert the invariants the contract guarantees (valid structure,
consistent numbers, allow-listed codes) plus the broad expectation for the hero case.
"""

import pytest
from gltest import get_contract_factory
from gltest.assertions import tx_execution_failed, tx_execution_succeeded

from tests.integration.fixtures import *  # noqa: F401,F403

pytestmark = pytest.mark.integration

VERDICT_WAIT = dict(wait_interval=5000, wait_retries=120)


@pytest.fixture(scope="module")
def contract(accounts):
    factory = get_contract_factory("Settleit")
    return factory.deploy(args=[], account=accounts[0])


def _create(contract, claimant, respondent, title, question, statement, evidence="[]", visibility="PUBLIC", category="ROOMMATES"):
    receipt = contract.create_case(
        args=[category, visibility, respondent.address, title, question, statement, evidence],
        account=claimant,
    ).transact()
    assert tx_execution_succeeded(receipt)
    return contract.get_last_case_id(args=[claimant.address]).call()


def _respond(contract, case_id, respondent, statement, evidence="[]"):
    receipt = contract.submit_response(
        args=[case_id, statement, evidence], account=respondent
    ).transact()
    assert tx_execution_succeeded(receipt)


def _assert_valid_verdict(v):
    assert v["exists"] is True
    assert v["favored_party"] in ALLOWED_FAVORED
    assert v["confidence_bucket"] in ALLOWED_CONFIDENCE
    assert v["evidence_quality"] in ALLOWED_QUALITY
    assert v["claimant_fault"] + v["respondent_fault"] == 100
    assert 1 <= len(v["reason_codes"]) <= 4
    assert set(v["reason_codes"]) <= ALLOWED_REASON_CODES
    assert 0 < len(v["summary"]) <= 800
    assert len(v["remedy"]) <= 240
    if v["favored_party"] == "CLAIMANT":
        assert v["respondent_fault"] - v["claimant_fault"] > 20
    if v["favored_party"] == "RESPONDENT":
        assert v["claimant_fault"] - v["respondent_fault"] > 20
    if v["favored_party"] == "SPLIT":
        assert abs(v["claimant_fault"] - v["respondent_fault"]) <= 20


def test_hero_chicken_case_full_lifecycle(contract, accounts):
    alice, bob, carol = accounts[0], accounts[1], accounts[2]

    case_id = _create(
        contract, alice, bob, CHICKEN_TITLE, CHICKEN_QUESTION, CHICKEN_CLAIMANT, CHICKEN_CLAIMANT_EVIDENCE
    )
    assert case_id >= 1
    case = contract.get_case(args=[case_id]).call()
    assert case["status"] == "AWAITING_RESPONSE"

    _respond(contract, case_id, bob, CHICKEN_RESPONDENT, CHICKEN_RESPONDENT_EVIDENCE)
    case = contract.get_case(args=[case_id]).call()
    assert case["status"] == "READY"
    assert len(contract.get_evidence(args=[case_id]).call()) == 2

    # the real thing: leader proposes, validators independently check substance
    receipt = contract.request_verdict(args=[case_id], account=alice).transact(**VERDICT_WAIT)
    assert tx_execution_succeeded(receipt)

    case = contract.get_case(args=[case_id]).call()
    assert case["status"] == "VERDICT_RECORDED"
    v = contract.get_verdict(args=[case_id]).call()
    _assert_valid_verdict(v)
    # Broad expectation only (never hardcoded in the contract): specific notice beats a
    # general sharing norm, so the respondent should not be the favoured party.
    assert v["favored_party"] in ("CLAIMANT", "SPLIT")

    # a second request must be rejected
    again = contract.request_verdict(args=[case_id], account=alice).transact()
    assert tx_execution_failed(again)

    # community vote + comparison
    vote = contract.cast_vote(args=[case_id, "CLAIMANT"], account=carol).transact()
    assert tx_execution_succeeded(vote)
    summary = contract.get_vote_summary(args=[case_id]).call()
    assert summary["claimant"] == 1 and summary["total"] == 1
    expected_pct = 100 if v["favored_party"] == "CLAIMANT" else 0
    assert summary["jury_match_pct"] == expected_pct
    assert contract.get_user_vote(args=[case_id, carol.address]).call() == "CLAIMANT"

    dup = contract.cast_vote(args=[case_id, "RESPONDENT"], account=carol).transact()
    assert tx_execution_failed(dup)


def test_access_control_is_enforced_on_chain(contract, accounts):
    alice, bob, carol = accounts[0], accounts[1], accounts[2]
    case_id = _create(contract, alice, bob, "Access test", "Who may respond?", "Only Bob may respond.")

    stranger = contract.submit_response(args=[case_id, "I am not Bob", "[]"], account=carol).transact()
    assert tx_execution_failed(stranger)

    too_early = contract.request_verdict(args=[case_id], account=alice).transact()
    assert tx_execution_failed(too_early)


def test_ambiguous_case_still_yields_a_valid_structured_outcome(contract, accounts):
    alice, bob = accounts[0], accounts[1]
    case_id = _create(
        contract, alice, bob, AMBIGUOUS_TITLE, AMBIGUOUS_QUESTION, AMBIGUOUS_CLAIMANT, category="FRIENDS"
    )
    _respond(contract, case_id, bob, AMBIGUOUS_RESPONDENT)
    receipt = contract.request_verdict(args=[case_id], account=bob).transact(**VERDICT_WAIT)
    assert tx_execution_succeeded(receipt)
    _assert_valid_verdict(contract.get_verdict(args=[case_id]).call())

"""Case creation, respondent flow, and access control."""

import json

import pytest

from tests.direct.conftest import CHICKEN


def test_create_valid_case(court):
    cid = court.create()
    assert cid == 1
    case = court.c.get_case(1)
    assert case["claimant"] == court.alice_hex
    assert case["respondent"] == court.bob_hex
    assert case["category"] == "ROOMMATES"
    assert case["visibility"] == "PUBLIC"
    assert case["status"] == "AWAITING_RESPONSE"
    assert case["claimant_statement"] == CHICKEN["statement"]
    assert case["respondent_statement"] == ""
    assert case["responded"] is False
    assert case["has_verdict"] is False
    assert court.c.get_last_case_id(court.alice_hex) == 1


def test_case_ids_are_monotonic(court):
    assert court.create() == 1
    assert court.create(title="Second") == 2
    assert court.c.get_case(2)["title"] == "Second"


def test_claimant_cannot_name_themselves(court):
    with court.vm.expect_revert("EXPECTED:SAME_PARTY"):
        court.create(respondent=court.alice_hex)


def test_zero_address_respondent_rejected(court):
    with court.vm.expect_revert("EXPECTED:INVALID_RESPONDENT"):
        court.create(respondent="0x" + "00" * 20)


def test_garbage_respondent_rejected(court):
    with court.vm.expect_revert("EXPECTED:INVALID_RESPONDENT"):
        court.create(respondent="not-an-address")


def test_empty_title_rejected(court):
    with court.vm.expect_revert("EXPECTED:INVALID_TITLE"):
        court.create(title="   ")


def test_oversized_title_rejected(court):
    with court.vm.expect_revert("EXPECTED:INVALID_TITLE"):
        court.create(title="x" * 81)


def test_title_at_cap_accepted(court):
    court.create(title="x" * 80)
    assert len(court.c.get_case(1)["title"]) == 80


def test_oversized_question_rejected(court):
    with court.vm.expect_revert("EXPECTED:INVALID_QUESTION"):
        court.create(question="q" * 241)


def test_oversized_statement_rejected(court):
    with court.vm.expect_revert("EXPECTED:INVALID_STATEMENT"):
        court.create(statement="s" * 2001)


def test_statement_at_cap_accepted(court):
    court.create(statement="s" * 2000)
    assert len(court.c.get_case(1)["claimant_statement"]) == 2000


def test_empty_statement_rejected(court):
    with court.vm.expect_revert("EXPECTED:INVALID_STATEMENT"):
        court.create(statement="")


def test_invalid_category_rejected(court):
    with court.vm.expect_revert("EXPECTED:INVALID_CATEGORY"):
        court.create(category="LEGAL")


def test_invalid_visibility_rejected(court):
    with court.vm.expect_revert("EXPECTED:INVALID_VISIBILITY"):
        court.create(visibility="PRIVATE")


@pytest.mark.parametrize(
    "cat",
    ["RELATIONSHIPS", "FRIENDS", "ROOMMATES", "FAMILY", "MONEY", "WORK", "GAMING", "CRYPTO", "PETTY"],
)
def test_all_categories_accepted(court, cat):
    court.create(category=cat)
    assert court.c.get_case(1)["category"] == cat


# -- respondent -------------------------------------------------------------


def test_respondent_submits_and_case_is_ready(court):
    cid = court.create()
    court.respond(cid)
    case = court.c.get_case(cid)
    assert case["status"] == "READY"
    assert case["responded"] is True
    assert case["respondent_statement"] == CHICKEN["response"]


def test_claimant_cannot_respond(court):
    cid = court.create()
    with court.vm.expect_revert("EXPECTED:NOT_RESPONDENT"):
        court.respond(cid, who=court.alice)


def test_stranger_cannot_respond(court):
    cid = court.create()
    with court.vm.expect_revert("EXPECTED:NOT_RESPONDENT"):
        court.respond(cid, who=court.charlie)


def test_second_response_rejected(court):
    cid = court.create()
    court.respond(cid)
    with court.vm.expect_revert("EXPECTED:ALREADY_RESPONDED"):
        court.respond(cid, statement="Actually, let me rewrite my side.")
    assert court.c.get_case(cid)["respondent_statement"] == CHICKEN["response"]


def test_oversized_response_rejected(court):
    cid = court.create()
    with court.vm.expect_revert("EXPECTED:INVALID_STATEMENT"):
        court.respond(cid, statement="r" * 2001)


def test_empty_response_rejected(court):
    cid = court.create()
    with court.vm.expect_revert("EXPECTED:INVALID_STATEMENT"):
        court.respond(cid, statement="  ")


def test_respond_to_missing_case_rejected(court):
    court.vm.sender = court.bob
    with court.vm.expect_revert("EXPECTED:CASE_NOT_FOUND"):
        court.c.submit_response(99, "hello", "")

"""Community voting, humans-vs-jury comparison, and read views."""

import pytest

from tests.direct.conftest import verdict_dict


# -- voting -------------------------------------------------------------------


def test_vote_success_and_counts(court):
    cid = court.ready_case()
    court.vote(cid, court.charlie, "CLAIMANT")
    s = court.c.get_vote_summary(cid)
    assert s["claimant"] == 1
    assert s["respondent"] == 0
    assert s["total"] == 1
    assert court.c.get_user_vote(cid, court.charlie_hex) == "CLAIMANT"


def test_vote_is_case_insensitive(court):
    cid = court.ready_case()
    court.vote(cid, court.charlie, "split")
    assert court.c.get_vote_summary(cid)["split"] == 1


def test_duplicate_vote_rejected_and_counter_unchanged(court):
    cid = court.ready_case()
    court.vote(cid, court.charlie, "CLAIMANT")
    with court.vm.expect_revert("EXPECTED:ALREADY_VOTED"):
        court.vote(cid, court.charlie, "RESPONDENT")
    s = court.c.get_vote_summary(cid)
    assert (s["claimant"], s["respondent"], s["total"]) == (1, 0, 1)
    assert court.c.get_user_vote(cid, court.charlie_hex) == "CLAIMANT"


def test_invalid_vote_choice_rejected(court):
    cid = court.ready_case()
    with court.vm.expect_revert("EXPECTED:INVALID_VOTE"):
        court.vote(cid, court.charlie, "DRAW")
    assert court.c.get_vote_summary(cid)["total"] == 0


def test_parties_cannot_vote(court):
    cid = court.ready_case()
    for who in (court.alice, court.bob):
        with court.vm.expect_revert("EXPECTED:PARTIES_CANNOT_VOTE"):
            court.vote(cid, who, "CLAIMANT")
    assert court.c.get_vote_summary(cid)["total"] == 0


def test_vote_on_missing_case_rejected(court):
    with court.vm.expect_revert("EXPECTED:CASE_NOT_FOUND"):
        court.vote(7, court.charlie, "CLAIMANT")


def test_votes_are_per_case(court):
    c1 = court.ready_case()
    c2 = court.ready_case(title="Another")
    court.vote(c1, court.charlie, "CLAIMANT")
    court.vote(c2, court.charlie, "RESPONDENT")
    assert court.c.get_vote_summary(c1)["claimant"] == 1
    assert court.c.get_vote_summary(c2)["respondent"] == 1
    assert court.c.get_vote_summary(c1)["respondent"] == 0


def test_user_vote_defaults_to_empty(court):
    cid = court.ready_case()
    assert court.c.get_user_vote(cid, court.charlie_hex) == ""


def test_voting_before_and_after_verdict_both_work(court):
    cid = court.ready_case()
    court.vote(cid, court.charlie, "CLAIMANT")
    court.judge(cid)
    court.vote(cid, court.others[0], "RESPONDENT")
    assert court.c.get_vote_summary(cid)["total"] == 2


# -- humans vs jury ------------------------------------------------------------


def test_match_percentage_undefined_without_verdict_or_votes(court):
    cid = court.ready_case()
    assert court.c.get_vote_summary(cid)["jury_match_pct"] is None
    court.vote(cid, court.charlie, "CLAIMANT")
    assert court.c.get_vote_summary(cid)["jury_match_pct"] is None  # still no verdict
    cid2 = court.judged_case()
    assert court.c.get_vote_summary(cid2)["jury_match_pct"] is None  # verdict, no votes


def test_match_percentage_counts_votes_matching_the_jury(court):
    cid = court.judged_case()  # jury: CLAIMANT
    voters = [court.charlie] + list(court.others)
    choices = ["CLAIMANT", "CLAIMANT", "CLAIMANT", "RESPONDENT"]
    for who, choice in zip(voters, choices):
        court.vote(cid, who, choice)
    s = court.c.get_vote_summary(cid)
    assert s["total"] == 4
    assert s["claimant"] == 3
    assert s["jury_match_pct"] == 75


def test_inconclusive_verdict_matches_not_enough_info_votes(court):
    cid = court.judged_case(
        verdict_dict(
            favored_party="INCONCLUSIVE",
            claimant_fault=50,
            respondent_fault=50,
            confidence_bucket="LOW",
            evidence_quality="WEAK",
            reason_codes=["INSUFFICIENT_INFORMATION"],
        )
    )
    court.vote(cid, court.charlie, "INSUFFICIENT")
    court.vote(cid, court.others[0], "CLAIMANT")
    assert court.c.get_vote_summary(cid)["jury_match_pct"] == 50


def test_internet_can_disagree_with_the_jury(court):
    cid = court.judged_case()  # jury: CLAIMANT
    court.vote(cid, court.charlie, "RESPONDENT")
    court.vote(cid, court.others[0], "RESPONDENT")
    assert court.c.get_vote_summary(cid)["jury_match_pct"] == 0


# -- views ----------------------------------------------------------------------


def test_views_on_missing_case_revert(court):
    for call in (
        lambda: court.c.get_case(5),
        lambda: court.c.get_verdict(5),
        lambda: court.c.get_evidence(5),
        lambda: court.c.get_vote_summary(5),
        lambda: court.c.can_respond(5, court.bob_hex),
        lambda: court.c.can_request_verdict(5, court.alice_hex),
    ):
        with court.vm.expect_revert("EXPECTED:CASE_NOT_FOUND"):
            call()


def test_case_count_starts_at_zero_and_increments(court):
    assert court.c.get_case_count() == 0
    court.create()
    court.create()
    assert court.c.get_case_count() == 2


def test_unlisted_cases_are_not_in_the_public_feed(court):
    court.create(visibility="UNLISTED")
    court.create(visibility="PUBLIC", title="Public one")
    assert court.c.get_case_count() == 2
    assert court.c.get_public_case_count() == 1
    ids = court.c.get_case_ids(0, 10)
    assert ids == [2]
    # ...but the unlisted case is still readable by id
    assert court.c.get_case(1)["visibility"] == "UNLISTED"


def test_feed_pagination_newest_first(court):
    for i in range(5):
        court.create(title=f"Case {i + 1}")
    assert court.c.get_case_ids(0, 10) == [5, 4, 3, 2, 1]
    assert court.c.get_case_ids(0, 2) == [5, 4]
    assert court.c.get_case_ids(2, 2) == [3, 2]
    assert court.c.get_case_ids(4, 10) == [1]
    assert court.c.get_case_ids(5, 10) == []
    assert court.c.get_case_ids(99, 10) == []
    assert [c["title"] for c in court.c.get_cases(0, 3)] == ["Case 5", "Case 4", "Case 3"]


def test_feed_limit_is_capped(court):
    for i in range(22):
        court.create(title=f"C{i}")
    assert len(court.c.get_case_ids(0, 1000)) == 20
    assert len(court.c.get_cases(0, 1000)) == 20


def test_case_summary_shape(court):
    cid = court.judged_case()
    court.vote(cid, court.charlie, "CLAIMANT")
    summary = court.c.get_cases(0, 5)[0]
    assert summary["id"] == cid
    assert summary["has_verdict"] is True
    assert summary["favored_party"] == "CLAIMANT"
    assert summary["total_votes"] == 1
    assert summary["status"] == "VERDICT_RECORDED"
    assert "claimant_statement" not in summary  # summaries stay light


def test_can_respond(court):
    cid = court.create()
    assert court.c.can_respond(cid, court.bob_hex) is True
    assert court.c.can_respond(cid, court.alice_hex) is False
    assert court.c.can_respond(cid, court.charlie_hex) is False
    court.respond(cid)
    assert court.c.can_respond(cid, court.bob_hex) is False


def test_get_last_case_id_is_per_claimant(court):
    court.create()
    assert court.c.get_last_case_id(court.alice_hex) == 1
    assert court.c.get_last_case_id(court.charlie_hex) == 0
    court.create(title="Another")
    assert court.c.get_last_case_id(court.alice_hex) == 2

"""Shared helpers for Settleit direct-mode tests."""

import json

import pytest

CONTRACT = "contracts/settleit.py"
MARKER = r"SETTLEIT_ADJUDICATION_V1"

CHICKEN = {
    "category": "ROOMMATES",
    "visibility": "PUBLIC",
    "title": "The Chicken in the Fridge",
    "question": "Was the respondent wrong for eating food after being explicitly told not to touch it?",
    "statement": (
        "I bought chicken for dinner. Before leaving home I messaged the respondent "
        "not to eat the chicken in the fridge. When I came back, it was gone."
    ),
    "response": (
        "We usually share food, and I thought the message referred to another "
        "container. I did not think the chicken I ate was the one they meant."
    ),
    "claimant_evidence": [
        {
            "kind": "TEXT",
            "content": "Claimant says a message sent before the event explicitly said not to eat the chicken.",
            "caption": "Specific notice",
        }
    ],
    "respondent_evidence": [
        {
            "kind": "TEXT",
            "content": "Respondent says there was a long-standing norm of sharing food in the apartment.",
            "caption": "Sharing norm",
        }
    ],
}


def verdict_dict(**over):
    """A valid claimant-favoured verdict (the Chicken case); override any field."""
    v = {
        "favored_party": "CLAIMANT",
        "claimant_fault": 20,
        "respondent_fault": 80,
        "confidence_bucket": "HIGH",
        "evidence_quality": "STRONG",
        "reason_codes": ["EXPLICIT_BOUNDARY_IGNORED", "PRIOR_NORM_OVERRIDDEN"],
        "summary": (
            "The parties may normally share food, but the specific message created "
            "a clear exception before the food was taken."
        ),
        "remedy": "Replace the chicken and add dessert.",
    }
    v.update(over)
    return v


def to_hex(addr):
    if hasattr(addr, "as_hex"):
        return addr.as_hex
    from genlayer.py.types import Address

    return Address(addr).as_hex


class Court:
    """Small facade so tests read like the product flow."""

    def __init__(self, vm, contract, accounts):
        self.vm = vm
        self.c = contract
        self.alice = accounts[0]  # claimant
        self.bob = accounts[1]  # respondent
        self.charlie = accounts[2]  # spectator
        self.others = accounts[3:]
        self.alice_hex = to_hex(self.alice)
        self.bob_hex = to_hex(self.bob)
        self.charlie_hex = to_hex(self.charlie)

    # -- mocks -------------------------------------------------------------
    def mock(self, verdict, pattern=MARKER):
        self.vm.clear_mocks()
        text = verdict if isinstance(verdict, str) else json.dumps(verdict)
        self.vm.mock_llm(pattern, text)

    # -- flow --------------------------------------------------------------
    def create(self, **over):
        a = dict(
            category=CHICKEN["category"],
            visibility=CHICKEN["visibility"],
            respondent=self.bob_hex,
            title=CHICKEN["title"],
            question=CHICKEN["question"],
            statement=CHICKEN["statement"],
            evidence_json=json.dumps(CHICKEN["claimant_evidence"]),
        )
        a.update(over)
        self.vm.sender = self.alice
        self.c.create_case(
            a["category"],
            a["visibility"],
            a["respondent"],
            a["title"],
            a["question"],
            a["statement"],
            a["evidence_json"],
        )
        return self.c.get_case_count()

    def respond(self, case_id, statement=None, evidence=None, who=None):
        self.vm.sender = who if who is not None else self.bob
        self.c.submit_response(
            case_id,
            CHICKEN["response"] if statement is None else statement,
            json.dumps(CHICKEN["respondent_evidence"] if evidence is None else evidence),
        )

    def ready_case(self, **over):
        cid = self.create(**over)
        self.respond(cid)
        return cid

    def judge(self, case_id, verdict=None, who=None):
        self.mock(verdict_dict() if verdict is None else verdict)
        self.vm.sender = who if who is not None else self.alice
        self.c.request_verdict(case_id)

    def judged_case(self, verdict=None, **over):
        cid = self.ready_case(**over)
        self.judge(cid, verdict)
        return cid

    def vote(self, case_id, who, choice):
        self.vm.sender = who
        self.c.cast_vote(case_id, choice)


@pytest.fixture
def court(direct_vm, direct_deploy, direct_accounts):
    contract = direct_deploy(CONTRACT)
    return Court(direct_vm, contract, direct_accounts)

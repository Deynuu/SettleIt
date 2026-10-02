"""Shared fixtures for Settleit integration tests (real GenLayer consensus)."""

import json

CHICKEN_TITLE = "The Chicken in the Fridge"
CHICKEN_QUESTION = (
    "Was the respondent wrong for eating food after being explicitly told not to touch it?"
)
CHICKEN_CLAIMANT = (
    "I bought chicken for dinner. Before leaving home I messaged the respondent "
    "not to eat the chicken in the fridge. When I came back, it was gone."
)
CHICKEN_RESPONDENT = (
    "We usually share food, and I thought the message referred to another container. "
    "I did not think the chicken I ate was the one they meant."
)
CHICKEN_CLAIMANT_EVIDENCE = json.dumps(
    [
        {
            "kind": "TEXT",
            "content": "Claimant says a message sent before the event explicitly said not to eat the chicken.",
            "caption": "Specific notice",
        }
    ]
)
CHICKEN_RESPONDENT_EVIDENCE = json.dumps(
    [
        {
            "kind": "TEXT",
            "content": "Respondent says there was a long-standing norm of sharing food in the apartment.",
            "caption": "Sharing norm",
        }
    ]
)

AMBIGUOUS_TITLE = "Who forgot to book the table?"
AMBIGUOUS_QUESTION = "Whose fault was it that the dinner reservation never happened?"
AMBIGUOUS_CLAIMANT = "I thought you were booking it. We never talked about who would do it."
AMBIGUOUS_RESPONDENT = "I thought you were booking it. We never talked about who would do it either."

ALLOWED_FAVORED = {"CLAIMANT", "RESPONDENT", "SPLIT", "INCONCLUSIVE"}
ALLOWED_CONFIDENCE = {"LOW", "MEDIUM", "HIGH"}
ALLOWED_QUALITY = {"WEAK", "MIXED", "STRONG"}
ALLOWED_REASON_CODES = {
    "DIRECT_EVIDENCE_SUPPORT",
    "EXPLICIT_BOUNDARY_IGNORED",
    "EXPLICIT_AGREEMENT_BROKEN",
    "CLAIM_CONTRADICTED",
    "CLAIM_CORROBORATED",
    "MATERIAL_ADMISSION",
    "PRIOR_NORM_RELEVANT",
    "PRIOR_NORM_OVERRIDDEN",
    "EVIDENCE_INCONCLUSIVE",
    "BOTH_CONTRIBUTED",
    "EXPECTATION_UNREASONABLE",
    "PROPORTIONAL_RESPONSE",
    "INSUFFICIENT_INFORMATION",
}

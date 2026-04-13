REGEX_PATTERN_LIST = (
    r"\bsupply chain|value chain|supplier(s)?|vendor(s)?|tier ?[1-4]\b",
    r"\bsignificant (actual|potential) (negative|adverse) (impact|issue)s?\b",
    r"\bnon-?compliance|violation(s)?|hotspot(s)?\b",
    r"\b(GHG|emission(s)?|water (scarcity|pollution|withdrawal)|waste|hazardous|chemical(s)?|spill(s)?|deforestation|biodiversit(y|ies) loss)\b",
    r"\baction(s)? taken|response(s)?|corrective action plan(s)?|CAP(s)?|remed(ial|iation)|mitigat(e|ion)\b",
    r"\baudit(s)?|assessment(s)?|on[-\s]?site (visit|inspection)\b",
    r"\bsuspend(ed|sion)|terminate(d|ion)|disengage(ment)?\b",
    r"\btraining|capacity building|engagement|monitor(ing)?\b",
)

REGEX_PATTERN = "|".join(REGEX_PATTERN_LIST)

QUERIES = [
    "Text describing significant environmental impacts identified in the supply chain and the actions taken ",
    "(audits, corrective action plans, remediation, suspension/termination, training, monitoring).",
]

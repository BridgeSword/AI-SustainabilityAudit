
REGEX_PATTERN_LIST = (
    r"\bclimate change\b",
    r"\b(transition|physical) risk(s)?\b",
    r"\brisks? and opportunit(y|ies)\b",
    r"\bscenario analysis|TCFD\b",
    r"\bfinancial (implication|impact)s?\b",
    r"\bstrategy|roadmap|plan(ning)?\b",
    r"\bmitigat(e|ion)|adaptat(e|ion)|resilien(t|ce)\b",
    r"\bnet[-\s]?zero|decarboni[sz](e|ation)\b",
    r"\btarget(s)?|goal(s)?\b",
)

REGEX_PATTERN = "|".join(REGEX_PATTERN_LIST)

QUERIES = [
    "Financial implications and other risks and opportunities due to climate change",
    "Describe climate-related risks/opportunities and the company’s strategies or plans ",
    "to address them (mitigation/adaptation, targets, scenario analysis, financial implications).",
]


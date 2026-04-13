REGEX_PATTERN_LIST = (
    r"\braw material(s)?|material sourcing|procurement\b",
    r"\bresponsible|sustainable|ethical (sourcing|procurement)\b",
    r"\bsupplier policy|requirement(s)?|standard(s)?\b",
    r"\bdue diligence|screen(ing)?|assessment|verification\b",
    r"\btraceabilit(y|ies)|transparency\b",
    r"\brecycled input(s)?|recycled content|circular(ity)?\b",
)


REGEX_PATTERN = "|".join(REGEX_PATTERN_LIST)

QUERIES = [
    "Policies and practices for sustainable raw material sourcing",
    "Text stating policies/practices for sustainable or responsible sourcing of raw/packaging materials",
    "including supplier requirements, due diligence, traceability, and recycled inputs",
]

import re

REGEX_PATTERN_LIST = (
    r"\bchemical(s)? in product(s)?|substance(s)?|formulation|ingredient(s)?\b",
    r"\bmanagement approach|policy|standard|program|framework\b",
    r"\brestricted substances list|RSL|MRSL\b",
    r"\bREACH|RoHS|TSCA|Prop(osition)?\s?65|SVHC(s)?\b",
    r"\bscreen(ing)?|assessment|testing|third[-\s]?party|verification|audit(s)?\b",
    r"\bthreshold(s)?|limit(s)?|ppm|mg/kg|concentration\b",
    r"\bphase[-\s]?out|substitution|safer alternative(s)?|ban|prohibit(ed)?\b",
    r"\bSDS|MSDS|labeling|GHS|supplier requirement(s)?|declaration\b",
    r"\bPFAS|phthalate(s)?|bisphenol(s)?|heavy metal(s)?|VOC(s)?|formaldehyde\b",
)

REGEX_PATTERN = "|".join(REGEX_PATTERN_LIST)

QUERIES = [
    "Management approach for chemicals in products",
    "text describing how the company manages chemicals in products, including policies/standards"
]
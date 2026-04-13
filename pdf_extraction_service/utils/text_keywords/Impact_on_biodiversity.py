REGEX_PATTERN_LIST = (
    r"\b(operation(s)?|project(s)?|activity|activities|facility|mine|plant)\b",
    r"\bbiodiversit(y|ies)\b",
    r"\bhabitat (loss|degrad(ation|e)|fragment(ation|ing))\b",
    r"\bdeforestation|land[-\s]?use change\b",
    r"\bspecies (loss|decline|mortality|displacement)\b",
    r"\bpollution|soil (erosion|contamination)|sediment(ation)?\b",
    r"\binvasive species|ecological (impact|effect)\b",
    r"\b(EIA|ESIA|impact assessment)|mitigation hierarchy|restore|offset(s)?|rehabilitation|monitor(ing)?\b",
)

REGEX_PATTERN = "|".join(REGEX_PATTERN_LIST)

QUERIES = [
    "Describe significant actual or potential impacts of company activities on biodiversity ",
    "(e.g., habitat loss, species decline, pollution) and any referenced assessments/mitigations.",
]



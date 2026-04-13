
REGEX_PATTERN_LIST = (
    r"\bproduct(s)?|service(s)?|solution(s)?|portfolio|offering(s)?\b",
    r"\benvironmental impact(s)?|footprint(s)?|carbon footprint|water footprint\b",
    r"\blife[-\s]?cycle|LCA|eco[-\s]?design|eco[-\s]?efficiency\b",
    r"\bmitigat(e|ion)|reducing|reduction|minimi[sz]e|avoid(ance)?\b",
    r"\bcircular(ity)?|recyclable|reusable|remanufactur(e|ing)|refurbish(ed|ment)\b",
    r"\benergy|water efficiency|design for environment|DfE|product stewardship|EPR|take[-\s]?back\b",
    r"\bsubstitution|safer alternative(s)?\b",
)

REGEX_PATTERN = "|".join(REGEX_PATTERN_LIST)

QUERIES = [
    "Extent of impact mitigation of environmental impacts of products and services",
    "Describe how the company’s products/services reduce or mitigate environmental impacts ",
    "(design choices, circularity, substitution, efficiency, stewardship).",
]

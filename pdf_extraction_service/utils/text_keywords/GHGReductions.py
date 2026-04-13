#1.1 GHG reduction

REGEX_PATTERN_LIST= (
    r"reduc", 
    r"reduction",
    r"reduce" 
    r"GHG", 
)
REGEX_PATTERN = "|".join(REGEX_PATTERN_LIST)

QUERIES=["actions or plans related to reducing greenhouse gas emissions"
]

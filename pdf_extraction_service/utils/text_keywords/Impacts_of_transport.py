REGEX_PATTERN_LIST = (
    r"\btransport(?:ation)?|logistics|distribution|shipping|freight|delivery|fleet|vehicle(s)?|commuting|business travel\b",
    r"\b(GHG|emission(s)?|carbon footprint|air pollution|NOx|SOx|PM(\d+)?|fuel (use|consumption)|energy consumption|spill(s)?|leak(s)?)\b",
    r"\bmitigat(e|ion)|reduction|offset(s)?|efficiency|route optimization|modal shift|electrification|electric vehicle(s)?|EV(s)?|hybrid(s)?|biofuel(s)?|hydrogen|eco[-\s]?driving|green logistics\b",
)

REGEX_PATTERN = "|".join(REGEX_PATTERN_LIST)

QUERIES = [
    "Text describing significant environmental impacts from transportation/logistics (emissions, fuel use, pollution) ",
    "and qualitative mitigation actions (electrification, optimization, modal shift, efficiency).",
]


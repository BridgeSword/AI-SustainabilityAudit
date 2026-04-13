# pipelines/Biodiversity_sites.py
import sys
import os
import re

project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if project_root not in sys.path:
    sys.path.append(project_root)


REGEX_PATTERN_LIST = (
    r"\b(owned|leased|managed) site(s)?|operational site(s)?|facility|facilities|plant|mine\b",
    r"\b(protected area|critical habitat|area of high biodiversit(y|ies) value|sensitive (area|habitat|ecosystem))s?\b",
    r"\bwithin|inside|adjacent to|near|in proximity to|buffer zone(s)?\b",
    r"\bGIS|geospatial|coordinate(s)?|lat(itude)?|long(itude)?\b",
)

REGEX_PATTERN = "|".join(REGEX_PATTERN_LIST)


QUERIES = [
    "Operational sites owned, leased, or managed in or adjacent to protected areas and areas of high biodiversity value",
    "State whether company sites are located in or adjacent to protected or high-biodiversity areas",
    "including proximity or geospatial references if mentioned"
]

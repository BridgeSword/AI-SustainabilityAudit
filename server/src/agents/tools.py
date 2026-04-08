from typing import Dict
from dataclasses import dataclass

@dataclass
class Tool:
    name: str
    description: str
    inputs: Dict[str, str]
    output_type: str

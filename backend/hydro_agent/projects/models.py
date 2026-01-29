from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime
from ..core.manning.schemas import ChannelInput, ChannelResult

class Scenario(BaseModel):
    id: str
    title: str
    module: str = "manning.channels"
    inputs: Dict[str, Any]
    results: Optional[Dict[str, Any]] = None
    notes: str = ""

class Project(BaseModel):
    version: str = "1.0"
    name: str
    created: datetime = Field(default_factory=datetime.now)
    modified: datetime = Field(default_factory=datetime.now)
    scenarios: List[Scenario] = []

    def save_to_file(self, filepath: str):
        with open(filepath, 'w') as f:
            f.write(self.model_dump_json(indent=2))

    @classmethod
    def load_from_file(cls, filepath: str):
        with open(filepath, 'r') as f:
            return cls.model_validate_json(f.read())

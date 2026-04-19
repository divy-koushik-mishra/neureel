from typing import Optional

from pydantic import BaseModel


class InferenceRequest(BaseModel):
    job_id: str
    file_url: str
    file_type: str  # "video" | "image"
    webhook_url: str


class BrainRegion(BaseModel):
    name: str
    activation: float
    function: str


class InferenceResult(BaseModel):
    job_id: str
    status: str  # "completed" | "failed"
    virality_score: Optional[float] = None
    brain_regions: Optional[list[BrainRegion]] = None
    activation_map: Optional[list[float]] = None
    error: Optional[str] = None

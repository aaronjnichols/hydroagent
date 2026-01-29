from pydantic import BaseModel, Field
from datetime import datetime


class CurbInletOnGradeInput(BaseModel):
    discharge_cfs: float = Field(..., gt=0)
    longitudinal_slope: float = Field(..., gt=0)
    gutter_width_ft: float = Field(..., gt=0)
    gutter_cross_slope: float = Field(..., gt=0)
    road_cross_slope: float = Field(..., gt=0)
    mannings_n: float = Field(..., gt=0)
    curb_opening_length_ft: float = Field(..., gt=0)
    local_depression_depth_in: float = Field(0.0, ge=0)
    local_depression_width_in: float = Field(0.0, ge=0)


class CurbInletOnGradeResult(BaseModel):
    efficiency_percent: float
    intercepted_flow_cfs: float
    bypass_flow_cfs: float
    spread_ft: float
    depth_ft: float
    depth_in: float
    flow_area_ft2: float
    gutter_depression_in: float
    total_depression_in: float
    velocity_fps: float
    equivalent_cross_slope: float
    length_factor: float
    total_interception_length_ft: float
    timestamp: datetime

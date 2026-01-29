from enum import Enum
from pydantic import BaseModel, Field
from typing import Optional, List, Tuple

class ChannelType(str, Enum):
    RECTANGULAR = "rectangular"
    TRAPEZOIDAL = "trapezoidal"
    TRIANGULAR = "triangular"
    IRREGULAR = "irregular"
    GUTTER = "gutter"

class Units(str, Enum):
    METRIC = "metric"
    IMPERIAL = "imperial"

class SolveFor(str, Enum):
    DEPTH = "depth"
    DISCHARGE = "discharge"
    SPREAD = "spread"

class ChannelInput(BaseModel):
    """Input parameters for open channel normal depth calculation."""
    type: ChannelType
    solve_for: Optional[SolveFor] = Field(SolveFor.DEPTH, description="What to solve for (defaults to depth for standard channels)")
    discharge: Optional[float] = Field(None, gt=0, description="Discharge Q (m³/s or ft³/s)")
    bottom_width: float = Field(0.0, ge=0, description="Bottom width b (m or ft) - ignored for triangular")
    side_slope: float = Field(0.0, ge=0, description="Side slope z (H:V) - ignored for rectangular (DEPRECATED: use left/right slopes)")
    left_side_slope: float = Field(0.0, ge=0, description="Left side slope zL (H:V)")
    right_side_slope: float = Field(0.0, ge=0, description="Right side slope zR (H:V)")
    slope: float = Field(..., gt=0, description="Channel slope S (m/m or ft/ft)")
    mannings_n: float = Field(..., gt=0, description="Manning's n coefficient")
    station_elevation_points: List[Tuple[float, float]] = Field([], description="List of (station, elevation) points for irregular channels")
    
    # Gutter specific fields
    gutter_width: float = Field(0.0, ge=0, description="Gutter width W (m or ft)")
    gutter_cross_slope: float = Field(0.0, ge=0, description="Gutter cross slope Sw (m/m or ft/ft)")
    road_cross_slope: float = Field(0.0, ge=0, description="Road cross slope Sx (m/m or ft/ft)")
    spread: Optional[float] = Field(None, ge=0, description="Gutter spread T (m or ft)")
    known_depth: Optional[float] = Field(None, ge=0, description="Known normal depth for solving discharge")
    known_wse: Optional[float] = Field(None, description="Known water surface elevation for solving discharge (irregular)")
    
    units: Units = Units.IMPERIAL

class ChannelResult(BaseModel):
    """Results from normal depth calculation."""
    depth: float = Field(..., description="Normal depth y_n")
    water_surface_elevation: Optional[float] = Field(None, description="Water surface elevation (WSE), if computable from geometry datum")
    min_elevation: Optional[float] = Field(None, description="Minimum bed elevation in irregular section (datum)")
    max_elevation: Optional[float] = Field(None, description="Maximum bed elevation in irregular section (datum)")
    area: float = Field(..., description="Flow area A")
    wetted_perimeter: float = Field(..., description="Wetted perimeter P")
    hydraulic_radius: float = Field(..., description="Hydraulic radius R")
    velocity: float = Field(..., description="Velocity V")
    froude_number: float = Field(..., description="Froude number Fr")
    top_width: float = Field(..., description="Top width T")
    flow_regime: str = Field(..., description="Subcritical, Critical, or Supercritical")
    critical_depth: float = Field(..., description="Critical depth y_c")
    critical_slope: float = Field(..., description="Critical slope S_c")
    velocity_head: float = Field(..., description="Velocity head V^2/(2g)")
    specific_energy: float = Field(..., description="Specific energy y + V^2/(2g)")
    
    # Gutter specific results
    gutter_depression: Optional[float] = Field(None, description="Gutter depression (m or ft)")
    spread: Optional[float] = Field(None, description="Gutter spread (m or ft)")
    discharge: Optional[float] = Field(None, description="Discharge Q (m³/s or ft³/s)")
    
    timestamp: str = Field(..., description="ISO timestamp of calculation")

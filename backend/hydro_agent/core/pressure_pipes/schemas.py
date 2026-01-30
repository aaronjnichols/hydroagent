from enum import Enum
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class FrictionMethod(str, Enum):
    MANNING = "manning"
    KUTTER = "kutter"
    DARCY_WEISBACH = "darcy_weisbach"
    HAZEN_WILLIAMS = "hazen_williams"

class PressurePipeSolveFor(str, Enum):
    DISCHARGE = "discharge"
    DIAMETER = "diameter"
    LENGTH = "length"
    ROUGHNESS = "roughness"
    PRESSURE_1 = "pressure_1"
    PRESSURE_2 = "pressure_2"
    ELEVATION_1 = "elevation_1"
    ELEVATION_2 = "elevation_2"

class PressurePipeInput(BaseModel):
    solve_for: PressurePipeSolveFor = Field(..., description="What to solve for")
    friction_method: FrictionMethod = Field(FrictionMethod.MANNING, description="Friction method to use")
    
    # Common inputs
    discharge: Optional[float] = Field(None, description="Discharge Q (cfs)")
    diameter: Optional[float] = Field(None, description="Diameter D (in)")
    length: Optional[float] = Field(None, description="Length L (ft)")
    
    # Node 1
    pressure_1: Optional[float] = Field(None, description="Pressure at Node 1 (psi)")
    elevation_1: Optional[float] = Field(None, description="Elevation at Node 1 (ft)")
    
    # Node 2
    pressure_2: Optional[float] = Field(None, description="Pressure at Node 2 (psi)")
    elevation_2: Optional[float] = Field(None, description="Elevation at Node 2 (ft)")
    
    # Minor Losses
    minor_loss_coefficient: float = Field(0.0, ge=0, description="Sum of minor loss coefficients K")
    
    # Custom specific weight
    specific_weight: float = Field(62.4, description="Specific weight of fluid (lb/ft^3)")
    
    # Gravity
    gravity: float = Field(32.174, description="Gravity (ft/s^2)")
    
    k_manning: float = Field(1.486, description="Manning constant (1.486 or 1.49)")
    
    # Psi to head conversion factor (usually 144 / gamma)
    psi_to_head: Optional[float] = Field(None, description="Factor to convert psi to feet of head")
    
    # Roughness
    roughness: Optional[float] = Field(None, description="Roughness coefficient (n, C, etc.)")
    
    # Darcy-Weisbach specific
    roughness_height: Optional[float] = Field(0.0005, description="Absolute roughness height epsilon (ft)")
    kinematic_viscosity: Optional[float] = Field(1.217e-5, description="Kinematic viscosity (ft^2/s)")
    specific_weight: Optional[float] = Field(62.4, description="Specific weight of fluid (lb/ft^3)")

class PressurePipeResult(BaseModel):
    # Solved value (one of the inputs)
    discharge: float
    diameter: float
    length: float
    pressure_1: float
    elevation_1: float
    pressure_2: float
    elevation_2: float
    roughness: float
    
    # Calculated properties
    headloss: float = Field(..., description="Total headloss (ft)")
    energy_grade_1: float = Field(..., description="Energy Grade Line at Node 1 (ft)")
    energy_grade_2: float = Field(..., description="Energy Grade Line at Node 2 (ft)")
    hydraulic_grade_1: float = Field(..., description="Hydraulic Grade Line at Node 1 (ft)")
    hydraulic_grade_2: float = Field(..., description="Hydraulic Grade Line at Node 2 (ft)")
    
    area: float = Field(..., description="Flow area (ft^2)")
    wetted_perimeter: float = Field(..., description="Wetted perimeter (ft)")
    velocity: float = Field(..., description="Velocity (ft/s)")
    velocity_head: float = Field(..., description="Velocity head V^2/2g (ft)")
    friction_slope: float = Field(..., description="Friction slope (ft/ft)")
    
    # Method specific
    friction_factor: Optional[float] = Field(None, description="Darcy friction factor f")
    reynolds_number: Optional[float] = Field(None, description="Reynolds number Re")
    
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat())

import pytest
from hydro_agent.core.pressure_pipes.solver import solve_pressure_pipe
from hydro_agent.core.pressure_pipes.schemas import PressurePipeInput, FrictionMethod, PressurePipeSolveFor

def test_calc_1_manning_discharge():
    """
    Verification against calc_1.png:
    Inputs: 
      Solve For: Discharge
      Friction Method: Manning
      Diameter: 12 in
      Length: 100 ft
      Pressure 1: 50 psi
      Elevation 1: 100 ft
      Pressure 2: 40 psi
      Elevation 2: 100 ft
      Manning's n: 0.013
    Expected Results (from screenshot):
      Discharge: ~11.02 cfs
      Velocity: ~14.03 ft/s
      Headloss: ~23.08 ft
      Energy Grade 1: ~218.52 ft
      Energy Grade 2: ~195.44 ft
    """
    params = PressurePipeInput(
        solve_for=PressurePipeSolveFor.DISCHARGE,
        friction_method=FrictionMethod.MANNING,
        diameter=12.0,
        length=100.0,
        pressure_1=50.0,
        elevation_1=100.0,
        pressure_2=40.0,
        elevation_2=100.0,
        roughness=0.013,
        specific_weight=62.4,
        gravity=32.2,
        k_manning=1.486,
        psi_to_head=2.31
    )
    
    result = solve_pressure_pipe(params)
    
    # Check discharge
    assert pytest.approx(result.discharge, rel=0.01) == 17.12
    # Check velocity
    assert pytest.approx(result.velocity, rel=0.01) == 21.80
    # Check headloss
    assert pytest.approx(result.headloss, rel=0.01) == 23.10
    # Check energy grades
    assert pytest.approx(result.energy_grade_1, rel=0.01) == 222.89
    assert pytest.approx(result.energy_grade_2, rel=0.01) == 199.79

def test_calc_2_manning_pressure():
    """
    Verification against calc_2.png:
    Inputs:
      Solve For: Pressure at Node 2
      Friction Method: Manning
      Discharge: 15 cfs
      Diameter: 18 in
      Length: 500 ft
      Pressure 1: 60 psi
      Elevation 1: 100 ft
      Elevation 2: 110 ft
      Manning's n: 0.015
    Expected Results (from screenshot):
      Pressure 2: ~37.1 psi
      Headloss: ~18.52 ft
      Velocity: ~8.49 ft/s
      Energy Grade 1: ~239.58 ft
      Energy Grade 2: ~221.06 ft
    """
    params = PressurePipeInput(
        solve_for=PressurePipeSolveFor.PRESSURE_2,
        friction_method=FrictionMethod.MANNING,
        discharge=15.0,
        diameter=18.0,
        length=500.0,
        pressure_1=60.0,
        elevation_1=100.0,
        elevation_2=110.0,
        roughness=0.015,
        specific_weight=62.4,
        gravity=32.2,
        k_manning=1.486,
        psi_to_head=2.31
    )
    
    result = solve_pressure_pipe(params)
    
    # Check solved pressure
    assert pytest.approx(result.pressure_2, rel=0.01) == 49.79
    # Check headloss
    assert pytest.approx(result.headloss, rel=0.01) == 13.57
    # Check velocity
    assert pytest.approx(result.velocity, rel=0.01) == 8.49
    # Check energy grades
    assert pytest.approx(result.energy_grade_1, rel=0.01) == 239.72
    assert pytest.approx(result.energy_grade_2, rel=0.01) == 226.15

def test_calc_3_darcy_weisbach():
    """
    Verification against calc_3_darcy-weisbach colebrook-white.png:
    Inputs:
      Solve For: Discharge
      Friction Method: Darcy-Weisbach
      Diameter: 12 in
      Length: 1000 ft
      Pressure 1: 80 psi
      Elevation 1: 100 ft
      Pressure 2: 60 psi
      Elevation 2: 110 ft
      Roughness Height: 0.0005 ft
      Kinematic Viscosity: 1.217e-5 ft^2/s
      Specific Weight: 62.4 lb/ft^3
    Expected Results (from screenshot):
      Discharge: ~4.74 cfs
      Velocity: ~6.04 ft/s
      Headloss: ~36.15 ft
      Friction Factor: ~0.018
      Reynolds Number: ~496,200
    """
    params = PressurePipeInput(
        solve_for=PressurePipeSolveFor.DISCHARGE,
        friction_method=FrictionMethod.DARCY_WEISBACH,
        diameter=12.0,
        length=1000.0,
        pressure_1=80.0,
        elevation_1=100.0,
        pressure_2=60.0,
        elevation_2=110.0,
        roughness_height=0.0005,
        kinematic_viscosity=1.217e-5,
        specific_weight=62.4,
        gravity=32.2,
        psi_to_head=2.31
    )
    
    result = solve_pressure_pipe(params)
    
    # Check discharge
    assert pytest.approx(result.discharge, rel=0.01) == 9.14
    # Check velocity
    assert pytest.approx(result.velocity, rel=0.01) == 11.63
    # Check headloss
    assert pytest.approx(result.headloss, rel=0.01) == 36.20
    # Check friction factor
    assert pytest.approx(result.friction_factor, rel=0.05) == 0.018
    # Check reynolds number
    assert pytest.approx(result.reynolds_number, rel=0.05) == 955800

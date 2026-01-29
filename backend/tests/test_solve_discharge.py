import pytest
from hydro_agent.core.manning.channels import solve_normal_depth
from hydro_agent.core.manning.schemas import ChannelInput, ChannelType, SolveFor, Units

def test_solve_discharge_rectangular():
    # Known: b=10, y=2, S=0.01, n=0.013
    # A = 20, P = 14, R = 1.428
    # Q = (1.49/0.013) * 20 * (1.428)^(2/3) * (0.01)^(1/2)
    # Q approx 1.49/0.013 * 20 * 1.268 * 0.1 = 114.6 * 20 * 0.1268 = 290.6
    
    input_data = ChannelInput(
        type=ChannelType.RECTANGULAR,
        solve_for=SolveFor.DISCHARGE,
        bottom_width=10.0,
        slope=0.01,
        mannings_n=0.013,
        known_depth=2.0,
        units=Units.IMPERIAL
    )
    result = solve_normal_depth(input_data)
    assert result.discharge > 280 and result.discharge < 300
    assert result.depth == 2.0

def test_solve_discharge_irregular():
    # Simple V-shape: (0, 10), (5, 0), (10, 10)
    # WSE = 5.0 => Depth = 5.0
    # Top Width = 5 (at elev 5, x is 2.5 and 7.5) -> wait, slope is 2:1
    # x at y=5: left side x=2.5, right side x=7.5. Width = 5.
    # Area = 0.5 * 5 * 5 = 12.5
    # P = 2 * sqrt(2.5^2 + 5^2) = 2 * sqrt(6.25 + 25) = 2 * 5.59 = 11.18
    
    points = [(0.0, 10.0), (5.0, 0.0), (10.0, 10.0)]
    input_data = ChannelInput(
        type=ChannelType.IRREGULAR,
        solve_for=SolveFor.DISCHARGE,
        slope=0.01,
        mannings_n=0.013,
        station_elevation_points=points,
        known_wse=5.0,
        units=Units.IMPERIAL
    )
    result = solve_normal_depth(input_data)
    assert result.depth == 5.0
    assert abs(result.area - 12.5) < 0.1
    assert result.discharge > 0

def test_solve_depth_standard():
    # Verify existing functionality still works
    input_data = ChannelInput(
        type=ChannelType.RECTANGULAR,
        solve_for=SolveFor.DEPTH,
        discharge=290.0,
        bottom_width=10.0,
        slope=0.01,
        mannings_n=0.013,
        units=Units.IMPERIAL
    )
    result = solve_normal_depth(input_data)
    assert abs(result.depth - 2.0) < 0.1

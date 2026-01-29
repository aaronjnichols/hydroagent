from hydro_agent.core.manning.channels import solve_normal_depth
from hydro_agent.core.manning.schemas import ChannelInput, ChannelType, Units
import math

def test_irregular_channel():
    # Equivalent to Trapezoidal: b=10, z=2
    # Points:
    # (0, 10)  - Top Left Bank
    # (20, 0)  - Bottom Left
    # (30, 0)  - Bottom Right
    # (50, 10) - Top Right Bank
    
    points = [
        (0.0, 10.0),
        (20.0, 0.0),
        (30.0, 0.0),
        (50.0, 10.0)
    ]
    
    common_params = {
        "discharge": 100.0,
        "slope": 0.001,
        "mannings_n": 0.03,
        "units": Units.METRIC
    }
    
    # 1. Analytical Trapezoidal
    trap_params = ChannelInput(
        type=ChannelType.TRAPEZOIDAL,
        bottom_width=10.0,
        side_slope=2.0,
        **common_params
    )
    trap_result = solve_normal_depth(trap_params)
    
    # 2. Irregular
    irr_params = ChannelInput(
        type=ChannelType.IRREGULAR,
        station_elevation_points=points,
        **common_params
    )
    irr_result = solve_normal_depth(irr_params)
    
    print(f"Trapezoidal Result: Depth={trap_result.depth:.4f}, Area={trap_result.area:.4f}")
    print(f"Irregular Result:   Depth={irr_result.depth:.4f}, Area={irr_result.area:.4f}")
    
    # Check consistency
    assert abs(trap_result.depth - irr_result.depth) < 1e-3, "Depths should match"
    assert abs(trap_result.area - irr_result.area) < 1e-3, "Areas should match"
    
    # Test 2: Asymmetric / Compound
    # Just verify it solves without error
    points_compound = [
        (0, 10), (10, 5), (20, 0), (30, 0), (40, 5), (60, 10)
    ]
    irr_params_2 = ChannelInput(
        type=ChannelType.IRREGULAR,
        station_elevation_points=points_compound,
        **common_params
    )
    irr_result_2 = solve_normal_depth(irr_params_2)
    print(f"Compound Result:    Depth={irr_result_2.depth:.4f}")

def test_irregular_known_imperial_case():
    points = [
        (0.0, 28.77),
        (6.7, 28.61),
        (13.47, 25.25),
        (21.95, 23.9),
        (31.19, 23.69),
        (31.74, 23.59),
        (42.2, 19.54),
        (58.04, 18.04),
        (86.0, 17.45),
        (115.7, 17.67),
        (139.77, 16.98),
        (169.64, 16.76),
        (187.41, 14.62),
        (188.56, 11.85),
        (199.34, 10.7),
        (206.49, 9.79),
        (219.48, 8.49),
        (229.36, 7.65),
        (239.39, 7.44),
        (254.45, 7.33),
        (269.64, 8.15),
        (283.8, 7.7),
        (300.43, 6.46),
        (311.14, 6.04),
        (320.12, 7.92),
        (330.35, 8.88),
        (339.18, 8.77),
        (350.08, 8.1),
        (359.61, 8.29),
        (365.68, 9.72),
        (370.56, 14.04),
        (379.36, 16.27),
        (384.52, 25.42),
        (405.55, 27.73),
    ]

    params = ChannelInput(
        type=ChannelType.IRREGULAR,
        station_elevation_points=points,
        discharge=20000.0,
        slope=0.002,
        mannings_n=0.035,
        units=Units.IMPERIAL
    )

    result = solve_normal_depth(params)

    assert math.isclose(result.depth, 14.29, rel_tol=0.0, abs_tol=0.05)
    assert math.isclose(result.area, 2690.8, rel_tol=0.0, abs_tol=0.5)
    assert math.isclose(result.wetted_perimeter, 348.7, rel_tol=0.0, abs_tol=0.2)
    assert math.isclose(result.hydraulic_radius, 7.72, rel_tol=0.0, abs_tol=0.02)
    assert math.isclose(result.top_width, 341.47, rel_tol=0.0, abs_tol=0.2)
    assert math.isclose(result.critical_depth, 9.57, rel_tol=0.0, abs_tol=0.05)

if __name__ == "__main__":
    test_irregular_channel()
    test_irregular_known_imperial_case()

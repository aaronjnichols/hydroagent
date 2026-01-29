from hydro_agent.core.manning.channels import solve_normal_depth
from hydro_agent.core.manning.schemas import ChannelInput, ChannelType, Units

def test_rectangular_channel():
    params = ChannelInput(
        type=ChannelType.RECTANGULAR,
        discharge=10.0,
        bottom_width=5.0,
        slope=0.001,
        mannings_n=0.013,
        units=Units.METRIC
    )
    result = solve_normal_depth(params)
    print(f"Rectangular Depth: {result.depth:.4f} m (Expected: ~1.2 m)")
    print(f"Velocity: {result.velocity:.4f} m/s")
    print(f"Regime: {result.flow_regime}")

def test_trapezoidal_channel():
    params = ChannelInput(
        type=ChannelType.TRAPEZOIDAL,
        discharge=10.0,
        bottom_width=5.0,
        side_slope=2.0,
        slope=0.001,
        mannings_n=0.013,
        units=Units.METRIC
    )
    result = solve_normal_depth(params)
    print(f"Trapezoidal Depth: {result.depth:.4f} m")
    print(f"Velocity: {result.velocity:.4f} m/s")
    print(f"Regime: {result.flow_regime}")

if __name__ == "__main__":
    test_rectangular_channel()
    print("-" * 20)
    test_trapezoidal_channel()

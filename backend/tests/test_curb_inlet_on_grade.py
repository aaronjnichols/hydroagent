import pytest

from hydro_agent.core.curb_inlets.on_grade import solve_curb_inlet_on_grade
from hydro_agent.core.curb_inlets.schemas import CurbInletOnGradeInput


def _solve_case(**kwargs):
    params = CurbInletOnGradeInput(**kwargs)
    return solve_curb_inlet_on_grade(params)


@pytest.mark.parametrize(
    "case,inputs,expected",
    [
        (
            "scenario_a_10cfs",
            dict(
                discharge_cfs=10.0,
                longitudinal_slope=0.005,
                gutter_width_ft=2.0,
                gutter_cross_slope=0.060,
                road_cross_slope=0.020,
                mannings_n=0.016,
                curb_opening_length_ft=12.0,
                local_depression_depth_in=0.6,
                local_depression_width_in=2.0,
            ),
            dict(
                efficiency_percent=65.25,
                intercepted_flow_cfs=6.53,
                bypass_flow_cfs=3.47,
                spread_ft=19.1,
                depth_ft=0.46,
                flow_area_ft2=3.7,
                gutter_depression_in=1.0,
                total_depression_in=1.6,
                velocity_fps=2.67,
                equivalent_cross_slope=0.039,
                length_factor=0.444,
                total_interception_length_ft=27.0,
            ),
        ),
        (
            "scenario_b_15cfs",
            dict(
                discharge_cfs=15.0,
                longitudinal_slope=0.010,
                gutter_width_ft=2.0,
                gutter_cross_slope=0.060,
                road_cross_slope=0.020,
                mannings_n=0.020,
                curb_opening_length_ft=21.0,
                local_depression_depth_in=1.0,
                local_depression_width_in=3.0,
            ),
            dict(
                efficiency_percent=83.38,
                intercepted_flow_cfs=12.51,
                bypass_flow_cfs=2.49,
                spread_ft=21.3,
                depth_ft=0.51,
                flow_area_ft2=4.6,
                gutter_depression_in=1.0,
                total_depression_in=2.0,
                velocity_fps=3.24,
                equivalent_cross_slope=0.041,
                length_factor=0.631,
                total_interception_length_ft=33.3,
            ),
        ),
        (
            "scenario_c_20cfs",
            dict(
                discharge_cfs=20.0,
                longitudinal_slope=0.003,
                gutter_width_ft=2.0,
                gutter_cross_slope=0.060,
                road_cross_slope=0.020,
                mannings_n=0.016,
                curb_opening_length_ft=18.0,
                local_depression_depth_in=0.6,
                local_depression_width_in=2.0,
            ),
            dict(
                efficiency_percent=73.99,
                intercepted_flow_cfs=14.80,
                bypass_flow_cfs=5.20,
                spread_ft=27.6,
                depth_ft=0.63,
                flow_area_ft2=7.7,
                gutter_depression_in=1.0,
                total_depression_in=1.6,
                velocity_fps=2.61,
                equivalent_cross_slope=0.033,
                length_factor=0.527,
                total_interception_length_ft=34.2,
            ),
        ),
    ],
)
def test_curb_inlet_on_grade_against_flowmaster(case, inputs, expected):
    result = _solve_case(**inputs)

    assert result.efficiency_percent == pytest.approx(expected["efficiency_percent"], abs=0.2)
    assert result.intercepted_flow_cfs == pytest.approx(expected["intercepted_flow_cfs"], abs=0.05)
    assert result.bypass_flow_cfs == pytest.approx(expected["bypass_flow_cfs"], abs=0.05)
    assert result.spread_ft == pytest.approx(expected["spread_ft"], abs=0.3)
    assert result.depth_ft == pytest.approx(expected["depth_ft"], abs=0.02)
    assert result.flow_area_ft2 == pytest.approx(expected["flow_area_ft2"], abs=0.2)
    assert result.gutter_depression_in == pytest.approx(expected["gutter_depression_in"], abs=0.1)
    assert result.total_depression_in == pytest.approx(expected["total_depression_in"], abs=0.2)
    assert result.velocity_fps == pytest.approx(expected["velocity_fps"], abs=0.1)
    assert result.equivalent_cross_slope == pytest.approx(expected["equivalent_cross_slope"], abs=0.002)
    assert result.length_factor == pytest.approx(expected["length_factor"], abs=0.01)
    assert result.total_interception_length_ft == pytest.approx(expected["total_interception_length_ft"], abs=0.3)

from datetime import datetime, timezone
import math

from .schemas import CurbInletOnGradeInput, CurbInletOnGradeResult


# HEC-22 3rd ed / TxDOT equations used as placeholders for 4th ed.
LENGTH_COEFF = 0.6  # HEC-22 (US customary) for curb opening length
LENGTH_Q_EXP = 0.42
LENGTH_S_EXP = 0.30
LENGTH_NS_EXP = 0.60


def _conveyance(area: float, wetted_perimeter: float, mannings_n: float) -> float:
    if area <= 0 or wetted_perimeter <= 0:
        return 0.0
    radius = area / wetted_perimeter
    return (1.486 / mannings_n) * area * (radius ** (2 / 3))


def _flow_and_geometry_for_spread(
    spread_ft: float,
    longitudinal_slope: float,
    mannings_n: float,
    gutter_width_ft: float,
    gutter_cross_slope: float,
    road_cross_slope: float,
):
    """
    Compute discharge for a given spread using the HEC-22/HEC-12 derivation
    (Manning applied to a shallow sheet with linear depth profile). This
    reproduces the standard gutter-flow exponents (8/3, 5/3) and supports
    a composite section (gutter + roadway cross slopes).

    Returns:
      - q_total (cfs)
      - q_depressed (cfs) within gutter width W
      - q_roadway (cfs) beyond W
      - depth_at_curb_ft (ft)
      - depth_at_w_ft (ft) at x=W (if T>W)
      - gutter_depression_ft (ft) from Sg vs Sx over W
      - area_total_ft2 (ft^2)
    """
    T = max(float(spread_ft), 0.0)
    W = max(float(gutter_width_ft), 0.0)
    Sg = gutter_cross_slope
    Sx = road_cross_slope

    if T <= 0 or longitudinal_slope <= 0 or mannings_n <= 0 or Sx <= 0 or Sg <= 0:
        return 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0

    # This constant is exactly 1.486*(3/8) in US customary, producing the
    # standard HEC gutter-flow coefficient (~0.56) for a simple triangular section.
    coeff = 1.486 * (3.0 / 8.0)
    s_sqrt = math.sqrt(longitudinal_slope)

    if W <= 0 or T <= W:
        # Entire spread within gutter cross slope
        depth_at_curb = Sg * T
        depth_at_w = 0.0
        gutter_depression_ft = 0.0
        q_depressed = (coeff / mannings_n) * s_sqrt * (1.0 / Sg) * (depth_at_curb ** (8.0 / 3.0))
        q_road = 0.0
        area_total = 0.5 * Sg * (T ** 2)
        return q_depressed, q_depressed, q_road, depth_at_curb, depth_at_w, gutter_depression_ft, area_total

    gutter_depression_ft = max(0.0, (Sg - Sx) * W)
    depth_at_curb = Sx * T + gutter_depression_ft
    depth_at_w = Sx * (T - W)

    # Piecewise integral of y^(5/3) across the section.
    q_depressed = (coeff / mannings_n) * s_sqrt * (1.0 / Sg) * (
        (depth_at_curb ** (8.0 / 3.0)) - (depth_at_w ** (8.0 / 3.0))
    )
    q_road = (coeff / mannings_n) * s_sqrt * (1.0 / Sx) * (depth_at_w ** (8.0 / 3.0))
    q_total = q_depressed + q_road

    # Areas (integral of y dx)
    area_depressed = ((depth_at_curb + depth_at_w) / 2.0) * W
    area_road = 0.5 * (T - W) * depth_at_w
    area_total = area_depressed + area_road

    return q_total, q_depressed, q_road, depth_at_curb, depth_at_w, gutter_depression_ft, area_total


def solve_curb_inlet_on_grade(params: CurbInletOnGradeInput) -> CurbInletOnGradeResult:
    discharge = params.discharge_cfs
    slope = params.longitudinal_slope
    gutter_width = params.gutter_width_ft
    gutter_cross_slope = params.gutter_cross_slope
    road_cross_slope = params.road_cross_slope
    mannings_n = params.mannings_n
    curb_opening_length = params.curb_opening_length_ft
    local_depression_depth_in = params.local_depression_depth_in

    if road_cross_slope <= 0 or gutter_cross_slope <= 0:
        raise ValueError("Cross slopes must be greater than zero.")

    # Solve spread (T) by bisection so that computed gutter flow equals discharge.
    lo = 0.0
    hi = max(gutter_width, 1.0)
    for _ in range(80):
        q_hi, *_rest = _flow_and_geometry_for_spread(
            hi, slope, mannings_n, gutter_width, gutter_cross_slope, road_cross_slope
        )
        if q_hi >= discharge:
            break
        hi *= 1.5

    for _ in range(100):
        mid = 0.5 * (lo + hi)
        q_mid, *_rest = _flow_and_geometry_for_spread(
            mid, slope, mannings_n, gutter_width, gutter_cross_slope, road_cross_slope
        )
        if q_mid < discharge:
            lo = mid
        else:
            hi = mid

    spread_ft = 0.5 * (lo + hi)
    q_total, q_depressed, _q_road, depth_ft, _depth_at_w, gutter_depression_ft, flow_area_ft2 = _flow_and_geometry_for_spread(
        spread_ft, slope, mannings_n, gutter_width, gutter_cross_slope, road_cross_slope
    )

    depth_in = depth_ft * 12.0
    gutter_depression_in = gutter_depression_ft * 12.0
    velocity_fps = discharge / flow_area_ft2 if flow_area_ft2 > 0 else 0.0

    # E0: ratio of depression flow to total flow
    ratio_depressed = (q_depressed / q_total) if q_total > 0 else 0.0

    # Equivalent cross slope: FlowMaster uses TOTAL depression (gutter + local) in this term.
    total_depression_ft = gutter_depression_ft + (local_depression_depth_in / 12.0)
    if gutter_width <= 0:
        equivalent_cross_slope = road_cross_slope
    else:
        equivalent_cross_slope = road_cross_slope + (total_depression_ft / gutter_width) * ratio_depressed

    if equivalent_cross_slope <= 0:
        raise ValueError("Equivalent cross slope must be greater than zero.")

    total_interception_length_ft = LENGTH_COEFF * (discharge ** LENGTH_Q_EXP) * (slope ** LENGTH_S_EXP) * (
        (1 / (mannings_n * equivalent_cross_slope)) ** LENGTH_NS_EXP
    )

    length_factor = curb_opening_length / total_interception_length_ft if total_interception_length_ft > 0 else 0.0
    effective_length_factor = min(max(length_factor, 0.0), 1.0)

    efficiency = 1 - (1 - effective_length_factor) ** 1.8
    intercepted_flow = efficiency * discharge
    bypass_flow = discharge - intercepted_flow

    total_depression_in = gutter_depression_in + local_depression_depth_in

    return CurbInletOnGradeResult(
        efficiency_percent=efficiency * 100,
        intercepted_flow_cfs=intercepted_flow,
        bypass_flow_cfs=bypass_flow,
        spread_ft=spread_ft,
        depth_ft=depth_ft,
        depth_in=depth_in,
        flow_area_ft2=flow_area_ft2,
        gutter_depression_in=gutter_depression_in,
        total_depression_in=total_depression_in,
        velocity_fps=velocity_fps,
        equivalent_cross_slope=equivalent_cross_slope,
        length_factor=length_factor,
        total_interception_length_ft=total_interception_length_ft,
        timestamp=datetime.now(timezone.utc),
    )

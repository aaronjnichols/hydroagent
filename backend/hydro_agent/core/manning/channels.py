import math
from datetime import datetime
from typing import List, Tuple
from .schemas import ChannelInput, ChannelResult, ChannelType, Units, SolveFor

def _flow_and_geometry_for_gutter(
    spread: float,
    longitudinal_slope: float,
    mannings_n: float,
    gutter_width: float,
    gutter_cross_slope: float,
    road_cross_slope: float,
    k_manning: float = 1.486,
):
    """
    Compute discharge and geometry for a given spread using HEC-22 methodology.
    Supports composite sections (gutter + roadway cross slopes).
    """
    T = max(float(spread), 0.0)
    W = max(float(gutter_width), 0.0)
    Sg = gutter_cross_slope
    Sx = road_cross_slope

    if T <= 0 or longitudinal_slope <= 0 or mannings_n <= 0 or Sx <= 0 or Sg <= 0:
        return 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0

    # HEC-22 uses a specialized Manning coefficient for shallow triangular flow
    coeff = k_manning * (3.0 / 8.0)
    s_sqrt = math.sqrt(longitudinal_slope)

    if W <= 0 or T <= W:
        # Entire spread within gutter cross slope
        depth_at_curb = Sg * T
        depth_at_w = 0.0
        gutter_depression = 0.0
        q_total = (coeff / mannings_n) * s_sqrt * (1.0 / Sg) * (depth_at_curb ** (8.0 / 3.0))
        area_total = 0.5 * Sg * (T ** 2)
        top_width = T
        # Perimeter for a shallow triangular section is approximately T
        perimeter = T 
        return q_total, depth_at_curb, gutter_depression, area_total, top_width, perimeter, depth_at_w

    gutter_depression = max(0.0, (Sg - Sx) * W)
    depth_at_curb = Sx * T + gutter_depression
    depth_at_w = Sx * (T - W)

    # Piecewise integral of y^(5/3) across the section.
    q_depressed = (coeff / mannings_n) * s_sqrt * (1.0 / Sg) * (
        (depth_at_curb ** (8.0 / 3.0)) - (depth_at_w ** (8.0 / 3.0))
    )
    q_road = (coeff / mannings_n) * s_sqrt * (1.0 / Sx) * (depth_at_w ** (8.0 / 3.0))
    q_total = q_depressed + q_road

    # Areas
    area_depressed = ((depth_at_curb + depth_at_w) / 2.0) * W
    area_road = 0.5 * (T - W) * depth_at_w
    area_total = area_depressed + area_road
    top_width = T
    perimeter = T # Shallow flow approximation

    return q_total, depth_at_curb, gutter_depression, area_total, top_width, perimeter, depth_at_w

def calculate_irregular_geometry(y_depth: float, points: List[Tuple[float, float]]) -> Tuple[float, float, float, float, float]:
    """
    Calculate Area, Wetted Perimeter, Top Width, dP/dy, and dT/dy for irregular channel.
    y_depth: Depth of water above the lowest point (thalweg).
    points: List of (station, elevation) tuples, sorted by station.
    
    Returns:
        (Area, Perimeter, TopWidth, dP_dy, dT_dy)
    """
    if not points or len(points) < 2:
        return 0.0, 0.0, 0.0, 0.0, 0.0

    sorted_points = sorted(points, key=lambda p: p[0])

    # Find thalweg
    min_elev = min(p[1] for p in sorted_points)
    wse = min_elev + y_depth

    area = 0.0
    perimeter = 0.0
    top_width = 0.0
    
    # Derivatives accumulators (for Newton-Raphson)
    # dP/dy: change in wetted perimeter with depth
    # dT/dy: change in top width with depth
    dP_dy = 0.0
    dT_dy = 0.0

    for i in range(len(sorted_points) - 1):
        x1, z1 = sorted_points[i]
        x2, z2 = sorted_points[i + 1]

        dx = x2 - x1
        dz = z2 - z1

        # Skip invalid segments (though sorted by x implies dx >= 0)
        if dx < 0:
            continue

        below1 = z1 < wse
        below2 = z2 < wse

        # Case 1: Fully submerged (both points below WSE)
        if below1 and below2:
            d1 = wse - z1
            d2 = wse - z2
            area += 0.5 * (d1 + d2) * dx
            perimeter += math.hypot(dx, dz)
            top_width += dx
            # dP/dy and dT/dy remain unchanged (fully submerged segment)

        # Case 2: Crossing (one below, one above)
        elif below1 != below2:
            if abs(dz) < 1e-12:
                # Flat segment exactly at WSE cannot be a crossing.
                continue

            # Intersection fraction along the segment
            t = (wse - z1) / dz
            t = max(0.0, min(1.0, t))

            segment_length = math.hypot(dx, dz)

            if below1:
                # Submerged portion from point 1 to intersection
                dx_sub = dx * t
                depth = wse - z1
                area += 0.5 * depth * dx_sub
                perimeter += segment_length * t
            else:
                # Submerged portion from intersection to point 2
                dx_sub = dx * (1 - t)
                depth = wse - z2
                area += 0.5 * depth * dx_sub
                perimeter += segment_length * (1 - t)

            top_width += dx_sub

            # Derivatives with respect to depth
            dP_dy += segment_length / abs(dz)
            dT_dy += abs(dx / dz)

        # Case 3: Both above
        # No contribution.

    return area, perimeter, top_width, dP_dy, dT_dy

def _solve_gutter_flow(params: ChannelInput) -> ChannelResult:
    """Solve for gutter flow parameters (Spread or Discharge)."""
    S = params.slope
    n = params.mannings_n
    units = params.units
    W = params.gutter_width
    Sg = params.gutter_cross_slope
    Sx = params.road_cross_slope
    k = 1.0 if units == Units.METRIC else 1.486
    g = 9.81 if units == Units.METRIC else 32.174
    
    solve_for = params.solve_for or SolveFor.SPREAD
    
    final_spread = 0.0
    final_Q = 0.0

    if solve_for == SolveFor.DISCHARGE:
        final_spread = params.spread or 0.0
        final_Q, *_ = _flow_and_geometry_for_gutter(
            final_spread, S, n, W, Sg, Sx, k
        )
    elif solve_for == SolveFor.SPREAD or solve_for == SolveFor.DEPTH:
        # Solve for Spread given Q using bisection
        Q_target = params.discharge
        if Q_target is None or Q_target <= 0:
            raise ValueError("Discharge Q is required to solve for spread.")
        
        lo = 0.0
        hi = max(W, 10.0)
        # Find upper bound
        for _ in range(20):
            q_test, *_ = _flow_and_geometry_for_gutter(hi, S, n, W, Sg, Sx, k)
            if q_test >= Q_target:
                break
            hi *= 2.0
        
        # Bisection
        for _ in range(100):
            mid = (lo + hi) / 2.0
            q_mid, *_ = _flow_and_geometry_for_gutter(mid, S, n, W, Sg, Sx, k)
            if q_mid < Q_target:
                lo = mid
            else:
                hi = mid
        
        final_spread = (lo + hi) / 2.0
        final_Q = Q_target
    else:
        raise ValueError(f"Unsupported solve_for mode for gutter: {solve_for}")

    # Final geometry calculation
    q_total, depth, depression, area, T, P, depth_at_w = _flow_and_geometry_for_gutter(
        final_spread, S, n, W, Sg, Sx, k
    )
    
    velocity = final_Q / area if area > 0 else 0.0
    hydraulic_radius = area / P if P > 0 else 0.0
    
    # Hydraulic Depth D = A / T
    D = area / T if T > 0 else 0.0
    Froude = velocity / math.sqrt(g * D) if D > 0 else 0.0
    
    regime = "Critical"
    if Froude > 1.001:
        regime = "Supercritical"
    elif Froude < 0.999:
        regime = "Subcritical"

    # For gutter flow, we don't typically solve for yc and Sc in the same way 
    # as standard channels, but we can provide placeholders or simplified versions.
    # For now, let's just return 0.0 or adapt if needed.
    # HEC-22 doesn't emphasize yc/Sc for gutters.
    yc = 0.0
    Sc = 0.0

    return ChannelResult(
        depth=depth,
        area=area,
        wetted_perimeter=P,
        hydraulic_radius=hydraulic_radius,
        velocity=velocity,
        froude_number=Froude,
        top_width=T,
        flow_regime=regime,
        critical_depth=yc,
        critical_slope=Sc,
        velocity_head=(velocity * velocity) / (2 * g),
        specific_energy=depth + (velocity * velocity) / (2 * g),
        gutter_depression=depression,
        spread=final_spread,
        discharge=final_Q,
        timestamp=datetime.now().isoformat()
    )

def solve_normal_depth(params: ChannelInput) -> ChannelResult:
    """
    Newton-Raphson solver for normal depth in open channels.
    Based on Manning's Equation: Q = (k/n) * A * R^(2/3) * S^(1/2)
    For Gutter type, can also solve for Spread or Discharge.
    """
    # Gutter-specific logic
    if params.type == ChannelType.GUTTER:
        return _solve_gutter_flow(params)

    channel_type = params.type
    solve_for = params.solve_for or SolveFor.DEPTH
    units = params.units
    points = params.station_elevation_points
    
    b = params.bottom_width
    zL = params.left_side_slope if params.left_side_slope > 0 else params.side_slope
    zR = params.right_side_slope if params.right_side_slope > 0 else params.side_slope
    S = params.slope
    n = params.mannings_n

    # Constants
    k = 1.0 if units == Units.METRIC else 1.49
    g = 9.81 if units == Units.METRIC else 32.174
    sqrt_S = math.sqrt(S)
    kn = k / n

    min_elev = None
    max_elev = None
    if channel_type == ChannelType.IRREGULAR and points:
        min_elev = min(p[1] for p in points)
        max_elev = max(p[1] for p in points)

    final_y = 0.0
    final_Q = 0.0

    if solve_for == SolveFor.DISCHARGE:
        # Solve for Discharge given Depth (or WSE for Irregular)
        if channel_type == ChannelType.IRREGULAR:
            if params.known_wse is None:
                raise ValueError("Known WSE is required to solve for discharge in irregular channels.")
            if min_elev is None:
                raise ValueError("Station-Elevation points are required for irregular channels.")
            final_y = max(0.0, params.known_wse - min_elev)
        else:
            if params.known_depth is None:
                raise ValueError("Known depth is required to solve for discharge.")
            final_y = params.known_depth
        
        # Calculate geometry at final_y
        if channel_type == ChannelType.RECTANGULAR:
            final_A = b * final_y
            final_P = b + 2 * final_y
            T = b
        elif channel_type == ChannelType.TRAPEZOIDAL:
            final_A = b * final_y + 0.5 * (zL + zR) * final_y * final_y
            final_P = b + final_y * math.sqrt(1 + zL * zL) + final_y * math.sqrt(1 + zR * zR)
            T = b + (zL + zR) * final_y
        elif channel_type == ChannelType.TRIANGULAR:
            final_A = 0.5 * (zL + zR) * final_y * final_y
            final_P = final_y * math.sqrt(1 + zL * zL) + final_y * math.sqrt(1 + zR * zR)
            T = (zL + zR) * final_y
        elif channel_type == ChannelType.IRREGULAR:
            final_A, final_P, T, _, _ = calculate_irregular_geometry(final_y, points)
        else:
            raise ValueError(f"Unknown channel type: {channel_type}")

        R = final_A / final_P if final_P > 0 else 0
        
        # Calculate Discharge Q
        final_Q = kn * final_A * math.pow(R, 2/3) * sqrt_S

    else:
        # Solve for Depth given Discharge
        Q = params.discharge
        if Q is None:
            raise ValueError("Discharge Q is required for standard channel types.")
        final_Q = Q
        
        # Solver settings
        y = 1.0  # initial guess
        if channel_type == ChannelType.IRREGULAR and points:
            y = (max_elev - min_elev) * 0.2 if max_elev > min_elev else 1.0
            if y == 0: y = 1.0

        max_iterations = 100
        tolerance = 1e-7

        for i in range(max_iterations):
            dTdy = 0.0 
            
            if channel_type == ChannelType.RECTANGULAR:
                A = b * y
                P = b + 2 * y
                dAdy = b
                dPdy = 2
            elif channel_type == ChannelType.TRAPEZOIDAL:
                A = b * y + 0.5 * (zL + zR) * y * y
                P = b + y * math.sqrt(1 + zL * zL) + y * math.sqrt(1 + zR * zR)
                dAdy = b + (zL + zR) * y
                dPdy = math.sqrt(1 + zL * zL) + math.sqrt(1 + zR * zR)
            elif channel_type == ChannelType.TRIANGULAR:
                A = 0.5 * (zL + zR) * y * y
                P = y * math.sqrt(1 + zL * zL) + y * math.sqrt(1 + zR * zR)
                dAdy = (zL + zR) * y
                dPdy = math.sqrt(1 + zL * zL) + math.sqrt(1 + zR * zR)
            elif channel_type == ChannelType.IRREGULAR:
                A, P, T, dPdy, dTdy = calculate_irregular_geometry(y, points)
                dAdy = T
            else:
                raise ValueError(f"Unknown channel type: {channel_type}")

            if P == 0:
                y = 0.01
                continue

            R = A / P
            f = kn * A * math.pow(R, 2/3) * sqrt_S - Q

            dRdy = (dAdy * P - A * dPdy) / (P * P)
            
            if R <= 0:
                y = 0.01
                continue
                
            dfdy = kn * sqrt_S * (dAdy * math.pow(R, 2/3) + A * (2/3) * math.pow(R, -1/3) * dRdy)

            if abs(dfdy) < 1e-12:
                y += 0.1
                continue

            next_y = y - f / dfdy
            
            if next_y <= 0:
                next_y = y * 0.5

            if abs(next_y - y) < tolerance:
                final_y = next_y
                break
            
            y = next_y
            if y <= 0:
                y = 0.01
        else:
             raise ValueError("Solver failed to converge after 100 iterations.")

        # Recompute geometry at final_y
        if channel_type == ChannelType.RECTANGULAR:
            final_A = b * final_y
            final_P = b + 2 * final_y
            T = b
        elif channel_type == ChannelType.TRAPEZOIDAL:
            final_A = b * final_y + 0.5 * (zL + zR) * final_y * final_y
            final_P = b + final_y * math.sqrt(1 + zL * zL) + final_y * math.sqrt(1 + zR * zR)
            T = b + (zL + zR) * final_y
        elif channel_type == ChannelType.TRIANGULAR:
            final_A = 0.5 * (zL + zR) * final_y * final_y
            final_P = final_y * math.sqrt(1 + zL * zL) + final_y * math.sqrt(1 + zR * zR)
            T = (zL + zR) * final_y
        elif channel_type == ChannelType.IRREGULAR:
            final_A, final_P, T, _, _ = calculate_irregular_geometry(final_y, points)

    # --- Common Calculations (Velocity, Critical Depth, etc.) ---
    final_V = final_Q / final_A if final_A > 0 else 0
    R = final_A / final_P if final_P > 0 else 0
    D = final_A / T if T > 0 else 0
    Froude = final_V / math.sqrt(g * D) if D > 0 else 0
    
    regime = "Critical"
    if Froude > 1.001:
        regime = "Supercritical"
    elif Froude < 0.999:
        regime = "Subcritical"

    # --- Critical Depth (yc) Calculation ---
    yc = 1.0  # initial guess
    if channel_type == ChannelType.RECTANGULAR:
        yc = math.pow(final_Q * final_Q / (g * b * b), 1/3)
    else:
        # Newton-Raphson for yc
        for _ in range(100):
            if channel_type == ChannelType.TRAPEZOIDAL:
                Ac = b * yc + 0.5 * (zL + zR) * yc * yc
                Tc = b + (zL + zR) * yc
                dAdyc = Tc
                dTdyc = zL + zR
            elif channel_type == ChannelType.TRIANGULAR:
                Ac = 0.5 * (zL + zR) * yc * yc
                Tc = (zL + zR) * yc
                dAdyc = Tc
                dTdyc = zL + zR
            elif channel_type == ChannelType.IRREGULAR:
                Ac, _, Tc, _, dTdyc = calculate_irregular_geometry(yc, points)
                dAdyc = Tc
            
            if Ac <= 0:
                yc = 0.01
                continue
                
            f_yc = (final_Q * final_Q * Tc) / (g * math.pow(Ac, 3)) - 1
            
            numerator = (dTdyc * math.pow(Ac, 3) - Tc * 3 * math.pow(Ac, 2) * dAdyc)
            denominator = math.pow(Ac, 6)
            
            if abs(denominator) < 1e-12:
                yc += 0.1
                continue
                
            dfdyc = (final_Q * final_Q / g) * numerator / denominator
            
            if abs(dfdyc) < 1e-12:
                yc += 0.1
                continue
            
            next_yc = yc - f_yc / dfdyc
            if abs(next_yc - yc) < 1e-7:
                yc = next_yc
                break
            yc = next_yc
            if yc <= 0: yc = 0.01

    # Critical Slope (Sc)
    if channel_type == ChannelType.RECTANGULAR:
        Ac_final = b * yc
        Pc_final = b + 2 * yc
    elif channel_type == ChannelType.TRAPEZOIDAL:
        Ac_final = b * yc + 0.5 * (zL + zR) * yc * yc
        Pc_final = b + yc * math.sqrt(1 + zL * zL) + yc * math.sqrt(1 + zR * zR)
    elif channel_type == ChannelType.TRIANGULAR:
        Ac_final = 0.5 * (zL + zR) * yc * yc
        Pc_final = yc * math.sqrt(1 + zL * zL) + yc * math.sqrt(1 + zR * zR)
    elif channel_type == ChannelType.IRREGULAR:
        Ac_final, Pc_final, _, _, _ = calculate_irregular_geometry(yc, points)
    
    Rc_final = Ac_final / Pc_final if Pc_final > 0 else 0
    if Ac_final > 0 and Rc_final > 0:
        Sc = math.pow(final_Q / (kn * Ac_final * math.pow(Rc_final, 2/3)), 2)
    else:
        Sc = 0.0

    hv = (final_V * final_V) / (2 * g)
    E = final_y + hv

    return ChannelResult(
        depth=final_y,
        water_surface_elevation=(min_elev + final_y) if min_elev is not None else None,
        min_elevation=min_elev,
        max_elevation=max_elev,
        area=final_A,
        wetted_perimeter=final_P,
        hydraulic_radius=R,
        velocity=final_V,
        froude_number=Froude,
        top_width=T,
        flow_regime=regime,
        critical_depth=yc,
        critical_slope=Sc,
        velocity_head=hv,
        specific_energy=E,
        discharge=final_Q,
        timestamp=datetime.now().isoformat()
    )

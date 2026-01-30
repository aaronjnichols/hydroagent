import math
from typing import Tuple
from .schemas import PressurePipeInput, PressurePipeResult, FrictionMethod, PressurePipeSolveFor

def solve_pressure_pipe(params: PressurePipeInput) -> PressurePipeResult:
    # Constants
    g = params.gravity
    gamma = params.specific_weight
    p_to_h = params.psi_to_head if params.psi_to_head is not None else (144.0 / gamma)
    
    # Helper to get current values or defaults for solving
    def get_val(name, default=0.0):
        val = getattr(params, name)
        return val if val is not None else default

    # Initial values
    Q = get_val('discharge')
    D_in = get_val('diameter')
    L = get_val('length')
    P1 = get_val('pressure_1')
    Z1 = get_val('elevation_1')
    P2 = get_val('pressure_2')
    Z2 = get_val('elevation_2')
    rough = get_val('roughness')
    
    method = params.friction_method
    solve_for = params.solve_for

    def calc_geometry(d_in):
        d_ft = d_in / 12.0
        area = (math.pi * d_ft**2) / 4.0
        perimeter = math.pi * d_ft
        radius = d_ft / 4.0
        return d_ft, area, perimeter, radius

    def calc_friction_slope(q, d_in, r_val, method):
        d_ft, area, perimeter, radius = calc_geometry(d_in)
        if area <= 0: return 0.0
        v = q / area
        
        if method == FrictionMethod.MANNING:
            # S = (Q*n / (k * A * R^(2/3)))^2
            if r_val <= 0: return 0.0
            return (q * r_val / (params.k_manning * area * (radius**(2/3))))**2
            
        elif method == FrictionMethod.HAZEN_WILLIAMS:
            # hf = 10.67 * L * Q^1.852 / (C^1.852 * D^4.871)
            # S = hf/L = 10.67 * Q^1.852 / (C^1.852 * D^4.871)
            if r_val <= 0 or d_ft <= 0: return 0.0
            return (10.67 * (q**1.852)) / ((r_val**1.852) * (d_ft**4.871))
            
        elif method == FrictionMethod.KUTTER:
            # Chezy C from Kutter
            # C = (41.65 + 0.00281/S + 1.811/n) / (1 + (41.65 + 0.00281/S) * n / sqrt(R))
            # This is circular because C depends on S. Usually S is assumed or iterated.
            # Simplified: Use a fixed S=0.01 for C calculation if solving for S, or iterate.
            # For now, let's use a simpler Manning-like approximation or fixed iteration.
            n = r_val
            s_guess = 0.01
            for _ in range(5):
                c = (41.65 + 0.00281/s_guess + 1.811/n) / (1 + (41.65 + 0.00281/s_guess) * n / math.sqrt(radius))
                # Q = C * A * sqrt(R * S) => S = (Q / (c * area * math.sqrt(radius)))**2
                s_guess = (q / (c * area * math.sqrt(radius)))**2
            return s_guess

        elif method == FrictionMethod.DARCY_WEISBACH:
            # hf = f * (L/D) * v^2 / 2g => S = f/D * v^2 / 2g
            if d_ft <= 0: return 0.0
            f = calc_darcy_f(q, d_in, params.roughness_height, params.kinematic_viscosity)
            return (f / d_ft) * (v**2 / (2 * g))
            
        return 0.0

    def calc_minor_loss(q, d_in, k_sum):
        _, area, _, _ = calc_geometry(d_in)
        if area <= 0: return 0.0
        v = q / area
        return k_sum * (v**2 / (2 * g))

    def calc_darcy_f(q, d_in, epsilon, nu):
        d_ft, area, _, _ = calc_geometry(d_in)
        if area <= 0 or nu <= 0: return 0.02
        v = q / area
        re = abs(v) * d_ft / nu
        if re < 2000:
            return 64.0 / re if re > 0 else 0.0
        
        # Swamee-Jain for explicit guess or solution
        # f = 0.25 / [log10(epsilon/(3.7*D) + 5.74/Re^0.9)]^2
        term1 = epsilon / (3.7 * d_ft)
        term2 = 5.74 / (re**0.9)
        f = 0.25 / (math.log10(term1 + term2)**2)
        
        # Colebrook-White iteration
        for _ in range(5):
            # 1/sqrt(f) = -2 * log10(epsilon/(3.7*D) + 2.51/(Re*sqrt(f)))
            f = 1.0 / (-2.0 * math.log10(term1 + 2.51 / (re * math.sqrt(f))))**2
        return f

    # Solve for the missing variable
    if solve_for == PressurePipeSolveFor.PRESSURE_1:
        # E1 - E2 = hf_total => (Z1 + P1/gamma + V1^2/2g) - E2 = hf_friction + hm
        # P1 = (hf_friction + hm + E2 - Z1 - V1^2/2g) * gamma
        _, area, _, _ = calc_geometry(D_in)
        v = Q / area
        hv = v**2 / (2 * g)
        s = calc_friction_slope(Q, D_in, rough, method)
        hf = s * L
        hm = calc_minor_loss(Q, D_in, params.minor_loss_coefficient)
        v2 = Q / area # same diameter
        hv2 = v2**2 / (2 * g)
        e2 = Z2 + (P2 * p_to_h) + hv2
        P1 = (hf + hm + e2 - Z1 - hv) / p_to_h
        
    elif solve_for == PressurePipeSolveFor.PRESSURE_2:
        # E1 - E2 = hf_total => P2 = (E1 - hf_friction - hm - Z2 - V2^2/2g) * gamma
        _, area, _, _ = calc_geometry(D_in)
        v = Q / area
        hv = v**2 / (2 * g)
        s = calc_friction_slope(Q, D_in, rough, method)
        hf = s * L
        hm = calc_minor_loss(Q, D_in, params.minor_loss_coefficient)
        e1 = Z1 + (P1 * p_to_h) + hv
        P2 = (e1 - hf - hm - Z2 - hv) / p_to_h

    elif solve_for == PressurePipeSolveFor.ELEVATION_1:
        _, area, _, _ = calc_geometry(D_in)
        v = Q / area
        hv = v**2 / (2 * g)
        s = calc_friction_slope(Q, D_in, rough, method)
        hf = s * L
        hm = calc_minor_loss(Q, D_in, params.minor_loss_coefficient)
        e2 = Z2 + (P2 * p_to_h) + hv
        Z1 = hf + hm + e2 - (P1 * p_to_h) - hv

    elif solve_for == PressurePipeSolveFor.ELEVATION_2:
        _, area, _, _ = calc_geometry(D_in)
        v = Q / area
        hv = v**2 / (2 * g)
        s = calc_friction_slope(Q, D_in, rough, method)
        hf = s * L
        hm = calc_minor_loss(Q, D_in, params.minor_loss_coefficient)
        e1 = Z1 + (P1 * p_to_h) + hv
        Z2 = e1 - hf - hm - (P2 * p_to_h) - hv

    elif solve_for == PressurePipeSolveFor.LENGTH:
        # hf_total = E1 - E2
        # hf_friction = hf_total - hm
        # L = hf_friction / S
        _, area, _, _ = calc_geometry(D_in)
        v = Q / area
        hv = v**2 / (2 * g)
        e1 = Z1 + (P1 * p_to_h) + hv
        e2 = Z2 + (P2 * p_to_h) + hv
        hf_total = e1 - e2
        hm = calc_minor_loss(Q, D_in, params.minor_loss_coefficient)
        hf_friction = hf_total - hm
        s = calc_friction_slope(Q, D_in, rough, method)
        L = hf_friction / s if s > 0 else 0.0

    elif solve_for in [PressurePipeSolveFor.DISCHARGE, PressurePipeSolveFor.DIAMETER, PressurePipeSolveFor.ROUGHNESS]:
        # Need to match hf_total = E1 - E2
        def objective(val):
            q_test = val if solve_for == PressurePipeSolveFor.DISCHARGE else Q
            d_test = val if solve_for == PressurePipeSolveFor.DIAMETER else D_in
            r_test = val if solve_for == PressurePipeSolveFor.ROUGHNESS else rough
            
            _, area_test, _, _ = calc_geometry(d_test)
            v_test = q_test / area_test if area_test > 0 else 0
            hv_test = v_test**2 / (2 * g)
            
            e1_test = Z1 + (P1 * p_to_h) + hv_test
            e2_test = Z2 + (P2 * p_to_h) + hv_test
            hf_energy_test = e1_test - e2_test
            
            s = calc_friction_slope(q_test, d_test, r_test, method)
            hm = calc_minor_loss(q_test, d_test, params.minor_loss_coefficient)
            return (s * L + hm) - hf_energy_test

        # Bisection
        low, high = 0.0001, 10000.0
        if solve_for == PressurePipeSolveFor.DIAMETER: high = 1000.0
        if solve_for == PressurePipeSolveFor.ROUGHNESS and method == FrictionMethod.MANNING: high = 0.5
        
        # Check if high is enough
        if objective(high) < 0 and solve_for != PressurePipeSolveFor.DIAMETER: # Diameter is inverse
             high *= 10
             
        for _ in range(100):
            mid = (low + high) / 2.0
            res = objective(mid)
            
            # For diameter, increasing diameter decreases headloss
            if solve_for == PressurePipeSolveFor.DIAMETER:
                if res > 0: low = mid
                else: high = mid
            else:
                if res < 0: low = mid
                else: high = mid
            
            if abs(high - low) < 1e-9:
                break
        
        solved_val = (low + high) / 2.0
        if solve_for == PressurePipeSolveFor.DISCHARGE: Q = solved_val
        elif solve_for == PressurePipeSolveFor.DIAMETER: D_in = solved_val
        else: rough = solved_val

    # Final calculations
    d_ft, area, perimeter, radius = calc_geometry(D_in)
    v = Q / area if area > 0 else 0.0
    hv = v**2 / (2 * g)
    e1 = Z1 + (P1 * p_to_h) + hv
    e2 = Z2 + (P2 * p_to_h) + hv
    
    # hf is friction headloss
    s_friction = calc_friction_slope(Q, D_in, rough, method)
    hf_friction = s_friction * L
    hm = calc_minor_loss(Q, D_in, params.minor_loss_coefficient)
    hf_total = hf_friction + hm
    
    hgl1 = Z1 + (P1 * p_to_h)
    hgl2 = Z2 + (P2 * p_to_h)

    f_factor = None
    re_number = None
    if method == FrictionMethod.DARCY_WEISBACH:
        f_factor = calc_darcy_f(Q, D_in, params.roughness_height, params.kinematic_viscosity)
        re_number = abs(v) * d_ft / params.kinematic_viscosity if params.kinematic_viscosity > 0 else 0

    return PressurePipeResult(
        discharge=Q,
        diameter=D_in,
        length=L,
        pressure_1=P1,
        elevation_1=Z1,
        pressure_2=P2,
        elevation_2=Z2,
        roughness=rough,
        headloss=hf_total,
        energy_grade_1=e1,
        energy_grade_2=e2,
        hydraulic_grade_1=hgl1,
        hydraulic_grade_2=hgl2,
        area=area,
        wetted_perimeter=perimeter,
        velocity=v,
        velocity_head=hv,
        friction_slope=s_friction,
        friction_factor=f_factor,
        reynolds_number=re_number
    )

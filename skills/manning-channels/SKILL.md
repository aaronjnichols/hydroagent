# Skill: Manning's Equation - Open Channel Calculations

## Purpose
Calculate normal depth, velocity, and flow properties for open channels (Rectangular, Trapezoidal, Triangular) using Manning's equation. This skill is optimized for hydrologic/hydraulic engineering tasks performed by AI agents.

## Capabilities
- Solve for normal depth ($y_n$) using Newton-Raphson iteration.
- Calculate hydraulic properties: Area ($A$), Velocity ($V$), Top Width ($T$), Wetted Perimeter ($P$), Hydraulic Radius ($R$).
- Determine flow regime (Subcritical, Critical, Supercritical) based on Froude number ($Fr$).
- Support for both Metric (SI) and Imperial (US) unit systems.
- Save and load projects containing multiple channel scenarios.
- **UI Support:** Save and load projects directly in the web interface using the "Save Project" and "Load Project" buttons in the sidebar.
- Export results to Markdown, CSV, and plain text for reporting.

## Usage Guide

### 1. Direct Python Integration
Agents can import and use the core solver directly:

```python
from hydro_agent.core.manning.channels import solve_normal_depth
from hydro_agent.core.manning.schemas import ChannelInput, ChannelType, Units

# Configure input
params = ChannelInput(
    type=ChannelType.TRAPEZOIDAL,
    discharge=10.0,      # Q (m3/s)
    bottom_width=5.0,    # b (m)
    side_slope=2.0,      # z (H:V)
    slope=0.001,         # S (m/m)
    mannings_n=0.013,    # n
    units=Units.METRIC
)

# Solve
result = solve_normal_depth(params)

# Access results
print(f"Normal Depth: {result.depth:.4f} m")
print(f"Flow Regime: {result.flow_regime}")
```

### 2. Project Management (Save/Load)
Agents can group multiple scenarios into a project and persist them to disk:

```python
from hydro_agent.projects.models import Project, Scenario
from hydro_agent.core.manning.channels import solve_normal_depth
from hydro_agent.core.manning.schemas import ChannelInput, ChannelType, Units

# 1. Create a project
project = Project(name="Main Canal Design")

# 2. Add a scenario
input_params = ChannelInput(type=ChannelType.TRAPEZOIDAL, discharge=15.0, bottom_width=4.0, side_slope=1.5, slope=0.0005, mannings_n=0.015)
result = solve_normal_depth(input_params)

scenario = Scenario(
    id="canal-01",
    title="Primary Reach",
    inputs=input_params.model_dump(),
    results=result.model_dump(),
    notes="Initial design for the primary reach."
)
project.scenarios.append(scenario)

# 3. Save to file
project.save_to_file("my_project.json")

# 4. Load from file
loaded_project = Project.load_from_file("my_project.json")
print(f"Loaded Project: {loaded_project.name}")
```

### 3. REST API Usage
If the Hydro Agent application is running, agents can use the API:

- **Endpoint:** `POST /api/manning/channels/solve`
- **Payload:** `ChannelInput` schema
- **Response:** `ChannelResult` schema

### 3. Export for Human Reports
To generate report-ready text for a user:

```python
from hydro_agent.export.formatters import to_markdown
# result and params from above
markdown_report = to_markdown(params, result)
```

## Schemas

### Input Schema (ChannelInput)
| Field | Type | Description |
|-------|------|-------------|
| `type` | `ChannelType` | `rectangular`, `trapezoidal`, `triangular` |
| `discharge` | `float` | $Q$ in m³/s or ft³/s |
| `bottom_width` | `float` | $b$ in m or ft (ignore for triangular) |
| `side_slope` | `float` | $z$ (H:V) (ignore for rectangular) |
| `slope` | `float` | $S$ in m/m |
| `mannings_n` | `float` | $n$ coefficient |
| `units` | `Units` | `metric` or `imperial` |

### Result Schema (ChannelResult)
| Field | Type | Description |
|-------|------|-------------|
| `depth` | `float` | Normal depth $y_n$ |
| `velocity` | `float` | Average velocity $V$ |
| `flow_regime` | `str` | `Subcritical`, `Critical`, `Supercritical` |
| `froude_number` | `float` | Froude Number $Fr$ |

## Best Practices for Agents
1. **Validation:** Always check that $Q, S, n$ are positive before solving.
2. **Unit Consistency:** Ensure all length inputs match the selected `units` system.
3. **Regime Analysis:** When $Fr \approx 1$, the flow is near-critical and may be unstable; warn the user.
4. **Exporting:** Prefer Markdown for AI-to-Human communication as it renders nicely in chat and documents.

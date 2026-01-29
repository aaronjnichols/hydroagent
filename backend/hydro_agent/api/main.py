from fastapi import FastAPI, APIRouter, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from ..core.manning.channels import solve_normal_depth
from ..core.manning.schemas import ChannelInput, ChannelResult
from ..export.formatters import to_markdown, to_csv, to_plain_text
from ..core.curb_inlets.on_grade import solve_curb_inlet_on_grade
from ..core.curb_inlets.schemas import CurbInletOnGradeInput, CurbInletOnGradeResult
from ..projects.models import Project, Scenario

app = FastAPI(
    title="Hydro Agent API",
    description="API for hydrologic/hydraulic tools",
    version="0.1.0"
)

# Enable CORS for frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

router = APIRouter(prefix="/api")

@router.get("/health")
async def health_check():
    return {"status": "healthy"}

@router.post("/manning/channels/solve", response_model=ChannelResult)
async def solve_channel(params: ChannelInput):
    """
    Solve for normal depth in an open channel using Manning's Equation.
    """
    try:
        result = solve_normal_depth(params)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/manning/channels/export")
async def export_channel(params: ChannelInput, format: str = "markdown"):
    """
    Export channel calculation in various formats.
    """
    try:
        result = solve_normal_depth(params)
        if format == "markdown":
            return {"content": to_markdown(params, result)}
        elif format == "csv":
            return {"content": to_csv(params, result)}
        elif format == "text":
            return {"content": to_plain_text(params, result)}
        else:
            raise HTTPException(status_code=400, detail="Invalid format")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/curb-inlets/on-grade/solve", response_model=CurbInletOnGradeResult)
async def solve_curb_inlet_on_grade_endpoint(params: CurbInletOnGradeInput):
    """
    Solve curb opening inlet (on-grade) interception using HEC-22 methodology.
    """
    try:
        result = solve_curb_inlet_on_grade(params)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/projects/validate", response_model=Project)
async def validate_project(project: Project):
    """
    Validate a project JSON structure.
    """
    return project

app.include_router(router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)

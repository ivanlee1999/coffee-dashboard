"""
FastAPI application for the Coffee Brew Dashboard.

Endpoints:
    POST /api/brews       – upload brew data + xlsx, get analysis
    GET  /api/brews       – list all saved brews (summary)
    GET  /api/brews/{id}  – full detail for one brew
    GET  /api/healthz     – health check
"""

import json
from datetime import datetime, timezone
from zipfile import BadZipFile

from fastapi import Depends, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from openpyxl.utils.exceptions import InvalidFileException
from sqlalchemy.orm import Session

from analysis import analyze_brew
from models import Brew, get_db, init_db
from parser import parse_brew_xlsx

app = FastAPI(title="Coffee Brew Dashboard API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


@app.on_event("startup")
def on_startup():
    init_db()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _ensure_utc(dt: datetime | None) -> str | None:
    """Return an ISO 8601 string with a trailing 'Z' for any datetime.

    Handles both timezone-aware (``+00:00`` → ``Z``) and naive datetimes
    (assumed UTC, as produced by ``datetime.utcnow`` and SQLite).
    """
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat().replace("+00:00", "Z")


def _serialize_brew_summary(brew: Brew) -> dict:
    return {
        "id": brew.id,
        "date": _ensure_utc(brew.created_at),
        "bean_name": brew.bean_name,
        "roast_level": brew.roast_level,
        "grinder_brand": brew.grinder_brand,
        "grinder_setting": brew.grinder_setting,
        "dose_weight": brew.dose_weight,
        "target_yield": brew.target_yield,
        "actual_yield": brew.actual_yield,
        "total_time_s": brew.total_time_s,
        "taste_tags": json.loads(brew.taste_tags),
        "taste_notes": brew.taste_notes,
        "score": brew.score,
    }


def _serialize_brew_detail(brew: Brew) -> dict:
    analysis = json.loads(brew.analysis_json)
    return {
        "brew": _serialize_brew_summary(brew),
        "series": json.loads(brew.raw_points_json),
        "phases": json.loads(brew.phases_json),
        "events": json.loads(brew.events_json),
        "stats": analysis.get("stats", {}),
        "issues": analysis.get("issues", []),
        "suggestions": analysis.get("suggestions", []),
        "grinder_suggestion": analysis.get("grinder_suggestion", ""),
        "score": brew.score,
    }


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/api/healthz")
def healthz():
    return {"status": "ok"}


@app.post("/api/brews")
async def create_brew(
    bean_name: str = Form(...),
    roast_level: str = Form(...),
    grinder_brand: str = Form(...),
    grinder_setting: float = Form(...),
    dose_weight: float = Form(...),
    target_yield: float = Form(...),
    taste_tags: str = Form("[]"),
    taste_notes: str = Form(""),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    # Validate file
    if not file.filename or not file.filename.lower().endswith(".xlsx"):
        raise HTTPException(status_code=400, detail="Only .xlsx files are accepted.")

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large (max 10 MB).")

    # Parse taste tags
    try:
        tags = json.loads(taste_tags)
        if not isinstance(tags, list):
            tags = []
    except json.JSONDecodeError:
        tags = [t.strip() for t in taste_tags.split(",") if t.strip()]

    # Parse xlsx
    try:
        parsed = parse_brew_xlsx(contents)
    except (ValueError, BadZipFile, InvalidFileException) as exc:
        raise HTTPException(status_code=400, detail=f"Invalid file: {exc}")

    # Run analysis
    analysis = analyze_brew(
        parsed["points"],
        parsed["phases"],
        dose_weight=dose_weight,
        target_yield=target_yield,
        taste_tags=tags,
    )

    # Persist
    brew = Brew(
        created_at=datetime.now(timezone.utc),
        bean_name=bean_name,
        roast_level=roast_level,
        grinder_brand=grinder_brand,
        grinder_setting=grinder_setting,
        dose_weight=dose_weight,
        target_yield=target_yield,
        actual_yield=analysis["stats"]["total_yield"],
        total_time_s=analysis["stats"]["total_time_s"],
        taste_tags=json.dumps(tags),
        taste_notes=taste_notes,
        score=analysis["score"],
        raw_points_json=json.dumps(parsed["series"]),
        phases_json=json.dumps(parsed["phases"]),
        events_json=json.dumps(parsed["events"]),
        analysis_json=json.dumps(analysis),
    )
    db.add(brew)
    db.commit()
    db.refresh(brew)

    return _serialize_brew_detail(brew)


@app.get("/api/brews")
def list_brews(db: Session = Depends(get_db)):
    brews = db.query(Brew).order_by(Brew.created_at.desc()).all()
    return [_serialize_brew_summary(b) for b in brews]


@app.get("/api/brews/{brew_id}")
def get_brew(brew_id: int, db: Session = Depends(get_db)):
    brew = db.query(Brew).filter(Brew.id == brew_id).first()
    if not brew:
        raise HTTPException(status_code=404, detail="Brew not found.")
    return _serialize_brew_detail(brew)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8095, reload=True)

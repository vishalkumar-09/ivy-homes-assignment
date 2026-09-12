import os
from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from app.api.router import api_router
from app.core.config import settings

app = FastAPI(
    title="Ivy Homes Property Portal",
    description="Real Estate Intelligence, Exploration & Analytics Platform for Bangalore",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static and Templates
os.makedirs("app/static/css", exist_ok=True)
os.makedirs("app/static/js", exist_ok=True)
os.makedirs("app/templates", exist_ok=True)

app.mount("/static", StaticFiles(directory="app/static"), name="static")
templates = Jinja2Templates(directory="app/templates")

# Include API Router
app.include_router(api_router, prefix="/api")

@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "service": "Ivy Homes Property Portal",
        "city": settings.CITY,
        "assigned_locality": settings.ASSIGNED_LOCALITY
    }

@app.get("/{full_path:path}")
async def serve_spa(request: Request, full_path: str = ""):
    # Do not intercept /api or /static or /health
    if full_path.startswith("api") or full_path.startswith("static") or full_path.startswith("health"):
        return None
    return templates.TemplateResponse(
        request=request,
        name="index.html",
        context={
            "city": settings.CITY,
            "assigned_locality": settings.ASSIGNED_LOCALITY
        }
    )

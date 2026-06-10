from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers.auth import router as auth_router
from app.routers.patrol import router as patrol_router
from app.routers.export import router as export_router

settings = get_settings()

app = FastAPI(
    title="QC Patrol Record API",
    description="API for QCパトロール記録（組立工程）— TQD-002付表",
    version="1.0.0",
)

_cors_origins = [settings.FRONTEND_ORIGIN]

# Support comma-separated FRONTEND_ORIGINS for multiple Vercel URLs
if settings.FRONTEND_ORIGINS:
    _cors_origins += [o.strip() for o in settings.FRONTEND_ORIGINS.split(",") if o.strip()]

# In development, always allow local Vite ports
if settings.APP_ENV == "development":
    _cors_origins += [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(set(_cors_origins)),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)

app.include_router(auth_router, prefix="/api")
app.include_router(patrol_router, prefix="/api")
app.include_router(export_router, prefix="/api")


@app.get("/health")
async def health():
    return {"status": "ok"}

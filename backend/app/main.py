import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from app.api.chat import router as chat_router
from app.api.whatsapp import router as whatsapp_router
from app.api.sms import router as sms_router
from app.api.complaints import router as complaints_router
from app.api.regions import router as regions_router
from app.api.audit import router as audit_router
from app.api.roads import router as roads_router
from app.api.contractors import router as contractors_router
from app.api.projects import router as projects_router
from app.api.conflicts import router as conflicts_router
from app.api.exchange import router as exchange_router
from app.api.translate import router as translate_router
from app.api.global_search import router as global_search_router
from app.api.demo import router as demo_router
from app.api.data_validation import router as data_validation_router
from app.api.data_quality import router as data_quality_router
from app.api.public import router as public_router
from app.api.procurement import router as procurement_router
from app.api.budget import router as budget_router
from app.services.sla_service import SlaService
from app.services.audit_context import set_audit_user


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Start SLA background monitor on startup, stop on shutdown."""
    # Startup
    sla_task = asyncio.create_task(SlaService.start_background_monitor())
    yield
    # Shutdown
    SlaService.stop_background_monitor()
    sla_task.cancel()
    try:
        await sla_task
    except asyncio.CancelledError:
        pass


app = FastAPI(
    title="ROADWATCH API",
    description="Backend services for ROADWATCH accountability platform",
    version="1.0.0",
    lifespan=lifespan,
)

# Enable CORS for Next.js dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins in development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Audit user context middleware ──────────────────────────────────────
@app.middleware("http")
async def audit_user_middleware(request: Request, call_next):
    """Set the audit user from the X-User-Id header (default: 'api')."""
    user = request.headers.get("X-User-Id", "api")
    set_audit_user(user)
    response = await call_next(request)
    return response


# Include v1 API routes
app.include_router(chat_router, prefix="/api/v1")
app.include_router(whatsapp_router, prefix="/api/v1")
app.include_router(sms_router, prefix="/api/v1")
app.include_router(complaints_router, prefix="/api/v1")
app.include_router(regions_router, prefix="/api/v1")
app.include_router(audit_router, prefix="/api/v1")
app.include_router(roads_router, prefix="/api/v1")
app.include_router(contractors_router, prefix="/api/v1")
app.include_router(projects_router, prefix="/api/v1")
app.include_router(conflicts_router, prefix="/api/v1")
app.include_router(exchange_router, prefix="/api/v1")
app.include_router(translate_router, prefix="/api/v1")
app.include_router(global_search_router, prefix="/api/v1")
app.include_router(demo_router)
app.include_router(procurement_router, prefix="/api/v1")
app.include_router(budget_router, prefix="/api/v1")
app.include_router(data_validation_router, prefix="/api/v1")
app.include_router(data_quality_router, prefix="/api/v1")
app.include_router(public_router, prefix="/api/v1")


@app.get("/")
async def root():
    return {"message": "ROADWATCH Backend Services API is active."}
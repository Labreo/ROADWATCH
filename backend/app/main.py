from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.chat import router as chat_router

app = FastAPI(
    title="ROADWATCH API",
    description="Backend services for ROADWATCH accountability platform",
    version="1.0.0"
)

# Enable CORS for Next.js dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins in development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include v1 API routes
app.include_router(chat_router, prefix="/api/v1")

@app.get("/")
async def root():
    return {"message": "ROADWATCH Backend Services API is active."}

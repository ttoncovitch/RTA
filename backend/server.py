"""
Minimal FastAPI server for health checks.
This is a frontend-only Firebase application - this server just satisfies deployment requirements.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="RTA Health Check Server")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"status": "ok", "message": "RTA Backend Health Check"}

@app.get("/api/health")
def health_check():
    return {"status": "healthy", "service": "rta-backend"}

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router as api_router
from app.core.config import settings
from app.db import SessionLocal, init_db
from app.services.practice_directory import seed_practices
from app.web.routes import router as web_router


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    if settings.seed_demo_data:
        db = SessionLocal()
        try:
            seed_practices(db)
        finally:
            db.close()
    yield


app = FastAPI(title="Dental Ops Platform", version="0.2.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(api_router)
app.include_router(web_router)

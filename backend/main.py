from fastapi import FastAPI
from database import Base, engine
from app.patient_routes import router as patient_router
from app.doctor_routes import router as doctor_router
from app.lab_routes import router as lab_router
from app.user_routes import router as user_router
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import websockets.client
import seed_db
from contextlib import asynccontextmanager

async def connect_websocket():
     await websockets.client.connect("http://127.0.0.1:8000")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # ✅ Startup code
    print("Running startup tasks...")
    seed_db.seed()

    yield  # ⏸ Application runs while waiting here

    # ⛔ Optional: Shutdown code
    print("Shutting down...")


app = FastAPI(lifespan=lifespan)

# Create all tables in the database
Base.metadata.create_all(bind=engine)



# Include routers with the prefix for each role
app.include_router(user_router, prefix="/users", tags=["users"])
app.include_router(patient_router, prefix="/patients", tags=["patients"])
app.include_router(doctor_router, prefix="/doctors", tags=["doctors"])
app.include_router(lab_router, prefix="/labs", tags=["labs"])

# Static file handling for uploads
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Enable CORS for all origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

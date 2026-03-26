from fastapi import FastAPI, APIRouter
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import socketio
import os
import logging
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Create Socket.IO server
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins='*',
    logger=True,
    engineio_logger=False
)

# Create the main FastAPI app
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Import and include auth routes
from routes.auth import router as auth_router
from routes.auth_multiple import router as auth_multiple_router
from routes.admin import router as admin_router
from routes.payments import router as payments_router
from routes.reports import router as reports_router
api_router.include_router(auth_router)
api_router.include_router(auth_multiple_router)
api_router.include_router(admin_router)
api_router.include_router(payments_router)
api_router.include_router(reports_router)

# Basic route
@api_router.get("/")
async def root():
    return {"message": "🦝 Raccoon App API - Real-time matching platform"}

# Include the router in the main app
app.include_router(api_router)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Register Socket.IO handlers
@app.on_event("startup")
async def startup_event():
    # Initialize database with indexes and seed data
    from services.db_init_service import initialize_database
    await initialize_database()
    logger.info("Database initialized")
    
    # Register socket handlers
    from websocket.socket_handlers import register_socket_handlers
    await register_socket_handlers(sio)
    logger.info("Socket.IO handlers registered")

# Shutdown handler
@app.on_event("shutdown")
async def shutdown():
    from services.db_service import DatabaseService
    await DatabaseService.close_db()
    logger.info("Application shutdown complete")

# Combine FastAPI and Socket.IO
socket_app = socketio.ASGIApp(
    sio,
    other_asgi_app=app,
    socketio_path='/api/socket.io'
)

# Export socket_app as app for uvicorn
app = socket_app

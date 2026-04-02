from fastapi import FastAPI, APIRouter, Request
from fastapi.responses import Response
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
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

# COOP Middleware for Firebase Auth popup support
class COOPMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        # Allow popups to communicate with opener (required for Firebase Google Auth)
        response.headers["Cross-Origin-Opener-Policy"] = "same-origin-allow-popups"
        response.headers["Cross-Origin-Embedder-Policy"] = "unsafe-none"
        return response

# Add COOP middleware first
app.add_middleware(COOPMiddleware)

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Import and include auth routes
from routes.auth import router as auth_router
from routes.auth_multiple import router as auth_multiple_router
from routes.admin import router as admin_router
from routes.payments import router as payments_router
from routes.reports import router as reports_router
from routes.stats import router as stats_router
api_router.include_router(auth_router)
api_router.include_router(auth_multiple_router)
api_router.include_router(admin_router)
api_router.include_router(payments_router)
api_router.include_router(reports_router)
api_router.include_router(stats_router)

# Basic route
@api_router.get("/")
async def root():
    return {"message": "🦝 Raccoon App API - Real-time matching platform"}

# Health check endpoint
@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "service": "raccoon-api"}

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
    import asyncio
    
    # Create database indexes with timeout (non-blocking)
    try:
        from services.db_service import DatabaseService
        await asyncio.wait_for(DatabaseService.create_indexes(), timeout=10.0)
        logger.info("Database indexes created")
    except asyncio.TimeoutError:
        logger.warning("Database index creation timed out - continuing without indexes")
    except Exception as e:
        logger.warning(f"Database index creation failed: {e} - continuing without indexes")
    
    # Initialize database with timeout (non-blocking)
    try:
        from services.db_init_service import initialize_database
        await asyncio.wait_for(initialize_database(), timeout=15.0)
        logger.info("Database initialized")
    except asyncio.TimeoutError:
        logger.warning("Database initialization timed out - continuing without full init")
    except Exception as e:
        logger.warning(f"Database initialization failed: {e} - continuing")
    
    # Register socket handlers (critical - must succeed)
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

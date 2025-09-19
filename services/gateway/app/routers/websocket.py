"""WebSocket router for real-time updates"""

import json
import logging
from typing import Dict, Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import redis.asyncio as aioredis

from app.core.config import settings

router = APIRouter()
logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manage WebSocket connections"""

    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, client_id: str):
        """Accept and store connection"""
        await websocket.accept()
        self.active_connections[client_id] = websocket
        logger.info(f"WebSocket connected: {client_id}")

    def disconnect(self, client_id: str):
        """Remove connection"""
        if client_id in self.active_connections:
            del self.active_connections[client_id]
            logger.info(f"WebSocket disconnected: {client_id}")

    async def send_message(self, client_id: str, message: Dict[str, Any]):
        """Send message to specific client"""
        if client_id in self.active_connections:
            websocket = self.active_connections[client_id]
            await websocket.send_json(message)

    async def broadcast(self, message: Dict[str, Any]):
        """Broadcast message to all connections"""
        for client_id, websocket in self.active_connections.items():
            try:
                await websocket.send_json(message)
            except Exception as e:
                logger.error(f"Error broadcasting to {client_id}: {e}")


# Global connection manager
manager = ConnectionManager()


@router.websocket("/population/{population_id}")
async def population_progress(websocket: WebSocket, population_id: str):
    """WebSocket endpoint for population generation progress"""
    client_id = f"population_{population_id}_{id(websocket)}"

    try:
        # Accept connection
        await manager.connect(websocket, client_id)

        # Connect to Redis
        redis_client = await aioredis.from_url(settings.REDIS_URL, decode_responses=True)
        pubsub = redis_client.pubsub()

        # Subscribe to population channels
        channels = [
            f"population:{population_id}:progress",
            f"population:{population_id}:error",
            f"population:{population_id}:complete"
        ]
        await pubsub.subscribe(*channels)

        # Listen for messages
        async for message in pubsub.listen():
            if message['type'] != 'message':
                continue

            try:
                data = json.loads(message['data'])
                channel = message['channel']

                # Determine message type
                if 'progress' in channel:
                    await websocket.send_json({
                        "type": "progress",
                        "data": data
                    })
                elif 'error' in channel:
                    await websocket.send_json({
                        "type": "error",
                        "data": data
                    })
                elif 'complete' in channel:
                    await websocket.send_json({
                        "type": "complete",
                        "data": data
                    })
                    break  # Close connection after completion

            except json.JSONDecodeError:
                logger.error(f"Invalid JSON in message: {message['data']}")
                continue

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected: {client_id}")

    except Exception as e:
        logger.error(f"WebSocket error for {client_id}: {e}")
        await websocket.send_json({
            "type": "error",
            "data": {"error": str(e)}
        })

    finally:
        # Cleanup
        manager.disconnect(client_id)
        if 'pubsub' in locals():
            await pubsub.unsubscribe()
            await pubsub.close()
        if 'redis_client' in locals():
            await redis_client.close()


@router.websocket("/notifications")
async def notifications(websocket: WebSocket):
    """WebSocket endpoint for general notifications"""
    client_id = f"notifications_{id(websocket)}"

    try:
        # Accept connection
        await manager.connect(websocket, client_id)

        # Keep connection alive
        while True:
            # Wait for client messages (for ping/pong)
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")

    except WebSocketDisconnect:
        logger.info(f"Notifications WebSocket disconnected: {client_id}")

    except Exception as e:
        logger.error(f"Notifications WebSocket error: {e}")

    finally:
        manager.disconnect(client_id)
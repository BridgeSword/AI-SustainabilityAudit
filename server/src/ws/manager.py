from fastapi import WebSocket
import json
from ..core.utils import get_logger

logger = get_logger(__name__)


class WSConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    async def disconnect_and_close(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        try:
            await websocket.close()
        except Exception as e:
            logger.warning(f"Failed to close WebSocket: {e}")

    async def send_json_obj(self, json_obj: json, websocket: WebSocket):
        await websocket.send_json(json_obj)

    async def send_text(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

    async def broadcast(self, message: str):
        disconnected_connections = []
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception as e:
                logger.error(f"Failed to send message: {e}")
                disconnected_connections.append(connection)
        
        # Remove disconnected connections
        for connection in disconnected_connections:
            if connection in self.active_connections:
                self.active_connections.remove(connection)

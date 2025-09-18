"""Redis pub/sub utilities for progress tracking"""

import json
import asyncio
from typing import Optional, Dict, Any, Callable
from datetime import datetime

import redis
import aioredis


class RedisPublisher:
    """Synchronous Redis publisher for workers"""
    
    def __init__(self, redis_url: str):
        self.redis_client = redis.from_url(redis_url, decode_responses=True)
    
    def publish_progress(self, population_id: str, progress: int, message: str, 
                        job_id: Optional[str] = None):
        """Publish progress update"""
        data = {
            "population_id": population_id,
            "progress": progress,
            "message": message,
            "timestamp": datetime.utcnow().isoformat()
        }
        if job_id:
            data["job_id"] = job_id
        
        channel = f"population:{population_id}:progress"
        self.redis_client.publish(channel, json.dumps(data))
    
    def publish_error(self, population_id: str, error: str):
        """Publish error message"""
        data = {
            "population_id": population_id,
            "error": error,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        channel = f"population:{population_id}:error"
        self.redis_client.publish(channel, json.dumps(data))
    
    def publish_complete(self, population_id: str, result: Dict[str, Any]):
        """Publish completion message"""
        data = {
            "population_id": population_id,
            "status": "completed",
            "result": result,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        channel = f"population:{population_id}:complete"
        self.redis_client.publish(channel, json.dumps(data))


class AsyncRedisSubscriber:
    """Asynchronous Redis subscriber for WebSocket endpoints"""
    
    def __init__(self, redis_url: str):
        self.redis_url = redis_url
        self.redis = None
        self.pubsub = None
    
    async def connect(self):
        """Connect to Redis"""
        self.redis = await aioredis.from_url(self.redis_url, decode_responses=True)
        self.pubsub = self.redis.pubsub()
    
    async def disconnect(self):
        """Disconnect from Redis"""
        if self.pubsub:
            await self.pubsub.unsubscribe()
            await self.pubsub.close()
        if self.redis:
            await self.redis.close()
    
    async def subscribe_to_population(self, population_id: str, 
                                     callbacks: Dict[str, Callable]):
        """Subscribe to all channels for a population
        
        Args:
            population_id: Population ID to subscribe to
            callbacks: Dict with keys 'on_progress', 'on_error', 'on_complete'
        """
        if not self.pubsub:
            await self.connect()
        
        channels = [
            f"population:{population_id}:progress",
            f"population:{population_id}:error",
            f"population:{population_id}:complete"
        ]
        
        await self.pubsub.subscribe(*channels)
        
        async for message in self.pubsub.listen():
            if message['type'] != 'message':
                continue
            
            try:
                data = json.loads(message['data'])
                channel = message['channel']
                
                if 'progress' in channel and 'on_progress' in callbacks:
                    await callbacks['on_progress'](data)
                elif 'error' in channel and 'on_error' in callbacks:
                    await callbacks['on_error'](data)
                elif 'complete' in channel and 'on_complete' in callbacks:
                    await callbacks['on_complete'](data)
                    break  # Stop listening after completion
                    
            except json.JSONDecodeError:
                continue


def create_progress_callback(redis_publisher: RedisPublisher, 
                           population_id: str, 
                           job_id: Optional[str] = None) -> Callable:
    """Create a progress callback function for Synthea generation
    
    Returns a function that can be passed to generation tasks
    """
    def update_progress(current: int, total: int, message: str = ""):
        progress = int((current / total) * 100) if total > 0 else 0
        if not message:
            message = f"Generating {current}/{total} patients..."
        redis_publisher.publish_progress(population_id, progress, message, job_id)
    
    return update_progress
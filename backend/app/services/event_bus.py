"""
Shared event bus for SSE-based real-time log streaming.
Extracted from whatsapp.py to allow cross-service broadcast without circular imports.
"""
import json
import asyncio
from datetime import datetime
from typing import Any, List


# In-memory queues for streaming logs to EventSource connections
log_listeners: List[asyncio.Queue] = []


async def broadcast_log(log_type: str, message: str, complaint: Any = None):
    """
    Dispatch live logs to all active log streaming listeners.
    """
    timestamp = datetime.now().strftime("%H:%M:%S")
    payload = {
        "timestamp": timestamp,
        "type": log_type,
        "message": message,
        "complaint": complaint,
    }
    for queue in log_listeners:
        await queue.put(payload)


async def event_generator():
    """
    SSE event generator that yields log messages as NDJSON.
    Registers a new queue on call and cleans up on cancellation.
    """
    queue: asyncio.Queue = asyncio.Queue()
    log_listeners.append(queue)
    try:
        # Yield initial connection confirmation
        conn_msg = {
            "timestamp": datetime.now().strftime("%H:%M:%S"),
            "type": "info",
            "message": "Real-time connection to PostGIS operations node established.",
        }
        yield f"data: {json.dumps(conn_msg)}\n\n"

        while True:
            log_data = await queue.get()
            yield f"data: {json.dumps(log_data)}\n\n"
    except asyncio.CancelledError:
        pass
    finally:
        if queue in log_listeners:
            log_listeners.remove(queue)
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
import json
from app.services.retrieval_engine import RetrievalEngine, sessions_memory

router = APIRouter()

class ChatRequest(BaseModel):
    message: str
    session_id: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None

@router.post("/chat")
async def chat_endpoint(request: ChatRequest):
    # Retrieve system prompt, citations, and metadata
    system_prompt, citations, suggested_actions, suggested_prompts, intent = \
        await RetrievalEngine.process_query(
            message=request.message,
            session_id=request.session_id,
            lat=request.latitude,
            lon=request.longitude
        )
        
    # Retrieve chat history for conversational memory
    history = sessions_memory.get(request.session_id, [])
    
    async def event_generator():
        full_response = ""
        # Stream response from retrieval engine
        async for chunk in RetrievalEngine.stream_response(system_prompt, request.message, history):
            full_response += chunk
            yield json.dumps({"type": "content", "content": chunk}) + "\n"
            
        # Update assistant response in conversational memory
        if request.session_id in sessions_memory:
            sessions_memory[request.session_id].append({"role": "assistant", "content": full_response})
            
        # Emit final metadata
        yield json.dumps({
            "type": "metadata",
            "citations": citations,
            "suggested_actions": suggested_actions,
            "suggested_prompts": suggested_prompts,
            "intent": intent
        }) + "\n"
        
    return StreamingResponse(event_generator(), media_type="application/x-ndjson")

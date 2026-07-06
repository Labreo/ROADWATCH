from fastapi import APIRouter, File, UploadFile, Form
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
import json
from datetime import datetime
from app.services.retrieval_engine import RetrievalEngine, sessions_memory
from app.services.vision_pipeline import RoadDamageEvaluator
from app.services.authority_resolver import AuthorityResolver
from app.services.road_retriever import StructuredRoadRetriever
from app.services.database import db

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


@router.post("/chat/analyze-photo")
async def analyze_photo_endpoint(
    image: UploadFile = File(...),
    latitude: float = Form(...),
    longitude: float = Form(...)
):
    """
    Exposes photo analysis endpoint. Decodes the image, runs Concentrate API evaluation,
    resolves responsible authorities & roads, and registers it inside the mock SQLite database.
    Returns a unified validation record mapping to the frontend Complaint state contracts.
    """
    try:
        # Read the uploaded image binary
        image_bytes = await image.read()
        
        # Run vision damage evaluation pipeline
        evaluator = RoadDamageEvaluator()
        analysis = evaluator.evaluate_damage(image_bytes, latitude, longitude)
        
        # Resolve geographic routing (authority and closest road segment)
        authority = AuthorityResolver.resolve_authority_for_coordinates(longitude, latitude)
        road = StructuredRoadRetriever.get_closest_road(longitude, latitude)
        
        assigned_authority_id = authority["id"] if authority else 4 # fallback to PWD
        road_id = road["id"] if road else None
        road_name = road["name"] if road else "Unmapped Segment"
        
        # Format draft details
        category = analysis["defect_type"]
        category_title = category.replace("_", " ").title()
        title = f"Citizen Report: {category_title} on {road_name}"
        
        desc_parts = [
            analysis["description"],
            f"Estimated affected surface area: {analysis['surface_area_sqm']} sqm.",
            f"Estimated volume: {analysis['volume_cum']} cum."
        ]
        if analysis["proximity_accidents"]:
            nearest_acc = analysis["proximity_accidents"][0]
            desc_parts.append(
                f"Note: Located {nearest_acc['distance_meters']}m from a historical {nearest_acc['severity']} severity accident."
            )
        description = " ".join(desc_parts)
        
        # Write to SQLite Database to ensure persistence (without mutation errors)
        geom_wkt = f"POINT({longitude} {latitude})"
        created_at_iso = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
        
        sql = """
        INSERT INTO complaints (title, description, category, geom, status, image_url, assigned_authority_id, road_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        params = (
            title,
            description,
            category,
            geom_wkt,
            "pending",
            f"/uploads/{image.filename}",
            assigned_authority_id,
            road_id,
            created_at_iso,
            created_at_iso
        )
        
        new_id = db.execute(sql, params)
        if new_id is None:
            new_id = 9999 # mock ID fallback
            
        # Structure draft complaint record matching frontend Complaint state contracts
        draft_complaint = {
            "id": new_id,
            "clientTempId": f"RW-AUTO-{new_id}",
            "title": title,
            "description": description,
            "category": category,
            "geometry": {
                "type": "Point",
                "coordinates": [longitude, latitude]
            },
            "status": "pending",
            "assignedAuthorityId": assigned_authority_id,
            "roadId": road_id,
            "createdAt": created_at_iso,
            "imageUrl": f"/uploads/{image.filename}",
            "imagePreview": f"/uploads/{image.filename}"
        }
        
        return {
            "success": True,
            "analysis": {
                "defect_type": analysis["defect_type"],
                "confidence": analysis["confidence"],
                "surface_area_sqm": analysis["surface_area_sqm"],
                "volume_cum": analysis["volume_cum"],
                "description": analysis["description"],
                "proximity_accidents": analysis["proximity_accidents"],
                "simulated_payload": analysis["simulated_payload"]
            },
            "draft_complaint": draft_complaint
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "error": str(e)
        }

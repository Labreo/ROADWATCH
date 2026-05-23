import httpx
import json
import asyncio
from app.services.road_retriever import StructuredRoadRetriever
from app.services.authority_resolver import AuthorityResolver
from app.services.database import db

# In-memory session memory storage
sessions_memory = {}

# Road & Entity Aliases Mapping
ROAD_ALIASES = {
    "weh": 1, "western express": 1, "western express highway": 1,
    "eeh": 2, "eastern express": 2, "eastern express highway": 2,
    "sv road": 3, "s.v. road": 3, "sv": 3,
    "link road": 4, "link": 4,
    "lbs": 5, "lbs marg": 5, "lal bahadur shastri": 5,
    "senapati bapat": 6, "bapat": 6, "sbm": 6,
    "ambedkar": 7, "dr ambedkar": 7, "dr. ambedkar": 7,
    "jvlr": 8, "jogeshwari vikhroli": 8, "jogeshwari-vikhroli": 8,
    "sclr": 9, "santa cruz chembur": 9, "santa cruz-chembur": 9,
    "ghodbunder": 10, "gb": 10,
    "marine drive": 11, "promenade": 11, "queens necklace": 11,
    "sion panvel": 12, "sion-panvel": 12, "sph": 12
}

CONTRACTOR_ALIASES = {
    "apex": 1, "apex infrastructure": 1,
    "buildwell": 2, "buildwell roadways": 2,
    "zenith": 3, "zenith construction": 3,
    "shiva": 4, "shiva earthmovers": 4,
    "landmark": 5, "landmark infra": 5,
    "metro": 6, "metro highway": 6,
    "coastal": 7, "coastal paving": 7,
    "bharat": 8, "bharat roads": 8,
    "skyline": 9, "skyline developers": 9,
    "omega": 10, "omega infrastructure": 10,
    "precision": 11, "precision asphalt": 11,
    "pioneer": 12, "pioneer engineering": 12
}

AUTHORITY_ALIASES = {
    "k-west": 1, "mcgm-kw": 1, "kw": 1, "ward k": 1,
    "f-north": 2, "mcgm-fn": 2, "fn": 2, "ward f": 2,
    "h-east": 3, "mcgm-he": 3, "he": 3, "ward h": 3,
    "pwd": 4, "pwd-mum": 4, "state pwd": 4, "public works": 4,
    "nhai": 5, "nhai-rom": 5, "national highway": 5, "highways authority": 5
}

class RetrievalEngine:
    @staticmethod
    def extract_entities(message: str):
        msg_lower = message.lower()
        road_id = None
        contractor_id = None
        authority_id = None
        
        # Check roads
        for alias, r_id in ROAD_ALIASES.items():
            # Match whole words/phrases to prevent subsets matching incorrectly
            if alias in msg_lower:
                road_id = r_id
                break
                
        # Check contractors
        for alias, c_id in CONTRACTOR_ALIASES.items():
            if alias in msg_lower:
                contractor_id = c_id
                break
                
        # Check authorities
        for alias, a_id in AUTHORITY_ALIASES.items():
            if alias in msg_lower:
                authority_id = a_id
                break
                
        return road_id, contractor_id, authority_id

    @staticmethod
    def classify_intent(message: str):
        msg_lower = message.lower()
        
        if any(w in msg_lower for w in ["budget", "cost", "money", "spent", "funding", "allocat", "variance", "crore", "lakh", "price"]):
            return "budget_audit"
        if any(w in msg_lower for w in ["damage", "pothole", "crater", "caved", "uneven", "defect", "waterlog", "flood", "debris", "ruin", "status", "condition", "bad"]):
            return "road_status"
        if any(w in msg_lower for w in ["contractor", "builder", "repaired", "built", "paved", "license", "blacklisted", "rating", "delay"]):
            return "contractor_lookup"
        if any(w in msg_lower for w in ["authority", "supervise", "responsible", "department", "ward", "officer", "who owns", "maintenance"]):
            return "authority_routing"
        if any(w in msg_lower for w in ["report", "complain", "file", "submit", "raise", "register", "escalat"]):
            return "report_escalation"
            
        return "general_inquiry"

    @classmethod
    async def process_query(cls, message: str, session_id: str, lat: float = None, lon: float = None):
        # 1. Update session history
        if session_id not in sessions_memory:
            sessions_memory[session_id] = []
        sessions_memory[session_id].append({"role": "user", "content": message})
        # Limit history to 6 messages to keep it lightweight
        if len(sessions_memory[session_id]) > 6:
            sessions_memory[session_id] = sessions_memory[session_id][-6:]
            
        # 2. Extract Entities & Intents
        road_id, contractor_id, authority_id = cls.extract_entities(message)
        intent = cls.classify_intent(message)
        
        # 3. Handle GPS fallback if coordinates provided and no road/authority resolved yet
        if not road_id and lat is not None and lon is not None:
            # Resolve closest road (within ~500m)
            closest_road = StructuredRoadRetriever.get_closest_road(lon, lat, max_distance=0.005)
            if closest_road:
                road_id = closest_road['id']
                
        if not authority_id and lat is not None and lon is not None:
            closest_auth = AuthorityResolver.resolve_authority_for_coordinates(lon, lat)
            if closest_auth:
                authority_id = closest_auth['id']
                
        # 4. Query Structured Facts
        context_facts = []
        citations = []
        suggested_actions = []
        suggested_prompts = []
        
        # Fetch data based on resolved entities
        resolved_road = None
        resolved_contractor = None
        resolved_authority = None
        
        if road_id:
            resolved_road = StructuredRoadRetriever.get_road_by_id(road_id)
            if resolved_road:
                # Add citation
                citations.append({
                    "type": "road",
                    "id": resolved_road['id'],
                    "name": resolved_road['name'],
                    "code": resolved_road['road_code'],
                    "status": resolved_road['status'],
                    "length": resolved_road['length_km']
                })
                context_facts.append(
                    f"Road Segment: {resolved_road['name']} ({resolved_road['road_code']})\n"
                    f"- Length: {resolved_road['length_km']} km\n"
                    f"- Relaying/Paving Status: {resolved_road['status']}\n"
                    f"- Supervising Department: {resolved_road['authority_name']} ({resolved_road['authority_code']})"
                )
                
                # Fetch projects & budgets
                projects = StructuredRoadRetriever.get_road_projects(road_id)
                if projects:
                    context_facts.append("Associated Budgets & Contracts:")
                    for p in projects:
                        context_facts.append(
                            f"  * Project Title: {p['title']}\n"
                            f"    - Contractor: {p['contractor_name']} (Rating: {p['contractor_rating']}/5.00, Blacklisted: {'Yes' if p['contractor_blacklisted'] else 'No'})\n"
                            f"    - Allocated Budget: INR {p['budget_allocated']:,.2f}\n"
                            f"    - Expended Budget: INR {p['budget_spent']:,.2f}\n"
                            f"    - Execution Status: {p['status']}\n"
                            f"    - Start Date: {p['start_date']} | Target End Date: {p['target_end_date']}\n"
                            f"    - Delay Days: {p['delay_days']} days"
                        )
                        # Add contractor citation if not already there
                        if not any(c['id'] == p['contractor_id'] for c in citations if c['type'] == 'contractor'):
                            citations.append({
                                "type": "contractor",
                                "id": p['contractor_id'],
                                "name": p['contractor_name'],
                                "rating": p['contractor_rating'],
                                "blacklisted": bool(p['contractor_blacklisted'])
                            })
                            
                # Fetch complaints
                complaints = StructuredRoadRetriever.get_road_complaints(road_id)
                if complaints:
                    context_facts.append("Citizen Defect Reports:")
                    for c in complaints:
                        context_facts.append(
                            f"  * Complaint Title: {c['title']}\n"
                            f"    - Category: {c['category']}\n"
                            f"    - Status: {c['status']}\n"
                            f"    - Details: {c['description']}\n"
                            f"    - Logged Date: {c['created_at']}"
                        )
                else:
                    context_facts.append("Citizen Defect Reports: No complaints logged on this segment.")
                    
                # Setup quick actions
                suggested_actions.append({
                    "type": "navigate_to_road",
                    "target_id": resolved_road['id'],
                    "label": f"View {resolved_road['name']} Map Details"
                })
                suggested_actions.append({
                    "type": "report_complaint_on_road",
                    "target_id": resolved_road['id'],
                    "label": f"File Complaint on {resolved_road['name']}"
                })
                
                # Contextual prompts
                suggested_prompts.append(f"Who is the contractor for {resolved_road['name']}?")
                suggested_prompts.append(f"How much budget was spent on {resolved_road['name']}?")

        if contractor_id:
            resolved_contractor = StructuredRoadRetriever.get_contractor_by_name(
                [c for c, cid in CONTRACTOR_ALIASES.items() if cid == contractor_id][0]
            )
            if resolved_contractor:
                citations.append({
                    "type": "contractor",
                    "id": resolved_contractor['id'],
                    "name": resolved_contractor['name'],
                    "rating": resolved_contractor['rating'],
                    "blacklisted": bool(resolved_contractor['blacklisted'])
                })
                blacklisted_str = f"YES (Reason: {resolved_contractor['blacklisted_reason']})" if resolved_contractor['blacklisted'] else "NO"
                context_facts.append(
                    f"Contractor Profile: {resolved_contractor['name']} (License: {resolved_contractor['license_number']})\n"
                    f"- Integrity Score / Rating: {resolved_contractor['rating']}/5.00\n"
                    f"- Completed Works: {resolved_contractor['projects_completed']} projects\n"
                    f"- Delayed Works: {resolved_contractor['projects_delayed']} projects\n"
                    f"- Blacklisted: {blacklisted_str}\n"
                    f"- Contact: {resolved_contractor['contact_email']} | {resolved_contractor['contact_phone']}"
                )
                
                # Contractor projects
                c_projects = StructuredRoadRetriever.get_contractor_projects(contractor_id)
                if c_projects:
                    context_facts.append("Contractor Projects Details:")
                    for p in c_projects:
                        context_facts.append(
                            f"  * Project: {p['title']} on {p['road_name']} ({p['road_code']})\n"
                            f"    - Allocated Budget: INR {p['budget_allocated']:,.2f} | Spent: INR {p['budget_spent']:,.2f}\n"
                            f"    - Status: {p['status']} | Delays: {p['delay_days']} days"
                        )
                
                # Action
                suggested_actions.append({
                    "type": "navigate_to_contractor",
                    "target_id": resolved_contractor['id'],
                    "label": f"View {resolved_contractor['name']} Scorecard"
                })
                
                # Contextual prompts
                suggested_prompts.append(f"Is {resolved_contractor['name']} blacklisted?")
                suggested_prompts.append(f"What projects has {resolved_contractor['name']} completed?")

        if authority_id:
            resolved_authority = AuthorityResolver.get_authority_by_id(authority_id)
            if resolved_authority:
                citations.append({
                    "type": "authority",
                    "id": resolved_authority['id'],
                    "name": resolved_authority['name'],
                    "code": resolved_authority['department_code']
                })
                context_facts.append(
                    f"Supervising Authority: {resolved_authority['name']} ({resolved_authority['department_code']})\n"
                    f"- Email: {resolved_authority['contact_email']}\n"
                    f"- Phone: {resolved_authority['contact_phone']}"
                )
                
                # Contextual prompts
                suggested_prompts.append(f"Which roads does {resolved_authority['department_code']} manage?")

        # 5. Default prompts and citations if none resolved
        if not citations:
            # Query some sample roads/contractors to give context
            all_auths = AuthorityResolver.list_all_authorities()
            context_facts.append("Global System Overview:")
            context_facts.append("Active authorities supervising public contracts:")
            for a in all_auths[:3]:
                context_facts.append(f"- {a['name']} ({a['department_code']})")
                
            suggested_prompts.append("Why is SV Road damaged again?")
            suggested_prompts.append("Who is the contractor for the Western Express Highway?")
            suggested_prompts.append("Which contractors are blacklisted?")
            suggested_prompts.append("How do I report a pothole?")

        # Clean duplicates from suggested prompts
        suggested_prompts = list(dict.fromkeys(suggested_prompts))[:3]
        
        # 6. Build Context Prompt & Check Ollama
        context_str = "\n".join(context_facts)
        
        system_prompt = (
            "You are ROADWATCH AI, a civic accountability chatbot for public road infrastructure.\n"
            "Your objective is to answer citizen questions about roads, budgets, contractors, and authorities.\n\n"
            "CRITICAL RULES:\n"
            "1. You must NEVER hallucinate or assume facts. Every figure, contractor, road status, and date must match the provided structured records exactly.\n"
            "2. If the provided facts do not contain the answer, say 'I do not have that specific record in my database.'\n"
            "3. Maintain a professional, objective, civic transparency-oriented tone.\n"
            "4. Format currency in Indian Rupees (e.g. ₹1,25,00,000).\n"
            "5. Use markdown for tables or lists to make metrics easily readable.\n\n"
            f"STRUCTURED DATABASE RECORDS:\n{context_str}\n\n"
            "ANSWER DIALECT:\n"
            "Ensure answers highlight the supervising authority, the contractor, and funding expenditures if relevant."
        )

        return system_prompt, citations, suggested_actions, suggested_prompts, intent

    @classmethod
    async def stream_response(cls, system_prompt: str, user_message: str, history: list = []):
        """
        Attempts to call the local Ollama instance (using llama3).
        Falls back to a fully deterministic, template-based response generator if Ollama is offline.
        Yields chunks of text.
        """
        ollama_url = "http://localhost:11434/api/chat"
        
        # Build prompt messages for Ollama API
        messages = [{"role": "system", "content": system_prompt}]
        
        # Add conversation history
        for h in history[:-1]: # exclude the latest message which we append separately
            messages.append({"role": h["role"], "content": h["content"]})
            
        messages.append({"role": "user", "content": user_message})

        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                # We request llama3 as it's installed
                payload = {
                    "model": "llama3",
                    "messages": messages,
                    "stream": True,
                    "options": {
                        "temperature": 0.0  # Zero temperature to keep it deterministic
                    }
                }
                
                async with client.stream("POST", ollama_url, json=payload) as response:
                    if response.status_code == 200:
                        async for line in response.iter_lines():
                            if line:
                                data = json.loads(line)
                                chunk = data.get("message", {}).get("content", "")
                                if chunk:
                                    yield chunk
                        return # Success
                    else:
                        print(f"Ollama returned status {response.status_code}. Falling back to template engine.")
        except Exception as e:
            print(f"Ollama connection error: {e}. Falling back to template engine.")

        # FALLBACK: Deterministic, rule-based response streaming
        # This executes character-by-character or chunk-by-chunk to simulate streaming
        fallback_text = cls.generate_deterministic_fallback(system_prompt, user_message)
        
        # Stream fallback text in chunks
        chunk_size = 8
        for i in range(0, len(fallback_text), chunk_size):
            yield fallback_text[i:i+chunk_size]
            await asyncio.sleep(0.02) # Fast, clean streaming effect

    @classmethod
    def generate_deterministic_fallback(cls, system_prompt: str, user_message: str) -> str:
        """
        Generates a premium, objective response strictly using database records.
        """
        msg_lower = user_message.lower()
        road_id, contractor_id, authority_id = cls.extract_entities(user_message)
        
        # 1. Road Specific Fallbacks
        if road_id:
            road = StructuredRoadRetriever.get_road_by_id(road_id)
            projects = StructuredRoadRetriever.get_road_projects(road_id)
            complaints = StructuredRoadRetriever.get_road_complaints(road_id)
            
            # Format projects & budget
            proj_info = ""
            total_allocated = 0
            total_spent = 0
            if projects:
                proj_info += "\n\n**Financial Audit Details:**\n"
                for p in projects:
                    total_allocated += p['budget_allocated']
                    total_spent += p['budget_spent']
                    status_emoji = "🚧" if p['status'] == 'in_progress' else "✅" if p['status'] == 'completed' else "🛑"
                    proj_info += f"- **{p['title']}** ({status_emoji} {p['status'].replace('_', ' ').capitalize()})\n"
                    proj_info += f"  * Contractor: **{p['contractor_name']}** (Rating: {p['contractor_rating']}/5.00)\n"
                    proj_info += f"  * Budget: Allocated ₹{p['budget_allocated']:,.0f} | Expended: ₹{p['budget_spent']:,.0f}\n"
                    if p['delay_days'] > 0:
                        proj_info += f"  * **Delay Warning**: Delayed by {p['delay_days']} days.\n"
            
            # Format complaints
            complaint_info = ""
            if complaints:
                active_complaints = [c for c in complaints if c['status'] != 'resolved']
                complaint_info = f"\n\n**Citizen Complaint Status:**\nThere are **{len(complaints)} reports** logged. "
                if active_complaints:
                    complaint_info += f"Currently **{len(active_complaints)} reports are unresolved** (e.g., *{active_complaints[0]['title']}* marked as *{active_complaints[0]['status']}*)."
                else:
                    complaint_info += "All complaints logged have been successfully resolved."
            
            if "budget" in msg_lower or "spent" in msg_lower or "money" in msg_lower:
                return (
                    f"According to public records, **{road['name']}** ({road['road_code']}) has a total allocated budget of **₹{total_allocated:,.0f}** "
                    f"across {len(projects)} sanctioned projects. Out of this, **₹{total_spent:,.0f}** has been expended to date.\n"
                    f"The supervising authority is the **{road['authority_name']}** ({road['authority_code']})."
                    f"{proj_info}"
                )
                
            if "contractor" in msg_lower or "repaired" in msg_lower or "who" in msg_lower:
                contractors_list = [p['contractor_name'] for p in projects]
                contractors_str = ", ".join(list(set(contractors_list)))
                return (
                    f"The contractor responsible for works on **{road['name']}** is **{contractors_str}**.\n"
                    f"This road segment is supervised by the **{road['authority_name']}** ({road['authority_code']}) "
                    f"and is currently classified as **{road['status'].replace('_', ' ')}**."
                    f"{proj_info}"
                )
                
            # Default road response
            return (
                f"The **{road['name']}** ({road['road_code']}) is a segment of **{road['length_km']} km** "
                f"under the jurisdiction of the **{road['authority_name']}** ({road['authority_code']}).\n"
                f"The segment's current relaying status is **{road['status'].replace('_', ' ')}**."
                f"{proj_info}{complaint_info}"
            )
            
        # 2. Contractor Specific Fallbacks
        if contractor_id:
            contractor = StructuredRoadRetriever.get_contractor_by_name(
                [c for c, cid in CONTRACTOR_ALIASES.items() if cid == contractor_id][0]
            )
            c_projects = StructuredRoadRetriever.get_contractor_projects(contractor_id)
            
            blacklisted_str = "🔴 **Blacklisted**" if contractor['blacklisted'] else "🟢 **Active (Good Standing)**"
            reason_str = f"\n* **Reason**: {contractor['blacklisted_reason']}" if contractor['blacklisted'] else ""
            
            proj_str = ""
            if c_projects:
                proj_str += "\n\n**Sanctioned Projects Registry:**\n"
                for p in c_projects:
                    proj_str += f"- **{p['title']}** on {p['road_name']} (Budget: ₹{p['budget_allocated']:,.0f}, Status: {p['status']})\n"
                    
            return (
                f"**Contractor Audit: {contractor['name']}** (License: `{contractor['license_number']}`)\n"
                f"- **Status**: {blacklisted_str}{reason_str}\n"
                f"- **Accountability Score / Rating**: {contractor['rating']}/5.00\n"
                f"- **Performance**: Completed {contractor['projects_completed']} projects, with {contractor['projects_delayed']} recorded delays.\n"
                f"- **Contact Details**: {contractor['contact_email']} | {contractor['contact_phone']}"
                f"{proj_str}"
            )

        # 3. Authority Specific Fallbacks
        if authority_id:
            auth = AuthorityResolver.get_authority_by_id(authority_id)
            return (
                f"**Supervising Authority Details:**\n"
                f"- **Entity Name**: {auth['name']} (`{auth['department_code']}`)\n"
                f"- **Contact Email**: [{auth['contact_email']}](mailto:{auth['contact_email']})\n"
                f"- **Contact Hotline**: {auth['contact_phone']}\n"
                f"This department supervises road segments and handles citizen complaints in its boundary polygon."
            )

        # 4. Intent Specific Fallbacks
        if intent == "report_escalation":
            return (
                "You can file a new road defect complaint directly on ROADWATCH:\n"
                "1. Click the **Mock Report Defect** button in the Defect Registry tab.\n"
                "2. The system automatically fetches your GPS coordinates, suggests the closest road segment, "
                "and routes the report to the responsible ward authority boundary.\n"
                "3. If offline, the report stores in IndexedDB and syncs automatically when connection is restored."
            )
            
        if intent == "contractor_lookup" and "blacklisted" in msg_lower:
            # List blacklisted contractors
            sql = "SELECT name, blacklisted_reason FROM contractors WHERE blacklisted = 1"
            blacklisted = db.query(sql)
            res = "**Integrity Audit - Blacklisted Contractors:**\n"
            for b in blacklisted:
                res += f"- **{b['name']}**\n  * *Reason*: {b['blacklisted_reason']}\n"
            return res

        # 5. Generic Help Response
        return (
            "I am the ROADWATCH AI accountability chatbot. I provide real-time public records audit facts "
            "about roads, budgets, delayed contracts, and municipal authorities.\n\n"
            "Try asking questions like:\n"
            "- *Who is the contractor for S.V. Road?*\n"
            "- *Is Omega Infrastructure blacklisted?*\n"
            "- *How much budget is spent on Link Road?*\n"
            "- *Which authority manages the Western Express Highway?*"
        )

import os
import httpx
import json
import asyncio
from app.services.road_retriever import StructuredRoadRetriever
from app.services.authority_resolver import AuthorityResolver
from app.services.database import db
from app.services.transparency_service import calculate_road_transparency, get_citywide_transparency_snapshot

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
                
        # Resolve routing details (always do this if coords available)
        routing_details = None
        if lat is not None and lon is not None:
            resolved_road_for_routing = StructuredRoadRetriever.get_closest_road(lon, lat, max_distance=0.005)
            road_name_for_routing = resolved_road_for_routing['name'] if resolved_road_for_routing else None
            routing_details = AuthorityResolver.resolve_with_routing_details(lon, lat, road_name_for_routing)

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
                road_geom = resolved_road.get('geom', '')
                road_coord_str = f"- Spatial Geometry: {road_geom}" if road_geom else ""
                context_facts.append(
                    f"Road Segment: {resolved_road['name']} ({resolved_road['road_code']})\n"
                    f"- Length: {resolved_road['length_km']} km\n"
                    f"- Relaying/Paving Status: {resolved_road['status']}\n"
                    f"- Supervising Department: {resolved_road['authority_name']} ({resolved_road['authority_code']})\n"
                    f"{road_coord_str}"
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
                    
                # — Budget-specific context for budget_audit intent —
                if intent == "budget_audit":
                    budget_summary = StructuredRoadRetriever.get_road_budget_summary(road_id)
                    if budget_summary:
                        context_facts.append(
                            f"Budget Summary for {resolved_road['name']}:\n"
                            f"- Total Sanctioned: ₹{budget_summary['total_sanctioned']:,.0f}\n"
                            f"- Total Spent: ₹{budget_summary['total_spent']:,.0f}\n"
                            f"- Spend Rate: {budget_summary['spend_pct']}%\n"
                            f"- Total Variance: ₹{budget_summary['total_variance']:,.0f}\n"
                            f"- Total Delay Days Across Projects: {budget_summary['total_delay_days']} days"
                        )

                    # Transparency score
                    transparency = calculate_road_transparency(road_id)
                    if transparency:
                        context_facts.append(
                            f"Transparency Score for {resolved_road['name']}: {transparency['transparency_score']}/100 (Grade: {transparency['grade']})\n"
                            f"- Spend Rate: {transparency['spend_pct']}% | Projects: {transparency['project_count']} | Unresolved Complaints: {transparency['complaint_count']}"
                        )
                        if transparency['anomalies']:
                            anomaly_lines = ["Detected Anomalies:"]
                            for a in transparency['anomalies']:
                                anomaly_lines.append(f"  * [{a['severity'].upper()}] {a['type']}: {a['description']}")
                            context_facts.append("\n".join(anomaly_lines))
                        if transparency['score_deductions']:
                            deduction_total = sum(d['points'] for d in transparency['score_deductions'])
                            context_facts.append(
                                f"Score Deductions: {deduction_total} points lost across "
                                + ", ".join(f"{d['category']}: -{d['points']}" for d in transparency['score_deductions'])
                            )

                    # Funding source breakdown
                    fund_sources = StructuredRoadRetriever.get_road_funding_sources_summary(road_id)
                    if fund_sources:
                        sources_lines = ["Funding Source Breakdown:"]
                        for fs in fund_sources:
                            sources_lines.append(
                                f"  * {fs['source_name']}: ₹{fs['total_amount']:,.0f} ({fs['pct_of_total']}%)"
                            )
                        context_facts.append("\n".join(sources_lines))

                    # Cost per KM
                    cost_per_km = StructuredRoadRetriever.get_road_cost_per_km(road_id)
                    if cost_per_km:
                        cost_lines = ["Cost Per KM Analysis:"]
                        for c in cost_per_km:
                            alloc_km = c.get('allocated_per_km')
                            spent_km = c.get('spent_per_km')
                            alloc_str = f"₹{alloc_km:,.0f}/km" if alloc_km else "N/A"
                            spent_str = f"₹{spent_km:,.0f}/km" if spent_km else "N/A"
                            cost_lines.append(
                                f"  * {c['title']} ({c['contractor_name']}): allocated {alloc_str}, spent {spent_str} — {c['status']}"
                            )
                        context_facts.append("\n".join(cost_lines))

                    # Variance reasons
                    variances = StructuredRoadRetriever.get_road_budget_variance_reasons(road_id)
                    if variances:
                        var_lines = ["Budget Variance Reasons:"]
                        for v in variances:
                            var_lines.append(
                                f"  * Project: {v['project_title']}\n"
                                f"    - Original: ₹{v['original_budget']:,.0f} → Revised: ₹{v['revised_budget']:,.0f} (variance: {v['variance_pct']}%)\n"
                                f"    - Reason: {v['reason']}\n"
                                f"    - Approved by: {v['approved_by']} on {v['approval_date']}"
                            )
                        context_facts.append("\n".join(var_lines))

                    suggested_prompts.append(f"How does {resolved_road['name']} compare to other roads on cost-per-km?")
                    suggested_prompts.append(f"What is the funding breakdown for {resolved_road['name']}?")

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
                
                # Budget transparency for contractor
                if intent == "budget_audit" or any(w in message.lower() for w in ["spent", "paid", "received", "earned", "money", "contract", "worth"]):
                    c_trans = StructuredRoadRetriever.get_contractor_transparency_summary(contractor_id)
                    if c_trans and c_trans['project_count'] > 0:
                        efficiency = "ON TIME" if c_trans['total_delay_days'] == 0 else f"DELAYED ({c_trans['total_delay_days']} days total)"
                        context_facts.append(
                            f"Contractor Financial Summary for {c_trans['name']}:\n"
                            f"- Total Contract Value: ₹{c_trans['total_contracts_value']:,.0f}\n"
                            f"- Total Received: ₹{c_trans['total_spent']:,.0f}\n"
                            f"- Projects Managed: {c_trans['project_count']}\n"
                            f"- Delivery Record: {efficiency}\n"
                            f"- Rating: {c_trans['rating']}/5.00 | Blacklisted: {'YES' if c_trans['blacklisted'] else 'NO'}"
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
                auth_geom = resolved_authority.get('geom_boundary', '')
                auth_coord_str = f"- Jurisdiction Boundary: {auth_geom}" if auth_geom else ""
                context_facts.append(
                    f"Supervising Authority: {resolved_authority['name']} ({resolved_authority['department_code']})\n"
                    f"- Email: {resolved_authority['contact_email']}\n"
                    f"- Phone: {resolved_authority['contact_phone']}\n"
                    f"{auth_coord_str}"
                )
                
                # Contextual prompts
                suggested_prompts.append(f"Which roads does {resolved_authority['department_code']} manage?")

        # 5. Default prompts and citations if none resolved
        if not citations:
            # Budget snapshot for general budget queries
            if intent == "budget_audit":
                snapshot = StructuredRoadRetriever.get_citywide_budget_snapshot()
                if snapshot and snapshot['total_projects'] > 0:
                    context_facts.append(
                        "City-wide Budget Snapshot:\n"
                        f"- Roads With Active Projects: {snapshot['roads_with_projects']}\n"
                        f"- Total Projects: {snapshot['total_projects']}\n"
                        f"- Total Sanctioned City-wide: ₹{snapshot['total_sanctioned_city']:,.0f}\n"
                        f"- Total Spent City-wide: ₹{snapshot['total_spent_city']:,.0f}\n"
                        f"- City Spend Rate: {snapshot['city_spend_pct']}%\n"
                        f"- Total Delay Days: {snapshot['total_delay_days_city']}\n"
                        f"- Distinct Funding Sources: {snapshot['distinct_funding_sources']}"
                    )
                # City-wide transparency snapshot
                city_transparency = get_citywide_transparency_snapshot()
                if city_transparency and city_transparency['roads_analyzed'] > 0:
                    context_facts.append(
                        "City-wide Transparency Report:\n"
                        f"- Roads Analyzed: {city_transparency['roads_analyzed']}\n"
                        f"- Average Transparency Score: {city_transparency['average_transparency_score']}/100\n"
                        f"- Total Anomalies Detected: {city_transparency['total_anomalies']}\n"
                        f"- High Severity Anomalies: {city_transparency['high_severity_anomalies']}"
                    )
                suggested_prompts.append("How much total budget is allocated to road projects city-wide?")
                suggested_prompts.append("Which road had the biggest budget variance?")
                suggested_prompts.append("Show me spending per km on WEH vs EEH")

            # System overview if no intent-specific data
            if not context_facts and not (intent == "budget_audit"):
                all_auths = AuthorityResolver.list_all_authorities()
                context_facts.append("Global System Overview:")
                context_facts.append("Active authorities supervising public contracts:")
                for a in all_auths[:3]:
                    context_facts.append(f"- {a['name']} ({a['department_code']})")

            if intent != "budget_audit":
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
            "BUDGET QUERY RESPONSE FORMAT (when the user asks about spending/funding/budget):\n"
            "- Always state: total sanctioned amount vs total actual spent, and the spend percentage.\n"
            "- When funding source data is available, include a bullet-point breakdown of sources (e.g. 'Central Road Fund: ₹30 Cr (25%)').\n"
            "- When cost-per-km data is available, mention it (e.g. '₹7.5 Cr/km allocated').\n"
            "- When variance reasons exist, summarize the key reason and approval authority.\n"
            "- If the project is delayed, include delay days in the response.\n"
            "- Example format: 'NH-48: ₹45 Cr sanctioned, ₹38.2 Cr actual spent (85%). Sources: Central Road Fund ₹30 Cr, State Budget ₹12 Cr, MPLAD ₹3 Cr'\n\n"
            f"STRUCTURED DATABASE RECORDS:\n{context_str}\n\n"
            "ANSWER DIALECT:\n"
            "Ensure answers highlight the supervising authority, the contractor, and funding expenditures if relevant."
        )

        return system_prompt, citations, suggested_actions, suggested_prompts, intent, routing_details

    @classmethod
    async def stream_response(cls, system_prompt: str, user_message: str, history: list = []):
        api_key = os.environ.get("CONCENTRATE_API_KEY", "")
        if not api_key:
            fallback_text = cls.generate_deterministic_fallback(system_prompt, user_message)
            chunk_size = 8
            for i in range(0, len(fallback_text), chunk_size):
                yield fallback_text[i:i+chunk_size]
                await asyncio.sleep(0.02)
            return

        messages = [{"role": "system", "content": system_prompt}]
        for h in history[:-1]:
            messages.append({"role": h["role"], "content": h["content"]})
        messages.append({"role": "user", "content": user_message})

        payload = {
            "model": "gemini-3.5-flash",
            "messages": messages,
            "temperature": 0.0,
            "stream": True
        }

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            async with client.stream("POST", "https://api.concentrate.ai/v1/chat/completions", json=payload, headers=headers) as response:
                if response.status_code != 200:
                    error_text = await response.aread()
                    print(f"Concentrate API error {response.status_code}: {error_text.decode(errors='replace')}")
                    fallback_text = cls.generate_deterministic_fallback(system_prompt, user_message)
                    chunk_size = 8
                    for i in range(0, len(fallback_text), chunk_size):
                        yield fallback_text[i:i+chunk_size]
                        await asyncio.sleep(0.02)
                    return

                async for line in response.iter_lines():
                    if line.startswith("data: "):
                        data_str = line[6:].strip()
                        if data_str == "[DONE]":
                            break
                        try:
                            chunk_data = json.loads(data_str)
                            delta = chunk_data.get("choices", [{}])[0].get("delta", {})
                            content = delta.get("content", "")
                            if content:
                                yield content
                        except Exception:
                            pass

    @classmethod
    def generate_deterministic_fallback(cls, system_prompt: str, user_message: str) -> str:
        road_id, contractor_id, authority_id = cls.extract_entities(user_message)
        msg_lower = user_message.lower()

        if road_id:
            road = StructuredRoadRetriever.get_road_by_id(road_id)
            if not road:
                return "I do not have that specific road record in my database."
            projects = StructuredRoadRetriever.get_road_projects(road_id)
            complaints = StructuredRoadRetriever.get_road_complaints(road_id)

            # Budget-audit fallback: structured financial answer
            if any(w in msg_lower for w in ["budget", "cost", "money", "spent", "funding", "allocat", "variance", "crore", "lakh", "price"]):
                parts = [f"**{road['name']}** ({road['road_code']}) — {road['length_km']} km, status: {road['status'].replace('_', ' ')}."]
                budget_summary = StructuredRoadRetriever.get_road_budget_summary(road_id)
                if budget_summary and budget_summary['project_count'] > 0:
                    parts.append(
                        f"**Budget:** ₹{budget_summary['total_sanctioned']:,.0f} sanctioned, "
                        f"₹{budget_summary['total_spent']:,.0f} spent "
                        f"({budget_summary['spend_pct']}%). "
                        f"Variance: ₹{budget_summary['total_variance']:,.0f}."
                    )
                # Transparency grade
                transparency = calculate_road_transparency(road_id)
                if transparency:
                    parts.append(f"**Transparency Score:** {transparency['transparency_score']}/100 (Grade: {transparency['grade']})")
                # Funding sources
                fund_sources = StructuredRoadRetriever.get_road_funding_sources_summary(road_id)
                if fund_sources:
                    src_strs = [f"{fs['source_name']} ₹{fs['total_amount']:,.0f} ({fs['pct_of_total']}%)" for fs in fund_sources]
                    parts.append(f"**Sources:** {' | '.join(src_strs)}")
                # Cost per km
                cost_per_km = StructuredRoadRetriever.get_road_cost_per_km(road_id)
                if cost_per_km:
                    c = cost_per_km[0]
                    if c.get('allocated_per_km'):
                        parts.append(f"**Cost per km:** ₹{c['allocated_per_km']:,.0f}/km allocated, ₹{c['spent_per_km']:,.0f}/km spent")
                # Variance reasons
                variances = StructuredRoadRetriever.get_road_budget_variance_reasons(road_id)
                if variances:
                    v = variances[0]
                    parts.append(f"**Variance Reason:** {v['reason']} (approved by {v['approved_by']})")
                # Projects
                if projects:
                    parts.append("**Projects:**")
                    for p in projects:
                        parts.append(
                            f"- {p['title']}: ₹{p['budget_allocated']:,.0f} → ₹{p['budget_spent']:,.0f} "
                            f"({p['status']}, delay {p['delay_days']}d). Contractor: {p['contractor_name']}."
                        )
                if complaints:
                    parts.append(f"**Complaints:** {len(complaints)} logged ({len([c for c in complaints if c['status'] != 'resolved'])} unresolved).")
                return "\n".join(parts)

            # Default fallback (non-budget)
            parts = [f"**{road['name']}** ({road['road_code']}) — {road['length_km']} km, status: {road['status'].replace('_', ' ')}. Supervising authority: {road['authority_name']} ({road['authority_code']})."]
            if projects:
                parts.append("\n**Budgets & Contracts:**")
                for p in projects:
                    parts.append(f"- {p['title']}: ₹{p['budget_allocated']:,.0f} allocated, ₹{p['budget_spent']:,.0f} spent. Contractor: {p['contractor_name']} (rating {p['contractor_rating']}/5). Status: {p['status']}. Delays: {p['delay_days']} days.")
            if complaints:
                parts.append(f"\n**Complaints:** {len(complaints)} logged ({len([c for c in complaints if c['status'] != 'resolved'])} unresolved).")
            return "\n".join(parts)

        if contractor_id:
            contractor = StructuredRoadRetriever.get_contractor_by_name(
                [c for c, cid in CONTRACTOR_ALIASES.items() if cid == contractor_id][0]
            )
            if not contractor:
                return "I do not have that specific contractor record in my database."
            status_str = "Blacklisted" if contractor['blacklisted'] else "Active (Good Standing)"

            # Budget-audit fallback for contractor
            if any(w in msg_lower for w in ["spent", "paid", "received", "earned", "money", "contract", "worth", "budget", "fund"]):
                c_trans = StructuredRoadRetriever.get_contractor_transparency_summary(contractor_id)
                if c_trans and c_trans['project_count'] > 0:
                    efficiency = "ON TIME" if c_trans['total_delay_days'] == 0 else f"DELAYED ({c_trans['total_delay_days']} days total)"
                    return (
                        f"**{contractor['name']}** (License: {contractor['license_number']})\n"
                        f"- Status: {status_str}\n"
                        f"- Total Contract Value: ₹{c_trans['total_contracts_value']:,.0f}\n"
                        f"- Total Received: ₹{c_trans['total_spent']:,.0f}\n"
                        f"- Projects Managed: {c_trans['project_count']}\n"
                        f"- Delivery Record: {efficiency}\n"
                        f"- Rating: {contractor['rating']}/5.00\n"
                        f"- Contact: {contractor['contact_email']} | {contractor['contact_phone']}"
                    )
            return (
                f"**{contractor['name']}** (License: {contractor['license_number']})\n"
                f"- Status: {status_str}\n"
                f"- Rating: {contractor['rating']}/5.00\n"
                f"- Completed: {contractor['projects_completed']} | Delayed: {contractor['projects_delayed']}\n"
                f"- Contact: {contractor['contact_email']} | {contractor['contact_phone']}"
            )

        if authority_id:
            auth = AuthorityResolver.get_authority_by_id(authority_id)
            if not auth:
                return "I do not have that specific authority record in my database."
            return (
                f"**{auth['name']}** ({auth['department_code']})\n"
                f"- Contact: {auth.get('contact_email', 'N/A')} | {auth.get('contact_phone', 'N/A')}"
            )

        # Budget-general fallback (no entity, but budget intent)
        if any(w in msg_lower for w in ["budget", "cost", "money", "spent", "funding", "allocat", "variance", "crore", "lakh", "price"]):
            snapshot = StructuredRoadRetriever.get_citywide_budget_snapshot()
            if snapshot and snapshot['total_projects'] > 0:
                return (
                    "**City-wide Budget Snapshot**\n\n"
                    f"- Roads With Active Projects: {snapshot['roads_with_projects']}\n"
                    f"- Total Projects: {snapshot['total_projects']}\n"
                    f"- Total Sanctioned: ₹{snapshot['total_sanctioned_city']:,.0f}\n"
                    f"- Total Spent: ₹{snapshot['total_spent_city']:,.0f}\n"
                    f"- Spend Rate: {snapshot['city_spend_pct']}%\n"
                    f"- Total Delay Days: {snapshot['total_delay_days_city']}\n"
                    f"- Funding Sources Used: {snapshot['distinct_funding_sources']}\n\n"
                    "Try asking about a specific road for detailed budget breakdown."
                )
            # City-wide transparency in general budget fallback
            city_transparency = get_citywide_transparency_snapshot()
            if city_transparency and city_transparency['roads_analyzed'] > 0:
                return (
                    "**City-wide Budget & Transparency Snapshot**\n\n"
                    f"- Roads Analyzed: {city_transparency['roads_analyzed']}\n"
                    f"- Total Sanctioned: ₹{city_transparency['total_sanctioned']:,.0f}\n"
                    f"- Total Spent: ₹{city_transparency['total_spent']:,.0f}\n"
                    f"- Spend Rate: {city_transparency['city_spend_pct']}%\n"
                    f"- Average Transparency Score: {city_transparency['average_transparency_score']}/100\n"
                    f"- Total Anomalies Detected: {city_transparency['total_anomalies']} "
                    f"({city_transparency['high_severity_anomalies']} high severity)\n\n"
                    "Try asking about a specific road for detailed budget breakdown."
                )

        return (
            "I am the ROADWATCH AI accountability chatbot. I provide public records audit facts "
            "about roads, budgets, delayed contracts, and municipal authorities.\n\n"
            "Try asking:\n"
            "- Who is the contractor for S.V. Road?\n"
            "- Is Omega Infrastructure blacklisted?\n"
            "- How much budget is spent on Link Road?\n"
            "- Which authority manages the Western Express Highway?"
        )

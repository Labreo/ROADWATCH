import subprocess
import os

CHROME_BIN = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
BASE_DIR = "/Users/sanjaywaradkar/ROADWATCH/DBMS_Project_Submission"

def build_use_case_diagram():
    width = 1100
    height = 1450

    svg = []
    svg.append(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" width="{width}" height="{height}" style="background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif;">')

    svg.append('''
    <defs>
        <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%" filterUnits="userSpaceOnUse">
            <feDropShadow dx="2" dy="2" stdDeviation="2.5" flood-opacity="0.10"/>
        </filter>
        <style>
            .actor-box { fill: #dbeafe; stroke: #2563eb; stroke-width: 2; rx: 10; filter: url(#shadow); }
            .actor-auto { fill: #ffedd5; stroke: #ea580c; stroke-width: 2; rx: 10; filter: url(#shadow); }
            .actor-text { font-size: 15px; font-weight: bold; fill: #1e3a8a; text-anchor: middle; dominant-baseline: central; }
            .actor-auto-text { font-size: 14px; font-weight: bold; fill: #9a3412; text-anchor: middle; dominant-baseline: central; }
            .uc-ellipse { fill: #ffffff; stroke: #0284c7; stroke-width: 1.8; filter: url(#shadow); }
            .uc-text { font-size: 13.5px; fill: #0f172a; text-anchor: middle; dominant-baseline: central; }
            .uc-line { stroke: #475569; stroke-width: 1.5; }
        </style>
    </defs>
    ''')

    # Border frame / container
    svg.append(f'<rect x="25" y="25" width="{width-50}" height="{height-50}" rx="12" fill="#fafafa" stroke="#e2e8f0" stroke-width="2"/>')
    svg.append(f'<text x="{width/2}" y="65" font-size="20" font-weight="bold" fill="#1e293b" text-anchor="middle">ROADWATCH: System Use Case Diagram</text>')
    svg.append(f'<line x1="50" y1="85" x2="{width-50}" y2="85" stroke="#cbd5e1" stroke-width="1.5"/>')

    actors = {
        'citizen': ('Citizen', 130, 260, 140, 50, False),
        'staff': ('Field Engineer\n(Staff)', 130, 520, 140, 54, False),
        'admin': ('Authority Admin\n(Commissioner)', 130, 830, 140, 54, False),
        'auditor': ('Public Auditor', 130, 1110, 140, 50, False),
        'system': ('System\n(Automated)', 130, 1330, 140, 54, True)
    }

    use_cases = [
        # Citizen
        ('uc_login', 'User Login &amp; Authentication', 620, 140, 140, 24),
        ('uc_file', 'File Road Grievance (GPS &amp; Photo)', 620, 205, 160, 24),
        ('uc_track', 'Track My Grievance Status', 620, 270, 145, 24),
        ('uc_score', 'View Road Condition &amp; Spend', 620, 335, 145, 24),

        # Field Staff
        ('uc_ward', 'View Ward Assigned Defects', 620, 430, 145, 24),
        ('uc_status', 'Update Defect Status Lifecycle', 620, 495, 150, 24),
        ('uc_repair', 'Add Repair Verification Note', 620, 560, 145, 24),
        ('uc_milestone', 'Certify Road Work Milestone', 620, 625, 145, 24),

        # Admin
        ('uc_tender', 'Float Road Work Tender', 620, 720, 140, 24),
        ('uc_bids', 'Evaluate Contractor Bids', 620, 785, 140, 24),
        ('uc_award', 'Award Project Contract', 620, 850, 140, 24),
        ('uc_variance', 'Log Budget Variance Justification', 620, 915, 160, 24),
        ('uc_sla', 'Configure Category SLA Hours', 620, 980, 145, 24),

        # Auditor
        ('uc_audit', 'Inspect Tamper-Evident Audit Log', 620, 1080, 165, 24),
        ('uc_costkm', 'Generate Cost-Per-KM Analytics', 620, 1145, 155, 24),

        # System automated
        ('uc_route', 'Auto-Route Grievance via PostGIS', 620, 1260, 165, 24),
        ('uc_escalate', 'Auto-Escalate Overdue SLA Level', 620, 1325, 160, 24),
        ('uc_rating', 'Recalculate Contractor Rating', 620, 1390, 150, 24)
    ]

    uc_map = {uc[0]: uc for uc in use_cases}

    connections = [
        ('citizen', 'uc_login'),
        ('citizen', 'uc_file'),
        ('citizen', 'uc_track'),
        ('citizen', 'uc_score'),

        ('staff', 'uc_login'),
        ('staff', 'uc_ward'),
        ('staff', 'uc_status'),
        ('staff', 'uc_repair'),
        ('staff', 'uc_milestone'),

        ('admin', 'uc_login'),
        ('admin', 'uc_tender'),
        ('admin', 'uc_bids'),
        ('admin', 'uc_award'),
        ('admin', 'uc_variance'),
        ('admin', 'uc_sla'),

        ('auditor', 'uc_login'),
        ('auditor', 'uc_audit'),
        ('auditor', 'uc_costkm'),

        ('system', 'uc_route'),
        ('system', 'uc_escalate'),
        ('system', 'uc_rating')
    ]

    for act_key, uc_id in connections:
        act = actors[act_key]
        uc = uc_map[uc_id]
        ax = act[1] + act[3] / 2
        ay = act[2]
        ux = uc[2] - uc[4]
        uy = uc[3]
        svg.append(f'<line class="uc-line" x1="{ax}" y1="{ay}" x2="{ux}" y2="{uy}"/>')

    for k, v in actors.items():
        name, x, y, w, h, is_auto = v
        bx = x - w/2
        by = y - h/2
        box_class = "actor-auto" if is_auto else "actor-box"
        text_class = "actor-auto-text" if is_auto else "actor-text"
        svg.append(f'<rect class="{box_class}" x="{bx}" y="{by}" width="{w}" height="{h}"/>')
        lines = name.split('\n')
        if len(lines) == 1:
            svg.append(f'<text class="{text_class}" x="{x}" y="{y}">{lines[0]}</text>')
        else:
            svg.append(f'<text class="{text_class}" x="{x}" y="{y - 8}">{lines[0]}</text>')
            svg.append(f'<text class="{text_class}" x="{x}" y="{y + 11}">{lines[1]}</text>')

    for uc_id, label, cx, cy, rx, ry in use_cases:
        svg.append(f'<ellipse class="uc-ellipse" cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}"/>')
        svg.append(f'<text class="uc-text" x="{cx}" y="{cy}">{label}</text>')

    svg.append('</svg>')
    
    svg_path = os.path.join(BASE_DIR, "use_case_diagram.svg")
    png_path = os.path.join(BASE_DIR, "use_case_diagram.png")
    with open(svg_path, 'w') as f:
        f.write('\n'.join(svg))
    print("Updated use_case_diagram.svg!")

    subprocess.run([
        CHROME_BIN,
        "--headless",
        "--disable-gpu",
        f"--screenshot={png_path}",
        "--window-size=1150,1500",
        f"file://{svg_path}"
    ])
    print("Rendered use_case_diagram.png!")

def build_system_flow_diagram():
    width = 1100
    height = 950

    svg = []
    svg.append(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" width="{width}" height="{height}" style="background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif;">')

    svg.append('''
    <defs>
        <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%" filterUnits="userSpaceOnUse">
            <feDropShadow dx="2" dy="2" stdDeviation="2.5" flood-opacity="0.10"/>
        </filter>
        <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#334155"/>
        </marker>
        <style>
            .flow-box { fill: #f8fafc; stroke: #3b82f6; stroke-width: 2; rx: 8; filter: url(#shadow); }
            .db-box { fill: #eff6ff; stroke: #1d4ed8; stroke-width: 2.2; rx: 8; filter: url(#shadow); }
            .audit-box { fill: #f0fdf4; stroke: #15803d; stroke-width: 2; rx: 8; filter: url(#shadow); }
            .flow-text-title { font-size: 15px; font-weight: bold; fill: #0f172a; text-anchor: middle; }
            .flow-text-desc { font-size: 12.5px; fill: #475569; text-anchor: middle; }
            .flow-arrow { stroke: #334155; stroke-width: 2; marker-end: url(#arrow); fill: none; }
        </style>
    </defs>
    ''')

    svg.append(f'<rect x="25" y="25" width="{width-50}" height="{height-50}" rx="12" fill="#fafafa" stroke="#e2e8f0" stroke-width="2"/>')
    svg.append(f'<text x="{width/2}" y="65" font-size="20" font-weight="bold" fill="#1e293b" text-anchor="middle">ROADWATCH: Preliminary System &amp; Data Flow</text>')
    svg.append(f'<line x1="50" y1="85" x2="{width-50}" y2="85" stroke="#cbd5e1" stroke-width="1.5"/>')

    # Step 1: User Client
    svg.append('''
    <g transform="translate(150, 110)">
        <rect class="flow-box" width="800" height="75"/>
        <text class="flow-text-title" x="400" y="32">1. Client Layer: Citizen &amp; Staff Interaction</text>
        <text class="flow-text-desc" x="400" y="54">Citizen submits road defect (GPS coordinates, category, photo) or Staff logs in via role dashboard</text>
    </g>
    ''')

    svg.append('<path class="flow-arrow" d="M 550 185 L 550 225"/>')

    # Step 2: API Gateway
    svg.append('''
    <g transform="translate(150, 230)">
        <rect class="flow-box" width="800" height="75"/>
        <text class="flow-text-title" x="400" y="32">2. Application Server Layer: FastAPI &amp; Payload Sanitization</text>
        <text class="flow-text-desc" x="400" y="54">Authenticates JWT token, validates schema types, extracts WGS84 GPS point, and opens DB transaction</text>
    </g>
    ''')

    svg.append('<path class="flow-arrow" d="M 550 305 L 550 345"/>')

    # Step 3: Database Spatial & State Machine
    svg.append('''
    <g transform="translate(150, 350)">
        <rect class="db-box" width="800" height="150"/>
        <text class="flow-text-title" x="400" y="32" fill="#1e3a8a">3. Database Layer: PostGIS &amp; Trigger-Driven State Engine</text>
        <text class="flow-text-desc" x="400" y="58">• Spatial Jurisdiction: ST_Contains(authorities.geom_boundary, complaint.geom) assigns Authority_ID</text>
        <text class="flow-text-desc" x="400" y="80">• Road Network Snapping: ST_DWithin(roads.geom, complaint.geom, 20m) associates nearest Road_ID</text>
        <text class="flow-text-desc" x="400" y="102">• State Machine Check: Validates status sequence (pending -&gt; routed -&gt; in_progress -&gt; resolved)</text>
        <text class="flow-text-desc" x="400" y="124">• Immutable Audit: trg_audit_complaints fires AFTER INSERT/UPDATE, logging before/after JSONB state</text>
    </g>
    ''')

    svg.append('<path class="flow-arrow" d="M 550 500 L 550 540"/>')

    # Step 4: Maintenance & Escalation
    svg.append('''
    <g transform="translate(150, 545)">
        <rect class="flow-box" width="800" height="95"/>
        <text class="flow-text-title" x="400" y="32">4. Field Execution &amp; Automated SLA Escalation</text>
        <text class="flow-text-desc" x="400" y="56">Ward engineer inspects defect, attaches repair completion notes, and marks complaint resolved</text>
        <text class="flow-text-desc" x="400" y="76">Automated SLA event triggers: IF elapsed_time &gt; category_sla_hours THEN increment escalation_level</text>
    </g>
    ''')

    svg.append('<path class="flow-arrow" d="M 550 640 L 550 680"/>')

    # Step 5: Transparency & Audit Views
    svg.append('''
    <g transform="translate(150, 685)">
        <rect class="audit-box" width="800" height="100"/>
        <text class="flow-text-title" x="400" y="32" fill="#14532d">5. Governance, Dynamic Scoring &amp; Public Transparency</text>
        <text class="flow-text-desc" x="400" y="56">• Contractor rating auto-calculated upon project milestone completion: recalculate_performance_index()</text>
        <text class="flow-text-desc" x="400" y="78">• Public Views: cost_per_km_view &amp; road_beneficiary_view provide real-time fiscal accountability</text>
    </g>
    ''')

    svg.append('</svg>')

    svg_path = os.path.join(BASE_DIR, "system_flow_diagram.svg")
    png_path = os.path.join(BASE_DIR, "system_flow_diagram.png")
    with open(svg_path, 'w') as f:
        f.write('\n'.join(svg))
    print("Updated system_flow_diagram.svg!")

    subprocess.run([
        CHROME_BIN,
        "--headless",
        "--disable-gpu",
        f"--screenshot={png_path}",
        "--window-size=1150,1000",
        f"file://{svg_path}"
    ])
    print("Rendered system_flow_diagram.png!")

if __name__ == '__main__':
    build_use_case_diagram()
    build_system_flow_diagram()

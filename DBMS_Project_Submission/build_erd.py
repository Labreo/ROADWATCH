import math
import xml.etree.ElementTree as ET
import subprocess

def generate_svg():
    width = 2800
    height = 1960

    svg = []
    svg.append(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" width="{width}" height="{height}" style="background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif;">')

    svg.append('''
    <defs>
        <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%" filterUnits="userSpaceOnUse">
            <feDropShadow dx="2" dy="3" stdDeviation="3" flood-opacity="0.14"/>
        </filter>
        <style>
            .entity-rect { fill: #dbeafe; stroke: #1d4ed8; stroke-width: 2.5; filter: url(#shadow); }
            .entity-text { font-size: 20px; font-weight: bold; fill: #1e3a8a; text-anchor: middle; dominant-baseline: central; }
            .weak-entity-outer { fill: #f3e8ff; stroke: #7e22ce; stroke-width: 2.5; filter: url(#shadow); }
            .weak-entity-inner { fill: none; stroke: #7e22ce; stroke-width: 1.5; }
            .weak-entity-text { font-size: 19px; font-weight: bold; fill: #581c87; text-anchor: middle; dominant-baseline: central; }
            .rel-diamond { fill: #fee2e2; stroke: #b91c1c; stroke-width: 2.2; filter: url(#shadow); }
            .rel-text { font-size: 15px; font-weight: bold; fill: #991b1b; text-anchor: middle; dominant-baseline: central; }
            .ident-rel-outer { fill: #fee2e2; stroke: #b91c1c; stroke-width: 2.2; filter: url(#shadow); }
            .ident-rel-inner { fill: none; stroke: #b91c1c; stroke-width: 1.5; }
            .attr-ellipse { fill: #f8fafc; stroke: #475569; stroke-width: 1.8; }
            .attr-pk { fill: #dcfce7; stroke: #15803d; stroke-width: 2.2; }
            .attr-comp { fill: #ede9fe; stroke: #6d28d9; stroke-width: 1.8; }
            .attr-multi { fill: #f1f5f9; stroke: #0369a1; stroke-width: 1.8; }
            .attr-derived { fill: #f8fafc; stroke: #64748b; stroke-width: 1.8; stroke-dasharray: 4,3; }
            .attr-text { font-size: 13.5px; fill: #1e293b; text-anchor: middle; dominant-baseline: central; }
            .attr-pk-text { font-size: 13.5px; font-weight: bold; text-decoration: underline; fill: #14532d; text-anchor: middle; dominant-baseline: central; }
            .attr-partial-text { font-size: 13.5px; font-weight: bold; fill: #581c87; text-anchor: middle; dominant-baseline: central; }
            .conn-line { stroke: #475569; stroke-width: 2; }
            .total-line-1 { stroke: #334155; stroke-width: 5.5; }
            .total-line-2 { stroke: #ffffff; stroke-width: 1.8; }
            .card-text { font-size: 15px; font-weight: bold; fill: #0f172a; text-anchor: middle; dominant-baseline: central; }
            .legend-text { font-size: 14px; fill: #334155; }
        </style>
    </defs>
    ''')

    # Top Banner
    svg.append('''
    <g id="title-banner">
        <rect x="40" y="25" width="2720" height="85" rx="12" fill="#0f172a"/>
        <text x="1400" y="60" fill="#f8fafc" font-size="26" font-weight="bold" text-anchor="middle">ROADWATCH: Entity-Relationship (ER) Conceptual Data Model</text>
        <text x="1400" y="88" fill="#94a3b8" font-size="15" text-anchor="middle">Chen Notation | Rectangles: Entities | Diamonds: Relationships | Ellipses: Attributes | Underlined: Primary Key</text>
    </g>
    ''')

    # Coordinates
    c_citizen = (460, 350)
    c_road = (1400, 350)
    c_auth = (2300, 350)

    c_comp = (640, 850)
    c_proj = (1700, 850)
    c_tend = (2320, 850)

    c_hist = (640, 1370)
    c_mile = (1380, 1370)
    c_cont = (2150, 1370)

    # Relationship centers
    r_manages = (1850, 350)
    r_files = (530, 590)
    r_occurs = (1020, 600)
    r_assoc = (1550, 600)
    r_gov = (2000, 600)
    r_floats = (2310, 600)
    r_exec = (1925, 1110)
    r_bids = (2235, 1110)
    r_hmile = (1540, 1110)
    r_hhist = (640, 1110)
    r_assigned = (1470, 680)

    lines_render = []
    rel_render = []
    card_render = []

    def add_line(x1, y1, x2, y2, total=False):
        if total:
            lines_render.append(f'<line class="total-line-1" x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}"/>')
            lines_render.append(f'<line class="total-line-2" x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}"/>')
        else:
            lines_render.append(f'<line class="conn-line" x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}"/>')

    def add_card(x, y, card):
        card_render.append(f'<circle cx="{x}" cy="{y}" r="13" fill="#ffffff" stroke="#94a3b8" stroke-width="1.5"/>')
        card_render.append(f'<text class="card-text" x="{x}" y="{y}">{card}</text>')

    def add_rel(x, y, rw, rh, name, is_identifying=False):
        pts = f"{x},{y - rh} {x + rw},{y} {x},{y + rh} {x - rw},{y}"
        if is_identifying:
            rel_render.append(f'<polygon class="ident-rel-outer" points="{pts}"/>')
            pts_inner = f"{x},{y - rh + 6} {x + rw - 8},{y} {x},{y + rh - 6} {x - rw + 8},{y}"
            rel_render.append(f'<polygon class="ident-rel-inner" points="{pts_inner}"/>')
        else:
            rel_render.append(f'<polygon class="rel-diamond" points="{pts}"/>')
        rel_render.append(f'<text class="rel-text" x="{x}" y="{y}">{name}</text>')

    # 1. R1: Manages (Authority 1 -> Road N)
    add_line(c_auth[0], c_auth[1], r_manages[0], r_manages[1], total=False)
    add_line(r_manages[0], r_manages[1], c_road[0], c_road[1], total=True)
    add_rel(r_manages[0], r_manages[1], 65, 34, "Manages")
    add_card(c_auth[0] - 120, c_auth[1] - 18, "1")
    add_card(c_road[0] + 120, c_road[1] - 18, "N")

    # 2. R2: Files (Citizen 1 -> Complaint N)
    add_line(c_citizen[0], c_citizen[1], r_files[0], r_files[1], total=False)
    add_line(r_files[0], r_files[1], c_comp[0], c_comp[1], total=True)
    add_rel(r_files[0], r_files[1], 55, 32, "Files")
    add_card(c_citizen[0] + 55, c_citizen[1] + 50, "1")
    add_card(c_comp[0] - 65, c_comp[1] - 45, "N")

    # 3. R3: Occurs_On (Complaint N -> Road 1)
    add_line(c_comp[0], c_comp[1], r_occurs[0], r_occurs[1], total=True)
    add_line(r_occurs[0], r_occurs[1], c_road[0], c_road[1], total=False)
    add_rel(r_occurs[0], r_occurs[1], 65, 32, "Occurs_On")
    add_card(c_comp[0] + 75, c_comp[1] - 48, "N")
    add_card(c_road[0] - 85, c_road[1] + 48, "1")

    # 4. R4: Associated_With (Project N -> Road 1)
    add_line(c_proj[0], c_proj[1], r_assoc[0], r_assoc[1], total=True)
    add_line(r_assoc[0], r_assoc[1], c_road[0], c_road[1], total=False)
    add_rel(r_assoc[0], r_assoc[1], 75, 32, "Associated_With")
    add_card(c_proj[0] - 78, c_proj[1] - 48, "N")
    add_card(c_road[0] + 78, c_road[1] + 48, "1")

    # 5. R5: Governs (Authority 1 -> Project N)
    add_line(c_auth[0], c_auth[1], r_gov[0], r_gov[1], total=False)
    add_line(r_gov[0], r_gov[1], c_proj[0], c_proj[1], total=True)
    add_rel(r_gov[0], r_gov[1], 60, 32, "Governs")
    add_card(c_auth[0] - 65, c_auth[1] + 50, "1")
    add_card(c_proj[0] + 65, c_proj[1] - 48, "N")

    # 6. R6: Floats (Authority 1 -> Tender N)
    add_line(c_auth[0], c_auth[1], r_floats[0], r_floats[1], total=False)
    add_line(r_floats[0], r_floats[1], c_tend[0], c_tend[1], total=True)
    add_rel(r_floats[0], r_floats[1], 55, 32, "Floats")
    add_card(c_auth[0] + 32, c_auth[1] + 48, "1")
    add_card(c_tend[0] + 15, c_tend[1] - 48, "N")

    # 7. R7: Executes (Contractor 1 -> Project N)
    add_line(c_cont[0], c_cont[1], r_exec[0], r_exec[1], total=False)
    add_line(r_exec[0], r_exec[1], c_proj[0], c_proj[1], total=True)
    add_rel(r_exec[0], r_exec[1], 60, 32, "Executes")
    add_card(c_cont[0] - 65, c_cont[1] - 48, "1")
    add_card(c_proj[0] + 68, c_proj[1] + 48, "N")

    # 8. R8: Bids_On (Contractor M -> Tender N)
    add_line(c_cont[0], c_cont[1], r_bids[0], r_bids[1], total=False)
    add_line(r_bids[0], r_bids[1], c_tend[0], c_tend[1], total=False)
    add_rel(r_bids[0], r_bids[1], 55, 32, "Bids_On")
    add_card(c_cont[0] + 48, c_cont[1] - 48, "M")
    add_card(c_tend[0] - 48, c_tend[1] + 48, "N")

    b_attrs = [
        (2410, 1070, 68, 23, "Financial_Quote"),
        (2420, 1130, 64, 23, "Technical_Score"),
        (2380, 1190, 52, 22, "Is_Winner")
    ]
    for bx, by, brx, bry, bname in b_attrs:
        add_line(r_bids[0], r_bids[1], bx, by)

    # 9. R9: Has_Milestone (Project 1 -> Project_Milestone N)
    add_line(c_proj[0], c_proj[1], r_hmile[0], r_hmile[1], total=False)
    add_line(r_hmile[0], r_hmile[1], c_mile[0], c_mile[1], total=True)
    add_rel(r_hmile[0], r_hmile[1], 68, 34, "Has_Milestone", is_identifying=True)
    add_card(c_proj[0] - 75, c_proj[1] + 48, "1")
    add_card(c_mile[0] + 75, c_mile[1] - 48, "N")

    # 10. R10: Has_History (Complaint 1 -> Status_History N)
    add_line(c_comp[0], c_comp[1], r_hhist[0], r_hhist[1], total=False)
    add_line(r_hhist[0], r_hhist[1], c_hist[0], c_hist[1], total=True)
    add_rel(r_hhist[0], r_hhist[1], 62, 34, "Has_History", is_identifying=True)
    add_card(c_comp[0] + 18, c_comp[1] + 48, "1")
    add_card(c_hist[0] + 18, c_hist[1] - 48, "N")

    # 11. R11: Assigned_To (Complaint N -> Authority 1)
    lines_render.append(f'''
    <path d="M {c_comp[0]} {c_comp[1]} C 1100 750, 1850 550, {c_auth[0]} {c_auth[1]}" fill="none" class="total-line-1"/>
    <path d="M {c_comp[0]} {c_comp[1]} C 1100 750, 1850 550, {c_auth[0]} {c_auth[1]}" fill="none" class="total-line-2"/>
    ''')
    add_rel(r_assigned[0], r_assigned[1], 65, 32, "Assigned_To")
    add_card(c_comp[0] + 120, c_comp[1] - 15, "N")
    add_card(c_auth[0] - 115, c_auth[1] + 35, "1")

    # Citizen Attributes
    c_attrs = [
        (300, 230, 52, 23, "Citizen_ID", "pk"),
        (460, 210, 45, 23, "Name", "comp"),
        (620, 230, 48, 23, "Email", "simple"),
        (230, 320, 66, 23, "Phone_Numbers", "multi"),
        (230, 390, 68, 23, "Residential_Ward", "simple"),
        (460, 450, 78, 23, "Total_Complaints_Filed", "derived")
    ]
    name_sub = [
        (400, 140, 48, 22, "First_Name"),
        (520, 140, 48, 22, "Last_Name")
    ]
    for ax, ay, arx, ary, aname, atype in c_attrs: add_line(c_citizen[0], c_citizen[1], ax, ay)
    for sx, sy, srx, sry, sname in name_sub: add_line(460, 210, sx, sy)

    # Road Attributes
    road_attrs = [
        (1200, 230, 50, 23, "Road_ID", "pk"),
        (1330, 210, 52, 23, "Road_Name", "simple"),
        (1470, 210, 50, 23, "Road_Code", "simple"),
        (1600, 230, 52, 23, "Length_KM", "simple"),
        (1160, 350, 50, 23, "Road_Type", "simple"),
        (1200, 430, 52, 23, "Surface_Type", "simple"),
        (1330, 450, 45, 23, "Status", "simple"),
        (1470, 450, 52, 23, "Geom_Path", "simple")
    ]
    for ax, ay, arx, ary, aname, atype in road_attrs: add_line(c_road[0], c_road[1], ax, ay)

    # Authority Attributes
    auth_attrs = [
        (2120, 230, 55, 23, "Authority_ID", "pk"),
        (2260, 210, 62, 23, "Authority_Name", "simple"),
        (2420, 210, 68, 23, "Department_Code", "simple"),
        (2530, 290, 55, 23, "Contact_Email", "simple"),
        (2540, 360, 55, 23, "Contact_Phone", "simple"),
        (2480, 430, 65, 23, "Geom_Boundary", "simple")
    ]
    for ax, ay, arx, ary, aname, atype in auth_attrs: add_line(c_auth[0], c_auth[1], ax, ay)

    # Complaint Attributes
    comp_attrs = [
        (440, 770, 55, 23, "Complaint_ID", "pk"),
        (420, 840, 42, 23, "Title", "simple"),
        (430, 910, 50, 23, "Description", "simple"),
        (480, 970, 45, 23, "Category", "simple"),
        (570, 1000, 52, 23, "Geom_Point", "simple"),
        (710, 1000, 65, 23, "Complaint_Status", "simple"),
        (810, 970, 42, 23, "Priority", "simple"),
        (850, 900, 60, 23, "Escalation_Level", "simple"),
        (850, 830, 48, 23, "Image_URL", "simple"),
        (810, 760, 50, 23, "Created_At", "simple")
    ]
    for ax, ay, arx, ary, aname, atype in comp_attrs: add_line(c_comp[0], c_comp[1], ax, ay)

    # Project Attributes
    proj_attrs = [
        (1540, 760, 50, 23, "Project_ID", "pk"),
        (1650, 740, 42, 23, "Title", "simple"),
        (1780, 740, 62, 23, "Budget_Allocated", "simple"),
        (1890, 780, 55, 23, "Budget_Spent", "simple"),
        (1900, 850, 55, 23, "Project_Status", "simple"),
        (1890, 920, 48, 23, "Start_Date", "simple"),
        (1810, 990, 60, 23, "Target_End_Date", "simple"),
        (1700, 1000, 60, 23, "Actual_End_Date", "simple"),
        (1570, 980, 50, 23, "Delay_Days", "simple"),
        (1510, 900, 65, 23, "Allocated_Per_KM", "derived")
    ]
    for ax, ay, arx, ary, aname, atype in proj_attrs: add_line(c_proj[0], c_proj[1], ax, ay)

    # Tender Attributes
    tend_attrs = [
        (2200, 770, 48, 23, "Tender_ID", "pk"),
        (2310, 750, 52, 23, "Reference_No", "simple"),
        (2490, 790, 38, 23, "Title", "simple"),
        (2510, 860, 58, 23, "Estimated_Value", "simple"),
        (2490, 930, 52, 23, "Tender_Status", "simple"),
        (2400, 980, 52, 23, "Published_Date", "simple"),
        (2270, 980, 48, 23, "Bid_Deadline", "simple")
    ]
    for ax, ay, arx, ary, aname, atype in tend_attrs: add_line(c_tend[0], c_tend[1], ax, ay)

    # Status_History Attributes
    hist_attrs = [
        (470, 1300, 55, 23, "History_Seq", "partial_pk"),
        (450, 1370, 45, 23, "Old_Status", "simple"),
        (470, 1440, 48, 23, "New_Status", "simple"),
        (570, 1490, 50, 23, "Changed_At", "simple"),
        (710, 1490, 45, 23, "Remarks", "simple")
    ]
    for ax, ay, arx, ary, aname, atype in hist_attrs: add_line(c_hist[0], c_hist[1], ax, ay)

    # Project_Milestone Attributes
    mile_attrs = [
        (1190, 1300, 58, 23, "Milestone_Num", "partial_pk"),
        (1180, 1380, 55, 23, "Milestone_Title", "simple"),
        (1230, 1460, 42, 23, "Amount", "simple"),
        (1340, 1490, 60, 23, "Milestone_Status", "simple"),
        (1470, 1490, 45, 23, "Due_Date", "simple"),
        (1560, 1420, 60, 23, "Completion_Date", "simple")
    ]
    for ax, ay, arx, ary, aname, atype in mile_attrs: add_line(c_mile[0], c_mile[1], ax, ay)

    # Contractor Attributes
    cont_attrs = [
        (1990, 1300, 55, 23, "Contractor_ID", "pk"),
        (1970, 1380, 60, 23, "Contractor_Code", "simple"),
        (1980, 1460, 58, 23, "Company_Name", "simple"),
        (2060, 1520, 60, 23, "License_Number", "simple"),
        (2190, 1530, 62, 23, "Registration_Date", "simple"),
        (2310, 1510, 42, 23, "Rating", "simple"),
        (2360, 1440, 65, 23, "Projects_Completed", "simple"),
        (2360, 1370, 60, 23, "Projects_Delayed", "simple"),
        (2330, 1300, 48, 23, "Blacklisted", "simple"),
        (2150, 1260, 68, 23, "Performance_Index", "derived")
    ]
    for ax, ay, arx, ary, aname, atype in cont_attrs: add_line(c_cont[0], c_cont[1], ax, ay)

    # 1. Output all lines
    svg.extend(lines_render)

    # 2. Output all relationships
    svg.extend(rel_render)

    # 3. Output all cardinality badges
    svg.extend(card_render)

    # 4. Output all entities
    def render_entity(x, y, w, h, name, is_weak=False):
        if is_weak:
            svg.append(f'<rect class="weak-entity-outer" x="{x - w/2}" y="{y - h/2}" width="{w}" height="{h}" rx="6"/>')
            svg.append(f'<rect class="weak-entity-inner" x="{x - w/2 + 5}" y="{y - h/2 + 5}" width="{w - 10}" height="{h - 10}" rx="4"/>')
            svg.append(f'<text class="weak-entity-text" x="{x}" y="{y}">{name}</text>')
        else:
            svg.append(f'<rect class="entity-rect" x="{x - w/2}" y="{y - h/2}" width="{w}" height="{h}" rx="6"/>')
            svg.append(f'<text class="entity-text" x="{x}" y="{y}">{name}</text>')

    render_entity(c_citizen[0], c_citizen[1], 180, 60, "Citizen")
    render_entity(c_road[0], c_road[1], 180, 60, "Road")
    render_entity(c_auth[0], c_auth[1], 190, 60, "Authority")
    render_entity(c_comp[0], c_comp[1], 190, 60, "Complaint")
    render_entity(c_proj[0], c_proj[1], 190, 60, "Project")
    render_entity(c_tend[0], c_tend[1], 180, 60, "Tender")
    render_entity(c_hist[0], c_hist[1], 200, 60, "Status_History", is_weak=True)
    render_entity(c_mile[0], c_mile[1], 210, 60, "Project_Milestone", is_weak=True)
    render_entity(c_cont[0], c_cont[1], 190, 60, "Contractor")

    # 5. Output all attributes
    def render_attr(cx, cy, rx, ry, name, attr_type='simple'):
        if attr_type == 'pk':
            svg.append(f'<ellipse class="attr-pk" cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}"/>')
            svg.append(f'<text class="attr-pk-text" x="{cx}" y="{cy}">{name}</text>')
        elif attr_type == 'partial_pk':
            svg.append(f'<ellipse class="attr-ellipse" cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}"/>')
            svg.append(f'<text class="attr-partial-text" x="{cx}" y="{cy}">{name}</text>')
            svg.append(f'<line x1="{cx - len(name)*4.0}" y1="{cy + 7}" x2="{cx + len(name)*4.0}" y2="{cy + 7}" stroke="#581c87" stroke-width="1.8" stroke-dasharray="3,3"/>')
        elif attr_type == 'multi':
            svg.append(f'<ellipse class="attr-multi" cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}"/>')
            svg.append(f'<ellipse class="attr-multi" cx="{cx}" cy="{cy}" rx="{rx - 4}" ry="{ry - 4}"/>')
            svg.append(f'<text class="attr-text" x="{cx}" y="{cy}">{name}</text>')
        elif attr_type == 'derived':
            svg.append(f'<ellipse class="attr-derived" cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}"/>')
            svg.append(f'<text class="attr-text" x="{cx}" y="{cy}">{name}</text>')
        elif attr_type == 'comp':
            svg.append(f'<ellipse class="attr-comp" cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}"/>')
            svg.append(f'<text class="attr-text" x="{cx}" y="{cy}">{name}</text>')
        else:
            svg.append(f'<ellipse class="attr-ellipse" cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}"/>')
            svg.append(f'<text class="attr-text" x="{cx}" y="{cy}">{name}</text>')

    for ax, ay, arx, ary, aname, atype in c_attrs: render_attr(ax, ay, arx, ary, aname, atype)
    for sx, sy, srx, sry, sname in name_sub: render_attr(sx, sy, srx, sry, sname, 'simple')
    for ax, ay, arx, ary, aname, atype in road_attrs: render_attr(ax, ay, arx, ary, aname, atype)
    for ax, ay, arx, ary, aname, atype in auth_attrs: render_attr(ax, ay, arx, ary, aname, atype)
    for ax, ay, arx, ary, aname, atype in comp_attrs: render_attr(ax, ay, arx, ary, aname, atype)
    for ax, ay, arx, ary, aname, atype in proj_attrs: render_attr(ax, ay, arx, ary, aname, atype)
    for ax, ay, arx, ary, aname, atype in tend_attrs: render_attr(ax, ay, arx, ary, aname, atype)
    for ax, ay, arx, ary, aname, atype in hist_attrs: render_attr(ax, ay, arx, ary, aname, atype)
    for ax, ay, arx, ary, aname, atype in mile_attrs: render_attr(ax, ay, arx, ary, aname, atype)
    for ax, ay, arx, ary, aname, atype in cont_attrs: render_attr(ax, ay, arx, ary, aname, atype)
    for bx, by, brx, bry, bname in b_attrs: render_attr(bx, by, brx, bry, bname, 'simple')

    # 6. Clean Academic Legend Box (NO meta commentary, NO warning banners)
    svg.append('''
    <g id="legend" transform="translate(60, 1640)">
        <rect width="2680" height="280" rx="10" fill="#f8fafc" stroke="#cbd5e1" stroke-width="2"/>
        <text x="30" y="35" font-size="20" font-weight="bold" fill="#0f172a">Academic ER Notation Legend (Chen Model &amp; Participation Semantics)</text>
        
        <!-- Row 1 -->
        <g transform="translate(30, 60)">
            <rect class="entity-rect" x="0" y="0" width="130" height="42" rx="4"/>
            <text class="entity-text" x="65" y="21" font-size="14">Strong Entity</text>
            <text class="legend-text" x="150" y="26">Independent entity with intrinsic primary key</text>
        </g>
        <g transform="translate(700, 60)">
            <rect class="weak-entity-outer" x="0" y="0" width="135" height="42" rx="4"/>
            <rect class="weak-entity-inner" x="4" y="4" width="127" height="34" rx="3"/>
            <text class="weak-entity-text" x="67" y="21" font-size="13">Weak Entity</text>
            <text class="legend-text" x="155" y="26">Existence-dependent entity; requires parent PK + Partial Key</text>
        </g>
        <g transform="translate(1500, 60)">
            <polygon class="rel-diamond" points="55,0 110,21 55,42 0,21"/>
            <text class="rel-text" x="55" y="21" font-size="12">Relation</text>
            <text class="legend-text" x="130" y="26">Binary relationship between strong entities (1:1, 1:N, M:N)</text>
        </g>
        <g transform="translate(2160, 60)">
            <polygon class="ident-rel-outer" points="55,0 110,21 55,42 0,21"/>
            <polygon class="ident-rel-inner" points="55,4 102,21 55,38 8,21"/>
            <text class="rel-text" x="55" y="21" font-size="11">Identifying</text>
            <text class="legend-text" x="130" y="26">Identifies weak entity to parent owner</text>
        </g>

        <!-- Row 2 -->
        <g transform="translate(30, 135)">
            <ellipse class="attr-pk" cx="50" cy="20" rx="45" ry="18"/>
            <text class="attr-pk-text" x="50" y="20" font-size="12">Key_Attr</text>
            <text class="legend-text" x="110" y="25">Primary Key attribute (Solid underline)</text>
        </g>
        <g transform="translate(700, 135)">
            <ellipse class="attr-ellipse" cx="50" cy="20" rx="45" ry="18"/>
            <text class="attr-partial-text" x="50" y="20" font-size="12">Partial_Key</text>
            <line x1="18" y1="26" x2="82" y2="26" stroke="#581c87" stroke-width="1.8" stroke-dasharray="3,3"/>
            <text class="legend-text" x="110" y="25">Partial discriminator key of weak entity (Dashed underline)</text>
        </g>
        <g transform="translate(1500, 135)">
            <ellipse class="attr-comp" cx="50" cy="20" rx="45" ry="18"/>
            <text class="attr-text" x="50" y="20" font-size="12">Composite</text>
            <text class="legend-text" x="110" y="25">Decomposable into sub-attributes (e.g. Name -&gt; First, Last)</text>
        </g>
        <g transform="translate(2160, 135)">
            <ellipse class="attr-multi" cx="50" cy="20" rx="45" ry="18"/>
            <ellipse class="attr-multi" cx="50" cy="20" rx="41" ry="14"/>
            <text class="attr-text" x="50" y="20" font-size="12">Multivalued</text>
            <text class="legend-text" x="110" y="25">Multiple values allowed (Double border)</text>
        </g>

        <!-- Row 3 -->
        <g transform="translate(30, 210)">
            <ellipse class="attr-derived" cx="50" cy="20" rx="45" ry="18"/>
            <text class="attr-text" x="50" y="20" font-size="12">Derived</text>
            <text class="legend-text" x="110" y="25">Dynamically computed attribute (Dashed ellipse)</text>
        </g>
        <g transform="translate(700, 210)">
            <line class="total-line-1" x1="0" y1="20" x2="80" y2="20"/>
            <line class="total-line-2" x1="0" y1="20" x2="80" y2="20"/>
            <text class="legend-text" x="100" y="25">Total Participation (Double Line) — Every entity instance MUST participate</text>
        </g>
        <g transform="translate(1500, 210)">
            <line class="conn-line" x1="0" y1="20" x2="80" y2="20"/>
            <text class="legend-text" x="100" y="25">Partial Participation (Single Line) — Participation is optional</text>
        </g>
        <g transform="translate(2160, 210)">
            <circle cx="20" cy="20" r="14" fill="#ffffff" stroke="#94a3b8" stroke-width="1.5"/>
            <text class="card-text" x="20" y="20">1, N, M</text>
            <text class="legend-text" x="50" y="25">Structural Cardinality Constraints</text>
        </g>
    </g>
    ''')

    svg.append('</svg>')
    return '\n'.join(svg)

if __name__ == '__main__':
    svg_content = generate_svg()
    svg_path = '/Users/sanjaywaradkar/ROADWATCH/DBMS_Project_Submission/ROADWATCH_ER_Diagram.svg'
    png_path = '/Users/sanjaywaradkar/ROADWATCH/DBMS_Project_Submission/ROADWATCH_ER_Diagram.png'
    with open(svg_path, 'w') as f:
        f.write(svg_content)
    print("Regenerated clean SVG without faculty comments!")

    subprocess.run([
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "--headless",
        "--disable-gpu",
        f"--screenshot={png_path}",
        "--window-size=2850,2020",
        f"file://{svg_path}"
    ])
    print("Rendered clean PNG!")

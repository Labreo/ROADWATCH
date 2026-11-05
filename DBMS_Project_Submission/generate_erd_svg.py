import math

def generate_svg():
    width = 2400
    height = 1750

    svg = []
    svg.append(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" width="{width}" height="{height}" style="background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif;">')

    # Styles and markers
    svg.append('''
    <defs>
        <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%" filterUnits="userSpaceOnUse">
            <feDropShadow dx="2" dy="3" stdDeviation="3" flood-opacity="0.15"/>
        </filter>
        <style>
            .entity-rect { fill: #dbeafe; stroke: #2563eb; stroke-width: 2.5; filter: url(#shadow); }
            .entity-text { font-size: 20px; font-weight: bold; fill: #1e3a8a; text-anchor: middle; dominant-baseline: central; }
            .weak-entity-outer { fill: #f3e8ff; stroke: #9333ea; stroke-width: 2.5; filter: url(#shadow); }
            .weak-entity-inner { fill: none; stroke: #9333ea; stroke-width: 1.5; }
            .weak-entity-text { font-size: 19px; font-weight: bold; fill: #581c87; text-anchor: middle; dominant-baseline: central; }
            .rel-diamond { fill: #fee2e2; stroke: #dc2626; stroke-width: 2.2; filter: url(#shadow); }
            .rel-text { font-size: 16px; font-weight: bold; fill: #991b1b; text-anchor: middle; dominant-baseline: central; }
            .ident-rel-outer { fill: #fee2e2; stroke: #dc2626; stroke-width: 2.2; filter: url(#shadow); }
            .ident-rel-inner { fill: none; stroke: #dc2626; stroke-width: 1.5; }
            .attr-ellipse { fill: #f8fafc; stroke: #475569; stroke-width: 1.8; }
            .attr-pk { fill: #dcfce7; stroke: #16a34a; stroke-width: 2.2; }
            .attr-comp { fill: #ede9fe; stroke: #7c3aed; stroke-width: 1.8; }
            .attr-multi { fill: #f1f5f9; stroke: #0284c7; stroke-width: 2; }
            .attr-derived { fill: #f8fafc; stroke: #64748b; stroke-width: 1.8; stroke-dasharray: 4,3; }
            .attr-text { font-size: 14px; fill: #1e293b; text-anchor: middle; dominant-baseline: central; }
            .attr-pk-text { font-size: 14px; font-weight: bold; text-decoration: underline; fill: #14532d; text-anchor: middle; dominant-baseline: central; }
            .attr-partial-text { font-size: 14px; font-weight: bold; text-decoration: underline; stroke-dasharray: 2,2; fill: #581c87; text-anchor: middle; dominant-baseline: central; }
            .conn-line { stroke: #334155; stroke-width: 2; }
            .total-line-1 { stroke: #334155; stroke-width: 5; }
            .total-line-2 { stroke: #ffffff; stroke-width: 1.5; }
            .card-text { font-size: 17px; font-weight: bold; fill: #0f172a; text-anchor: middle; dominant-baseline: central; }
            .legend-text { font-size: 14px; fill: #334155; }
        </style>
    </defs>
    ''')

    # Title Banner
    svg.append('''
    <g id="title-banner">
        <rect x="40" y="25" width="2320" height="75" rx="12" fill="#1e293b"/>
        <text x="1200" y="55" fill="#f8fafc" font-size="26" font-weight="bold" text-anchor="middle">ROADWATCH: Entity-Relationship Diagram (Conceptual Data Model in Chen Notation)</text>
        <text x="1200" y="82" fill="#94a3b8" font-size="16" text-anchor="middle">Strict Chen Notation (No Foreign Keys in ERD) | Rectangles: Entities | Diamonds: Relationships | Ellipses: Attributes | Double Borders: Weak / Multivalued | Underline: PK</text>
    </g>
    ''')

    # Helper functions
    def draw_entity(x, y, w, h, name, is_weak=False):
        if is_weak:
            svg.append(f'<rect class="weak-entity-outer" x="{x - w/2}" y="{y - h/2}" width="{w}" height="{h}" rx="6"/>')
            svg.append(f'<rect class="weak-entity-inner" x="{x - w/2 + 5}" y="{y - h/2 + 5}" width="{w - 10}" height="{h - 10}" rx="4"/>')
            svg.append(f'<text class="weak-entity-text" x="{x}" y="{y}">{name}</text>')
        else:
            svg.append(f'<rect class="entity-rect" x="{x - w/2}" y="{y - h/2}" width="{w}" height="{h}" rx="6"/>')
            svg.append(f'<text class="entity-text" x="{x}" y="{y}">{name}</text>')

    def draw_relationship(x, y, rw, rh, name, is_identifying=False):
        pts = f"{x},{y - rh} {x + rw},{y} {x},{y + rh} {x - rw},{y}"
        if is_identifying:
            svg.append(f'<polygon class="ident-rel-outer" points="{pts}"/>')
            pts_inner = f"{x},{y - rh + 6} {x + rw - 8},{y} {x},{y + rh - 6} {x - rw + 8},{y}"
            svg.append(f'<polygon class="ident-rel-inner" points="{pts_inner}"/>')
        else:
            svg.append(f'<polygon class="rel-diamond" points="{pts}"/>')
        svg.append(f'<text class="rel-text" x="{x}" y="{y}">{name}</text>')

    def draw_attribute(cx, cy, rx, ry, name, attr_type='simple'):
        # attr_type: simple, pk, partial_pk, comp, multi, derived
        if attr_type == 'pk':
            svg.append(f'<ellipse class="attr-pk" cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}"/>')
            svg.append(f'<text class="attr-pk-text" x="{cx}" y="{cy}">{name}</text>')
        elif attr_type == 'partial_pk':
            svg.append(f'<ellipse class="attr-ellipse" cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}"/>')
            svg.append(f'<text class="attr-partial-text" x="{cx}" y="{cy}">{name}</text>')
            # Add dashed underline for partial key
            svg.append(f'<line x1="{cx - len(name)*4.2}" y1="{cy + 7}" x2="{cx + len(name)*4.2}" y2="{cy + 7}" stroke="#581c87" stroke-width="1.8" stroke-dasharray="3,3"/>')
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

    def draw_line(x1, y1, x2, y2, total=False):
        if total:
            svg.append(f'<line class="total-line-1" x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}"/>')
            svg.append(f'<line class="total-line-2" x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}"/>')
        else:
            svg.append(f'<line class="conn-line" x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}"/>')

    def draw_cardinality(x, y, card):
        svg.append(f'<circle cx="{x}" cy="{y}" r="12" fill="#ffffff" stroke="#94a3b8" stroke-width="1.5"/>')
        svg.append(f'<text class="card-text" x="{x}" y="{y}">{card}</text>')

    # -------------------------------------------------------------
    # ENTITY POSITIONS
    # -------------------------------------------------------------
    # 1. Citizen
    c_citizen = (380, 260)
    draw_entity(c_citizen[0], c_citizen[1], 180, 60, "Citizen")

    # 2. Road
    c_road = (1200, 260)
    draw_entity(c_road[0], c_road[1], 180, 60, "Road")

    # 3. Authority
    c_auth = (2000, 260)
    draw_entity(c_auth[0], c_auth[1], 180, 60, "Authority")

    # 4. Complaint
    c_comp = (620, 650)
    draw_entity(c_comp[0], c_comp[1], 190, 60, "Complaint")

    # 5. Project
    c_proj = (1680, 650)
    draw_entity(c_proj[0], c_proj[1], 190, 60, "Project")

    # 6. Contractor
    c_cont = (2120, 1080)
    draw_entity(c_cont[0], c_cont[1], 190, 60, "Contractor")

    # 7. Tender
    c_tend = (1750, 1080)
    draw_entity(c_tend[0], c_tend[1], 180, 60, "Tender")

    # 8. Status_History (Weak Entity of Complaint)
    c_hist = (620, 1080)
    draw_entity(c_hist[0], c_hist[1], 200, 60, "Status_History", is_weak=True)

    # 9. Project_Milestone (Weak Entity of Project)
    c_mile = (1200, 1080)
    draw_entity(c_mile[0], c_mile[1], 210, 60, "Project_Milestone", is_weak=True)

    # -------------------------------------------------------------
    # RELATIONSHIPS
    # -------------------------------------------------------------
    # R1: Manages (Authority 1 -> Road N)
    r_manages = (1600, 260)
    draw_line(c_auth[0] - 90, c_auth[1], r_manages[0] + 65, r_manages[1], total=False)
    draw_line(r_manages[0] - 65, r_manages[1], c_road[0] + 90, c_road[1], total=True)
    draw_relationship(r_manages[0], r_manages[1], 65, 34, "Manages")
    draw_cardinality(c_auth[0] - 115, c_auth[1] - 18, "1")
    draw_cardinality(c_road[0] + 115, c_road[1] - 18, "N")

    # R2: Files (Citizen 1 -> Complaint N)
    r_files = (470, 460)
    draw_line(c_citizen[0] + 40, c_citizen[1] + 30, r_files[0] - 20, r_files[1] - 25, total=False)
    draw_line(r_files[0] + 20, r_files[1] + 25, c_comp[0] - 50, c_comp[1] - 30, total=True)
    draw_relationship(r_files[0], r_files[1], 55, 32, "Files")
    draw_cardinality(c_citizen[0] + 60, c_citizen[1] + 50, "1")
    draw_cardinality(c_comp[0] - 75, c_comp[1] - 45, "N")

    # R3: Occurs_On (Complaint N -> Road 1)
    r_occurs = (910, 450)
    draw_line(c_comp[0] + 60, c_comp[1] - 30, r_occurs[0] - 30, r_occurs[1] + 25, total=True)
    draw_line(r_occurs[0] + 30, r_occurs[1] - 25, c_road[0] - 60, c_road[1] + 30, total=False)
    draw_relationship(r_occurs[0], r_occurs[1], 65, 32, "Occurs_On")
    draw_cardinality(c_comp[0] + 85, c_comp[1] - 45, "N")
    draw_cardinality(c_road[0] - 85, c_road[1] + 50, "1")

    # R4: Assigned_To (Complaint N -> Authority 1)
    # Routed through a clear diamond
    r_assign = (1310, 520)
    draw_line(c_comp[0] + 95, c_comp[1] - 15, r_assign[0] - 65, r_assign[1], total=True)
    draw_line(r_assign[0] + 65, r_assign[1], c_auth[0] - 50, c_auth[1] + 30, total=False)
    draw_relationship(r_assign[0], r_assign[1], 65, 32, "Assigned_To")
    draw_cardinality(c_comp[0] + 120, c_comp[1] - 28, "N")
    draw_cardinality(c_auth[0] - 70, c_auth[1] + 45, "1")

    # R5: Associated_With (Project N -> Road 1)
    r_assoc = (1440, 450)
    draw_line(c_proj[0] - 50, c_proj[1] - 30, r_assoc[0] + 30, r_assoc[1] + 25, total=True)
    draw_line(r_assoc[0] - 30, r_assoc[1] - 25, c_road[0] + 60, c_road[1] + 30, total=False)
    draw_relationship(r_assoc[0], r_assoc[1], 75, 32, "Associated_With")
    draw_cardinality(c_proj[0] - 75, c_proj[1] - 45, "N")
    draw_cardinality(c_road[0] + 85, c_road[1] + 50, "1")

    # R6: Governs (Authority 1 -> Project N)
    r_gov = (1850, 460)
    draw_line(c_auth[0] - 20, c_auth[1] + 30, r_gov[0] + 20, r_gov[1] - 25, total=False)
    draw_line(r_gov[0] - 20, r_gov[1] + 25, c_proj[0] + 40, c_proj[1] - 30, total=True)
    draw_relationship(r_gov[0], r_gov[1], 60, 32, "Governs")
    draw_cardinality(c_auth[0] - 40, c_auth[1] + 50, "1")
    draw_cardinality(c_proj[0] + 60, c_proj[1] - 45, "N")

    # R7: Executes (Contractor 1 -> Project N)
    r_exec = (1910, 860)
    draw_line(c_cont[0] - 30, c_cont[1] - 30, r_exec[0] + 20, r_exec[1] + 25, total=False)
    draw_line(r_exec[0] - 20, r_exec[1] - 25, c_proj[0] + 50, c_proj[1] + 30, total=True)
    draw_relationship(r_exec[0], r_exec[1], 60, 32, "Executes")
    draw_cardinality(c_cont[0] - 50, c_cont[1] - 45, "1")
    draw_cardinality(c_proj[0] + 75, c_proj[1] + 45, "N")

    # R8: Floats (Authority 1 -> Tender N)
    r_floats = (1960, 680)
    draw_line(c_auth[0] + 20, c_auth[1] + 30, r_floats[0] + 10, r_floats[1] - 30, total=False)
    draw_line(r_floats[0] - 10, r_floats[1] + 30, c_tend[0] + 50, c_tend[1] - 30, total=True)
    draw_relationship(r_floats[0], r_floats[1], 55, 32, "Floats")
    draw_cardinality(c_auth[0] + 40, c_auth[1] + 50, "1")
    draw_cardinality(c_tend[0] + 70, c_tend[1] - 45, "N")

    # R9: Bids_On (Contractor M -> Tender N)
    r_bids = (1940, 1080)
    draw_line(c_cont[0] - 95, c_cont[1], r_bids[0] + 55, r_bids[1], total=False)
    draw_line(r_bids[0] - 55, r_bids[1], c_tend[0] + 90, c_tend[1], total=False)
    draw_relationship(r_bids[0], r_bids[1], 55, 32, "Bids_On")
    draw_cardinality(c_cont[0] - 115, c_cont[1] - 18, "M")
    draw_cardinality(c_tend[0] + 115, c_tend[1] - 18, "N")

    # Attributes on Bids_On relationship
    b_attrs = [
        (1880, 1200, 65, 23, "Financial_Quote"),
        (1990, 1200, 60, 23, "Technical_Score"),
        (1940, 1260, 50, 22, "Is_Winner")
    ]
    for bx, by, brx, bry, bname in b_attrs:
        draw_line(r_bids[0], r_bids[1] + 30, bx, by - bry)
        draw_attribute(bx, by, brx, bry, bname)

    # R10: Has_Milestone (Project 1 -> Project_Milestone N) [Identifying Relationship]
    r_hmile = (1440, 870)
    draw_line(c_proj[0] - 60, c_proj[1] + 30, r_hmile[0] + 30, r_hmile[1] - 25, total=False)
    draw_line(r_hmile[0] - 30, r_hmile[1] + 25, c_mile[0] + 50, c_mile[1] - 30, total=True)
    draw_relationship(r_hmile[0], r_hmile[1], 68, 34, "Has_Milestone", is_identifying=True)
    draw_cardinality(c_proj[0] - 85, c_proj[1] + 45, "1")
    draw_cardinality(c_mile[0] + 75, c_mile[1] - 45, "N")

    # R11: Has_History (Complaint 1 -> Status_History N) [Identifying Relationship]
    r_hhist = (620, 860)
    draw_line(c_comp[0], c_comp[1] + 30, r_hhist[0], r_hhist[1] - 32, total=False)
    draw_line(r_hhist[0], r_hhist[1] + 32, c_hist[0], c_hist[1] - 30, total=True)
    draw_relationship(r_hhist[0], r_hhist[1], 62, 34, "Has_History", is_identifying=True)
    draw_cardinality(c_comp[0] + 18, c_comp[1] + 45, "1")
    draw_cardinality(c_hist[0] + 18, c_hist[1] - 45, "N")

    # -------------------------------------------------------------
    # ATTRIBUTES FOR EACH ENTITY
    # -------------------------------------------------------------
    # 1. Citizen Attributes
    c_attrs = [
        (220, 150, 52, 23, "Citizen_ID", "pk"),
        (380, 130, 45, 23, "Name", "comp"),
        (520, 150, 48, 23, "Email", "simple"),
        (200, 240, 65, 23, "Phone_Numbers", "multi"),
        (200, 320, 68, 23, "Residential_Ward", "simple"),
        (380, 370, 78, 23, "Total_Complaints_Filed", "derived")
    ]
    # Name composite children
    name_sub = [
        (320, 60, 48, 22, "First_Name"),
        (440, 60, 48, 22, "Last_Name")
    ]
    for ax, ay, arx, ary, aname, atype in c_attrs:
        draw_line(c_citizen[0], c_citizen[1], ax, ay)
        draw_attribute(ax, ay, arx, ary, aname, atype)
    for sx, sy, srx, sry, sname in name_sub:
        draw_line(380, 130, sx, sy)
        draw_attribute(sx, sy, srx, sry, sname, 'simple')

    # 2. Road Attributes
    road_attrs = [
        (1020, 140, 50, 23, "Road_ID", "pk"),
        (1140, 130, 52, 23, "Road_Name", "simple"),
        (1260, 130, 50, 23, "Road_Code", "simple"),
        (1380, 140, 52, 23, "Length_KM", "simple"),
        (980, 260, 50, 23, "Road_Type", "simple"),
        (1020, 340, 52, 23, "Surface_Type", "simple"),
        (1140, 370, 45, 23, "Status", "simple"),
        (1280, 370, 52, 23, "Geom_Path", "simple")
    ]
    for ax, ay, arx, ary, aname, atype in road_attrs:
        draw_line(c_road[0], c_road[1], ax, ay)
        draw_attribute(ax, ay, arx, ary, aname, atype)

    # 3. Authority Attributes
    auth_attrs = [
        (1840, 140, 55, 23, "Authority_ID", "pk"),
        (1970, 130, 62, 23, "Authority_Name", "simple"),
        (2110, 130, 68, 23, "Department_Code", "simple"),
        (2220, 210, 55, 23, "Contact_Email", "simple"),
        (2230, 280, 55, 23, "Contact_Phone", "simple"),
        (2160, 360, 65, 23, "Geom_Boundary", "simple")
    ]
    for ax, ay, arx, ary, aname, atype in auth_attrs:
        draw_line(c_auth[0], c_auth[1], ax, ay)
        draw_attribute(ax, ay, arx, ary, aname, atype)

    # 4. Complaint Attributes
    comp_attrs = [
        (420, 590, 55, 23, "Complaint_ID", "pk"),
        (410, 660, 42, 23, "Title", "simple"),
        (420, 730, 50, 23, "Description", "simple"),
        (470, 790, 45, 23, "Category", "simple"),
        (560, 810, 52, 23, "Geom_Point", "simple"),
        (680, 810, 65, 23, "Complaint_Status", "simple"),
        (780, 780, 42, 23, "Priority", "simple"),
        (820, 710, 60, 23, "Escalation_Level", "simple"),
        (820, 640, 48, 23, "Image_URL", "simple"),
        (790, 570, 50, 23, "Created_At", "simple")
    ]
    for ax, ay, arx, ary, aname, atype in comp_attrs:
        draw_line(c_comp[0], c_comp[1], ax, ay)
        draw_attribute(ax, ay, arx, ary, aname, atype)

    # 5. Project Attributes
    proj_attrs = [
        (1520, 570, 50, 23, "Project_ID", "pk"),
        (1640, 550, 42, 23, "Title", "simple"),
        (1750, 550, 62, 23, "Budget_Allocated", "simple"),
        (1850, 590, 55, 23, "Budget_Spent", "simple"),
        (1850, 660, 55, 23, "Project_Status", "simple"),
        (1850, 730, 48, 23, "Start_Date", "simple"),
        (1770, 790, 60, 23, "Target_End_Date", "simple"),
        (1660, 800, 60, 23, "Actual_End_Date", "simple"),
        (1550, 770, 50, 23, "Delay_Days", "simple"),
        (1510, 700, 65, 23, "Allocated_Per_KM", "derived")
    ]
    for ax, ay, arx, ary, aname, atype in proj_attrs:
        draw_line(c_proj[0], c_proj[1], ax, ay)
        draw_attribute(ax, ay, arx, ary, aname, atype)

    # 6. Contractor Attributes
    cont_attrs = [
        (2280, 960, 55, 23, "Contractor_ID", "pk"),
        (2300, 1030, 60, 23, "Contractor_Code", "simple"),
        (2310, 1100, 58, 23, "Company_Name", "simple"),
        (2300, 1170, 60, 23, "License_Number", "simple"),
        (2270, 1240, 62, 23, "Registration_Date", "simple"),
        (2210, 1300, 42, 23, "Rating", "simple"),
        (2110, 1310, 65, 23, "Projects_Completed", "simple"),
        (2010, 1300, 60, 23, "Projects_Delayed", "simple"),
        (1970, 1230, 48, 23, "Blacklisted", "simple"),
        (2160, 950, 68, 23, "Performance_Index", "derived")
    ]
    for ax, ay, arx, ary, aname, atype in cont_attrs:
        draw_line(c_cont[0], c_cont[1], ax, ay)
        draw_attribute(ax, ay, arx, ary, aname, atype)

    # 7. Tender Attributes
    tend_attrs = [
        (1640, 990, 48, 23, "Tender_ID", "pk"),
        (1750, 980, 52, 23, "Reference_No", "simple"),
        (1610, 1070, 38, 23, "Title", "simple"),
        (1610, 1140, 58, 23, "Estimated_Value", "simple"),
        (1670, 1210, 52, 23, "Tender_Status", "simple"),
        (1760, 1220, 52, 23, "Published_Date", "simple"),
        (1830, 1160, 48, 23, "Bid_Deadline", "simple")
    ]
    for ax, ay, arx, ary, aname, atype in tend_attrs:
        draw_line(c_tend[0], c_tend[1], ax, ay)
        draw_attribute(ax, ay, arx, ary, aname, atype)

    # 8. Status_History Attributes (Weak Entity)
    hist_attrs = [
        (460, 1020, 55, 23, "History_Seq", "partial_pk"),
        (440, 1090, 45, 23, "Old_Status", "simple"),
        (460, 1160, 48, 23, "New_Status", "simple"),
        (560, 1200, 50, 23, "Changed_At", "simple"),
        (680, 1200, 45, 23, "Remarks", "simple")
    ]
    for ax, ay, arx, ary, aname, atype in hist_attrs:
        draw_line(c_hist[0], c_hist[1], ax, ay)
        draw_attribute(ax, ay, arx, ary, aname, atype)

    # 9. Project_Milestone Attributes (Weak Entity)
    mile_attrs = [
        (1040, 1020, 58, 23, "Milestone_Num", "partial_pk"),
        (1030, 1100, 55, 23, "Milestone_Title", "simple"),
        (1070, 1170, 42, 23, "Amount", "simple"),
        (1170, 1200, 60, 23, "Milestone_Status", "simple"),
        (1280, 1200, 45, 23, "Due_Date", "simple"),
        (1340, 1140, 60, 23, "Completion_Date", "simple")
    ]
    for ax, ay, arx, ary, aname, atype in mile_attrs:
        draw_line(c_mile[0], c_mile[1], ax, ay)
        draw_attribute(ax, ay, arx, ary, aname, atype)

    # -------------------------------------------------------------
    # LEGEND BOX
    # -------------------------------------------------------------
    svg.append('''
    <g id="legend" transform="translate(60, 1370)">
        <rect width="2280" height="330" rx="10" fill="#f8fafc" stroke="#cbd5e1" stroke-width="2"/>
        <text x="30" y="35" font-size="20" font-weight="bold" fill="#0f172a">Academic ER Notation Legend (Chen Model & Participation Semantics)</text>
        
        <!-- Row 1 -->
        <g transform="translate(30, 60)">
            <rect class="entity-rect" x="0" y="0" width="120" height="40" rx="4"/>
            <text class="entity-text" x="60" y="20" font-size="14">Strong Entity</text>
            <text class="legend-text" x="140" y="25">Independent entity with intrinsic primary key</text>
        </g>
        <g transform="translate(600, 60)">
            <rect class="weak-entity-outer" x="0" y="0" width="130" height="40" rx="4"/>
            <rect class="weak-entity-inner" x="4" y="4" width="122" height="32" rx="3"/>
            <text class="weak-entity-text" x="65" y="20" font-size="13">Weak Entity</text>
            <text class="legend-text" x="150" y="25">Existence-dependent entity; requires parent PK + Partial Key</text>
        </g>
        <g transform="translate(1300, 60)">
            <polygon class="rel-diamond" points="50,0 100,20 50,40 0,20"/>
            <text class="rel-text" x="50" y="20" font-size="12">Relation</text>
            <text class="legend-text" x="120" y="25">Binary relationship between strong entities (1:1, 1:N, M:N)</text>
        </g>
        <g transform="translate(1850, 60)">
            <polygon class="ident-rel-outer" points="50,0 100,20 50,40 0,20"/>
            <polygon class="ident-rel-inner" points="50,4 92,20 50,36 8,20"/>
            <text class="rel-text" x="50" y="20" font-size="11">Identifying</text>
            <text class="legend-text" x="120" y="25">Identifies weak entity to parent owner</text>
        </g>

        <!-- Row 2 -->
        <g transform="translate(30, 140)">
            <ellipse class="attr-pk" cx="50" cy="20" rx="45" ry="18"/>
            <text class="attr-pk-text" x="50" y="20" font-size="12">Key_Attr</text>
            <text class="legend-text" x="110" y="25">Primary Key attribute (Solid underline)</text>
        </g>
        <g transform="translate(600, 140)">
            <ellipse class="attr-ellipse" cx="50" cy="20" rx="45" ry="18"/>
            <text class="attr-partial-text" x="50" y="20" font-size="12">Partial_Key</text>
            <line x1="18" y1="26" x2="82" y2="26" stroke="#581c87" stroke-width="1.8" stroke-dasharray="3,3"/>
            <text class="legend-text" x="110" y="25">Partial discriminator key of weak entity (Dashed underline)</text>
        </g>
        <g transform="translate(1300, 140)">
            <ellipse class="attr-comp" cx="50" cy="20" rx="45" ry="18"/>
            <text class="attr-text" x="50" y="20" font-size="12">Composite</text>
            <text class="legend-text" x="110" y="25">Decomposable into atomic sub-attributes (e.g. Name -> First, Last)</text>
        </g>
        <g transform="translate(1850, 140)">
            <ellipse class="attr-multi" cx="50" cy="20" rx="45" ry="18"/>
            <ellipse class="attr-multi" cx="50" cy="20" rx="41" ry="14"/>
            <text class="attr-text" x="50" y="20" font-size="12">Multivalued</text>
            <text class="legend-text" x="110" y="25">Multiple values per entity (Double border)</text>
        </g>

        <!-- Row 3 -->
        <g transform="translate(30, 220)">
            <ellipse class="attr-derived" cx="50" cy="20" rx="45" ry="18"/>
            <text class="attr-text" x="50" y="20" font-size="12">Derived</text>
            <text class="legend-text" x="110" y="25">Dynamically computed attribute (Dashed ellipse)</text>
        </g>
        <g transform="translate(600, 220)">
            <line class="total-line-1" x1="0" y1="20" x2="80" y2="20"/>
            <line class="total-line-2" x1="0" y1="20" x2="80" y2="20"/>
            <text class="legend-text" x="100" y="25">Total Participation (Double Line) — Every entity instance MUST participate</text>
        </g>
        <g transform="translate(1300, 220)">
            <line class="conn-line" x1="0" y1="20" x2="80" y2="20"/>
            <text class="legend-text" x="100" y="25">Partial Participation (Single Line) — Participation is optional</text>
        </g>
        <g transform="translate(1850, 220)">
            <circle cx="20" cy="20" r="14" fill="#ffffff" stroke="#94a3b8" stroke-width="1.5"/>
            <text class="card-text" x="20" y="20">1, N, M</text>
            <text class="legend-text" x="50" y="25">Structural Cardinality Constraints</text>
        </g>
    </g>
    ''')

    svg.append('</svg>')
    return '\n'.join(svg)

if __name__ == '__main__':
    content = generate_svg()
    with open('/Users/sanjaywaradkar/ROADWATCH/DBMS_Project_Submission/ROADWATCH_ER_Diagram.svg', 'w') as f:
        f.write(content)
    print("Generated ROADWATCH_ER_Diagram.svg successfully!")

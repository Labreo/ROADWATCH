#!/usr/bin/env python3
"""
Generates 20 High-Fidelity UI Wireframe Screens (Frames) for ROADWATCH DBMS Project.
Outputs:
1. 20 standalone Figma-ready SVG files in DBMS_Project_Submission/figma_frames/Frame_01_*.svg .. Frame_20_*.svg
2. 1 combined Master Figma Canvas SVG in DBMS_Project_Submission/ROADWATCH_All_20_Figma_Frames.svg
3. 20 high-res PNG renders via Headless Chrome in DBMS_Project_Submission/figma_frames/png/
4. Interactive Figma Canvas Web Showcase in DBMS_Project_Submission/wireframes/index.html
"""

import os
import html

BASE_DIR = "/Users/sanjaywaradkar/ROADWATCH/DBMS_Project_Submission"
SVG_DIR = os.path.join(BASE_DIR, "figma_frames")
PNG_DIR = os.path.join(SVG_DIR, "png")
WIREFRAMES_DIR = os.path.join(BASE_DIR, "wireframes")

os.makedirs(SVG_DIR, exist_ok=True)
os.makedirs(PNG_DIR, exist_ok=True)
os.makedirs(WIREFRAMES_DIR, exist_ok=True)


def esc(text):
    return html.escape(str(text))


# ---------------------------------------------------------------------------
# SHARED UI PRIMITIVES FOR HIGH-FIDELITY SVG FRAMES
# ---------------------------------------------------------------------------

def svg_defs():
    return """
  <defs>
    <linearGradient id="bgDark" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0b1120"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
    <linearGradient id="cardGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1e293b"/>
      <stop offset="100%" stop-color="#151f32"/>
    </linearGradient>
    <linearGradient id="blueGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#2563eb"/>
      <stop offset="100%" stop-color="#0ea5e9"/>
    </linearGradient>
    <linearGradient id="emeraldGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#059669"/>
      <stop offset="100%" stop-color="#10b981"/>
    </linearGradient>
    <linearGradient id="amberGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#d97706"/>
      <stop offset="100%" stop-color="#f59e0b"/>
    </linearGradient>
    <linearGradient id="roseGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#e11d48"/>
      <stop offset="100%" stop-color="#f43f5e"/>
    </linearGradient>
    <linearGradient id="mapBg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0c192c"/>
      <stop offset="100%" stop-color="#0f243c"/>
    </linearGradient>
    <filter id="shadow" x="-4%" y="-4%" width="108%" height="112%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000000" flood-opacity="0.35"/>
    </filter>
  </defs>
"""


def desktop_shell(frame_id, title, section, active_nav, db_tables, inner_content):
    """
    Renders a complete 1440x900 Desktop Web Screen with:
    - Left Navigation Sidebar (220px) matching ROADWATCH Sidebar.tsx
    - Top Header Bar (56px) matching ROADWATCH TopNav.tsx
    - Main Viewport Area (1220x812)
    - Bottom Database Telemetry Status Bar (32px)
    """
    nav_items = [
        ("roads", "Geospatial Map", "MAP"),
        ("chat", "AI Chat Assistant", "AI"),
        ("budgets", "Budget Compliance", "INR"),
        ("contractors", "Contractor Scores", "CON"),
        ("complaints", "Citizen Complaints", "CMP"),
        ("admin", "Operations Center", "OPS"),
        ("sla", "SLA Escalations", "SLA"),
        ("conflicts", "Boundary Conflicts", "GIS"),
        ("scheduler", "Repair Scheduler", "SCH"),
        ("playback", "Historical Playback", " T "),
        ("sensors", "IoT Sensor Monitor", "IOT"),
        ("twin", "3D Digital Twin", "3D"),
        ("regions", "Multi-Region Hub", "REG"),
        ("tenders", "Procurement Ledger", "TND"),
        ("audit", "Forensic Audit Log", "LOG"),
    ]

    sidebar_svg = [
        f'<g id="Sidebar_{frame_id}">',
        '<rect x="0" y="0" width="220" height="900" fill="#090d16"/>',
        '<line x1="220" y1="0" x2="220" y2="900" stroke="#1e293b" stroke-width="1"/>',
        # Brand header
        '<rect x="16" y="14" width="30" height="30" rx="8" fill="url(#blueGrad)"/>',
        '<text x="31" y="34" font-family="Inter, sans-serif" font-size="14" font-weight="800" fill="#ffffff" text-anchor="middle">R</text>',
        '<text x="56" y="28" font-family="Inter, sans-serif" font-size="15" font-weight="800" fill="#ffffff" letter-spacing="0.5">ROADWATCH</text>',
        '<text x="56" y="42" font-family="JetBrains Mono, monospace" font-size="9" font-weight="600" fill="#38bdf8">POSTGIS v16 • CIVIC AI</text>',
        '<line x1="0" y1="56" x2="220" y2="56" stroke="#1e293b" stroke-width="1"/>',
        '<text x="18" y="76" font-family="Inter, sans-serif" font-size="9" font-weight="700" fill="#64748b" letter-spacing="1.2">PLATFORM MODULES</text>',
    ]

    y = 88
    for key, label, code in nav_items:
        is_act = (key == active_nav)
        if is_act:
            sidebar_svg.append(f'<rect x="10" y="{y}" width="200" height="34" rx="7" fill="#1e3a8a" stroke="#3b82f6" stroke-width="1"/>')
            sidebar_svg.append(f'<rect x="10" y="{y+7}" width="3" height="20" rx="1.5" fill="#38bdf8"/>')
            sidebar_svg.append(f'<rect x="20" y="{y+7}" width="26" height="20" rx="4" fill="#2563eb"/>')
            sidebar_svg.append(f'<text x="33" y="{y+20}" font-family="JetBrains Mono, monospace" font-size="8.5" font-weight="700" fill="#ffffff" text-anchor="middle">{esc(code)}</text>')
            sidebar_svg.append(f'<text x="54" y="{y+21}" font-family="Inter, sans-serif" font-size="11.5" font-weight="700" fill="#ffffff">{esc(label)}</text>')
        else:
            sidebar_svg.append(f'<rect x="20" y="{y+7}" width="26" height="20" rx="4" fill="#1e293b"/>')
            sidebar_svg.append(f'<text x="33" y="{y+20}" font-family="JetBrains Mono, monospace" font-size="8.5" font-weight="600" fill="#94a3b8" text-anchor="middle">{esc(code)}</text>')
            sidebar_svg.append(f'<text x="54" y="{y+21}" font-family="Inter, sans-serif" font-size="11.5" font-weight="500" fill="#94a3b8">{esc(label)}</text>')
        y += 38

    # Bottom user & mission clock card in sidebar
    sidebar_svg.extend([
        '<rect x="12" y="676" width="196" height="92" rx="8" fill="#0f172a" stroke="#1e293b"/>',
        '<text x="24" y="696" font-family="JetBrains Mono, monospace" font-size="9" font-weight="700" fill="#38bdf8">DB ENGINE TELEMETRY</text>',
        '<circle cx="28" cy="714" r="4" fill="#10b981"/>',
        '<text x="38" y="718" font-family="Inter, sans-serif" font-size="10.5" font-weight="600" fill="#e2e8f0">PostGIS 3.4 Spatial GIST</text>',
        '<text x="24" y="736" font-family="JetBrains Mono, monospace" font-size="9.5" fill="#94a3b8">UTC Clock: 14:32:08Z</text>',
        '<text x="24" y="754" font-family="JetBrains Mono, monospace" font-size="9.5" fill="#94a3b8">Sync Queue: 0 Pending</text>',
        # User profile box
        '<rect x="12" y="780" width="196" height="76" rx="8" fill="#131c2e" stroke="#1e293b"/>',
        '<circle cx="34" cy="810" r="14" fill="#2563eb"/>',
        '<text x="34" y="814" font-family="Inter, sans-serif" font-size="11" font-weight="700" fill="#ffffff" text-anchor="middle">KW</text>',
        '<text x="56" y="804" font-family="Inter, sans-serif" font-size="11" font-weight="700" fill="#ffffff">Kanak Waradkar</text>',
        '<text x="56" y="818" font-family="JetBrains Mono, monospace" font-size="9" fill="#38bdf8">Roll: 24B-CO-030</text>',
        '<text x="24" y="842" font-family="Inter, sans-serif" font-size="9.5" fill="#94a3b8">Team: Krushna (031) • Manjunath (035)</text>',
        '</g>'
    ])

    topbar_svg = f"""
    <g id="TopNav_{frame_id}">
      <rect x="220" y="0" width="1220" height="56" fill="#0f172a"/>
      <line x1="220" y1="56" x2="1440" y2="56" stroke="#1e293b" stroke-width="1"/>
      <text x="244" y="23" font-family="JetBrains Mono, monospace" font-size="9.5" font-weight="700" fill="#38bdf8" letter-spacing="0.8">{esc(section.upper())}</text>
      <text x="244" y="42" font-family="Inter, sans-serif" font-size="14" font-weight="800" fill="#ffffff">{esc(title)}</text>

      <!-- Global Search Bar -->
      <rect x="734" y="12" width="228" height="32" rx="6" fill="#1e293b" stroke="#334155"/>
      <text x="748" y="32" font-family="Inter, sans-serif" font-size="10.5" fill="#94a3b8">Search WEH-NH8, SV-RD-01, ID...</text>
      <rect x="924" y="17" width="30" height="22" rx="4" fill="#0f172a"/>
      <text x="939" y="31" font-family="JetBrains Mono, monospace" font-size="9.5" fill="#64748b" text-anchor="middle">⌘K</text>

      <!-- Region Pill -->
      <rect x="974" y="12" width="142" height="32" rx="6" fill="#1e293b" stroke="#334155"/>
      <text x="988" y="32" font-family="Inter, sans-serif" font-size="11" font-weight="600" fill="#f8fafc">IN • India (Mumbai • ₹)</text>

      <!-- Online Status Pill -->
      <rect x="1128" y="12" width="124" height="32" rx="6" fill="#064e3b" stroke="#059669"/>
      <circle cx="1144" cy="28" r="4" fill="#10b981"/>
      <text x="1156" y="32" font-family="JetBrains Mono, monospace" font-size="10" font-weight="700" fill="#a7f3d0">POSTGIS ONLINE</text>

      <!-- Role Badge -->
      <rect x="1264" y="12" width="156" height="32" rx="6" fill="#1e3a8a" stroke="#3b82f6"/>
      <text x="1342" y="32" font-family="Inter, sans-serif" font-size="11" font-weight="700" fill="#bfdbfe" text-anchor="middle">Frame #{frame_id:02d} • 1440×900</text>
    </g>
    """

    footer_svg = f"""
    <g id="FooterBar_{frame_id}">
      <rect x="220" y="868" width="1220" height="32" fill="#090d16"/>
      <line x1="220" y1="868" x2="1440" y2="868" stroke="#1e293b" stroke-width="1"/>
      <text x="244" y="888" font-family="JetBrains Mono, monospace" font-size="10" font-weight="600" fill="#38bdf8">BOUND DBMS RELATIONS: {esc(db_tables)}</text>
      <text x="1420" y="888" font-family="JetBrains Mono, monospace" font-size="10" fill="#64748b" text-anchor="end">ROADWATCH DBMS • Kanak Waradkar (24B-CO-030) • Krushna Surve (24B-CO-031) • Manjunath Gavada (24B-CO-035)</text>
    </g>
    """

    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 900" width="1440" height="900">
  {svg_defs()}
  <rect id="Frame_{frame_id:02d}_Background" x="0" y="0" width="1440" height="900" fill="#0b1120"/>
  {''.join(sidebar_svg)}
  {topbar_svg}
  <g id="MainContent_{frame_id}">
    {inner_content}
  </g>
  {footer_svg}
</svg>"""


def mobile_shell(frame_id, title, subtitle, step_pct, active_tab, db_tables, inner_content):
    """
    Renders a complete 390x844 Mobile PWA Screen with:
    - iOS/Android Status Bar (36px)
    - Mobile App Header + Progress Bar (58px)
    - Main Content Viewport (390x674)
    - Bottom Navigation Bar + DBMS Binding Strip (76px)
    """
    tabs = [
        ("map", "GIS Map"),
        ("report", "Report Defect"),
        ("my", "My Reports"),
        ("sync", "Offline Sync"),
    ]
    tab_svg = []
    tx = 0
    for key, lbl in tabs:
        is_act = (key == active_tab)
        col = "#38bdf8" if is_act else "#64748b"
        fw = "700" if is_act else "500"
        if is_act:
            tab_svg.append(f'<rect x="{tx+16}" y="772" width="65" height="3" rx="1.5" fill="#38bdf8"/>')
        tab_svg.append(f'<circle cx="{tx+48}" cy="790" r="9" fill="{"#1e3a8a" if is_act else "#1e293b"}" stroke="{col}" stroke-width="1.2"/>')
        tab_svg.append(f'<text x="{tx+48}" y="814" font-family="Inter, sans-serif" font-size="10" font-weight="{fw}" fill="{col}" text-anchor="middle">{esc(lbl)}</text>')
        tx += 97

    prog_width = int(358 * (step_pct / 100.0))

    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 390 844" width="390" height="844">
  {svg_defs()}
  <rect id="Frame_{frame_id:02d}_Mobile_BG" x="0" y="0" width="390" height="844" rx="28" fill="#0b1120" stroke="#334155" stroke-width="2"/>
  
  <!-- Status Bar -->
  <g id="StatusBar_{frame_id}">
    <text x="24" y="24" font-family="Inter, sans-serif" font-size="12" font-weight="700" fill="#f8fafc">09:42</text>
    <rect x="145" y="10" width="100" height="18" rx="9" fill="#000000"/>
    <text x="310" y="24" font-family="JetBrains Mono, monospace" font-size="10.5" font-weight="700" fill="#38bdf8">5G • 100%</text>
  </g>

  <!-- App Header -->
  <g id="MobileHeader_{frame_id}">
    <rect x="0" y="34" width="390" height="58" fill="#0f172a"/>
    <line x1="0" y1="92" x2="390" y2="92" stroke="#1e293b" stroke-width="1"/>
    <rect x="16" y="44" width="28" height="28" rx="7" fill="url(#blueGrad)"/>
    <text x="30" y="63" font-family="Inter, sans-serif" font-size="13" font-weight="800" fill="#ffffff" text-anchor="middle">R</text>
    <text x="52" y="56" font-family="Inter, sans-serif" font-size="13.5" font-weight="800" fill="#ffffff">{esc(title)}</text>
    <text x="52" y="71" font-family="JetBrains Mono, monospace" font-size="9.5" fill="#38bdf8">{esc(subtitle)}</text>
    <rect x="312" y="46" width="62" height="22" rx="5" fill="#1e3a8a" stroke="#3b82f6"/>
    <text x="343" y="61" font-family="JetBrains Mono, monospace" font-size="9.5" font-weight="700" fill="#bfdbfe" text-anchor="middle">F#{frame_id:02d}</text>
    <rect x="16" y="80" width="358" height="5" rx="2.5" fill="#1e293b"/>
    <rect x="16" y="80" width="{prog_width}" height="5" rx="2.5" fill="url(#blueGrad)"/>
  </g>

  <!-- Main Mobile Content -->
  <g id="MobileContent_{frame_id}">
    {inner_content}
  </g>

  <!-- Bottom Navigation & DB Strip -->
  <g id="MobileBottomNav_{frame_id}">
    <rect x="0" y="770" width="390" height="74" fill="#090d16"/>
    <line x1="0" y1="770" x2="390" y2="770" stroke="#1e293b" stroke-width="1"/>
    {''.join(tab_svg)}
    <rect x="0" y="822" width="390" height="22" fill="#050811"/>
    <text x="195" y="836" font-family="JetBrains Mono, monospace" font-size="8.5" font-weight="600" fill="#38bdf8" text-anchor="middle">DBMS: {esc(db_tables)}</text>
  </g>
</svg>"""


def kpi_card(x, y, w, h, label, value, subtext, badge_text, accent_color="#38bdf8"):
    return f"""
    <g>
      <rect x="{x}" y="{y}" width="{w}" height="{h}" rx="10" fill="#131c2e" stroke="#1e293b" stroke-width="1"/>
      <rect x="{x}" y="{y}" width="4" height="{h}" rx="2" fill="{accent_color}"/>
      <text x="{x+18}" y="{y+24}" font-family="Inter, sans-serif" font-size="10.5" font-weight="700" fill="#94a3b8" letter-spacing="0.6">{esc(label.upper())}</text>
      <rect x="{x+w-88}" y="{y+11}" width="76" height="20" rx="10" fill="#0f172a" stroke="{accent_color}" stroke-width="0.8"/>
      <text x="{x+w-50}" y="{y+24}" font-family="JetBrains Mono, monospace" font-size="9" font-weight="700" fill="{accent_color}" text-anchor="middle">{esc(badge_text)}</text>
      <text x="{x+18}" y="{y+56}" font-family="Inter, sans-serif" font-size="24" font-weight="800" fill="#ffffff">{esc(value)}</text>
      <text x="{x+18}" y="{y+76}" font-family="Inter, sans-serif" font-size="10.5" font-weight="500" fill="#cbd5e1">{esc(subtext)}</text>
    </g>
    """


def status_badge(x, y, text, kind="info"):
    palette = {
        "resolved": ("#064e3b", "#10b981", "#a7f3d0"),
        "good": ("#064e3b", "#10b981", "#a7f3d0"),
        "in_progress": ("#0c4a6e", "#0ea5e9", "#bae6fd"),
        "routed": ("#1e1b4b", "#6366f1", "#c7d2fe"),
        "pending": ("#451a03", "#f59e0b", "#fde68a"),
        "warning": ("#451a03", "#f59e0b", "#fde68a"),
        "critical": ("#4c0519", "#f43f5e", "#fecdd3"),
        "poor": ("#4c0519", "#f43f5e", "#fecdd3"),
        "info": ("#1e293b", "#64748b", "#e2e8f0"),
    }
    bg, border, fg = palette.get(kind, palette["info"])
    w = max(68, len(text) * 6 + 20)
    return f"""
    <g>
      <rect x="{x}" y="{y}" width="{w}" height="22" rx="11" fill="{bg}" stroke="{border}" stroke-width="1"/>
      <text x="{x + w//2}" y="{y+14.5}" font-family="JetBrains Mono, monospace" font-size="9.5" font-weight="700" fill="{fg}" text-anchor="middle">{esc(text)}</text>
    </g>
    """


def data_table(x, y, w, title, subtitle, headers, col_widths, rows, row_h=38):
    """Renders a crisp, multi-column dark-mode enterprise table."""
    total_h = 56 + 32 + len(rows) * row_h + 12
    out = [
        f'<g>',
        f'<rect x="{x}" y="{y}" width="{w}" height="{total_h}" rx="10" fill="#131c2e" stroke="#1e293b" stroke-width="1"/>',
        f'<text x="{x+18}" y="{y+26}" font-family="Inter, sans-serif" font-size="14" font-weight="800" fill="#ffffff">{esc(title)}</text>',
        f'<text x="{x+18}" y="{y+44}" font-family="JetBrains Mono, monospace" font-size="10" fill="#38bdf8">{esc(subtitle)}</text>',
        f'<rect x="{x+1}" y="{y+56}" width="{w-2}" height="32" fill="#0f172a"/>',
        f'<line x1="{x}" y1="{y+56}" x2="{x+w}" y2="{y+56}" stroke="#1e293b"/>',
        f'<line x1="{x}" y1="{y+88}" x2="{x+w}" y2="{y+88}" stroke="#1e293b"/>',
    ]
    cx = x + 16
    for h_text, cw in zip(headers, col_widths):
        out.append(f'<text x="{cx}" y="{y+76}" font-family="Inter, sans-serif" font-size="10" font-weight="700" fill="#94a3b8" letter-spacing="0.5">{esc(h_text.upper())}</text>')
        cx += cw

    ry = y + 88
    for r_idx, row in enumerate(rows):
        if r_idx % 2 == 1:
            out.append(f'<rect x="{x+1}" y="{ry}" width="{w-2}" height="{row_h}" fill="#0f172a" fill-opacity="0.45"/>')
        out.append(f'<line x1="{x+12}" y1="{ry+row_h}" x2="{x+w-12}" y2="{ry+row_h}" stroke="#1e293b" stroke-width="0.6"/>')
        cx = x + 16
        for c_val, cw in zip(row, col_widths):
            if isinstance(c_val, tuple):
                b_txt, b_kind = c_val
                out.append(status_badge(cx, ry + (row_h - 22)//2, b_txt, b_kind))
            else:
                s_val = str(c_val)
                is_mono = s_val.startswith("#") or s_val.startswith("CON-") or s_val.startswith("RD-") or s_val.startswith("WEH") or s_val.startswith("SV-") or s_val.startswith("LBS") or s_val.startswith("EEH") or s_val.startswith("SBM") or s_val.startswith("TND-") or s_val.startswith("PRJ-") or s_val.startswith("AUD-") or s_val.startswith("₹") or s_val.startswith("MCGM") or s_val.startswith("PWD") or s_val.startswith("NHAI")
                ff = "JetBrains Mono, monospace" if is_mono else "Inter, sans-serif"
                fc = "#38bdf8" if (s_val.startswith("#") or s_val.startswith("CON-") or s_val.startswith("TND-") or s_val.startswith("AUD-")) else ("#10b981" if s_val.startswith("₹") else "#e2e8f0")
                fw = "700" if is_mono else "500"
                out.append(f'<text x="{cx}" y="{ry + row_h//2 + 4}" font-family="{ff}" font-size="11" font-weight="{fw}" fill="{fc}">{esc(s_val)}</text>')
            cx += cw
        ry += row_h

    out.append('</g>')
    return "\n".join(out)


def mumbai_gis_map_box(x, y, w, h, title="PostGIS Live Spatial Layer (SRID 4326)"):
    """Renders a high-fidelity vector GIS map of Mumbai road segments, polygons, and complaint pins."""
    grid_lines = []
    for gx in range(x + 40, x + w, 45):
        grid_lines.append(f'<line x1="{gx}" y1="{y}" x2="{gx}" y2="{y+h}" stroke="#1e293b" stroke-width="0.7"/>')
    for gy in range(y + 40, y + h, 45):
        grid_lines.append(f'<line x1="{x}" y1="{gy}" x2="{x+w}" y2="{gy}" stroke="#1e293b" stroke-width="0.7"/>')

    return f"""
    <g>
      <rect x="{x}" y="{y}" width="{w}" height="{h}" rx="10" fill="url(#mapBg)" stroke="#1e293b" stroke-width="1"/>
      {''.join(grid_lines)}
      
      <!-- Authority Jurisdiction Polygons (ST_Contains) -->
      <polygon points="{x+40},{y+60} {x+w*0.48:.0f},{y+50} {x+w*0.52:.0f},{y+h*0.55:.0f} {x+50},{y+h*0.60:.0f}" fill="#1d4ed8" fill-opacity="0.14" stroke="#3b82f6" stroke-width="1.2" stroke-dasharray="5,4"/>
      <polygon points="{x+w*0.48:.0f},{y+50} {x+w-35},{y+65} {x+w-45},{y+h-45} {x+w*0.52:.0f},{y+h*0.55:.0f}" fill="#059669" fill-opacity="0.12" stroke="#10b981" stroke-width="1.2" stroke-dasharray="5,4"/>
      <polygon points="{x+50},{y+h*0.60:.0f} {x+w*0.52:.0f},{y+h*0.55:.0f} {x+w*0.60:.0f},{y+h-30} {x+60},{y+h-35}" fill="#d97706" fill-opacity="0.12" stroke="#f59e0b" stroke-width="1.2" stroke-dasharray="5,4"/>

      <!-- Road LineStrings (roads.geom) -->
      <!-- WEH-NH8 (Under Construction - Amber) -->
      <polyline points="{x+90},{y+h-30} {x+140},{y+h*0.65:.0f} {x+195},{y+h*0.38:.0f} {x+250},{y+45}" fill="none" stroke="#f59e0b" stroke-width="5" stroke-linecap="round"/>
      <!-- SV-RD-01 (Poor - Rose Red) -->
      <polyline points="{x+55},{y+h-45} {x+95},{y+h*0.62:.0f} {x+135},{y+h*0.35:.0f} {x+165},{y+55}" fill="none" stroke="#f43f5e" stroke-width="4.5" stroke-linecap="round"/>
      <!-- EEH-NH8 (Fair - Sky Blue) -->
      <polyline points="{x+w*0.55:.0f},{y+h-35} {x+w*0.64:.0f},{y+h*0.58:.0f} {x+w*0.74:.0f},{y+h*0.28:.0f} {x+w*0.84:.0f},{y+45}" fill="none" stroke="#38bdf8" stroke-width="5" stroke-linecap="round"/>
      <!-- SBM-MARG-01 & Marine Drive (Good - Emerald) -->
      <polyline points="{x+70},{y+h*0.72:.0f} {x+w*0.42:.0f},{y+h*0.68:.0f} {x+w*0.76:.0f},{y+h*0.74:.0f}" fill="none" stroke="#10b981" stroke-width="4" stroke-linecap="round"/>
      <!-- LBS-MARG-01 (Poor - Rose Red) -->
      <polyline points="{x+w*0.44:.0f},{y+h-40} {x+w*0.50:.0f},{y+h*0.52:.0f} {x+w*0.62:.0f},{y+70}" fill="none" stroke="#f43f5e" stroke-width="4" stroke-dasharray="8,4" stroke-linecap="round"/>

      <!-- Defect Complaint Point Pins (complaints.geom) -->
      <circle cx="{x+115}" cy="{y+h*0.48:.0f}" r="11" fill="#f43f5e" stroke="#ffffff" stroke-width="2"/>
      <text x="{x+115}" y="{y+h*0.48+4:.0f}" font-family="Inter, sans-serif" font-size="9.5" font-weight="800" fill="#ffffff" text-anchor="middle">P1</text>

      <circle cx="{x+185}" cy="{y+h*0.42:.0f}" r="11" fill="#f59e0b" stroke="#ffffff" stroke-width="2"/>
      <text x="{x+185}" y="{y+h*0.42+4:.0f}" font-family="Inter, sans-serif" font-size="9.5" font-weight="800" fill="#ffffff" text-anchor="middle">C2</text>

      <circle cx="{x+w*0.51:.0f}" cy="{y+h*0.50:.0f}" r="11" fill="#f43f5e" stroke="#ffffff" stroke-width="2"/>
      <text x="{x+w*0.51:.0f}" y="{y+h*0.50+4:.0f}" font-family="Inter, sans-serif" font-size="9.5" font-weight="800" fill="#ffffff" text-anchor="middle">W3</text>

      <circle cx="{x+w*0.68:.0f}" cy="{y+h*0.44:.0f}" r="11" fill="#10b981" stroke="#ffffff" stroke-width="2"/>
      <text x="{x+w*0.68:.0f}" y="{y+h*0.44+4:.0f}" font-family="Inter, sans-serif" font-size="9.5" font-weight="800" fill="#ffffff" text-anchor="middle">✓</text>

      <!-- Map Overlay Header Pill -->
      <rect x="{x+14}" y="{y+14}" width="{min(w-28, 360)}" height="30" rx="6" fill="#090d16" fill-opacity="0.88" stroke="#334155"/>
      <text x="{x+26}" y="{y+33}" font-family="JetBrains Mono, monospace" font-size="10.5" font-weight="700" fill="#38bdf8">{esc(title)}</text>

      <!-- Map Legend Box -->
      <rect x="{x+14}" y="{y+h-42}" width="{min(w-28, 450)}" height="28" rx="6" fill="#090d16" fill-opacity="0.88" stroke="#334155"/>
      <circle cx="{x+28}" cy="{y+h-28}" r="4.5" fill="#10b981"/>
      <text x="{x+38}" y="{y+h-24}" font-family="Inter, sans-serif" font-size="9.5" font-weight="600" fill="#e2e8f0">Good (SBM/Marine)</text>
      <circle cx="{x+142}" cy="{y+h-28}" r="4.5" fill="#38bdf8"/>
      <text x="{x+152}" y="{y+h-24}" font-family="Inter, sans-serif" font-size="9.5" font-weight="600" fill="#e2e8f0">Fair (EEH-NH8)</text>
      <circle cx="{x+242}" cy="{y+h-28}" r="4.5" fill="#f59e0b"/>
      <text x="{x+252}" y="{y+h-24}" font-family="Inter, sans-serif" font-size="9.5" font-weight="600" fill="#e2e8f0">Construction (WEH)</text>
      <circle cx="{x+360}" cy="{y+h-28}" r="4.5" fill="#f43f5e"/>
      <text x="{x+370}" y="{y+h-24}" font-family="Inter, sans-serif" font-size="9.5" font-weight="600" fill="#e2e8f0">Poor (SV/LBS)</text>
    </g>
    """

# ---------------------------------------------------------------------------
# FRAME 01 — 10 DEFINITIONS
# ---------------------------------------------------------------------------

def build_frame_01():
    """Frame 01: Civic Portal Landing & Live City Accountability Hero (1440x900)"""
    inner = f"""
    <!-- Hero Banner Split -->
    <rect x="244" y="72" width="1172" height="300" rx="12" fill="#131c2e" stroke="#1e293b"/>
    <rect x="268" y="94" width="230" height="24" rx="12" fill="#1e3a8a" stroke="#3b82f6"/>
    <text x="383" y="110" font-family="JetBrains Mono, monospace" font-size="10" font-weight="700" fill="#93c5fd" text-anchor="middle">CIVIC INFRASTRUCTURE INTELLIGENCE</text>
    <text x="268" y="150" font-family="Inter, sans-serif" font-size="28" font-weight="800" fill="#ffffff">Every Rupee Tracked. Every Pothole</text>
    <text x="268" y="184" font-family="Inter, sans-serif" font-size="28" font-weight="800" fill="#38bdf8">Geospatially Routed &amp; Audited.</text>
    <text x="268" y="214" font-family="Inter, sans-serif" font-size="12.5" fill="#94a3b8">PostGIS-powered municipal governance uniting public road budgets, contractor scorecards,</text>
    <text x="268" y="232" font-family="Inter, sans-serif" font-size="12.5" fill="#94a3b8">3D digital twins, and automated SLA breach escalation across 4 global regions.</text>

    <!-- Search & CTA Row -->
    <rect x="268" y="254" width="380" height="42" rx="8" fill="#0f172a" stroke="#334155"/>
    <text x="284" y="279" font-family="Inter, sans-serif" font-size="11.5" fill="#64748b">Search road code (WEH-NH8, SV-RD-01, LBS-MARG-01)...</text>
    <rect x="660" y="254" width="165" height="42" rx="8" fill="url(#blueGrad)"/>
    <text x="742" y="279" font-family="Inter, sans-serif" font-size="12" font-weight="700" fill="#ffffff" text-anchor="middle">+ Report Road Defect</text>
    <rect x="837" y="254" width="150" height="42" rx="8" fill="#1e293b" stroke="#3b82f6"/>
    <text x="912" y="279" font-family="Inter, sans-serif" font-size="12" font-weight="700" fill="#93c5fd" text-anchor="middle">Open Public Ledger</text>

    <!-- Live SQL Proof Strip -->
    <text x="268" y="332" font-family="JetBrains Mono, monospace" font-size="10.5" font-weight="600" fill="#10b981">✓ ST_Contains Polygon Routing (98.4% Accuracy)   •   ✓ ST_DWithin 20m Road Snapping   •   ✓ Immutable JSONB Audit Triggers</text>

    <!-- Right Hero Mini GIS Preview -->
    {mumbai_gis_map_box(1010, 88, 390, 268, "Mumbai Live Jurisdiction Preview")}

    <!-- 4 KPI Cards -->
    {kpi_card(244, 388, 281, 96, "Monitored Road Network", "124.70 KM", "8 Mumbai Arterial Corridors + 14 Global", "22 ROADS", "#38bdf8")}
    {kpi_card(541, 388, 281, 96, "Active Public Works Spend", "₹92.20 Cr", "Disbursed: ₹61.62 Cr Across 10 IN Projects", "26 PROJECTS", "#10b981")}
    {kpi_card(838, 388, 281, 96, "Registered Contractors", "21 Firms", "19 Active • 2 Blacklisted (CON-00010/15)", "AUDITED", "#f59e0b")}
    {kpi_card(1135, 388, 281, 96, "SLA Resolution Velocity", "94.2% On-Time", "Mean Resolution: 38.4h (Target <= 48h)", "SLA L0-L2", "#6366f1")}

    <!-- Bottom Live Public Accountability Table -->
    {data_table(
        244, 500, 1172,
        "Live Public Infrastructure & Grievance Accountability Feed (Mumbai Jurisdiction)",
        "SELECT r.road_code, r.name, a.department_code, p.title, p.budget_allocated, c.name, r.status FROM roads r JOIN projects p ...",
        ["Road Code", "Corridor Name", "Authority", "Active Project Contract", "Allocated Budget", "Assigned Contractor", "Road Status"],
        [110, 185, 110, 290, 140, 195, 120],
        [
            ["WEH-NH8", "Western Express Highway", "NHAI-ROM", "WEH Flyover Resurfacing & Grouting", "₹24.00 Cr", "Apex Infrastructure (4.25★)", ("CONSTRUCTION", "warning")],
            ["SV-RD-01", "S.V. Road (Andheri-Bandra)", "MCGM-KW", "SV Road Drainage Microtunnelling", "₹9.50 Cr", "Omega Infra (BLACKLISTED)", ("POOR • HALTED", "critical")],
            ["LINK-RD-01", "New Link Road Corridor", "MCGM-KW", "Link Road Concrete Upgrade Ph.2", "₹14.50 Cr", "Metro Highway Cons. (4.60★)", ("CONSTRUCTION", "in_progress")],
            ["LBS-MARG-01", "LBS Marg Central Arterial", "MCGM-HE", "LBS Marg Sewer Line & Patching", "₹6.20 Cr", "Shiva Earthmovers (2.10★)", ("POOR • DELAYED", "critical")],
            ["GHODBUNDER", "Ghodbunder Highway SH-42", "PWD-MUM", "Ghodbunder Mast-Asphalt Overlay", "₹19.00 Cr", "Bharat Roads & Infra (4.75★)", ("GOOD • VERIFIED", "good")],
            ["SBM-MARG-01", "Senapati Bapat Marg", "MCGM-FN", "SBM Micro-Silica Concrete Topping", "₹8.50 Cr", "Zenith Construction (4.50★)", ("GOOD • VERIFIED", "good")],
            ["MARINE-DR-01", "Marine Drive Promenade", "MCGM-FN", "Marine Drive Promenade Resurfacing", "₹5.20 Cr", "Zenith Construction (4.50★)", ("GOOD • VERIFIED", "good")],
        ],
        row_h=36
    )}
    """
    return desktop_shell(1, "Civic Portal Landing & Live Accountability Overview", "Public Portal / Overview", "roads", "regions, authorities, roads, projects, contractors, complaints", inner)


def build_frame_02():
    """Frame 02: Interactive Geospatial Road Registry & PostGIS Map Explorer (1440x900)"""
    inner = f"""
    <!-- Filter & Spatial Query Toolbar -->
    <rect x="244" y="70" width="760" height="46" rx="8" fill="#131c2e" stroke="#1e293b"/>
    <text x="262" y="97" font-family="JetBrains Mono, monospace" font-size="10.5" font-weight="700" fill="#38bdf8">LAYER FILTERS:</text>
    <rect x="372" y="79" width="88" height="28" rx="6" fill="#1e3a8a" stroke="#3b82f6"/>
    <text x="416" y="97" font-family="Inter, sans-serif" font-size="10.5" font-weight="700" fill="#ffffff" text-anchor="middle">All Roads (8)</text>
    <rect x="468" y="79" width="110" height="28" rx="6" fill="#0f172a" stroke="#334155"/>
    <text x="523" y="97" font-family="Inter, sans-serif" font-size="10.5" fill="#cbd5e1" text-anchor="middle">Complaints (42)</text>
    <rect x="586" y="79" width="132" height="28" rx="6" fill="#0f172a" stroke="#334155"/>
    <text x="652" y="97" font-family="Inter, sans-serif" font-size="10.5" fill="#cbd5e1" text-anchor="middle">GIST Polygons (5)</text>
    <rect x="726" y="79" width="128" height="28" rx="6" fill="#0f172a" stroke="#334155"/>
    <text x="790" y="97" font-family="Inter, sans-serif" font-size="10.5" fill="#cbd5e1" text-anchor="middle">Defect Heatmap</text>
    <rect x="862" y="79" width="130" height="28" rx="6" fill="#064e3b" stroke="#10b981"/>
    <text x="927" y="97" font-family="JetBrains Mono, monospace" font-size="10" font-weight="700" fill="#a7f3d0" text-anchor="middle">SRID:4326 ACTIVE</text>

    <!-- Main Interactive GIS Map Canvas -->
    {mumbai_gis_map_box(244, 128, 760, 460, "Mumbai Road Network — PostGIS GEOMETRY(LineString, 4326)")}

    <!-- Bottom Road Segment Quick Matrix under Map -->
    {data_table(
        244, 602, 760,
        "Gazetted Road Segments in Active Map Viewport",
        "Spatial GIST Index Scan: idx_roads_geom • Bounding Box [72.80, 18.90, 72.96, 19.28]",
        ["Road Code", "Name", "Type", "Length", "Surface / Lanes", "AADT Traffic", "Condition"],
        [100, 165, 55, 75, 125, 105, 110],
        [
            ["SV-RD-01", "S.V. Road (Selected)", "City", "16.8 km", "Asphalt • 4L (14.5m)", "62,000 / day", ("POOR", "poor")],
            ["WEH-NH8", "Western Express Hwy", "NH", "25.5 km", "Asphalt • 6L (35.5m)", "185,000 / day", ("CONSTRUCTION", "warning")],
            ["LBS-MARG-01", "LBS Marg Arterial", "City", "21.0 km", "Asphalt • 4L (16.0m)", "78,000 / day", ("POOR", "poor")],
            ["EEH-NH8", "Eastern Express Hwy", "SH", "22.1 km", "Asphalt • 4L (22.0m)", "95,000 / day", ("FAIR", "in_progress")],
        ],
        row_h=36
    )}

    <!-- Right Slide-Over Inspector Drawer (RoadDetailsPanel.tsx) -->
    <rect x="1020" y="70" width="396" height="784" rx="12" fill="#131c2e" stroke="#3b82f6" stroke-width="1.2"/>
    <rect x="1020" y="70" width="396" height="68" rx="12" fill="#1e293b"/>
    <text x="1040" y="96" font-family="JetBrains Mono, monospace" font-size="10" font-weight="700" fill="#38bdf8">SELECTED ROAD INSPECTOR • ID #3</text>
    <text x="1040" y="120" font-family="Inter, sans-serif" font-size="18" font-weight="800" fill="#ffffff">S.V. Road (SV-RD-01)</text>
    {status_badge(1316, 94, "POOR STATUS", "poor")}

    <!-- Physical Telemetry Specs -->
    <rect x="1038" y="152" width="172" height="62" rx="8" fill="#0f172a" stroke="#1e293b"/>
    <text x="1050" y="172" font-family="Inter, sans-serif" font-size="10" fill="#94a3b8">LENGTH &amp; WIDTH</text>
    <text x="1050" y="198" font-family="JetBrains Mono, monospace" font-size="14" font-weight="700" fill="#ffffff">16.80 km • 14.5m</text>

    <rect x="1224" y="152" width="174" height="62" rx="8" fill="#0f172a" stroke="#1e293b"/>
    <text x="1236" y="172" font-family="Inter, sans-serif" font-size="10" fill="#94a3b8">DAILY TRAFFIC (AADT)</text>
    <text x="1236" y="198" font-family="JetBrains Mono, monospace" font-size="14" font-weight="700" fill="#38bdf8">62,000 veh/day</text>

    <rect x="1038" y="224" width="172" height="62" rx="8" fill="#0f172a" stroke="#1e293b"/>
    <text x="1050" y="244" font-family="Inter, sans-serif" font-size="10" fill="#94a3b8">SURFACE &amp; LANES</text>
    <text x="1050" y="270" font-family="JetBrains Mono, monospace" font-size="13" font-weight="700" fill="#ffffff">Asphalt • 4 Lanes</text>

    <rect x="1224" y="224" width="174" height="62" rx="8" fill="#0f172a" stroke="#1e293b"/>
    <text x="1236" y="244" font-family="Inter, sans-serif" font-size="10" fill="#94a3b8">LAST RELAYED DATE</text>
    <text x="1236" y="270" font-family="JetBrains Mono, monospace" font-size="13" font-weight="700" fill="#f43f5e">2018-06-10 (Overdue)</text>

    <!-- Jurisdiction & Contractor Card -->
    <rect x="1038" y="300" width="360" height="118" rx="8" fill="#0f172a" stroke="#1e293b"/>
    <text x="1052" y="322" font-family="JetBrains Mono, monospace" font-size="10" font-weight="700" fill="#38bdf8">MANAGING AUTHORITY &amp; CONTRACTOR</text>
    <text x="1052" y="344" font-family="Inter, sans-serif" font-size="12" font-weight="700" fill="#ffffff">City Municipal Corp — Ward K-West (MCGM-KW)</text>
    <text x="1052" y="362" font-family="JetBrains Mono, monospace" font-size="10.5" fill="#94a3b8">ward.kw@mcgm.gov.in • +91-22-2623-0000</text>
    <line x1="1052" y1="372" x2="1382" y2="372" stroke="#1e293b"/>
    <text x="1052" y="392" font-family="Inter, sans-serif" font-size="11.5" font-weight="700" fill="#f43f5e">Contractor: Omega Infrastructure (CON-00010)</text>
    <text x="1052" y="408" font-family="JetBrains Mono, monospace" font-size="10" fill="#fecdd3">⚠️ BLACKLISTED • Rating 1.80★ • Perf Index: 21.60</text>

    <!-- Active Projects on Road -->
    <rect x="1038" y="432" width="360" height="170" rx="8" fill="#0f172a" stroke="#1e293b"/>
    <text x="1052" y="454" font-family="JetBrains Mono, monospace" font-size="10" font-weight="700" fill="#38bdf8">LINKED CONTRACTS (projects table)</text>
    <rect x="1050" y="466" width="336" height="58" rx="6" fill="#131c2e" stroke="#f43f5e" stroke-width="0.8"/>
    <text x="1062" y="484" font-family="Inter, sans-serif" font-size="11" font-weight="700" fill="#ffffff">#PRJ-03: SV Road Drainage Microtunnelling</text>
    <text x="1062" y="502" font-family="JetBrains Mono, monospace" font-size="10" fill="#f43f5e">Alloc: ₹9.50 Cr • Spent: ₹4.50 Cr • Delay: 378d (HALTED)</text>

    <rect x="1050" y="532" width="336" height="58" rx="6" fill="#131c2e" stroke="#0ea5e9" stroke-width="0.8"/>
    <text x="1062" y="550" font-family="Inter, sans-serif" font-size="11" font-weight="700" fill="#ffffff">#PRJ-04: SV Road Emergency Asphalt Laying</text>
    <text x="1062" y="568" font-family="JetBrains Mono, monospace" font-size="10" fill="#38bdf8">Alloc: ₹3.50 Cr • Spent: ₹1.20 Cr • Zenith Con (ACTIVE)</text>

    <!-- Data Quality Scorecard (DataQualityCard.tsx) -->
    <rect x="1038" y="616" width="360" height="162" rx="8" fill="#0f172a" stroke="#1e293b"/>
    <text x="1052" y="638" font-family="JetBrains Mono, monospace" font-size="10" font-weight="700" fill="#10b981">DATA QUALITY SCORE: 88 / 100 (GRADE B+)</text>
    <text x="1052" y="662" font-family="Inter, sans-serif" font-size="10.5" fill="#cbd5e1">Completeness (14/14 fields)</text>
    <rect x="1230" y="652" width="150" height="8" rx="4" fill="#1e293b"/><rect x="1230" y="652" width="142" height="8" rx="4" fill="#10b981"/>
    <text x="1052" y="688" font-family="Inter, sans-serif" font-size="10.5" fill="#cbd5e1">Freshness (Inspected 2025)</text>
    <rect x="1230" y="678" width="150" height="8" rx="4" fill="#1e293b"/><rect x="1230" y="678" width="124" height="8" rx="4" fill="#38bdf8"/>
    <text x="1052" y="714" font-family="Inter, sans-serif" font-size="10.5" fill="#cbd5e1">Spatial Validity (ST_IsValid)</text>
    <rect x="1230" y="704" width="150" height="8" rx="4" fill="#1e293b"/><rect x="1230" y="704" width="150" height="8" rx="4" fill="#10b981"/>
    <text x="1052" y="740" font-family="Inter, sans-serif" font-size="10.5" fill="#cbd5e1">Relational Consistency</text>
    <rect x="1230" y="730" width="150" height="8" rx="4" fill="#1e293b"/><rect x="1230" y="730" width="136" height="8" rx="4" fill="#10b981"/>

    <rect x="1038" y="792" width="360" height="46" rx="8" fill="url(#blueGrad)"/>
    <text x="1218" y="820" font-family="Inter, sans-serif" font-size="13" font-weight="700" fill="#ffffff" text-anchor="middle">+ File Defect Complaint on S.V. Road</text>
    """
    return desktop_shell(2, "Interactive Geospatial Road Registry & PostGIS Explorer", "Intelligence / Road Registry", "roads", "roads, authorities, contractors, projects, road_defect_history", inner)


def build_frame_03():
    """Frame 03: Citizen Defect Reporting Wizard — Step 1: GPS Pinpoint & PostGIS Auto-Snap (390x844 Mobile)"""
    inner = f"""
    <!-- Interactive Mobile GIS Map -->
    {mumbai_gis_map_box(16, 104, 358, 285, "GPS Lock: 19.1197°N, 72.8364°E (±3.1m)")}
    <!-- Crosshair Target -->
    <circle cx="195" cy="246" r="26" fill="none" stroke="#38bdf8" stroke-width="2" stroke-dasharray="4,3"/>
    <circle cx="195" cy="246" r="6" fill="#f43f5e" stroke="#ffffff" stroke-width="2"/>

    <!-- Search Address Bar -->
    <rect x="28" y="150" width="334" height="34" rx="7" fill="#0f172a" fill-opacity="0.92" stroke="#3b82f6"/>
    <text x="42" y="171" font-family="Inter, sans-serif" font-size="11" font-weight="600" fill="#f8fafc">📍 Near Andheri Subway Northbound, S.V. Road</text>

    <!-- PostGIS Spatial Resolution Card -->
    <rect x="16" y="402" width="358" height="176" rx="12" fill="#131c2e" stroke="#3b82f6" stroke-width="1.2"/>
    <rect x="28" y="414" width="210" height="20" rx="5" fill="#064e3b"/>
    <text x="36" y="428" font-family="JetBrains Mono, monospace" font-size="9.5" font-weight="700" fill="#a7f3d0">✓ POSTGIS SPATIAL MATCH RESOLVED</text>

    <text x="28" y="454" font-family="Inter, sans-serif" font-size="10" font-weight="700" fill="#94a3b8">SNAPPED ROAD SEGMENT (ST_DWithin &lt;= 20m)</text>
    <text x="28" y="472" font-family="Inter, sans-serif" font-size="14" font-weight="800" fill="#ffffff">S.V. Road (Code: SV-RD-01 • 4.2m dist)</text>

    <text x="28" y="498" font-family="Inter, sans-serif" font-size="10" font-weight="700" fill="#94a3b8">CONTAINING JURISDICTION (ST_Contains Polygon)</text>
    <text x="28" y="516" font-family="Inter, sans-serif" font-size="12.5" font-weight="700" fill="#38bdf8">City Municipal Corp — Ward K-West (MCGM-KW)</text>

    <line x1="28" y1="528" x2="362" y2="528" stroke="#1e293b"/>
    <text x="28" y="548" font-family="JetBrains Mono, monospace" font-size="10" font-weight="600" fill="#f59e0b">⚠️ Active Project Warranty: Zenith Construction</text>
    <text x="28" y="564" font-family="JetBrains Mono, monospace" font-size="9.5" fill="#94a3b8">Contract #PRJ-04 • Defect Liability Period Active</text>

    <!-- Offline Dexie.js Persistence Card -->
    <rect x="16" y="590" width="358" height="92" rx="10" fill="#0f172a" stroke="#1e293b"/>
    <text x="28" y="612" font-family="JetBrains Mono, monospace" font-size="10" font-weight="700" fill="#38bdf8">RESILIENT OFFLINE SYNC (DEXIE.JS INDEXEDDB)</text>
    <text x="28" y="632" font-family="Inter, sans-serif" font-size="11" fill="#cbd5e1">Client Temp UUID: 8f94c120-7e4a-4b92-9c11</text>
    <text x="28" y="650" font-family="Inter, sans-serif" font-size="11" fill="#cbd5e1">Geometry WKT: POINT(72.8364 19.1197) SRID=4326</text>
    <text x="28" y="668" font-family="JetBrains Mono, monospace" font-size="9.5" fill="#10b981">✓ Saved locally • Idempotent sync guaranteed</text>

    <!-- Primary CTA Button -->
    <rect x="16" y="696" width="358" height="52" rx="10" fill="url(#blueGrad)"/>
    <text x="195" y="727" font-family="Inter, sans-serif" font-size="14" font-weight="800" fill="#ffffff" text-anchor="middle">Confirm GPS Location &amp; Continue →</text>
    """
    return mobile_shell(3, "Report Defect — Step 1/3", "GPS Pinpoint & PostGIS Auto-Snap", 33, "report", "complaints, roads, authorities, project_warranties", inner)


def build_frame_04():
    """Frame 04: Citizen Defect Reporting Wizard — Step 2: Photo & AI Vision Analysis (390x844 Mobile)"""
    inner = f"""
    <!-- Geotagged Photo Preview with AI Vision Bounding Box -->
    <rect x="16" y="104" width="358" height="196" rx="12" fill="#131c2e" stroke="#3b82f6" stroke-width="1.2"/>
    <!-- Simulated Road Surface & Pothole Crater Vector -->
    <rect x="26" y="114" width="338" height="148" rx="8" fill="#1e293b"/>
    <line x1="60" y1="262" x2="140" y2="114" stroke="#475569" stroke-width="2" stroke-dasharray="8,6"/>
    <line x1="330" y1="262" x2="250" y2="114" stroke="#475569" stroke-width="2" stroke-dasharray="8,6"/>
    <ellipse cx="195" cy="196" rx="68" ry="32" fill="#090d16" stroke="#64748b" stroke-width="2"/>
    <ellipse cx="195" cy="200" rx="52" ry="22" fill="#020617"/>
    <!-- AI Bounding Box -->
    <rect x="118" y="156" width="154" height="82" fill="none" stroke="#f43f5e" stroke-width="2" stroke-dasharray="5,3"/>
    <rect x="118" y="136" width="176" height="20" rx="4" fill="#f43f5e"/>
    <text x="206" y="150" font-family="JetBrains Mono, monospace" font-size="9.5" font-weight="700" fill="#ffffff" text-anchor="middle">AI VISION: POTHOLE 96.4%</text>
    <text x="34" y="282" font-family="JetBrains Mono, monospace" font-size="9.5" fill="#38bdf8">EXIF: 19.1197°N 72.8364°E • 342KB WebP • Est Depth: 9.2cm</text>

    <!-- Category Selector (complaints.category CHECK constraint) -->
    <text x="18" y="320" font-family="Inter, sans-serif" font-size="11" font-weight="700" fill="#94a3b8">DEFECT CATEGORY (DB CHECK CONSTRAINT)</text>
    <rect x="16" y="328" width="114" height="44" rx="8" fill="#1e3a8a" stroke="#38bdf8" stroke-width="1.5"/>
    <text x="73" y="354" font-family="JetBrains Mono, monospace" font-size="10.5" font-weight="700" fill="#ffffff" text-anchor="middle">✓ pothole</text>

    <rect x="138" y="328" width="114" height="44" rx="8" fill="#131c2e" stroke="#1e293b"/>
    <text x="195" y="354" font-family="JetBrains Mono, monospace" font-size="10.5" fill="#94a3b8" text-anchor="middle">paving_defect</text>

    <rect x="260" y="328" width="114" height="44" rx="8" fill="#131c2e" stroke="#1e293b"/>
    <text x="317" y="354" font-family="JetBrains Mono, monospace" font-size="10.5" fill="#94a3b8" text-anchor="middle">waterlogging</text>

    <rect x="16" y="380" width="175" height="36" rx="8" fill="#131c2e" stroke="#1e293b"/>
    <text x="103" y="402" font-family="JetBrains Mono, monospace" font-size="10.5" fill="#94a3b8" text-anchor="middle">debris</text>

    <rect x="199" y="380" width="175" height="36" rx="8" fill="#131c2e" stroke="#1e293b"/>
    <text x="286" y="402" font-family="JetBrains Mono, monospace" font-size="10.5" fill="#94a3b8" text-anchor="middle">missing_signage</text>

    <!-- Priority / Severity Slider (1 to 5) -->
    <rect x="16" y="428" width="358" height="74" rx="10" fill="#131c2e" stroke="#1e293b"/>
    <text x="28" y="448" font-family="Inter, sans-serif" font-size="10.5" font-weight="700" fill="#94a3b8">PRIORITY SCORE (1–5) &amp; SLA CLOCK</text>
    <text x="362" y="448" font-family="JetBrains Mono, monospace" font-size="10" font-weight="700" fill="#f43f5e" text-anchor="end">SLA: 24h L1 / 48h L2</text>
    <rect x="28" y="458" width="60" height="32" rx="6" fill="#0f172a" stroke="#1e293b"/><text x="58" y="479" font-family="Inter, sans-serif" font-size="11" fill="#64748b" text-anchor="middle">1 Low</text>
    <rect x="96" y="458" width="60" height="32" rx="6" fill="#0f172a" stroke="#1e293b"/><text x="126" y="479" font-family="Inter, sans-serif" font-size="11" fill="#64748b" text-anchor="middle">2 Fair</text>
    <rect x="164" y="458" width="60" height="32" rx="6" fill="#0f172a" stroke="#1e293b"/><text x="194" y="479" font-family="Inter, sans-serif" font-size="11" fill="#64748b" text-anchor="middle">3 Med</text>
    <rect x="232" y="458" width="68" height="32" rx="6" fill="#4c0519" stroke="#f43f5e" stroke-width="1.5"/><text x="266" y="479" font-family="Inter, sans-serif" font-size="11" font-weight="800" fill="#fecdd3" text-anchor="middle">4 High ✓</text>
    <rect x="308" y="458" width="54" height="32" rx="6" fill="#0f172a" stroke="#1e293b"/><text x="335" y="479" font-family="Inter, sans-serif" font-size="11" fill="#64748b" text-anchor="middle">5 Crit</text>

    <!-- Title, Description & Citizen Contact Inputs -->
    <rect x="16" y="514" width="358" height="170" rx="10" fill="#131c2e" stroke="#1e293b"/>
    <text x="28" y="534" font-family="Inter, sans-serif" font-size="10" font-weight="700" fill="#94a3b8">COMPLAINT TITLE &amp; AI SUMMARY</text>
    <rect x="28" y="540" width="334" height="30" rx="6" fill="#0f172a" stroke="#334155"/>
    <text x="38" y="559" font-family="Inter, sans-serif" font-size="11" font-weight="600" fill="#f8fafc">Deep crater near Andheri Subway Northbound lane</text>

    <text x="28" y="586" font-family="Inter, sans-serif" font-size="10" font-weight="700" fill="#94a3b8">DESCRIPTION &amp; CITIZEN CONTACT (citizen_contact)</text>
    <rect x="28" y="592" width="334" height="44" rx="6" fill="#0f172a" stroke="#334155"/>
    <text x="38" y="610" font-family="Inter, sans-serif" font-size="10.5" fill="#cbd5e1">Water-filled pothole 9.2cm deep causing severe</text>
    <text x="38" y="626" font-family="Inter, sans-serif" font-size="10.5" fill="#cbd5e1">two-wheeler skidding risk during peak traffic.</text>
    <text x="28" y="656" font-family="JetBrains Mono, monospace" font-size="10" fill="#38bdf8">Notify: kanakwaradkar@gmail.com • +91-98201-XXXXX</text>

    <!-- Submit Button -->
    <rect x="16" y="696" width="358" height="52" rx="10" fill="url(#emeraldGrad)"/>
    <text x="195" y="727" font-family="Inter, sans-serif" font-size="14" font-weight="800" fill="#ffffff" text-anchor="middle">Submit Verified Grievance Report →</text>
    """
    return mobile_shell(4, "Report Defect — Step 2/3", "AI Vision Analysis & Classification", 66, "report", "complaints, sla_config, road_documents", inner)


def build_frame_05():
    """Frame 05: Duplicate Complaint Detection & Offline Sync Queue (390x844 Mobile)"""
    inner = f"""
    <!-- Spatial Duplicate Detection Modal Card (DuplicateComplaintDialog.tsx) -->
    <rect x="16" y="104" width="358" height="256" rx="12" fill="#131c2e" stroke="#f59e0b" stroke-width="1.5"/>
    <rect x="28" y="116" width="248" height="22" rx="6" fill="#451a03" stroke="#f59e0b"/>
    <text x="38" y="131" font-family="JetBrains Mono, monospace" font-size="9.5" font-weight="700" fill="#fde68a">⚠️ SPATIAL DUPLICATE DETECTED (11.4m)</text>

    <text x="28" y="158" font-family="Inter, sans-serif" font-size="13.5" font-weight="800" fill="#ffffff">Existing Report #CMP-18981 Nearby</text>
    <text x="28" y="176" font-family="Inter, sans-serif" font-size="11" fill="#94a3b8">PostGIS ST_DWithin found an active pothole report</text>
    <text x="28" y="192" font-family="Inter, sans-serif" font-size="11" fill="#94a3b8">within 25m on S.V. Road (Ward K-West).</text>

    <rect x="28" y="204" width="334" height="86" rx="8" fill="#0f172a" stroke="#1e293b"/>
    <text x="40" y="224" font-family="JetBrains Mono, monospace" font-size="10.5" font-weight="700" fill="#38bdf8">#CMP-18981 • Deep Pothole Andheri Subway</text>
    <text x="40" y="242" font-family="Inter, sans-serif" font-size="10.5" fill="#e2e8f0">Status: ROUTED to MCGM-KW • Priority: 4 (High)</text>
    <text x="40" y="260" font-family="Inter, sans-serif" font-size="10.5" fill="#10b981">14 Citizens Subscribed • Contractor Notified</text>
    <text x="40" y="278" font-family="JetBrains Mono, monospace" font-size="9.5" fill="#94a3b8">Filed 3h ago • SLA Target: 45h remaining</text>

    <rect x="28" y="302" width="196" height="42" rx="8" fill="url(#blueGrad)"/>
    <text x="126" y="327" font-family="Inter, sans-serif" font-size="11.5" font-weight="700" fill="#ffffff" text-anchor="middle">Upvote &amp; Follow #18981</text>
    <rect x="232" y="302" width="130" height="42" rx="8" fill="#0f172a" stroke="#475569"/>
    <text x="297" y="327" font-family="Inter, sans-serif" font-size="11" font-weight="600" fill="#cbd5e1" text-anchor="middle">File New Anyway</text>

    <!-- Offline Sync Queue Manager (OfflineSyncDialog.tsx) -->
    <rect x="16" y="374" width="358" height="264" rx="12" fill="#131c2e" stroke="#1e293b"/>
    <text x="28" y="398" font-family="Inter, sans-serif" font-size="13" font-weight="800" fill="#ffffff">Offline Sync Queue (IndexedDB → PostGIS)</text>
    <text x="28" y="414" font-family="JetBrains Mono, monospace" font-size="9.5" fill="#38bdf8">POST /api/v1/complaints/sync • Idempotent UUID Key</text>

    <!-- Sync Item 1 -->
    <rect x="28" y="426" width="334" height="62" rx="8" fill="#0f172a" stroke="#10b981" stroke-width="0.8"/>
    <text x="40" y="446" font-family="JetBrains Mono, monospace" font-size="10" font-weight="700" fill="#a7f3d0">UUID: 8f94c120...9c11 → DB ID #18984</text>
    <text x="40" y="464" font-family="Inter, sans-serif" font-size="11" font-weight="600" fill="#ffffff">S.V. Road Pothole • 342 KB Image</text>
    <text x="40" y="480" font-family="JetBrains Mono, monospace" font-size="9.5" fill="#10b981">✓ SYNCED TO POSTGIS • ST_Contains: MCGM-KW</text>

    <!-- Sync Item 2 -->
    <rect x="28" y="496" width="334" height="62" rx="8" fill="#0f172a" stroke="#0ea5e9" stroke-width="0.8"/>
    <text x="40" y="516" font-family="JetBrains Mono, monospace" font-size="10" font-weight="700" fill="#bae6fd">UUID: c4d2881a...11b0 → Uploading (78%)</text>
    <text x="40" y="534" font-family="Inter, sans-serif" font-size="11" font-weight="600" fill="#ffffff">LBS Marg Waterlogging • 418 KB Image</text>
    <rect x="40" y="544" width="310" height="6" rx="3" fill="#1e293b"/><rect x="40" y="544" width="242" height="6" rx="3" fill="#38bdf8"/>

    <!-- Sync Item 3 -->
    <rect x="28" y="566" width="334" height="58" rx="8" fill="#0f172a" stroke="#f59e0b" stroke-width="0.8"/>
    <text x="40" y="586" font-family="JetBrains Mono, monospace" font-size="10" font-weight="700" fill="#fde68a">UUID: f9e0332b...44a9 → Queued in Dexie.js</text>
    <text x="40" y="604" font-family="Inter, sans-serif" font-size="11" font-weight="600" fill="#ffffff">Link Road Missing Signage • 280 KB Image</text>

    <!-- Outbound Citizen Notification Status (citizen_notifications table) -->
    <rect x="16" y="650" width="358" height="102" rx="10" fill="#131c2e" stroke="#1e293b"/>
    <text x="28" y="672" font-family="JetBrains Mono, monospace" font-size="10" font-weight="700" fill="#10b981">CITIZEN NOTIFICATION DISPATCH LOG</text>
    <text x="28" y="694" font-family="Inter, sans-serif" font-size="11" fill="#e2e8f0">📧 Email (kanakwaradkar@gmail.com): SENT (200 OK)</text>
    <text x="28" y="714" font-family="Inter, sans-serif" font-size="11" fill="#e2e8f0">📱 WhatsApp / SMS (+91-98201-XXXXX): SENT</text>
    <text x="28" y="736" font-family="JetBrains Mono, monospace" font-size="9.5" fill="#94a3b8">Template: tpl_complaint_routed_v2 • Event: routed</text>
    """
    return mobile_shell(5, "Duplicate Check & Sync Center", "Spatial Dedup & Offline Queue", 100, "sync", "complaints, citizen_notifications, road_documents", inner)


def build_frame_06():
    """Frame 06: Citizen 'My Reports' Dashboard & Live SLA Tracking Timeline (390x844 Mobile)"""
    inner = f"""
    <!-- Citizen Summary KPI Strip -->
    <rect x="16" y="104" width="112" height="64" rx="8" fill="#131c2e" stroke="#1e293b"/>
    <text x="72" y="126" font-family="Inter, sans-serif" font-size="9.5" font-weight="700" fill="#94a3b8" text-anchor="middle">TOTAL FILED</text>
    <text x="72" y="154" font-family="Inter, sans-serif" font-size="20" font-weight="800" fill="#ffffff" text-anchor="middle">8</text>

    <rect x="139" y="104" width="112" height="64" rx="8" fill="#131c2e" stroke="#0ea5e9"/>
    <text x="195" y="126" font-family="Inter, sans-serif" font-size="9.5" font-weight="700" fill="#38bdf8" text-anchor="middle">ACTIVE SLA</text>
    <text x="195" y="154" font-family="Inter, sans-serif" font-size="20" font-weight="800" fill="#38bdf8" text-anchor="middle">2</text>

    <rect x="262" y="104" width="112" height="64" rx="8" fill="#131c2e" stroke="#10b981"/>
    <text x="318" y="126" font-family="Inter, sans-serif" font-size="9.5" font-weight="700" fill="#10b981" text-anchor="middle">RESOLVED</text>
    <text x="318" y="154" font-family="Inter, sans-serif" font-size="20" font-weight="800" fill="#10b981" text-anchor="middle">6</text>

    <!-- Active Ticket Lifecycle Card (ComplaintTimeline.tsx) -->
    <rect x="16" y="180" width="358" height="392" rx="12" fill="#131c2e" stroke="#3b82f6" stroke-width="1.2"/>
    <text x="28" y="204" font-family="JetBrains Mono, monospace" font-size="11" font-weight="700" fill="#38bdf8">TICKET #CMP-18981 • S.V. ROAD (SV-RD-01)</text>
    {status_badge(282, 188, "IN_PROGRESS", "in_progress")}
    <text x="28" y="226" font-family="Inter, sans-serif" font-size="13.5" font-weight="800" fill="#ffffff">Deep Crater Near Andheri Subway</text>

    <!-- SLA Countdown Bar -->
    <rect x="28" y="238" width="334" height="44" rx="8" fill="#0f172a" stroke="#1e293b"/>
    <text x="40" y="256" font-family="JetBrains Mono, monospace" font-size="9.5" font-weight="700" fill="#10b981">SLA COUNTDOWN: 31h 15m REMAINING (TARGET 48h)</text>
    <rect x="40" y="266" width="310" height="7" rx="3.5" fill="#1e293b"/>
    <rect x="40" y="266" width="205" height="7" rx="3.5" fill="url(#emeraldGrad)"/>

    <!-- 5-Stage State Machine Timeline -->
    <line x1="44" y1="304" x2="44" y2="525" stroke="#334155" stroke-width="2"/>

    <circle cx="44" cy="308" r="8" fill="#10b981"/>
    <text x="64" y="306" font-family="Inter, sans-serif" font-size="11.5" font-weight="700" fill="#ffffff">1. Complaint Logged &amp; Geo-Indexed</text>
    <text x="64" y="322" font-family="JetBrains Mono, monospace" font-size="9.5" fill="#94a3b8">22 Oct 09:42 • Status: pending • GIST Point</text>

    <circle cx="44" cy="360" r="8" fill="#10b981"/>
    <text x="64" y="358" font-family="Inter, sans-serif" font-size="11.5" font-weight="700" fill="#ffffff">2. Auto-Routed via PostGIS ST_Contains</text>
    <text x="64" y="374" font-family="JetBrains Mono, monospace" font-size="9.5" fill="#94a3b8">22 Oct 09:43 • Assigned: MCGM Ward K-West</text>

    <circle cx="44" cy="412" r="9" fill="#0ea5e9" stroke="#bae6fd" stroke-width="2"/>
    <text x="64" y="410" font-family="Inter, sans-serif" font-size="11.5" font-weight="800" fill="#38bdf8">3. Field Repair Crew Dispatched (Active)</text>
    <text x="64" y="426" font-family="JetBrains Mono, monospace" font-size="9.5" fill="#bae6fd">22 Oct 14:10 • Zenith Construction Co (#CON-00003)</text>

    <circle cx="44" cy="464" r="7" fill="#1e293b" stroke="#64748b" stroke-width="1.5"/>
    <text x="64" y="462" font-family="Inter, sans-serif" font-size="11.5" font-weight="600" fill="#64748b">4. Hot-Mix Asphalt Patching &amp; QA Test</text>
    <text x="64" y="478" font-family="JetBrains Mono, monospace" font-size="9.5" fill="#475569">Awaiting contractor completion photo upload</text>

    <circle cx="44" cy="516" r="7" fill="#1e293b" stroke="#64748b" stroke-width="1.5"/>
    <text x="64" y="514" font-family="Inter, sans-serif" font-size="11.5" font-weight="600" fill="#64748b">5. Citizen Resolution Sign-off &amp; Closure</text>
    <text x="64" y="530" font-family="JetBrains Mono, monospace" font-size="9.5" fill="#475569">Triggers snapshot_road_on_complaint_change()</text>

    <!-- Citizen Routing Accuracy Feedback Card (routing_feedback table) -->
    <rect x="16" y="584" width="358" height="168" rx="12" fill="#131c2e" stroke="#1e293b"/>
    <text x="28" y="606" font-family="JetBrains Mono, monospace" font-size="10" font-weight="700" fill="#38bdf8">ROUTING FEEDBACK VERIFICATION (routing_feedback)</text>
    <text x="28" y="626" font-family="Inter, sans-serif" font-size="12" font-weight="700" fill="#ffffff">Was MCGM Ward K-West the right authority?</text>
    <text x="28" y="644" font-family="Inter, sans-serif" font-size="10.5" fill="#94a3b8">Your feedback updates authorities.routing_accuracy_score</text>
    <text x="28" y="658" font-family="Inter, sans-serif" font-size="10.5" fill="#94a3b8">(Current MCGM-KW Accuracy Score: 96.40%).</text>

    <rect x="28" y="674" width="160" height="38" rx="8" fill="#064e3b" stroke="#10b981"/>
    <text x="108" y="698" font-family="Inter, sans-serif" font-size="11.5" font-weight="700" fill="#a7f3d0" text-anchor="middle">✓ Yes, Confirmed</text>

    <rect x="198" y="674" width="164" height="38" rx="8" fill="#0f172a" stroke="#475569"/>
    <text x="280" y="698" font-family="Inter, sans-serif" font-size="11.5" font-weight="600" fill="#cbd5e1" text-anchor="middle">✕ Flag Wrong Dept</text>

    <text x="28" y="736" font-family="JetBrains Mono, monospace" font-size="9.5" fill="#64748b">UNIQUE(complaint_id) • Citizen: Kanak Waradkar</text>
    """
    return mobile_shell(6, "My Grievances & SLA Timeline", "Citizen Lifecycle & Routing Feedback", 100, "my", "complaints, sla_escalations, routing_feedback", inner)


def build_frame_07():
    """Frame 07: AI Accountability Chat Assistant & Multimodal Photo RAG (1440x900 Desktop)"""
    inner = f"""
    <!-- Left Thread History Column -->
    <rect x="244" y="72" width="250" height="780" rx="10" fill="#131c2e" stroke="#1e293b"/>
    <text x="262" y="98" font-family="Inter, sans-serif" font-size="13" font-weight="800" fill="#ffffff">AI Investigation Threads</text>
    <rect x="258" y="112" width="222" height="34" rx="7" fill="url(#blueGrad)"/>
    <text x="369" y="133" font-family="Inter, sans-serif" font-size="11.5" font-weight="700" fill="#ffffff" text-anchor="middle">+ New AI Audit Query</text>

    <rect x="258" y="160" width="222" height="64" rx="8" fill="#1e3a8a" stroke="#3b82f6"/>
    <text x="270" y="180" font-family="Inter, sans-serif" font-size="11.5" font-weight="700" fill="#ffffff">S.V. Road Contractor Audit</text>
    <text x="270" y="196" font-family="JetBrains Mono, monospace" font-size="9.5" fill="#93c5fd">SV-RD-01 • CON-00010 • Active</text>
    <text x="270" y="212" font-family="Inter, sans-serif" font-size="9.5" fill="#cbd5e1">3 SQL tool calls • 2 citations</text>

    <rect x="258" y="234" width="222" height="58" rx="8" fill="#0f172a" stroke="#1e293b"/>
    <text x="270" y="254" font-family="Inter, sans-serif" font-size="11" font-weight="600" fill="#e2e8f0">WEH Flyover Budget Variance</text>
    <text x="270" y="272" font-family="JetBrains Mono, monospace" font-size="9.5" fill="#64748b">WEH-NH8 • ₹24.0 Cr Analysis</text>

    <rect x="258" y="302" width="222" height="58" rx="8" fill="#0f172a" stroke="#1e293b"/>
    <text x="270" y="322" font-family="Inter, sans-serif" font-size="11" font-weight="600" fill="#e2e8f0">Photo Triage: LBS Marg Crater</text>
    <text x="270" y="340" font-family="JetBrains Mono, monospace" font-size="9.5" fill="#64748b">Vision Pipeline • #CMP-18990</text>

    <rect x="258" y="370" width="222" height="58" rx="8" fill="#0f172a" stroke="#1e293b"/>
    <text x="270" y="390" font-family="Inter, sans-serif" font-size="11" font-weight="600" fill="#e2e8f0">Blacklisted Firms Check 2026</text>
    <text x="270" y="408" font-family="JetBrains Mono, monospace" font-size="9.5" fill="#64748b">Omega Infra &amp; Detroit Roads</text>

    <!-- Center Chat Conversation Stream -->
    <rect x="508" y="72" width="560" height="780" rx="10" fill="#131c2e" stroke="#1e293b"/>
    <text x="528" y="100" font-family="Inter, sans-serif" font-size="14" font-weight="800" fill="#ffffff">RAG + SQL Tool-Calling Civic Assistant</text>
    <text x="528" y="116" font-family="JetBrains Mono, monospace" font-size="10" fill="#38bdf8">Endpoint: POST /api/v1/chat/analyze-photo • Streaming NDJSON</text>
    <line x1="508" y1="128" x2="1068" y2="128" stroke="#1e293b"/>

    <!-- User Prompt Bubble -->
    <rect x="600" y="144" width="448" height="74" rx="10" fill="#1e3a8a" stroke="#3b82f6"/>
    <text x="616" y="166" font-family="Inter, sans-serif" font-size="11.5" font-weight="700" fill="#ffffff">Kanak Waradkar (Citizen / Auditor):</text>
    <text x="616" y="186" font-family="Inter, sans-serif" font-size="11.5" fill="#e2e8f0">"Who is the contractor responsible for S.V. Road (SV-RD-01),</text>
    <text x="616" y="204" font-family="Inter, sans-serif" font-size="11.5" fill="#e2e8f0">why is the drainage project halted, and what is the SLA chain?"</text>

    <!-- AI Tool Call Telemetry Pill -->
    <rect x="528" y="232" width="480" height="28" rx="6" fill="#090d16" stroke="#10b981"/>
    <text x="542" y="250" font-family="JetBrains Mono, monospace" font-size="9.5" font-weight="700" fill="#10b981">⚡ SQL TOOL EXECUTED: road_retriever.get_road_accountability('SV-RD-01') [14ms]</text>

    <!-- AI Response Bubble -->
    <rect x="528" y="272" width="520" height="486" rx="10" fill="#0f172a" stroke="#334155"/>
    <text x="546" y="298" font-family="Inter, sans-serif" font-size="12" font-weight="700" fill="#38bdf8">ROADWATCH AI Accountability Engine:</text>
    <text x="546" y="320" font-family="Inter, sans-serif" font-size="11.5" fill="#e2e8f0">Based on live PostgreSQL records for S.V. Road (Code: SV-RD-01, ID #3):</text>
    <text x="546" y="342" font-family="Inter, sans-serif" font-size="11" fill="#cbd5e1">1. Primary Contract (#PRJ-03): SV Road Drainage Trenching &amp; Microtunnelling</text>
    <text x="546" y="360" font-family="Inter, sans-serif" font-size="11" fill="#cbd5e1">   was awarded ₹9.50 Cr (₹4.50 Cr spent) to Omega Infrastructure Corp.</text>
    <text x="546" y="378" font-family="Inter, sans-serif" font-size="11" fill="#f43f5e">2. Halted &amp; Blacklisted: Project is HALTED at 378 delay days. Contractor</text>
    <text x="546" y="396" font-family="Inter, sans-serif" font-size="11" fill="#f43f5e">   CON-00010 is BLACKLISTED for surface peeling within 3 months.</text>

    <!-- Embedded RoutedToCard.tsx -->
    <rect x="546" y="414" width="484" height="128" rx="8" fill="#131c2e" stroke="#3b82f6"/>
    <text x="562" y="436" font-family="JetBrains Mono, monospace" font-size="10" font-weight="700" fill="#38bdf8">EMBEDDED COMPONENT: RoutedToCard.tsx</text>
    <text x="562" y="458" font-family="Inter, sans-serif" font-size="13" font-weight="800" fill="#ffffff">Jurisdiction: MCGM — Ward K-West (MCGM-KW)</text>
    <text x="562" y="478" font-family="Inter, sans-serif" font-size="11" fill="#cbd5e1">Emergency Remediation (#PRJ-04): Zenith Construction Co (CON-00003)</text>
    <text x="562" y="496" font-family="JetBrains Mono, monospace" font-size="10" fill="#10b981">Allocated: ₹3.50 Cr • Rating: 4.50★ • Perf Index: 87.91/100</text>
    <rect x="562" y="508" width="120" height="22" rx="4" fill="#1e293b"/><text x="622" y="523" font-family="JetBrains Mono, monospace" font-size="9" fill="#93c5fd" text-anchor="middle">[Citation: roads#3]</text>
    <rect x="690" y="508" width="135" height="22" rx="4" fill="#1e293b"/><text x="757" y="523" font-family="JetBrains Mono, monospace" font-size="9" fill="#93c5fd" text-anchor="middle">[Citation: projects#3]</text>

    <!-- Embedded EscalationChainCard.tsx -->
    <rect x="546" y="554" width="484" height="184" rx="8" fill="#131c2e" stroke="#f59e0b"/>
    <text x="562" y="576" font-family="JetBrains Mono, monospace" font-size="10" font-weight="700" fill="#f59e0b">EMBEDDED COMPONENT: EscalationChainCard.tsx (sla_config)</text>
    <text x="562" y="600" font-family="Inter, sans-serif" font-size="11.5" font-weight="700" fill="#10b981">● Level 0 (0–24h): MCGM Ward K-West (ward.kw@mcgm.gov.in)</text>
    <text x="562" y="626" font-family="Inter, sans-serif" font-size="11.5" font-weight="700" fill="#f59e0b">● Level 1 (24–48h): State PWD Mumbai Division (se.mumbai@pwd.gov.in)</text>
    <text x="562" y="652" font-family="Inter, sans-serif" font-size="11.5" font-weight="700" fill="#f43f5e">● Level 2 (&gt;48h Breach): NHAI RO Mumbai / Chief Vigilance Commissioner</text>
    <text x="562" y="680" font-family="JetBrains Mono, monospace" font-size="10" fill="#94a3b8">Webhook Dispatch: authority_webhooks → https://hooks.mcgm.gov.in/rw</text>
    <text x="562" y="700" font-family="JetBrains Mono, monospace" font-size="10" fill="#38bdf8">Budget Variance Reason (#BVR-02): Basalt rock strata delay logged</text>

    <!-- Chat Input Box -->
    <rect x="528" y="772" width="520" height="64" rx="8" fill="#090d16" stroke="#3b82f6"/>
    <text x="546" y="808" font-family="Inter, sans-serif" font-size="11.5" fill="#94a3b8">Ask about any road, contractor, tender, or attach defect photo...</text>
    <rect x="944" y="786" width="90" height="36" rx="6" fill="url(#blueGrad)"/>
    <text x="989" y="809" font-family="Inter, sans-serif" font-size="11.5" font-weight="700" fill="#ffffff" text-anchor="middle">Send ↵</text>

    <!-- Right SQL & JSONB Inspector Column -->
    <rect x="1082" y="72" width="334" height="780" rx="10" fill="#131c2e" stroke="#1e293b"/>
    <text x="1100" y="100" font-family="Inter, sans-serif" font-size="13" font-weight="800" fill="#ffffff">Parameterized SQL &amp; JSONB Trace</text>
    <text x="1100" y="118" font-family="JetBrains Mono, monospace" font-size="9.5" fill="#10b981">retrieval_engine.py • Zero SQL Injection</text>

    <rect x="1098" y="134" width="302" height="310" rx="8" fill="#090d16" stroke="#1e293b"/>
    <text x="1110" y="156" font-family="JetBrains Mono, monospace" font-size="10" font-weight="700" fill="#38bdf8">-- Executed Parameterized Query:</text>
    <text x="1110" y="176" font-family="JetBrains Mono, monospace" font-size="9.5" fill="#e2e8f0">SELECT r.id, r.name, r.road_code,</text>
    <text x="1110" y="194" font-family="JetBrains Mono, monospace" font-size="9.5" fill="#e2e8f0">  r.status, a.department_code,</text>
    <text x="1110" y="212" font-family="JetBrains Mono, monospace" font-size="9.5" fill="#e2e8f0">  c.name AS contractor_name,</text>
    <text x="1110" y="230" font-family="JetBrains Mono, monospace" font-size="9.5" fill="#e2e8f0">  c.contractor_code, c.blacklisted,</text>
    <text x="1110" y="248" font-family="JetBrains Mono, monospace" font-size="9.5" fill="#e2e8f0">  c.performance_index, p.budget_spent</text>
    <text x="1110" y="266" font-family="JetBrains Mono, monospace" font-size="9.5" fill="#e2e8f0">FROM roads r</text>
    <text x="1110" y="284" font-family="JetBrains Mono, monospace" font-size="9.5" fill="#e2e8f0">JOIN authorities a ON r.authority_id=a.id</text>
    <text x="1110" y="302" font-family="JetBrains Mono, monospace" font-size="9.5" fill="#e2e8f0">JOIN contractors c ON r.contractor_id=c.id</text>
    <text x="1110" y="320" font-family="JetBrains Mono, monospace" font-size="9.5" fill="#e2e8f0">JOIN projects p ON p.road_id = r.id</text>
    <text x="1110" y="338" font-family="JetBrains Mono, monospace" font-size="9.5" fill="#f59e0b">WHERE r.road_code = $1;</text>
    <text x="1110" y="362" font-family="JetBrains Mono, monospace" font-size="9.5" fill="#10b981">-- Bind Params: ['SV-RD-01']</text>
    <text x="1110" y="382" font-family="JetBrains Mono, monospace" font-size="9.5" fill="#94a3b8">-- Index Used: roads_road_code_key</text>

    <rect x="1098" y="460" width="302" height="374" rx="8" fill="#090d16" stroke="#1e293b"/>
    <text x="1110" y="482" font-family="JetBrains Mono, monospace" font-size="10" font-weight="700" fill="#10b981">// Returned PostGIS Tuple JSONB:</text>
    <text x="1110" y="504" font-family="JetBrains Mono, monospace" font-size="9.5" fill="#cbd5e1">{{</text>
    <text x="1122" y="522" font-family="JetBrains Mono, monospace" font-size="9.5" fill="#38bdf8">"road_id": 3,</text>
    <text x="1122" y="540" font-family="JetBrains Mono, monospace" font-size="9.5" fill="#38bdf8">"road_code": "SV-RD-01",</text>
    <text x="1122" y="558" font-family="JetBrains Mono, monospace" font-size="9.5" fill="#f43f5e">"status": "poor",</text>
    <text x="1122" y="576" font-family="JetBrains Mono, monospace" font-size="9.5" fill="#e2e8f0">"authority": "MCGM-KW",</text>
    <text x="1122" y="594" font-family="JetBrains Mono, monospace" font-size="9.5" fill="#f43f5e">"contractor": "CON-00010",</text>
    <text x="1122" y="612" font-family="JetBrains Mono, monospace" font-size="9.5" fill="#f43f5e">"blacklisted": true,</text>
    <text x="1122" y="630" font-family="JetBrains Mono, monospace" font-size="9.5" fill="#f59e0b">"performance_index": 21.60,</text>
    <text x="1122" y="648" font-family="JetBrains Mono, monospace" font-size="9.5" fill="#10b981">"allocated": 95000000.00,</text>
    <text x="1122" y="666" font-family="JetBrains Mono, monospace" font-size="9.5" fill="#f43f5e">"delay_days": 378</text>
    <text x="1110" y="684" font-family="JetBrains Mono, monospace" font-size="9.5" fill="#cbd5e1">}}</text>
    """
    return desktop_shell(7, "AI Accountability Chat Assistant & Photo Triage RAG", "Intelligence / AI Assistant", "chat", "roads, projects, contractors, authorities, complaints, sla_config", inner)


def build_frame_08():
    """Frame 08: 3D Digital Twin & Sub-Surface Road Inspection Viewport (1440x900 Desktop)"""
    inner = f"""
    <!-- Top 3D Viewport Controls Bar -->
    <rect x="244" y="70" width="800" height="46" rx="8" fill="#131c2e" stroke="#1e293b"/>
    <text x="262" y="97" font-family="JetBrains Mono, monospace" font-size="10.5" font-weight="700" fill="#38bdf8">3D DIGITAL TWIN CORRIDOR:</text>
    <rect x="442" y="79" width="210" height="28" rx="6" fill="#1e3a8a" stroke="#3b82f6"/>
    <text x="547" y="97" font-family="Inter, sans-serif" font-size="10.5" font-weight="700" fill="#ffffff" text-anchor="middle">WEH-NH8 (6 Lanes • 35.5m) ▾</text>
    <rect x="662" y="79" width="115" height="28" rx="6" fill="#0f172a" stroke="#334155"/>
    <text x="719" y="97" font-family="Inter, sans-serif" font-size="10.5" fill="#cbd5e1" text-anchor="middle">Wireframe Mesh</text>
    <rect x="785" y="79" width="120" height="28" rx="6" fill="#0f172a" stroke="#334155"/>
    <text x="845" y="97" font-family="Inter, sans-serif" font-size="10.5" fill="#cbd5e1" text-anchor="middle">Sub-Base Layers</text>
    <rect x="913" y="79" width="116" height="28" rx="6" fill="#064e3b" stroke="#10b981"/>
    <text x="971" y="97" font-family="JetBrains Mono, monospace" font-size="10" font-weight="700" fill="#a7f3d0" text-anchor="middle">R3F 60 FPS GPU</text>

    <!-- Center 3D Isometric Highway Digital Twin Viewport -->
    <rect x="244" y="128" width="800" height="430" rx="12" fill="#080e1a" stroke="#3b82f6" stroke-width="1"/>
    <!-- Perspective Grid Lines -->
    <line x1="244" y1="360" x2="1044" y2="360" stroke="#1e293b" stroke-width="0.8"/>
    <line x1="244" y1="420" x2="1044" y2="420" stroke="#1e293b" stroke-width="0.8"/>
    <line x1="244" y1="480" x2="1044" y2="480" stroke="#1e293b" stroke-width="0.8"/>
    <!-- 3D Perspective 6-Lane Highway Deck -->
    <polygon points="560,165 728,165 980,535 308,535" fill="#1e293b" stroke="#38bdf8" stroke-width="1.5"/>
    <!-- Sub-base 3D Slab Thickness -->
    <polygon points="308,535 980,535 980,552 308,552" fill="#0f172a" stroke="#f59e0b" stroke-width="1"/>
    <!-- Center Median & Lane Dividers -->
    <line x1="644" y1="165" x2="644" y2="535" stroke="#f59e0b" stroke-width="3"/>
    <line x1="600" y1="165" x2="420" y2="535" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="10,8"/>
    <line x1="688" y1="165" x2="868" y2="535" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="10,8"/>
    <!-- 3D Pothole / Defect Anomaly Markers on Deck -->
    <ellipse cx="525" cy="380" rx="34" ry="14" fill="#4c0519" stroke="#f43f5e" stroke-width="2"/>
    <line x1="525" y1="380" x2="525" y2="305" stroke="#f43f5e" stroke-width="1.5"/>
    <rect x="435" y="275" width="180" height="30" rx="5" fill="#4c0519" stroke="#f43f5e"/>
    <text x="525" y="294" font-family="JetBrains Mono, monospace" font-size="9.5" font-weight="700" fill="#fecdd3" text-anchor="middle">KM 4.2: Pothole (Depth 8.4cm)</text>

    <ellipse cx="745" cy="435" rx="42" ry="16" fill="#451a03" stroke="#f59e0b" stroke-width="2"/>
    <line x1="745" y1="435" x2="745" y2="355" stroke="#f59e0b" stroke-width="1.5"/>
    <rect x="645" y="325" width="200" height="30" rx="5" fill="#451a03" stroke="#f59e0b"/>
    <text x="745" y="344" font-family="JetBrains Mono, monospace" font-size="9.5" font-weight="700" fill="#fde68a" text-anchor="middle">KM 7.8: Grouting Zone (#PRJ-01)</text>

    <text x="266" y="156" font-family="JetBrains Mono, monospace" font-size="10.5" font-weight="700" fill="#38bdf8">THREE.JS / REACT THREE FIBER • 3D STRUCTURAL MESH VIEWER</text>

    <!-- Bottom Material Layer Table (road_materials & project_warranties) -->
    {data_table(
        244, 572, 800,
        "Pavement Layer Material Specifications & Quarry Certificates (road_materials table)",
        "SELECT material_type, specification_grade, mix_design_ref, source_quarry, approved_by FROM road_materials WHERE project_id = 1",
        ["Layer Type", "Specification Grade", "Mix Design Ref", "Source Quarry", "Approved By", "Test Status"],
        [115, 145, 125, 165, 125, 100],
        [
            ["asphalt", "VG-40 Bituminous Concrete", "MIX-BC-2025-09", "Panvel Basalt Crushers", "Chief Eng. PWD", ("VERIFIED", "good")],
            ["base_course", "Dense Bituminous Macadam", "MIX-DBM-2025-04", "Thane Aggregate Hub", "NHAI QA Lab", ("VERIFIED", "good")],
            ["subbase", "Wet Mix Macadam (WMM)", "MIX-WMM-2025-01", "Raigad Stone Quarry", "SGS Materials", ("VERIFIED", "good")],
            ["concrete", "M-40 Micro-Silica Grout", "MIX-M40-2026-02", "UltraTech RMC Plant", "IIT-B Audit", ("ACTIVE", "in_progress")],
        ],
        row_h=38
    )}

    <!-- Right Structural & Warranty Telemetry Panel -->
    <rect x="1060" y="70" width="356" height="784" rx="12" fill="#131c2e" stroke="#1e293b"/>
    <text x="1080" y="100" font-family="Inter, sans-serif" font-size="15" font-weight="800" fill="#ffffff">Twin Telemetry &amp; Warranty</text>
    <text x="1080" y="118" font-family="JetBrains Mono, monospace" font-size="10" fill="#38bdf8">Corridor: WEH-NH8 • NHAI-ROM</text>

    <rect x="1078" y="136" width="320" height="106" rx="8" fill="#0f172a" stroke="#1e293b"/>
    <text x="1094" y="158" font-family="Inter, sans-serif" font-size="10.5" font-weight="700" fill="#94a3b8">STRUCTURAL INTEGRITY INDEX</text>
    <text x="1094" y="194" font-family="Inter, sans-serif" font-size="30" font-weight="800" fill="#38bdf8">76.4 / 100</text>
    <text x="1094" y="218" font-family="JetBrains Mono, monospace" font-size="10" fill="#10b981">Surface Roughness IRI: 2.1 m/km (Fair-Good)</text>

    <!-- Warranty Card (project_warranties table) -->
    <rect x="1078" y="256" width="320" height="180" rx="8" fill="#0f172a" stroke="#10b981"/>
    <text x="1094" y="278" font-family="JetBrains Mono, monospace" font-size="10" font-weight="700" fill="#10b981">DEFECT LIABILITY WARRANTY (project_warranties)</text>
    <text x="1094" y="302" font-family="Inter, sans-serif" font-size="13" font-weight="800" fill="#ffffff">Warranty ID #PW-01 • 36 Months</text>
    <text x="1094" y="324" font-family="Inter, sans-serif" font-size="11" fill="#cbd5e1">Start: 2025-06-01 • End: 2028-06-01</text>
    <text x="1094" y="344" font-family="Inter, sans-serif" font-size="11" fill="#cbd5e1">Type: defect_liability • Claims Filed: 2</text>
    <text x="1094" y="364" font-family="JetBrains Mono, monospace" font-size="11" font-weight="700" fill="#f59e0b">Liability Coverage: ₹2,40,00,000</text>
    <rect x="1094" y="382" width="288" height="36" rx="6" fill="#064e3b"/>
    <text x="1238" y="404" font-family="Inter, sans-serif" font-size="11" font-weight="700" fill="#a7f3d0" text-anchor="middle">✓ Repairs Billed to Contractor (Zero Public Cost)</text>

    <!-- Attached Road Documents (road_documents table) -->
    <rect x="1078" y="452" width="320" height="382" rx="8" fill="#0f172a" stroke="#1e293b"/>
    <text x="1094" y="476" font-family="JetBrains Mono, monospace" font-size="10" font-weight="700" fill="#38bdf8">ATTACHED REPOSITORY (road_documents)</text>
    <rect x="1094" y="492" width="288" height="58" rx="6" fill="#131c2e" stroke="#1e293b"/>
    <text x="1106" y="512" font-family="Inter, sans-serif" font-size="11" font-weight="700" fill="#ffffff">📄 WEH_Core_Sample_Lab_Report.pdf</text>
    <text x="1106" y="530" font-family="JetBrains Mono, monospace" font-size="9.5" fill="#94a3b8">material_certificate • 2.4 MB • IIT-Bombay</text>

    <rect x="1094" y="560" width="288" height="58" rx="6" fill="#131c2e" stroke="#1e293b"/>
    <text x="1106" y="580" font-family="Inter, sans-serif" font-size="11" font-weight="700" fill="#ffffff">📐 WEH_Flyover_CAD_CrossSection.dwg</text>
    <text x="1106" y="598" font-family="JetBrains Mono, monospace" font-size="9.5" fill="#94a3b8">design_document • 8.1 MB • NHAI-ROM</text>

    <rect x="1094" y="628" width="288" height="58" rx="6" fill="#131c2e" stroke="#1e293b"/>
    <text x="1106" y="648" font-family="Inter, sans-serif" font-size="11" font-weight="700" fill="#ffffff">📷 KM4_2_Laser_Profilometer_Scan.png</text>
    <text x="1106" y="666" font-family="JetBrains Mono, monospace" font-size="9.5" fill="#94a3b8">inspection_photo • 1.8 MB • 2026-10-18</text>

    <rect x="1094" y="700" width="288" height="58" rx="6" fill="#131c2e" stroke="#1e293b"/>
    <text x="1106" y="720" font-family="Inter, sans-serif" font-size="11" font-weight="700" fill="#ffffff">📋 Apex_Infra_Grouting_Compliance.pdf</text>
    <text x="1106" y="738" font-family="JetBrains Mono, monospace" font-size="9.5" fill="#94a3b8">contractor_report • 3.2 MB • CON-00001</text>
    """
    return desktop_shell(8, "3D Digital Twin & Sub-Surface Structural Inspection", "Intelligence / 3D Digital Twin", "twin", "roads, road_materials, project_warranties, road_documents, projects", inner)


def build_frame_09():
    """Frame 09: IoT Pavement Sensor Network HUD & Sub-Surface Stress Monitor (1440x900 Desktop)"""
    inner = f"""
    <!-- Top 4 Sensor KPIs -->
    {kpi_card(244, 72, 281, 94, "Active IoT Piezo Nodes", "148 Nodes", "98.6% Online Across 8 Mumbai Corridors", "TELEMETRY", "#38bdf8")}
    {kpi_card(541, 72, 281, 94, "Sub-Base Moisture Avg", "16.4% Vol", "Alert on SV-RD-01 (28.9% Water Ingress)", "+4.2% MONSOON", "#f59e0b")}
    {kpi_card(838, 72, 281, 94, "Dynamic Axle Stress", "71.2 MPa", "Peak Heavy Commercial Load on WEH-NH8", "PIEZO ARRAY", "#6366f1")}
    {kpi_card(1135, 72, 281, 94, "Threshold Anomalies", "3 Critical", "Auto-Created Preventive Inspection Tickets", "AUTO-TRIGGER", "#f43f5e")}

    <!-- Center Left: Underground Cross Section Visualizer (UndergroundCrossSection.tsx) -->
    <rect x="244" y="182" width="600" height="340" rx="10" fill="#131c2e" stroke="#1e293b"/>
    <text x="264" y="208" font-family="Inter, sans-serif" font-size="14" font-weight="800" fill="#ffffff">Sub-Surface Pavement Cross-Section &amp; Embedded Sensor Array</text>
    <text x="264" y="226" font-family="JetBrains Mono, monospace" font-size="10" fill="#38bdf8">Component: UndergroundCrossSection.tsx • Corridor: S.V. Road (SV-RD-01)</text>

    <!-- 4 Geological / Pavement Strata Bands -->
    <rect x="264" y="242" width="560" height="52" rx="4" fill="#1e293b" stroke="#475569"/>
    <text x="278" y="264" font-family="JetBrains Mono, monospace" font-size="10" font-weight="700" fill="#f8fafc">L1: WEARING COURSE (50mm Bituminous Asphalt) • Temp: 39.4°C</text>
    <circle cx="480" cy="272" r="7" fill="#10b981" stroke="#fff"/><text x="494" y="276" font-family="JetBrains Mono, monospace" font-size="9.5" fill="#a7f3d0">SNS-SV-01 (142 µε)</text>
    <circle cx="680" cy="272" r="7" fill="#f43f5e" stroke="#fff"/><text x="694" y="276" font-family="JetBrains Mono, monospace" font-size="9.5" fill="#fecdd3">SNS-SV-02 (410 µε!)</text>

    <rect x="264" y="298" width="560" height="62" rx="4" fill="#172033" stroke="#334155"/>
    <text x="278" y="320" font-family="JetBrains Mono, monospace" font-size="10" font-weight="700" fill="#cbd5e1">L2: DENSE BITUMINOUS MACADAM BINDER (100mm) • Shear Stress: 64 MPa</text>
    <circle cx="560" cy="336" r="7" fill="#f59e0b" stroke="#fff"/><text x="574" y="340" font-family="JetBrains Mono, monospace" font-size="9.5" fill="#fde68a">SNS-SV-03 (Fatigue Warn)</text>

    <rect x="264" y="364" width="560" height="68" rx="4" fill="#0f172a" stroke="#334155"/>
    <text x="278" y="388" font-family="JetBrains Mono, monospace" font-size="10" font-weight="700" fill="#38bdf8">L3: WET MIX MACADAM SUB-BASE (250mm) • Moisture: 28.9% (CRITICAL)</text>
    <circle cx="420" cy="408" r="8" fill="#f43f5e" stroke="#fff"/><text x="434" y="412" font-family="JetBrains Mono, monospace" font-size="9.5" fill="#fecdd3">HYD-SV-04 (Seepage Alert)</text>

    <rect x="264" y="436" width="560" height="66" rx="4" fill="#091526" stroke="#1e3a8a"/>
    <text x="278" y="460" font-family="JetBrains Mono, monospace" font-size="10" font-weight="700" fill="#60a5fa">L4: NATURAL SUB-GRADE &amp; WATER TABLE • Pore Pressure: 18.4 kPa</text>
    <polyline points="274,484 340,476 410,488 480,472 550,486 620,474 690,488 760,478 814,484" fill="none" stroke="#38bdf8" stroke-width="2"/>

    <!-- Center Right: Corridor Stress & Vibration Heatmap (SensorHeatmap.tsx) -->
    <rect x="860" y="182" width="556" height="340" rx="10" fill="#131c2e" stroke="#1e293b"/>
    <text x="880" y="208" font-family="Inter, sans-serif" font-size="14" font-weight="800" fill="#ffffff">Acoustic &amp; Structural Stress Heatmap Matrix</text>
    <text x="880" y="226" font-family="JetBrains Mono, monospace" font-size="10" fill="#38bdf8">Component: SensorHeatmap.tsx • Micro-strain (µε) by KM Segment</text>

    <!-- Heatmap Bars per Road -->
    <text x="880" y="264" font-family="JetBrains Mono, monospace" font-size="11" font-weight="700" fill="#e2e8f0">SV-RD-01</text>
    <rect x="975" y="248" width="80" height="24" rx="4" fill="#f59e0b"/><rect x="1060" y="248" width="80" height="24" rx="4" fill="#f43f5e"/><rect x="1145" y="248" width="80" height="24" rx="4" fill="#f43f5e"/><rect x="1230" y="248" width="80" height="24" rx="4" fill="#f59e0b"/><rect x="1315" y="248" width="80" height="24" rx="4" fill="#10b981"/>

    <text x="880" y="304" font-family="JetBrains Mono, monospace" font-size="11" font-weight="700" fill="#e2e8f0">WEH-NH8</text>
    <rect x="975" y="288" width="80" height="24" rx="4" fill="#10b981"/><rect x="1060" y="288" width="80" height="24" rx="4" fill="#f59e0b"/><rect x="1145" y="288" width="80" height="24" rx="4" fill="#f59e0b"/><rect x="1230" y="288" width="80" height="24" rx="4" fill="#38bdf8"/><rect x="1315" y="288" width="80" height="24" rx="4" fill="#10b981"/>

    <text x="880" y="344" font-family="JetBrains Mono, monospace" font-size="11" font-weight="700" fill="#e2e8f0">LBS-MARG</text>
    <rect x="975" y="328" width="80" height="24" rx="4" fill="#f43f5e"/><rect x="1060" y="328" width="80" height="24" rx="4" fill="#f43f5e"/><rect x="1145" y="328" width="80" height="24" rx="4" fill="#f59e0b"/><rect x="1230" y="328" width="80" height="24" rx="4" fill="#38bdf8"/><rect x="1315" y="328" width="80" height="24" rx="4" fill="#38bdf8"/>

    <text x="880" y="384" font-family="JetBrains Mono, monospace" font-size="11" font-weight="700" fill="#e2e8f0">EEH-NH8</text>
    <rect x="975" y="368" width="80" height="24" rx="4" fill="#10b981"/><rect x="1060" y="368" width="80" height="24" rx="4" fill="#10b981"/><rect x="1145" y="368" width="80" height="24" rx="4" fill="#38bdf8"/><rect x="1230" y="368" width="80" height="24" rx="4" fill="#10b981"/><rect x="1315" y="368" width="80" height="24" rx="4" fill="#10b981"/>

    <text x="880" y="424" font-family="JetBrains Mono, monospace" font-size="11" font-weight="700" fill="#e2e8f0">SBM-MARG</text>
    <rect x="975" y="408" width="80" height="24" rx="4" fill="#10b981"/><rect x="1060" y="408" width="80" height="24" rx="4" fill="#10b981"/><rect x="1145" y="408" width="80" height="24" rx="4" fill="#10b981"/><rect x="1230" y="408" width="80" height="24" rx="4" fill="#10b981"/><rect x="1315" y="408" width="80" height="24" rx="4" fill="#10b981"/>

    <text x="975" y="458" font-family="JetBrains Mono, monospace" font-size="9.5" fill="#94a3b8">KM 0–4          KM 4–8          KM 8–12         KM 12–16        KM 16–20</text>
    <text x="880" y="492" font-family="Inter, sans-serif" font-size="11" fill="#cbd5e1">● Red (&gt;350 µε): Structural Sub-Base Delamination Risk   •   ● Amber (200–350 µε): Fatigue</text>

    <!-- Bottom Sensor Node Telemetry Table -->
    {data_table(
        244, 536, 1172,
        "Real-Time Pavement Sensor Node Stream & Automated Inspection Triggers",
        "Streams into road_defect_history (source = 'inspection') when micro-strain > 350 µε or moisture > 25%",
        ["Sensor Node ID", "Road Segment", "Depth Layer", "Tensile Strain", "Moisture %", "Asphalt Temp", "Health Status"],
        [140, 195, 165, 145, 135, 135, 150],
        [
            ["#SNS-SV-02", "S.V. Road (SV-RD-01)", "L1 Wearing (50mm)", "410 µε (Crit)", "24.1%", "39.8°C", ("BREACH • TICKETED", "critical")],
            ["#HYD-SV-04", "S.V. Road (SV-RD-01)", "L3 WMM Sub-base", "295 µε", "28.9% (Seepage)", "34.2°C", ("MOISTURE ALERT", "critical")],
            ["#SNS-LBS-09", "LBS Marg (LBS-MARG-01)", "L2 DBM Binder", "362 µε (High)", "22.4%", "38.5°C", ("FATIGUE WARNING", "warning")],
            ["#SNS-WEH-14", "Western Express (WEH-NH8)", "L1 Wearing (50mm)", "215 µε", "12.8%", "40.1°C", ("NOMINAL", "good")],
            ["#SNS-SBM-03", "Senapati Bapat Marg", "L1 Concrete Slab", "118 µε", "8.4%", "36.0°C", ("OPTIMAL", "good")],
        ],
        row_h=38
    )}
    """
    return desktop_shell(9, "IoT Pavement Sensor Network HUD & Sub-Surface Stress Monitor", "Intelligence / IoT Sensor Monitor", "sensors", "roads, road_defect_history, road_materials, complaints", inner)


def build_frame_10():
    """Frame 10: Historical Road Deterioration Playback & Timeline Analyzer (1440x900 Desktop)"""
    inner = f"""
    <!-- Interactive Time-Travel Scrubber Bar (TimelineSlider.tsx) -->
    <rect x="244" y="72" width="1172" height="92" rx="10" fill="#131c2e" stroke="#3b82f6" stroke-width="1.2"/>
    <text x="266" y="98" font-family="Inter, sans-serif" font-size="13.5" font-weight="800" fill="#ffffff">Temporal Database Snapshot Scrubber (road_defect_history: 2021 — 2026)</text>
    <rect x="1140" y="82" width="76" height="26" rx="6" fill="#2563eb"/><text x="1178" y="99" font-family="Inter, sans-serif" font-size="11" font-weight="700" fill="#fff" text-anchor="middle">▶ Play 2x</text>
    <rect x="1226" y="82" width="170" height="26" rx="6" fill="#0f172a" stroke="#38bdf8"/><text x="1311" y="99" font-family="JetBrains Mono, monospace" font-size="10.5" font-weight="700" fill="#38bdf8" text-anchor="middle">SNAPSHOT: 2026-10-22</text>

    <!-- Timeline Track -->
    <line x1="280" y1="132" x2="1380" y2="132" stroke="#334155" stroke-width="6" stroke-linecap="round"/>
    <line x1="280" y1="132" x2="1280" y2="132" stroke="url(#blueGrad)" stroke-width="6" stroke-linecap="round"/>
    <circle cx="380" cy="132" r="7" fill="#10b981"/><text x="380" y="152" font-family="JetBrains Mono, monospace" font-size="9.5" fill="#94a3b8" text-anchor="middle">2021 (Good)</text>
    <circle cx="580" cy="132" r="7" fill="#38bdf8"/><text x="580" y="152" font-family="JetBrains Mono, monospace" font-size="9.5" fill="#94a3b8" text-anchor="middle">2023 (Fair)</text>
    <circle cx="780" cy="132" r="8" fill="#f59e0b"/><text x="780" y="152" font-family="JetBrains Mono, monospace" font-size="9.5" fill="#fde68a" text-anchor="middle">May 2024 (PRJ-03 Start)</text>
    <circle cx="1020" cy="132" r="8" fill="#f43f5e"/><text x="1020" y="152" font-family="JetBrains Mono, monospace" font-size="9.5" fill="#fecdd3" text-anchor="middle">Jul 2025 (Halted/Blacklisted)</text>
    <circle cx="1280" cy="132" r="10" fill="#38bdf8" stroke="#ffffff" stroke-width="2"/><text x="1280" y="152" font-family="JetBrains Mono, monospace" font-size="10" font-weight="700" fill="#ffffff" text-anchor="middle">Oct 2026 (Emergency Fix)</text>

    <!-- Split Temporal Map Comparison & Deterioration Curve -->
    {mumbai_gis_map_box(244, 178, 576, 330, "Historical Spatial State: S.V. Road & LBS Marg")}

    <!-- Right Chart: Deterioration & Complaint Density Curve -->
    <rect x="836" y="178" width="580" height="330" rx="10" fill="#131c2e" stroke="#1e293b"/>
    <text x="856" y="206" font-family="Inter, sans-serif" font-size="14" font-weight="800" fill="#ffffff">Road Condition vs. Active Defect Count &amp; Avg Depth (cm)</text>
    <text x="856" y="224" font-family="JetBrains Mono, monospace" font-size="10" fill="#38bdf8">Trigger: trg_rdh_complaint_insert → snapshot_road_on_complaint_change()</text>

    <!-- Chart Axes -->
    <line x1="890" y1="250" x2="890" y2="450" stroke="#334155" stroke-width="1.5"/>
    <line x1="890" y1="450" x2="1380" y2="450" stroke="#334155" stroke-width="1.5"/>
    <line x1="890" y1="300" x2="1380" y2="300" stroke="#1e293b" stroke-dasharray="4,4"/>
    <line x1="890" y1="350" x2="1380" y2="350" stroke="#1e293b" stroke-dasharray="4,4"/>
    <line x1="890" y1="400" x2="1380" y2="400" stroke="#1e293b" stroke-dasharray="4,4"/>

    <!-- Complaint Surge Curve (Rose) -->
    <polyline points="910,435 995,418 1080,380 1165,295 1250,268 1350,310" fill="none" stroke="#f43f5e" stroke-width="3.5"/>
    <!-- PCI Health Curve (Cyan) -->
    <polyline points="910,265 995,288 1080,325 1165,390 1250,425 1350,375" fill="none" stroke="#38bdf8" stroke-width="3.5"/>

    <text x="910" y="472" font-family="JetBrains Mono, monospace" font-size="9.5" fill="#94a3b8">2021        2022        2023        2024        2025        2026</text>
    <text x="890" y="494" font-family="Inter, sans-serif" font-size="10.5" font-weight="600" fill="#38bdf8">▬ Pavement Health Score (PCI)     </text>
    <text x="1120" y="494" font-family="Inter, sans-serif" font-size="10.5" font-weight="600" fill="#f43f5e">▬ Open Complaints Count (complaints table)</text>

    <!-- Bottom Snapshot Ledger Table (road_defect_history) -->
    {data_table(
        244, 524, 1172,
        "Chronological Road Defect History Snapshots (road_defect_history table)",
        "SELECT id, road_id, snapshot_date, status_at_time, complaint_count, project_count, avg_depth_cm, source FROM road_defect_history ORDER BY snapshot_date DESC",
        ["Snapshot ID", "Road Segment", "Snapshot Date", "Status at Time", "Open Complaints", "Active Projects", "Avg Defect Depth", "Trigger Source"],
        [115, 190, 130, 145, 140, 135, 145, 140],
        [
            ["#RDH-9042", "S.V. Road (SV-RD-01)", "2026-10-22", ("POOR", "poor"), "18 Open", "2 Projects", "8.40 cm", "complaint"],
            ["#RDH-8810", "S.V. Road (SV-RD-01)", "2026-03-01", ("POOR", "poor"), "24 Open", "2 Projects", "9.15 cm", "project"],
            ["#RDH-7920", "LBS Marg (LBS-MARG-01)", "2025-11-15", ("POOR", "poor"), "15 Open", "1 Project", "7.80 cm", "inspection"],
            ["#RDH-6412", "Western Express (WEH-NH8)", "2025-06-01", ("CONSTRUCTION", "warning"), "9 Open", "2 Projects", "5.20 cm", "project"],
            ["#RDH-5104", "Eastern Express (EEH-NH8)", "2024-12-10", ("FAIR", "in_progress"), "6 Open", "1 Project", "4.10 cm", "inspection"],
            ["#RDH-3890", "Senapati Bapat Marg", "2023-12-10", ("GOOD", "good"), "0 Open", "0 Projects", "0.00 cm", "project"],
        ],
        row_h=38
    )}
    """
    return desktop_shell(10, "Historical Road Deterioration Playback & Snapshot Analyzer", "Accountability / Historical Playback", "playback", "road_defect_history, roads, projects, complaints", inner)

# ---------------------------------------------------------------------------
# FRAME 11 — 20 DEFINITIONS
# ---------------------------------------------------------------------------

def build_frame_11():
    """Frame 11: Municipal Operations Command Center & Live System Log (1440x900 Desktop)"""
    inner = f"""
    <!-- 4 Executive Operations KPIs -->
    {kpi_card(244, 72, 281, 94, "Active Open Grievances", "142 Tickets", "88 Routed • 36 In Progress • 18 Pending", "LIVE TRIAGE", "#38bdf8")}
    {kpi_card(541, 72, 281, 94, "SLA Compliance Rate", "91.5% Within", "Target <= 48h Pothole / <= 24h Drainage", "SLA ENGINE", "#10b981")}
    {kpi_card(838, 72, 281, 94, "Level 2 Escalations", "6 Critical", "Escalated toPWD-MUM & NHAI-ROM", "NEEDS ACTION", "#f43f5e")}
    {kpi_card(1135, 72, 281, 94, "Webhook Delivery Rate", "99.4% Sent", "17 Registered Authority Endpoints", "HTTP 200 OK", "#6366f1")}

    <!-- Center Grievance Operations Triage Table (ComplaintOperationsPanel.tsx) -->
    {data_table(
        244, 182, 780,
        "Municipal Grievance Triage & State Machine Console (complaints table)",
        "Enforces valid transitions: pending → routed → in_progress → resolved / rejected",
        ["Ticket ID", "Category", "Road Code", "Assigned Authority", "Priority", "SLA Level", "Status"],
        [95, 115, 100, 125, 80, 95, 120],
        [
            ["#CMP-18981", "pothole", "SV-RD-01", "MCGM-KW (Ward K-W)", "4 (High)", "L0 (31h left)", ("IN_PROGRESS", "in_progress")],
            ["#CMP-18940", "waterlogging", "LBS-MARG-01", "MCGM-HE (Ward H-E)", "5 (Crit)", "L2 BREACHED", ("ESCALATED L2", "critical")],
            ["#CMP-18952", "paving_defect", "WEH-NH8", "NHAI-ROM (Mumbai)", "4 (High)", "L1 (12h over)", ("ESCALATED L1", "warning")],
            ["#CMP-18990", "pothole", "LINK-RD-01", "MCGM-KW (Ward K-W)", "3 (Med)", "L0 (44h left)", ("ROUTED", "routed")],
            ["#CMP-18995", "missing_signage", "EEH-NH8", "PWD-MUM (State)", "2 (Fair)", "L0 (68h left)", ("PENDING", "pending")],
            ["#CMP-18812", "pothole", "SBM-MARG-01", "MCGM-FN (Ward F-N)", "4 (High)", "Closed 28h", ("RESOLVED", "resolved")],
            ["#CMP-18804", "debris", "MARINE-DR-01", "MCGM-FN (Ward F-N)", "3 (Med)", "Closed 19h", ("RESOLVED", "resolved")],
        ],
        row_h=40
    )}

    <!-- Bottom Quick Action Toolbar under Triage Table -->
    <rect x="244" y="566" width="780" height="284" rx="10" fill="#131c2e" stroke="#1e293b"/>
    <text x="264" y="594" font-family="Inter, sans-serif" font-size="14" font-weight="800" fill="#ffffff">Outbound Authority Webhook Registry &amp; Delivery Log (authority_webhooks + notification_log)</text>
    <text x="264" y="612" font-family="JetBrains Mono, monospace" font-size="10" fill="#38bdf8">Subscribed Events: complaint.assigned, complaint.escalated, complaint.updated, complaint.declined</text>

    <rect x="264" y="628" width="740" height="58" rx="8" fill="#0f172a" stroke="#10b981" stroke-width="0.8"/>
    <text x="280" y="650" font-family="JetBrains Mono, monospace" font-size="10.5" font-weight="700" fill="#a7f3d0">MCGM-KW → https://webhooks.mcgm.gov.in/api/v1/k-west/grievances</text>
    <text x="280" y="670" font-family="Inter, sans-serif" font-size="10.5" fill="#cbd5e1">Last Event: complaint.assigned (#CMP-18981) • HTTP 200 OK • Latency: 118ms • HMAC-SHA256 Verified</text>

    <rect x="264" y="696" width="740" height="58" rx="8" fill="#0f172a" stroke="#f59e0b" stroke-width="0.8"/>
    <text x="280" y="718" font-family="JetBrains Mono, monospace" font-size="10.5" font-weight="700" fill="#fde68a">PWD-MUM → https://pwd.maharashtra.gov.in/hooks/roadwatch-sla</text>
    <text x="280" y="738" font-family="Inter, sans-serif" font-size="10.5" fill="#cbd5e1">Last Event: complaint.escalated (#CMP-18940 → L2) • HTTP 200 OK • Latency: 204ms • Secret Token Active</text>

    <rect x="264" y="764" width="740" height="58" rx="8" fill="#0f172a" stroke="#3b82f6" stroke-width="0.8"/>
    <text x="280" y="786" font-family="JetBrains Mono, monospace" font-size="10.5" font-weight="700" fill="#93c5fd">NHAI-ROM → https://nhai.gov.in/ro-mumbai/telemetry/webhook</text>
    <text x="280" y="806" font-family="Inter, sans-serif" font-size="10.5" fill="#cbd5e1">Last Event: complaint.updated (#CMP-18952) • HTTP 200 OK • Latency: 142ms • Active</text>

    <!-- Right Live System Log Terminal (LiveSystemLog.tsx) -->
    <rect x="1040" y="182" width="376" height="668" rx="10" fill="#090d16" stroke="#334155"/>
    <rect x="1040" y="182" width="376" height="44" rx="10" fill="#131c2e"/>
    <circle cx="1062" cy="204" r="5" fill="#f43f5e"/><circle cx="1078" cy="204" r="5" fill="#f59e0b"/><circle cx="1094" cy="204" r="5" fill="#10b981"/>
    <text x="1114" y="208" font-family="JetBrains Mono, monospace" font-size="11" font-weight="700" fill="#ffffff">LiveSystemLog.tsx • DB Event Stream</text>

    <text x="1056" y="250" font-family="JetBrains Mono, monospace" font-size="9.5" fill="#10b981">[14:32:04] INFO  POST /api/v1/complaints (201)</text>
    <text x="1056" y="268" font-family="JetBrains Mono, monospace" font-size="9.5" fill="#94a3b8">  ├─ ST_Contains matched authority_id=1 (MCGM-KW)</text>
    <text x="1056" y="286" font-family="JetBrains Mono, monospace" font-size="9.5" fill="#94a3b8">  ├─ ST_DWithin matched road_id=3 (SV-RD-01, 4.2m)</text>
    <text x="1056" y="304" font-family="JetBrains Mono, monospace" font-size="9.5" fill="#38bdf8">  └─ Trigger: trg_audit_complaints → audit_log#9941</text>

    <text x="1056" y="336" font-family="JetBrains Mono, monospace" font-size="9.5" fill="#f59e0b">[14:30:00] WARN  SLA Worker Cron Tick Executed</text>
    <text x="1056" y="354" font-family="JetBrains Mono, monospace" font-size="9.5" fill="#fecdd3">  ├─ #CMP-18940 elapsed 51.2h &gt; sla_config(24h)</text>
    <text x="1056" y="372" font-family="JetBrains Mono, monospace" font-size="9.5" fill="#fecdd3">  ├─ Escalated: from_level=1 → to_level=2</text>
    <text x="1056" y="390" font-family="JetBrains Mono, monospace" font-size="9.5" fill="#38bdf8">  └─ INSERT INTO sla_escalations (id=412)</text>

    <text x="1056" y="422" font-family="JetBrains Mono, monospace" font-size="9.5" fill="#10b981">[14:28:19] INFO  Trigger trg_rdh_complaint_update</text>
    <text x="1056" y="440" font-family="JetBrains Mono, monospace" font-size="9.5" fill="#94a3b8">  ├─ Snapshot created for road_id=3 (SV-RD-01)</text>
    <text x="1056" y="458" font-family="JetBrains Mono, monospace" font-size="9.5" fill="#94a3b8">  └─ Open complaints: 18 • Status: poor</text>

    <text x="1056" y="490" font-family="JetBrains Mono, monospace" font-size="9.5" fill="#38bdf8">[14:25:11] INFO  Trigger trg_contractor_perf_index</text>
    <text x="1056" y="508" font-family="JetBrains Mono, monospace" font-size="9.5" fill="#94a3b8">  ├─ Recalculated CON-00003 (Zenith Construction)</text>
    <text x="1056" y="526" font-family="JetBrains Mono, monospace" font-size="9.5" fill="#10b981">  └─ performance_index = 87.91 (42 done, 1 delay)</text>

    <text x="1056" y="558" font-family="JetBrains Mono, monospace" font-size="9.5" fill="#10b981">[14:20:02] INFO  Webhook Dispatch #NL-809</text>
    <text x="1056" y="576" font-family="JetBrains Mono, monospace" font-size="9.5" fill="#94a3b8">  ├─ Target: ward.kw@mcgm.gov.in</text>
    <text x="1056" y="594" font-family="JetBrains Mono, monospace" font-size="9.5" fill="#10b981">  └─ Response: 200 OK (notification_log updated)</text>
    """
    return desktop_shell(11, "Municipal Operations Command Center & Live System Log", "System / Operations Center", "admin", "complaints, authorities, authority_webhooks, notification_log, audit_log", inner)


def build_frame_12():
    """Frame 12: Automated SLA Escalation Engine & Response Time Tracker (1440x900 Desktop)"""
    inner = f"""
    <!-- Critical SLA Alert Banner (EscalationSLAAlert.tsx) -->
    <rect x="244" y="72" width="1172" height="68" rx="10" fill="#4c0519" stroke="#f43f5e" stroke-width="1.5"/>
    <text x="268" y="98" font-family="JetBrains Mono, monospace" font-size="11" font-weight="800" fill="#fecdd3">🚨 AUTOMATED SLA BREACH ESCALATION ENGINE ACTIVE (sla_config + sla_escalations)</text>
    <text x="268" y="120" font-family="Inter, sans-serif" font-size="12" fill="#ffe4e6">6 open grievances exceeded statutory resolution hours and were automatically promoted to Level 1 / Level 2 oversight authorities.</text>
    <rect x="1220" y="88" width="176" height="36" rx="7" fill="#e11d48"/>
    <text x="1308" y="110" font-family="Inter, sans-serif" font-size="11.5" font-weight="700" fill="#ffffff" text-anchor="middle">Run SLA Check Now ↻</text>

    <!-- Left: SLA Configuration Matrix (sla_config table) -->
    {data_table(
        244, 154, 580,
        "Category SLA Threshold Rules (sla_config table)",
        "Per-region & per-category escalation hours and target authority mapping",
        ["Category", "Region", "L1 Hours", "L2 Hours", "Escalate To Authority"],
        [115, 65, 85, 85, 195],
        [
            ["pothole", "IN", "24h → L1", "48h → L2", "PWD-MUM → NHAI-ROM"],
            ["waterlogging", "IN", "12h → L1", "24h → L2", "MCGM-HE → PWD-MUM"],
            ["paving_defect", "IN", "48h → L1", "96h → L2", "PWD-MUM → NHAI-ROM"],
            ["debris", "IN", "18h → L1", "36h → L2", "MCGM-KW → PWD-MUM"],
            ["missing_signage", "IN", "36h → L1", "72h → L2", "MCGM-FN → PWD-MUM"],
        ],
        row_h=36
    )}

    <!-- Right: Authority Response Time Tracker (ResponseTimeTracker.tsx) -->
    <rect x="840" y="154" width="576" height="280" rx="10" fill="#131c2e" stroke="#1e293b"/>
    <text x="860" y="182" font-family="Inter, sans-serif" font-size="14" font-weight="800" fill="#ffffff">Authority Mean Time to Resolve (MTTR) vs. 48h Benchmark</text>
    <text x="860" y="200" font-family="JetBrains Mono, monospace" font-size="10" fill="#38bdf8">Component: ResponseTimeTracker.tsx • Routing Accuracy Score</text>

    <!-- Horizontal Bar Comparisons -->
    <text x="860" y="238" font-family="Inter, sans-serif" font-size="11.5" font-weight="600" fill="#e2e8f0">MCGM-FN (Ward F-North)</text>
    <rect x="1040" y="224" width="340" height="18" rx="4" fill="#0f172a"/><rect x="1040" y="224" width="198" height="18" rx="4" fill="#10b981"/>
    <text x="1248" y="237" font-family="JetBrains Mono, monospace" font-size="10" font-weight="700" fill="#10b981">28.4h Avg (96.8% Acc)</text>

    <text x="860" y="276" font-family="Inter, sans-serif" font-size="11.5" font-weight="600" fill="#e2e8f0">MCGM-KW (Ward K-West)</text>
    <rect x="1040" y="262" width="340" height="18" rx="4" fill="#0f172a"/><rect x="1040" y="262" width="235" height="18" rx="4" fill="#38bdf8"/>
    <text x="1285" y="275" font-family="JetBrains Mono, monospace" font-size="10" font-weight="700" fill="#38bdf8">34.2h Avg (96.4% Acc)</text>

    <text x="860" y="314" font-family="Inter, sans-serif" font-size="11.5" font-weight="600" fill="#e2e8f0">PWD-MUM (Mumbai Div)</text>
    <rect x="1040" y="300" width="340" height="18" rx="4" fill="#0f172a"/><rect x="1040" y="300" width="288" height="18" rx="4" fill="#f59e0b"/>
    <text x="1335" y="313" font-family="JetBrains Mono, monospace" font-size="10" font-weight="700" fill="#f59e0b">44.8h Avg</text>

    <text x="860" y="352" font-family="Inter, sans-serif" font-size="11.5" font-weight="600" fill="#e2e8f0">MCGM-HE (Ward H-East)</text>
    <rect x="1040" y="338" width="340" height="18" rx="4" fill="#0f172a"/><rect x="1040" y="338" width="325" height="18" rx="4" fill="#f43f5e"/>
    <text x="1290" y="351" font-family="JetBrains Mono, monospace" font-size="10" font-weight="700" fill="#ffffff">52.6h (Breach!)</text>

    <text x="860" y="390" font-family="Inter, sans-serif" font-size="11.5" font-weight="600" fill="#e2e8f0">NHAI-ROM (RO Mumbai)</text>
    <rect x="1040" y="376" width="340" height="18" rx="4" fill="#0f172a"/><rect x="1040" y="376" width="260" height="18" rx="4" fill="#38bdf8"/>
    <text x="1310" y="389" font-family="JetBrains Mono, monospace" font-size="10" font-weight="700" fill="#38bdf8">39.1h Avg</text>

    <!-- Bottom SLA Escalations Audit Trail Table (sla_escalations) -->
    {data_table(
        244, 450, 1172,
        "Immutable SLA Escalation Audit Ledger (sla_escalations table)",
        "SELECT e.id, e.complaint_id, c.title, e.from_level, e.to_level, e.escalated_by, a.department_code, e.notified_at, e.notification_status FROM sla_escalations e ...",
        ["Escalation ID", "Complaint ID", "Defect Summary & Road", "Transition", "Escalated By", "Target Authority", "Notified Timestamp", "Webhook Status"],
        [110, 115, 255, 110, 110, 140, 165, 130],
        [
            ["#ESC-0412", "#CMP-18940", "Severe Waterlogging on LBS Marg", "L1 → L2", "system_cron", "PWD-MUM (State)", "2026-10-22 14:30 UTC", ("SENT • 200 OK", "resolved")],
            ["#ESC-0411", "#CMP-18952", "Expansion Joint Crack on WEH-NH8", "L0 → L1", "system_cron", "NHAI-ROM (Hwy)", "2026-10-22 12:00 UTC", ("SENT • 200 OK", "resolved")],
            ["#ESC-0409", "#CMP-18910", "Subway Approach Crater on SV-RD-01", "L1 → L2", "admin_kanak", "PWD-MUM (State)", "2026-10-21 18:15 UTC", ("SENT • 200 OK", "resolved")],
            ["#ESC-0405", "#CMP-18894", "Manhole Depression on Link Road", "L0 → L1", "system_cron", "MCGM-KW (Ward)", "2026-10-21 09:00 UTC", ("SENT • 200 OK", "resolved")],
            ["#ESC-0401", "#CMP-18860", "Asphalt Peeling on LBS Marg", "L1 → L2", "system_cron", "PWD-MUM (State)", "2026-10-20 22:00 UTC", ("SENT • 200 OK", "resolved")],
            ["#ESC-0398", "#CMP-18832", "Storm Drain Choke on SV-RD-01", "L0 → L1", "system_cron", "MCGM-KW (Ward)", "2026-10-20 14:00 UTC", ("SENT • 200 OK", "resolved")],
        ],
        row_h=38
    )}
    """
    return desktop_shell(12, "Automated SLA Escalation Engine & Response Time Tracker", "Accountability / SLA Escalation Engine", "sla", "sla_config, sla_escalations, complaints, authorities, notification_log", inner)


def build_frame_13():
    """Frame 13: Geospatial Jurisdiction Boundary & Cross-Region Conflict Resolver (1440x900 Desktop)"""
    inner = f"""
    <!-- Left Map: Polygon Overlap & Boundary Crossing Map -->
    {mumbai_gis_map_box(244, 72, 590, 410, "Jurisdiction Polygon Overlap: MCGM-KW ∩ PWD-MUM ∩ NHAI-ROM")}

    <!-- Right Panel: Active Conflict Groups & Resolution Actions -->
    <rect x="850" y="72" width="566" height="410" rx="10" fill="#131c2e" stroke="#f59e0b" stroke-width="1.2"/>
    <text x="870" y="100" font-family="Inter, sans-serif" font-size="15" font-weight="800" fill="#ffffff">Boundary &amp; Duplicate Conflict Resolution Queue</text>
    <text x="870" y="118" font-family="JetBrains Mono, monospace" font-size="10" fill="#f59e0b">Tables: road_conflict_groups, authority_conflict_groups, road_aliases</text>

    <!-- Conflict Card 1 -->
    <rect x="870" y="134" width="526" height="152" rx="8" fill="#0f172a" stroke="#f43f5e"/>
    <text x="886" y="156" font-family="JetBrains Mono, monospace" font-size="10.5" font-weight="700" fill="#fecdd3">CONFLICT KEY: RCG-MUM-WEH-ANDHERI-RAMP (Unresolved)</text>
    <text x="886" y="178" font-family="Inter, sans-serif" font-size="13" font-weight="800" fill="#ffffff">Western Express Highway Flyover Slip-Road (Andheri East)</text>
    <text x="886" y="198" font-family="Inter, sans-serif" font-size="11" fill="#cbd5e1">• Declined By: MCGM-KW (declined_authority_ids = [1]) — Claims NHAI Flyover Zone</text>
    <text x="886" y="216" font-family="Inter, sans-serif" font-size="11" fill="#cbd5e1">• Overlapping Polygons: PWD-MUM (id=4) &amp; NHAI-ROM (id=5) via ST_Intersects</text>
    <rect x="886" y="232" width="160" height="38" rx="6" fill="url(#blueGrad)"/>
    <text x="966" y="255" font-family="Inter, sans-serif" font-size="11" font-weight="700" fill="#ffffff" text-anchor="middle">Split Complaint (Both)</text>
    <rect x="1056" y="232" width="165" height="38" rx="6" fill="#064e3b" stroke="#10b981"/>
    <text x="1138" y="255" font-family="Inter, sans-serif" font-size="11" font-weight="700" fill="#a7f3d0" text-anchor="middle">Assign Primary: NHAI</text>
    <rect x="1231" y="232" width="148" height="38" rx="6" fill="#1e293b" stroke="#475569"/>
    <text x="1305" y="255" font-family="Inter, sans-serif" font-size="11" fill="#cbd5e1" text-anchor="middle">Merge JSONB Meta</text>

    <!-- Conflict Card 2: Road Aliases -->
    <rect x="870" y="298" width="526" height="166" rx="8" fill="#0f172a" stroke="#3b82f6"/>
    <text x="886" y="320" font-family="JetBrains Mono, monospace" font-size="10.5" font-weight="700" fill="#38bdf8">CROSS-REGION &amp; LOCAL ROAD ALIAS RESOLVER (road_aliases table)</text>
    <text x="886" y="344" font-family="Inter, sans-serif" font-size="11.5" font-weight="600" fill="#e2e8f0">• Road ID #1 (WEH-NH8): "Western Express Highway" (primary) ↔ "NH-48 Mumbai"</text>
    <text x="886" y="366" font-family="Inter, sans-serif" font-size="11.5" font-weight="600" fill="#e2e8f0">• Road ID #3 (SV-RD-01): "Swami Vivekananda Road" (national) ↔ "S.V. Road"</text>
    <text x="886" y="388" font-family="Inter, sans-serif" font-size="11.5" font-weight="600" fill="#e2e8f0">• Road ID #5 (LBS-MARG-01): "Lal Bahadur Shastri Marg" ↔ "Old Agra Road"</text>
    <text x="886" y="416" font-family="JetBrains Mono, monospace" font-size="10" fill="#10b981">✓ Prevents duplicate road creation during citizen NLP chat &amp; OSM imports</text>
    <text x="886" y="438" font-family="JetBrains Mono, monospace" font-size="10" fill="#94a3b8">Constraint: UNIQUE(road_id, alias_name) • Indexed on idx_road_aliases_name</text>

    <!-- Bottom Table: road_region_crossings & region_overlap_routes -->
    {data_table(
        244, 498, 1172,
        "Cross-Boundary Segment Crossings & Overlap Routing Rules (road_region_crossings & region_overlap_routes)",
        "Handles complaints with parent_complaint_id self-referential FK split across multi-authority borders",
        ["Crossing ID", "Road Code", "Primary Jurisdiction", "Secondary Jurisdiction", "Segment Geometry WKT", "Split Action Rule", "Resolution State"],
        [105, 115, 165, 175, 250, 150, 160],
        [
            ["#RRC-01", "WEH-NH8", "MCGM-KW (Ward K-W)", "NHAI-ROM (National)", "LINESTRING(72.852 19.101...)", ("SPLIT (Parent/Child)", "in_progress"), ("RESOLVED", "resolved")],
            ["#RRC-02", "WEH-NH8", "PWD-MUM (State Div)", "NHAI-ROM (National)", "LINESTRING(72.859 19.186...)", ("FORWARD PRIMARY", "routed"), ("PENDING LOCK", "warning")],
            ["#RRC-03", "EEH-NH8", "MCGM-HE (Ward H-E)", "PWD-MUM (State Div)", "LINESTRING(72.921 19.041...)", ("DUPLICATE NOTIFY", "info"), ("RESOLVED", "resolved")],
            ["#RRC-04", "GHODBUNDER", "PWD-MUM (State Div)", "NHAI-ROM (National)", "LINESTRING(72.955 19.222...)", ("FORWARD PRIMARY", "routed"), ("RESOLVED", "resolved")],
            ["#RRC-05", "SV-RD-01", "MCGM-KW (Ward K-W)", "MCGM-FN (Ward F-N)", "LINESTRING(72.835 19.060...)", ("SPLIT (Parent/Child)", "in_progress"), ("RESOLVED", "resolved")],
        ],
        row_h=40
    )}
    """
    return desktop_shell(13, "Geospatial Jurisdiction Boundary & Conflict Resolver", "System / Boundary Conflicts", "conflicts", "road_region_crossings, region_overlap_routes, road_conflict_groups, road_aliases", inner)


def build_frame_14():
    """Frame 14: Field Maintenance Repair Scheduler & Milestone Execution (1440x900 Desktop)"""
    inner = f"""
    <!-- Top 4 Scheduler KPIs -->
    {kpi_card(244, 72, 281, 94, "Active Field Crews", "18 Teams", "Dispatched Across 6 Mumbai Projects", "ON-SITE", "#38bdf8")}
    {kpi_card(541, 72, 281, 94, "Milestones Completed", "34 / 52", "Verified by PWD & MCGM Chief Engineers", "65.4% DONE", "#10b981")}
    {kpi_card(838, 72, 281, 94, "Milestone Payouts Due", "₹11.40 Cr", "4 Milestones Pending Final QA Release", "APPROVAL", "#f59e0b")}
    {kpi_card(1135, 72, 281, 94, "Delayed Contracts", "2 Halted/Late", "SV-RD-01 (378d) & LBS-MARG-01 (203d)", "PENALTY LOG", "#f43f5e")}

    <!-- Weekly Gantt / Crew Dispatch Timeline (RepairScheduler.tsx) -->
    <rect x="244" y="180" width="1172" height="270" rx="10" fill="#131c2e" stroke="#1e293b"/>
    <text x="264" y="208" font-family="Inter, sans-serif" font-size="14" font-weight="800" fill="#ffffff">Active Public Works Gantt Schedule &amp; Field Engineering Dispatch (RepairScheduler.tsx)</text>
    <text x="264" y="226" font-family="JetBrains Mono, monospace" font-size="10" fill="#38bdf8">Constraint enforced: CHECK (target_end_date &gt;= start_date) • CHECK (completion_date &gt;= due_date)</text>

    <!-- Gantt Header -->
    <text x="264" y="254" font-family="JetBrains Mono, monospace" font-size="10" font-weight="700" fill="#94a3b8">PROJECT / CORRIDOR               Q1 2026            Q2 2026            Q3 2026            Q4 2026            STATUS</text>
    <line x1="264" y1="262" x2="1396" y2="262" stroke="#1e293b"/>

    <!-- Gantt Row 1 -->
    <text x="264" y="290" font-family="Inter, sans-serif" font-size="11.5" font-weight="700" fill="#ffffff">#PRJ-01 WEH Flyover Grouting</text>
    <rect x="520" y="276" width="520" height="20" rx="5" fill="#1e3a8a" stroke="#38bdf8"/>
    <rect x="520" y="276" width="400" height="20" rx="5" fill="url(#blueGrad)"/>
    <text x="720" y="290" font-family="JetBrains Mono, monospace" font-size="9.5" font-weight="700" fill="#ffffff" text-anchor="middle">77% Spent (₹18.5 Cr / ₹24.0 Cr) • Apex Infra</text>
    {status_badge(1270, 275, "ON SCHEDULE", "good")}

    <!-- Gantt Row 2 -->
    <text x="264" y="330" font-family="Inter, sans-serif" font-size="11.5" font-weight="700" fill="#ffffff">#PRJ-04 SV Emergency Asphalt</text>
    <rect x="610" y="316" width="440" height="20" rx="5" fill="#064e3b" stroke="#10b981"/>
    <rect x="610" y="316" width="210" height="20" rx="5" fill="url(#emeraldGrad)"/>
    <text x="820" y="330" font-family="JetBrains Mono, monospace" font-size="9.5" font-weight="700" fill="#ffffff" text-anchor="middle">34% Spent (₹1.2 Cr / ₹3.5 Cr) • Zenith Con</text>
    {status_badge(1270, 315, "IN_PROGRESS", "in_progress")}

    <!-- Gantt Row 3 -->
    <text x="264" y="370" font-family="Inter, sans-serif" font-size="11.5" font-weight="700" fill="#ffffff">#PRJ-05 Link Rd Concrete Ph.2</text>
    <rect x="500" y="356" width="600" height="20" rx="5" fill="#1e3a8a" stroke="#38bdf8"/>
    <rect x="500" y="356" width="310" height="20" rx="5" fill="url(#blueGrad)"/>
    <text x="800" y="370" font-family="JetBrains Mono, monospace" font-size="9.5" font-weight="700" fill="#ffffff" text-anchor="middle">52% Spent (₹7.5 Cr / ₹14.5 Cr) • Metro Hwy</text>
    {status_badge(1270, 355, "IN_PROGRESS", "in_progress")}

    <!-- Gantt Row 4 -->
    <text x="264" y="410" font-family="Inter, sans-serif" font-size="11.5" font-weight="700" fill="#f43f5e">#PRJ-03 SV Drainage Trenching</text>
    <rect x="480" y="396" width="390" height="20" rx="5" fill="#4c0519" stroke="#f43f5e"/>
    <text x="675" y="410" font-family="JetBrains Mono, monospace" font-size="9.5" font-weight="700" fill="#fecdd3" text-anchor="middle">HALTED AT 47% (378 Days Delayed • Omega Infra)</text>
    {status_badge(1270, 395, "HALTED • AUDIT", "critical")}

    <!-- Bottom Project Milestones Table (project_milestones table) -->
    {data_table(
        244, 466, 1172,
        "Project Milestone Payment & Verification Ledger (project_milestones table)",
        "SELECT id, project_id, title, amount, status, due_date, completion_date, verified_by, payment_release_date FROM project_milestones",
        ["Milestone ID", "Project ID", "Milestone Deliverable Title", "Amount (INR)", "Due Date", "Verified By", "Milestone Status"],
        [105, 95, 310, 140, 120, 185, 165],
        [
            ["#MS-101", "#PRJ-01", "Phase 1: Cold Milling & Expansion Joint Grouting", "₹6,00,00,000", "2025-10-15", "Er. V. Kulkarni (NHAI)", ("COMPLETED • PAID", "resolved")],
            ["#MS-102", "#PRJ-01", "Phase 2: DBM Binder Course 75mm Compaction", "₹8,50,00,000", "2026-02-28", "Er. V. Kulkarni (NHAI)", ("COMPLETED • PAID", "resolved")],
            ["#MS-103", "#PRJ-01", "Phase 3: VG-40 Wearing Course & Thermoplastic", "₹5,50,00,000", "2026-05-30", "Pending Field QA", ("IN_PROGRESS", "in_progress")],
            ["#MS-204", "#PRJ-04", "Emergency Crater Excavation & WMM Base", "₹1,20,00,000", "2026-04-30", "Er. R. Deshmukh (MCGM)", ("COMPLETED • PAID", "resolved")],
            ["#MS-205", "#PRJ-04", "Mastic Asphalt Top Seal & Rainwater Grates", "₹2,30,00,000", "2026-08-31", "Awaiting Core Test", ("IN_PROGRESS", "in_progress")],
            ["#MS-302", "#PRJ-03", "Microtunnelling Storm Conduit (Disputed)", "₹5,00,00,000", "2025-05-10", "REJECTED BY AUDITOR", ("CANCELLED • FROZEN", "critical")],
        ],
        row_h=38
    )}
    """
    return desktop_shell(14, "Field Maintenance Repair Scheduler & Milestone Execution", "System / Repair Scheduler", "scheduler", "projects, project_milestones, contractors, roads, approval_trail", inner)


def build_frame_15():
    """Frame 15: Multi-Region Hub & OpenStreetMap Data Quality Catalog (1440x900 Desktop)"""
    inner = f"""
    <!-- 4 Global Region Cards (regions table) -->
    {kpi_card(244, 72, 281, 108, "🇮🇳 India (Region: IN)", "Mumbai • INR (₹)", "5 Authorities • 8 Roads • 10 Projects", "Asia/Kolkata", "#38bdf8")}
    {kpi_card(541, 72, 281, 108, "🇺🇸 United States (US)", "Detroit • USD ($)", "4 Authorities • 4 Roads • 4 Projects", "America/Detroit", "#10b981")}
    {kpi_card(838, 72, 281, 108, "🇬🇧 United Kingdom (GB)", "London • GBP (£)", "4 Authorities • 4 Roads • 4 Projects", "Europe/London", "#6366f1")}
    {kpi_card(1135, 72, 281, 108, "🇰🇪 Kenya (Region: KE)", "Nairobi • KES (KSh)", "4 Authorities • 6 Roads • 8 Projects", "Africa/Nairobi", "#f59e0b")}

    <!-- Center Left: OSM Import Log & CPI Inflation Table (region_import_log + cpi_data) -->
    {data_table(
        244, 196, 610,
        "External OSM Geospatial Import Runs (region_import_log)",
        "Tracks automated OpenStreetMap LineString ingestion & validation",
        ["Run ID", "Region", "Source", "Imported", "Skipped", "Errors", "Finished At"],
        [75, 65, 75, 80, 75, 65, 140],
        [
            ["#IMP-41", "IN", "osm_overpass", "842", "14", "0", "2026-10-22 04:00"],
            ["#IMP-40", "US", "tiger_osm", "618", "9", "0", "2026-10-22 03:30"],
            ["#IMP-39", "GB", "os_highways", "512", "4", "0", "2026-10-22 03:00"],
            ["#IMP-38", "KE", "kura_osm", "394", "19", "1", "2026-10-22 02:30"],
        ],
        row_h=36
    )}

    <!-- Center Right: CPI Inflation Normalization Panel (cpi_data table) -->
    <rect x="870" y="196" width="546" height="248" rx="10" fill="#131c2e" stroke="#1e293b"/>
    <text x="890" y="224" font-family="Inter, sans-serif" font-size="14" font-weight="800" fill="#ffffff">Cross-Region CPI Inflation Normalization (cpi_data table)</text>
    <text x="890" y="242" font-family="JetBrains Mono, monospace" font-size="10" fill="#38bdf8">UNIQUE(region_code, year) • Normalizes 2020–2026 historical road budgets</text>

    <rect x="890" y="260" width="244" height="76" rx="8" fill="#0f172a" stroke="#1e293b"/>
    <text x="906" y="282" font-family="JetBrains Mono, monospace" font-size="10.5" font-weight="700" fill="#38bdf8">IN (India CPI Index)</text>
    <text x="906" y="304" font-family="Inter, sans-serif" font-size="12" font-weight="700" fill="#ffffff">2023: 181.2  →  2026: 198.6</text>
    <text x="906" y="322" font-family="JetBrains Mono, monospace" font-size="9.5" fill="#10b981">Inflation Deflator: +9.6%</text>

    <rect x="1152" y="260" width="244" height="76" rx="8" fill="#0f172a" stroke="#1e293b"/>
    <text x="1168" y="282" font-family="JetBrains Mono, monospace" font-size="10.5" font-weight="700" fill="#10b981">US (Detroit CPI Index)</text>
    <text x="1168" y="304" font-family="Inter, sans-serif" font-size="12" font-weight="700" fill="#ffffff">2023: 304.7  →  2026: 324.1</text>
    <text x="1168" y="322" font-family="JetBrains Mono, monospace" font-size="9.5" fill="#10b981">Inflation Deflator: +6.4%</text>

    <rect x="890" y="348" width="244" height="76" rx="8" fill="#0f172a" stroke="#1e293b"/>
    <text x="906" y="370" font-family="JetBrains Mono, monospace" font-size="10.5" font-weight="700" fill="#6366f1">GB (UK CPI Index)</text>
    <text x="906" y="392" font-family="Inter, sans-serif" font-size="12" font-weight="700" fill="#ffffff">2023: 130.5  →  2026: 139.8</text>
    <text x="906" y="410" font-family="JetBrains Mono, monospace" font-size="9.5" fill="#10b981">Inflation Deflator: +7.1%</text>

    <rect x="1152" y="348" width="244" height="76" rx="8" fill="#0f172a" stroke="#1e293b"/>
    <text x="1168" y="370" font-family="JetBrains Mono, monospace" font-size="10.5" font-weight="700" fill="#f59e0b">KE (Kenya CPI Index)</text>
    <text x="1168" y="392" font-family="Inter, sans-serif" font-size="12" font-weight="700" fill="#ffffff">2023: 134.0  →  2026: 152.4</text>
    <text x="1168" y="410" font-family="JetBrains Mono, monospace" font-size="9.5" fill="#f59e0b">Inflation Deflator: +13.7%</text>

    <!-- Bottom Multi-Region Road Data Catalog Table -->
    {data_table(
        244, 460, 1172,
        "Global Multi-Region Road Asset & Data Quality Catalog (22 Seeded Corridors Across IN, US, GB, KE)",
        "Evaluates 4 Data Quality Dimensions: Completeness, Freshness, Relational Consistency, PostGIS Spatial Validity",
        ["Region", "Road Code", "Corridor Name", "Managing Authority", "Length", "Surface / Width", "AADT", "Data Quality Grade"],
        [75, 115, 215, 225, 85, 145, 110, 150],
        [
            ["🇮🇳 IN", "WEH-NH8", "Western Express Highway", "NHAI-ROM (RO Mumbai)", "25.5 km", "Asphalt • 35.5m", "185,000", ("GRADE A (94%)", "good")],
            ["🇮🇳 IN", "SV-RD-01", "S.V. Road Corridor", "MCGM-KW (Ward K-West)", "16.8 km", "Asphalt • 14.5m", "62,000", ("GRADE B+ (88%)", "in_progress")],
            ["🇺🇸 US", "I94-WD-01", "I-94 Edsel Ford Freeway", "FHWA-MI (Michigan Div)", "45.2 km", "Asphalt • 35.0m", "155,000", ("GRADE A (92%)", "good")],
            ["🇺🇸 US", "WOODWARD-01", "Woodward Avenue M-1", "MDOT-LAN (Michigan DOT)", "27.0 km", "Asphalt • 24.0m", "72,000", ("GRADE A (95%)", "good")],
            ["🇬🇧 GB", "M25-01", "M25 London Orbital J8-12", "NH-SE (National Hwys)", "18.9 km", "Asphalt • 36.0m", "180,000", ("GRADE A+ (97%)", "good")],
            ["🇰🇪 KE", "THIKA-SHWY-01", "Thika Superhighway (A2)", "KURA-HQ (Kenya Urban)", "12.5 km", "Asphalt • 35.0m", "95,000", ("GRADE A (91%)", "good")],
        ],
        row_h=38
    )}
    """
    return desktop_shell(15, "Multi-Region Governance Hub & Data Quality Catalog", "Intelligence / Multi-Region Hub", "regions", "regions, region_import_log, cpi_data, roads, authorities", inner)


def build_frame_16():
    """Frame 16: Public Spend Transparency, Sankey Fund Flow & Cost-Per-KM Screen (1440x900 Desktop)"""
    inner = f"""
    <!-- Top 4 Fiscal KPIs -->
    {kpi_card(244, 72, 281, 94, "Total Allocated (Mumbai)", "₹92.20 Cr", "Across 10 Active & Completed Contracts", "10 PROJECTS", "#38bdf8")}
    {kpi_card(541, 72, 281, 94, "Total Disbursed Spend", "₹61.62 Cr", "66.8% Utilization • Audited Vouchers", "VERIFIED", "#10b981")}
    {kpi_card(838, 72, 281, 94, "Normalized Cost / KM", "₹7.39 Cr/km", "Computed via cost_per_km_view SQL View", "BENCHMARK", "#6366f1")}
    {kpi_card(1135, 72, 281, 94, "Population Served", "4.82 Million", "Aggregated via road_beneficiary_view", "BENEFICIARIES", "#f59e0b")}

    <!-- Center Left: Sankey Multi-Tier Fund Flow Diagram (SankeyFlowVisualizer.tsx / fund_sources) -->
    <rect x="244" y="182" width="660" height="310" rx="10" fill="#131c2e" stroke="#1e293b"/>
    <text x="264" y="208" font-family="Inter, sans-serif" font-size="14" font-weight="800" fill="#ffffff">Multi-Tier Public Fund Allocation Sankey Flow (fund_sources table)</text>
    <text x="264" y="226" font-family="JetBrains Mono, monospace" font-size="10" fill="#38bdf8">Component: SankeyFlowVisualizer.tsx • Source Tier → Authority Tier → Road Contract Tier</text>

    <!-- Left Nodes: Fund Sources -->
    <rect x="268" y="248" width="155" height="48" rx="6" fill="#1e3a8a" stroke="#38bdf8"/>
    <text x="345" y="270" font-family="Inter, sans-serif" font-size="10.5" font-weight="700" fill="#ffffff" text-anchor="middle">Central Road Infra Fund</text>
    <text x="345" y="286" font-family="JetBrains Mono, monospace" font-size="10" fill="#93c5fd" text-anchor="middle">₹25.00 Cr (27.1%)</text>

    <rect x="268" y="310" width="155" height="48" rx="6" fill="#064e3b" stroke="#10b981"/>
    <text x="345" y="332" font-family="Inter, sans-serif" font-size="10.5" font-weight="700" fill="#ffffff" text-anchor="middle">State PWD Allocations</text>
    <text x="345" y="348" font-family="JetBrains Mono, monospace" font-size="10" fill="#a7f3d0" text-anchor="middle">₹28.20 Cr (30.6%)</text>

    <rect x="268" y="372" width="155" height="48" rx="6" fill="#451a03" stroke="#f59e0b"/>
    <text x="345" y="394" font-family="Inter, sans-serif" font-size="10.5" font-weight="700" fill="#ffffff" text-anchor="middle">Municipal General Tier</text>
    <text x="345" y="410" font-family="JetBrains Mono, monospace" font-size="10" fill="#fde68a" text-anchor="middle">₹39.00 Cr (42.3%)</text>

    <!-- Flow Curves -->
    <path d="M 423 272 C 475 272, 475 268, 525 268" fill="none" stroke="#38bdf8" stroke-width="14" stroke-opacity="0.45"/>
    <path d="M 423 334 C 475 334, 475 334, 525 334" fill="none" stroke="#10b981" stroke-width="16" stroke-opacity="0.45"/>
    <path d="M 423 396 C 475 396, 475 400, 525 400" fill="none" stroke="#f59e0b" stroke-width="20" stroke-opacity="0.45"/>

    <!-- Middle Nodes: Authorities -->
    <rect x="525" y="248" width="130" height="44" rx="6" fill="#0f172a" stroke="#38bdf8"/>
    <text x="590" y="274" font-family="JetBrains Mono, monospace" font-size="10.5" font-weight="700" fill="#38bdf8" text-anchor="middle">NHAI-ROM (₹32.5Cr)</text>

    <rect x="525" y="312" width="130" height="44" rx="6" fill="#0f172a" stroke="#10b981"/>
    <text x="590" y="338" font-family="JetBrains Mono, monospace" font-size="10.5" font-weight="700" fill="#10b981" text-anchor="middle">PWD-MUM (₹20.8Cr)</text>

    <rect x="525" y="376" width="130" height="44" rx="6" fill="#0f172a" stroke="#f59e0b"/>
    <text x="590" y="402" font-family="JetBrains Mono, monospace" font-size="10.5" font-weight="700" fill="#f59e0b" text-anchor="middle">MCGM Wards (₹38.9Cr)</text>

    <!-- Flow Curves to Projects -->
    <path d="M 655 270 C 695 270, 695 268, 735 268" fill="none" stroke="#38bdf8" stroke-width="14" stroke-opacity="0.45"/>
    <path d="M 655 334 C 695 334, 695 334, 735 334" fill="none" stroke="#10b981" stroke-width="14" stroke-opacity="0.45"/>
    <path d="M 655 398 C 695 398, 695 400, 735 400" fill="none" stroke="#f59e0b" stroke-width="18" stroke-opacity="0.45"/>

    <!-- Right Nodes: Major Projects -->
    <rect x="735" y="248" width="150" height="44" rx="6" fill="#0f172a" stroke="#cbd5e1"/>
    <text x="810" y="274" font-family="Inter, sans-serif" font-size="10" font-weight="700" fill="#ffffff" text-anchor="middle">WEH &amp; Ghodbunder</text>

    <rect x="735" y="312" width="150" height="44" rx="6" fill="#0f172a" stroke="#cbd5e1"/>
    <text x="810" y="338" font-family="Inter, sans-serif" font-size="10" font-weight="700" fill="#ffffff" text-anchor="middle">Link Rd &amp; SBM Concrete</text>

    <rect x="735" y="376" width="150" height="44" rx="6" fill="#0f172a" stroke="#f43f5e"/>
    <text x="810" y="402" font-family="Inter, sans-serif" font-size="10" font-weight="700" fill="#fecdd3" text-anchor="middle">SV Rd &amp; LBS Sewer</text>

    <text x="268" y="466" font-family="JetBrains Mono, monospace" font-size="10" fill="#94a3b8">✓ 100% Traceable from Taxpayer Source → Authority → Road Segment → Beneficiary Population</text>

    <!-- Center Right: Value for Money & Beneficiary Card (VfmScoreCard.tsx) -->
    <rect x="920" y="182" width="496" height="310" rx="10" fill="#131c2e" stroke="#1e293b"/>
    <text x="940" y="208" font-family="Inter, sans-serif" font-size="14" font-weight="800" fill="#ffffff">Cost-Per-KM &amp; Beneficiary Impact (road_beneficiary_view)</text>
    <text x="940" y="226" font-family="JetBrains Mono, monospace" font-size="10" fill="#38bdf8">Joins projects ⋈ roads ⋈ project_beneficiaries (residential/commuters)</text>

    <rect x="940" y="244" width="220" height="104" rx="8" fill="#0f172a" stroke="#10b981"/>
    <text x="956" y="266" font-family="Inter, sans-serif" font-size="10" font-weight="700" fill="#94a3b8">BEST VALUE FOR MONEY</text>
    <text x="956" y="294" font-family="Inter, sans-serif" font-size="16" font-weight="800" fill="#10b981">Ghodbunder Hwy</text>
    <text x="956" y="314" font-family="JetBrains Mono, monospace" font-size="10.5" fill="#e2e8f0">₹0.93 Cr/km • 85k AADT</text>
    <text x="956" y="332" font-family="JetBrains Mono, monospace" font-size="9.5" fill="#10b981">Saved ₹30.0 Lakhs under budget</text>

    <rect x="1176" y="244" width="220" height="104" rx="8" fill="#0f172a" stroke="#f43f5e"/>
    <text x="1192" y="266" font-family="Inter, sans-serif" font-size="10" font-weight="700" fill="#94a3b8">COST OVERRUN FLAGGED</text>
    <text x="1192" y="294" font-family="Inter, sans-serif" font-size="16" font-weight="800" fill="#f43f5e">EEH Remediation</text>
    <text x="1192" y="314" font-family="JetBrains Mono, monospace" font-size="10.5" fill="#e2e8f0">+₹12.0 Lakhs Overrun</text>
    <text x="1192" y="332" font-family="JetBrains Mono, monospace" font-size="9.5" fill="#fecdd3">Spent ₹1.92 Cr vs ₹1.80 Cr Alloc</text>

    <rect x="940" y="362" width="456" height="112" rx="8" fill="#0f172a" stroke="#1e293b"/>
    <text x="956" y="384" font-family="JetBrains Mono, monospace" font-size="10" font-weight="700" fill="#38bdf8">BENEFICIARY DEMOGRAPHICS (project_beneficiaries table)</text>
    <text x="956" y="408" font-family="Inter, sans-serif" font-size="11.5" fill="#e2e8f0">• Commuters Served Daily: 603,000 vehicles/day across 8 corridors</text>
    <text x="956" y="430" font-family="Inter, sans-serif" font-size="11.5" fill="#e2e8f0">• Households Directly Connected: 412,500 Census Households (2021 Base)</text>
    <text x="956" y="452" font-family="Inter, sans-serif" font-size="11.5" fill="#10b981">• Per-Capita Infrastructure Spend: ₹1,912 per citizen beneficiary</text>

    <!-- Bottom SQL View Table (cost_per_km_view) -->
    {data_table(
        244, 508, 1172,
        "Normalized Project Cost-Per-Kilometer SQL View (cost_per_km_view)",
        "SELECT project_id, title, road_name, length_km, budget_allocated, budget_spent, allocated_per_km, spent_per_km, overrun_per_km, status FROM cost_per_km_view",
        ["Project ID", "Contract Title", "Road Name", "Length", "Allocated / KM", "Spent / KM", "Overrun / KM", "Status"],
        [95, 250, 175, 80, 130, 130, 135, 135],
        [
            ["#PRJ-01", "WEH Flyover Resurfacing & Grouting", "Western Express Hwy", "25.5 km", "₹0.94 Cr/km", "₹0.73 Cr/km", "-₹0.21 Cr (Under)", ("IN_PROGRESS", "in_progress")],
            ["#PRJ-02", "EEH Pothole Remediation Campaign", "Eastern Express Hwy", "22.1 km", "₹0.081 Cr/km", "₹0.087 Cr/km", "+₹0.006 Cr (OVER)", ("OVERRUN AUDIT", "critical")],
            ["#PRJ-03", "SV Road Drainage Microtunnelling", "S.V. Road", "16.8 km", "₹0.57 Cr/km", "₹0.27 Cr/km", "Frozen at 47%", ("HALTED • 378d", "critical")],
            ["#PRJ-05", "Link Road Concrete Upgrade Ph.2", "Link Road", "18.2 km", "₹0.80 Cr/km", "₹0.41 Cr/km", "-₹0.39 Cr (Under)", ("IN_PROGRESS", "in_progress")],
            ["#PRJ-07", "SBM Micro-Silica Concrete Topping", "Senapati Bapat Marg", "7.5 km", "₹1.13 Cr/km", "₹1.12 Cr/km", "-₹0.01 Cr (Saved)", ("COMPLETED", "resolved")],
            ["#PRJ-08", "Ghodbunder Mast-Asphalt Overlay", "Ghodbunder Road", "20.0 km", "₹0.95 Cr/km", "₹0.93 Cr/km", "-₹0.02 Cr (Saved)", ("COMPLETED", "resolved")],
        ],
        row_h=38
    )}
    """
    return desktop_shell(16, "Public Spend Transparency, Sankey Fund Flow & Cost-Per-KM", "Accountability / Budget Compliance", "budgets", "projects, fund_sources, cost_per_km_view, project_beneficiaries", inner)


def build_frame_17():
    """Frame 17: Budget Variance Drill-Down, Contingency Reserves & Approval Trail (1440x900 Desktop)"""
    inner = f"""
    <!-- Top Left: Budget Variance Reasons Table (budget_variance_reasons) -->
    {data_table(
        244, 72, 680,
        "Budget Variance Reasons & Statutory Justifications (budget_variance_reasons)",
        "Audited via trg_audit_bvr trigger • Tracks original vs. revised project budgets",
        ["Var ID", "Project", "Original", "Revised", "Variance", "Justification Reason", "Approved By"],
        [70, 75, 90, 90, 85, 155, 95],
        [
            ["#BVR-1", "#PRJ-02", "₹1.80 Cr", "₹1.92 Cr", "+6.67%", "Monsoon emergency night milling", "SE PWD-MUM"],
            ["#BVR-2", "#PRJ-03", "₹8.20 Cr", "₹9.50 Cr", "+15.85%", "Hard basalt strata in SV subway", "MCGM Comm."],
            ["#BVR-3", "#PRJ-06", "₹5.80 Cr", "₹6.20 Cr", "+6.90%", "Utility water main relocation", "MCGM-HE Eng"],
            ["#BVR-4", "#PRJ-01", "₹22.5 Cr", "₹24.0 Cr", "+6.67%", "Extra elastomeric bearing pads", "NHAI RO Dir"],
        ],
        row_h=40
    )}

    <!-- Top Right: Contingency Reserves Panel (ContingencyReservesPanel.tsx / contingency_reserves) -->
    <rect x="940" y="72" width="476" height="260" rx="10" fill="#131c2e" stroke="#1e293b"/>
    <text x="960" y="100" font-family="Inter, sans-serif" font-size="14" font-weight="800" fill="#ffffff">Contingency Reserves (contingency_reserves)</text>
    <text x="960" y="118" font-family="JetBrains Mono, monospace" font-size="10" fill="#38bdf8">Enforces: CHECK (utilized_amount &lt;= allocated_amount)</text>

    <rect x="960" y="136" width="436" height="54" rx="8" fill="#0f172a" stroke="#1e293b"/>
    <text x="974" y="156" font-family="Inter, sans-serif" font-size="11.5" font-weight="700" fill="#ffffff">#CR-01 (WEH Flyover #PRJ-01): ₹1.20 Cr Utilized / ₹2.40 Cr</text>
    <rect x="974" y="168" width="300" height="8" rx="4" fill="#1e293b"/><rect x="974" y="168" width="150" height="8" rx="4" fill="#38bdf8"/>
    <text x="1290" y="176" font-family="JetBrains Mono, monospace" font-size="9.5" fill="#38bdf8">partially_utilized</text>

    <rect x="960" y="200" width="436" height="54" rx="8" fill="#0f172a" stroke="#1e293b"/>
    <text x="974" y="220" font-family="Inter, sans-serif" font-size="11.5" font-weight="700" fill="#ffffff">#CR-02 (SV Drainage #PRJ-03): ₹95.0 L Utilized / ₹95.0 L</text>
    <rect x="974" y="232" width="300" height="8" rx="4" fill="#1e293b"/><rect x="974" y="232" width="300" height="8" rx="4" fill="#f43f5e"/>
    <text x="1290" y="240" font-family="JetBrains Mono, monospace" font-size="9.5" fill="#f43f5e">exhausted (100%)</text>

    <rect x="960" y="264" width="436" height="54" rx="8" fill="#0f172a" stroke="#1e293b"/>
    <text x="974" y="284" font-family="Inter, sans-serif" font-size="11.5" font-weight="700" fill="#ffffff">#CR-03 (Link Rd #PRJ-05): ₹0.00 Utilized / ₹1.45 Cr</text>
    <rect x="974" y="296" width="300" height="8" rx="4" fill="#1e293b"/><rect x="974" y="296" width="8" height="8" rx="4" fill="#10b981"/>
    <text x="1290" y="304" font-family="JetBrains Mono, monospace" font-size="9.5" fill="#10b981">available (0%)</text>

    <!-- Bottom Multi-Entity Approval Trail Table (approval_trail table) -->
    {data_table(
        244, 348, 1172,
        "Multi-Stage Statutory Governance Approval Trail (approval_trail table)",
        "SELECT id, entity_type, entity_id, action, requested_by, approved_by, approved_at, status, comments FROM approval_trail ORDER BY created_at DESC",
        ["Approval ID", "Entity Type", "Entity ID", "Governance Action", "Requested By", "Approved By", "Auditor Comments", "Status"],
        [100, 105, 85, 175, 145, 145, 250, 125],
        [
            ["#APR-501", "milestone", "#MS-102", "release_milestone_funds", "Apex Infra (CON-1)", "V. Kulkarni (NHAI)", "Core density 98.4% verified", ("APPROVED", "resolved")],
            ["#APR-502", "variance", "#BVR-02", "approve_budget_revision", "Er. S. Patil (MCGM)", "Municipal Comm.", "Basalt strata geological report attached", ("APPROVED", "resolved")],
            ["#APR-503", "contingency", "#CR-02", "drawdown_contingency", "Omega Infra (CON-10)", "Chief Auditor MCGM", "Rejected: Contractor caused delay", ("REJECTED", "critical")],
            ["#APR-504", "project", "#PRJ-03", "halt_and_blacklist", "Ward K-West Exec", "Standing Committee", "378 days overdue; surface peeling", ("APPROVED", "resolved")],
            ["#APR-505", "milestone", "#MS-103", "release_milestone_funds", "Apex Infra (CON-1)", "Pending QA Lab", "Awaiting 7-day Marshall stability test", ("PENDING", "pending")],
            ["#APR-506", "variance", "#BVR-04", "approve_budget_revision", "NHAI Project Dir", "Ministry Finance", "Bearing pad specification upgrade", ("APPROVED", "resolved")],
            ["#APR-507", "contingency", "#CR-01", "drawdown_contingency", "Apex Infra (CON-1)", "NHAI RO Mumbai", "Monsoon dewatering pumps deployed", ("APPROVED", "resolved")],
        ],
        row_h=42
    )}
    """
    return desktop_shell(17, "Budget Variance Drill-Down, Contingency & Approval Trail", "Accountability / Variance & Approvals", "budgets", "budget_variance_reasons, contingency_reserves, approval_trail, projects", inner)


def build_frame_18():
    """Frame 18: Contractor Scorecards, Performance Index & Blacklist Governance (1440x900 Desktop)"""
    inner = f"""
    <!-- Top Trigger Formula Banner -->
    <rect x="244" y="72" width="1172" height="68" rx="10" fill="#131c2e" stroke="#3b82f6" stroke-width="1.2"/>
    <text x="268" y="96" font-family="JetBrains Mono, monospace" font-size="10.5" font-weight="700" fill="#38bdf8">POSTGRESQL TRIGGER FORMULA: trg_contractor_perf_index → recalculate_performance_index()</text>
    <text x="268" y="120" font-family="JetBrains Mono, monospace" font-size="10.5" font-weight="700" fill="#ffffff">NEW.performance_index := ROUND((projects_completed::NUMERIC / GREATEST(projects_completed + projects_delayed, 1)) * rating * 20, 2);</text>
    <rect x="1210" y="86" width="186" height="38" rx="7" fill="#064e3b" stroke="#10b981"/>
    <text x="1303" y="110" font-family="JetBrains Mono, monospace" font-size="10.5" font-weight="700" fill="#a7f3d0" text-anchor="middle">CHECK (~ '^CON-\\d{{5}}$')</text>

    <!-- Left/Center Master Contractor Table (contractors table) -->
    {data_table(
        244, 154, 780,
        "Registered Public Works Contractors & Auto-Computed Scorecards (contractors table)",
        "21 Registered Firms Across IN, US, GB, KE • Sorted by Performance Index",
        ["Code", "Contractor Name", "License No", "Done", "Delayed", "Rating", "Perf Index", "Status"],
        [95, 175, 95, 55, 65, 65, 90, 110],
        [
            ["CON-00006", "Metro Highway Consultants", "LIC-IN-006", "31", "0", "4.60★", "92.00 / 100", ("CERTIFIED A+", "good")],
            ["CON-00008", "Bharat Roads & Infra", "LIC-IN-008", "85", "3", "4.75★", "91.76 / 100", ("CERTIFIED A+", "good")],
            ["CON-00003", "Zenith Construction Co", "LIC-IN-003", "42", "1", "4.50★", "87.91 / 100", ("CERTIFIED A", "good")],
            ["CON-00011", "Precision Asphalt Works", "LIC-IN-011", "3", "0", "4.00★", "80.00 / 100", ("ACTIVE B+", "in_progress")],
            ["CON-00001", "Apex Infrastructure Ltd", "LIC-IN-001", "24", "2", "4.25★", "78.46 / 100", ("ACTIVE B+", "in_progress")],
            ["CON-00005", "Landmark Infra Projects", "LIC-IN-005", "15", "2", "3.90★", "68.82 / 100", ("ACTIVE B", "in_progress")],
            ["CON-00002", "BuildWell Roadways Ltd", "LIC-IN-002", "18", "4", "3.80★", "62.18 / 100", ("WATCHLIST C", "warning")],
            ["CON-00004", "Shiva Earthmovers Pvt", "LIC-IN-004", "8", "5", "2.10★", "25.85 / 100", ("SHOW-CAUSE", "warning")],
            ["CON-00010", "Omega Infrastructure Corp", "LIC-IN-010", "12", "8", "1.80★", "21.60 / 100", ("BLACKLISTED", "critical")],
            ["CON-00015", "Detroit Roads Alliance", "LIC-US-003", "10", "5", "2.50★", "33.33 / 100", ("BLACKLISTED", "critical")],
        ],
        row_h=40
    )}

    <!-- Right Contractor Dossier & Blacklist Enforcement Modal (ContractorScorecardDialog.tsx) -->
    <rect x="1040" y="154" width="376" height="696" rx="12" fill="#131c2e" stroke="#f43f5e" stroke-width="1.5"/>
    <rect x="1040" y="154" width="376" height="72" rx="12" fill="#4c0519"/>
    <text x="1060" y="180" font-family="JetBrains Mono, monospace" font-size="10" font-weight="700" fill="#fecdd3">CONTRACTOR DOSSIER • CON-00010</text>
    <text x="1060" y="206" font-family="Inter, sans-serif" font-size="17" font-weight="800" fill="#ffffff">Omega Infrastructure Corp</text>
    {status_badge(1306, 174, "BLACKLISTED", "critical")}

    <rect x="1058" y="242" width="164" height="68" rx="8" fill="#0f172a" stroke="#1e293b"/>
    <text x="1072" y="264" font-family="Inter, sans-serif" font-size="10" fill="#94a3b8">PERFORMANCE INDEX</text>
    <text x="1072" y="294" font-family="JetBrains Mono, monospace" font-size="20" font-weight="800" fill="#f43f5e">21.60 / 100</text>

    <rect x="1234" y="242" width="164" height="68" rx="8" fill="#0f172a" stroke="#1e293b"/>
    <text x="1248" y="264" font-family="Inter, sans-serif" font-size="10" fill="#94a3b8">DELAY TRACK RECORD</text>
    <text x="1248" y="294" font-family="JetBrains Mono, monospace" font-size="18" font-weight="800" fill="#f59e0b">8 / 20 Delayed</text>

    <!-- Blacklist Reason Box (contractors.blacklisted_reason) -->
    <rect x="1058" y="324" width="340" height="134" rx="8" fill="#0f172a" stroke="#f43f5e"/>
    <text x="1074" y="346" font-family="JetBrains Mono, monospace" font-size="10" font-weight="700" fill="#f43f5e">STATUTORY BLACKLIST REASON (DB COLUMN):</text>
    <text x="1074" y="368" font-family="Inter, sans-serif" font-size="11" fill="#ffe4e6">"Failure to complete SV Road drainage project</text>
    <text x="1074" y="386" font-family="Inter, sans-serif" font-size="11" fill="#ffe4e6">inside contract timelines; substandard materials</text>
    <text x="1074" y="404" font-family="Inter, sans-serif" font-size="11" fill="#ffe4e6">causing surface peeling within 3 months."</text>
    <text x="1074" y="436" font-family="JetBrains Mono, monospace" font-size="9.5" fill="#94a3b8">License: LIC-IN-010 • Reg: 2016-10-10 • legal@omegacorp.in</text>

    <!-- Linked Contract Failures & Warranty Claims -->
    <rect x="1058" y="472" width="340" height="190" rx="8" fill="#0f172a" stroke="#1e293b"/>
    <text x="1074" y="494" font-family="JetBrains Mono, monospace" font-size="10" font-weight="700" fill="#38bdf8">DEFECT RECURRENCE &amp; WARRANTY CLAIMS</text>
    <text x="1074" y="518" font-family="Inter, sans-serif" font-size="11" font-weight="700" fill="#ffffff">• Contract #PRJ-03: SV Road Drainage</text>
    <text x="1074" y="536" font-family="JetBrains Mono, monospace" font-size="10" fill="#f43f5e">  Status: HALTED • Delay: 378 Days • ₹4.5Cr Frozen</text>
    <text x="1074" y="564" font-family="Inter, sans-serif" font-size="11" font-weight="700" fill="#ffffff">• Citizen Grievances on Paved Segment:</text>
    <text x="1074" y="582" font-family="JetBrains Mono, monospace" font-size="10" fill="#f59e0b">  18 Active Pothole &amp; Trench Complaints on SV-RD-01</text>
    <text x="1074" y="610" font-family="Inter, sans-serif" font-size="11" font-weight="700" fill="#ffffff">• Tender Bid Eligibility Check:</text>
    <text x="1074" y="628" font-family="JetBrains Mono, monospace" font-size="10" fill="#f43f5e">  BLOCKED from tender_bids (blacklisted = TRUE)</text>

    <rect x="1058" y="678" width="340" height="46" rx="8" fill="#e11d48"/>
    <text x="1228" y="706" font-family="Inter, sans-serif" font-size="12" font-weight="700" fill="#ffffff" text-anchor="middle">Download Vigilance Debarment Order (PDF)</text>
    <rect x="1058" y="734" width="340" height="42" rx="8" fill="#0f172a" stroke="#475569"/>
    <text x="1228" y="760" font-family="Inter, sans-serif" font-size="11.5" font-weight="600" fill="#cbd5e1" text-anchor="middle">View Audit Log History (trg_audit_contractors)</text>
    """
    return desktop_shell(18, "Contractor Scorecards, Performance Index & Blacklist Registry", "Accountability / Contractor Scores", "contractors", "contractors, projects, project_warranties, complaints, audit_log", inner)


def build_frame_19():
    """Frame 19: Public Procurement Ledger, Tenders & QCBS/L1 Bid Evaluation Matrix (1440x900 Desktop)"""
    inner = f"""
    <!-- Top 4 Procurement KPIs -->
    {kpi_card(244, 72, 281, 94, "Published Public Tenders", "38 Tenders", "Across NHAI, State PWD & MCGM Wards", "PROCUREMENT", "#38bdf8")}
    {kpi_card(541, 72, 281, 94, "Total Tender Valuation", "₹342.50 Cr", "CHECK (bid_deadline >= published_date)", "AUDITED", "#10b981")}
    {kpi_card(838, 72, 281, 94, "Competitive Bid Ratio", "4.6 Bids/Tnd", "Zero Single-Vendor Uncontested Awards", "QCBS MATRIX", "#6366f1")}
    {kpi_card(1135, 72, 281, 94, "Blacklisted Bids Blocked", "3 Rejected", "Omega Infra & Detroit Roads Blocked", "DB ENFORCED", "#f43f5e")}

    <!-- Top Table: Active Tenders Registry (tenders table) -->
    {data_table(
        244, 180, 1172,
        "Public Works Tender Call Lifecycle Registry (tenders table)",
        "SELECT reference_no, title, authority_id, estimated_value, status, published_date, bid_deadline, award_date FROM tenders",
        ["Tender Ref No", "Procurement Title", "Authority", "Est. Value", "Published", "Bid Deadline", "Award Date", "Status"],
        [135, 290, 110, 120, 110, 110, 110, 145],
        [
            ["TND-NHAI-2025-01", "WEH Flyover Resurfacing & Structural Grouting", "NHAI-ROM", "₹24.50 Cr", "2025-03-10", "2025-04-25", "2025-05-15", ("AWARDED", "resolved")],
            ["TND-MCGM-2026-04", "SV Road Emergency Asphalt Laying & Patching", "MCGM-KW", "₹3.60 Cr", "2026-01-05", "2026-02-10", "2026-02-22", ("AWARDED", "resolved")],
            ["TND-MCGM-2025-09", "Link Road Concrete Pavement Upgrade Ph.2", "MCGM-KW", "₹14.80 Cr", "2025-07-15", "2025-09-01", "2025-09-28", ("AWARDED", "resolved")],
            ["TND-PWD-2026-11", "Eastern Express Hwy Monsoon Micro-Surfacing", "PWD-MUM", "₹6.80 Cr", "2026-09-15", "2026-10-30", "Pending", ("UNDER_EVALUATION", "in_progress")],
        ],
        row_h=38
    )}

    <!-- Bottom Left: Bid Evaluation Matrix (tender_bids table) -->
    {data_table(
        244, 456, 760,
        "Contractor Bid Submissions & Weighted QCBS Evaluation (tender_bids table)",
        "Selected Tender: TND-MCGM-2026-04 (SV Road Emergency Asphalt • Est: ₹3.60 Cr)",
        ["Bidder Contractor", "Financial Quote", "Tech Score", "Fin Score", "Weighted Total", "Award Result"],
        [175, 125, 95, 95, 110, 130],
        [
            ["Zenith Construction (CON-00003)", "₹3,50,00,000", "94.0 / 100", "96.5 / 100", "95.10 / 100", ("★ L1 WINNER", "resolved")],
            ["Apex Infrastructure (CON-00001)", "₹3,58,00,000", "91.0 / 100", "92.0 / 100", "91.40 / 100", ("L2 QUALIFIED", "in_progress")],
            ["Landmark Infra (CON-00005)", "₹3,64,00,000", "85.5 / 100", "88.0 / 100", "86.50 / 100", ("L3 QUALIFIED", "info")],
            ["BuildWell Roadways (CON-00002)", "₹3,72,00,000", "79.0 / 100", "83.0 / 100", "80.60 / 100", ("L4 NON-COMP", "warning")],
            ["Omega Infra Corp (CON-00010)", "₹3,10,00,000", "0.0 / 100", "0.0 / 100", "0.00 / 100", ("DISQUALIFIED", "critical")],
        ],
        row_h=40
    )}

    <!-- Bottom Right: Evaluation Criteria Weights (evaluation_criteria table) -->
    <rect x="1020" y="456" width="396" height="394" rx="10" fill="#131c2e" stroke="#1e293b"/>
    <text x="1040" y="484" font-family="Inter, sans-serif" font-size="14" font-weight="800" fill="#ffffff">QCBS Evaluation Criteria (evaluation_criteria)</text>
    <text x="1040" y="502" font-family="JetBrains Mono, monospace" font-size="10" fill="#38bdf8">UNIQUE(tender_id, criterion_name) • Total Weight = 100%</text>

    <rect x="1040" y="520" width="356" height="68" rx="8" fill="#0f172a" stroke="#1e293b"/>
    <text x="1056" y="542" font-family="Inter, sans-serif" font-size="12" font-weight="700" fill="#ffffff">1. Technical Mix &amp; Plant Capacity (40% Weight)</text>
    <text x="1056" y="562" font-family="Inter, sans-serif" font-size="10.5" fill="#94a3b8">Max Score: 100 • Batching plant distance &amp; VG-40 lab certs</text>

    <rect x="1040" y="598" width="356" height="68" rx="8" fill="#0f172a" stroke="#1e293b"/>
    <text x="1056" y="620" font-family="Inter, sans-serif" font-size="12" font-weight="700" fill="#ffffff">2. Financial Bid Competitiveness (40% Weight)</text>
    <text x="1056" y="640" font-family="Inter, sans-serif" font-size="10.5" fill="#94a3b8">Max Score: 100 • L1 quote normalization formula</text>

    <rect x="1040" y="676" width="356" height="68" rx="8" fill="#0f172a" stroke="#1e293b"/>
    <text x="1056" y="698" font-family="Inter, sans-serif" font-size="12" font-weight="700" fill="#ffffff">3. Historical Performance Index (20% Weight)</text>
    <text x="1056" y="718" font-family="Inter, sans-serif" font-size="10.5" fill="#94a3b8">Max Score: 100 • Pulled directly from contractors table</text>

    <rect x="1040" y="760" width="356" height="72" rx="8" fill="#064e3b" stroke="#10b981"/>
    <text x="1056" y="784" font-family="JetBrains Mono, monospace" font-size="10.5" font-weight="700" fill="#a7f3d0">✓ AWARD LETTER VERIFIED (award_letter_url)</text>
    <text x="1056" y="804" font-family="Inter, sans-serif" font-size="11" fill="#ffffff">Partial Index idx_tender_bids_winner enforces</text>
    <text x="1056" y="820" font-family="Inter, sans-serif" font-size="11" fill="#ffffff">winner lookup across all awarded contracts.</text>
    """
    return desktop_shell(19, "Public Procurement Ledger, Tenders & Bid Evaluation Matrix", "Accountability / Procurement Ledger", "tenders", "tenders, tender_bids, evaluation_criteria, contractors, authorities", inner)


def build_frame_20():
    """Frame 20: Immutable Database Audit Log & JSONB Mutation Forensics Explorer (1440x900 Desktop)"""
    inner = f"""
    <!-- Filter & Cryptographic Integrity Bar -->
    <rect x="244" y="70" width="1172" height="50" rx="8" fill="#131c2e" stroke="#1e293b"/>
    <text x="262" y="100" font-family="JetBrains Mono, monospace" font-size="10.5" font-weight="700" fill="#38bdf8">AUDIT TABLE FILTER:</text>
    <rect x="400" y="81" width="105" height="28" rx="6" fill="#1e3a8a" stroke="#3b82f6"/><text x="452" y="99" font-family="JetBrains Mono, monospace" font-size="10" font-weight="700" fill="#fff" text-anchor="middle">ALL TABLES (7)</text>
    <rect x="513" y="81" width="95" height="28" rx="6" fill="#0f172a" stroke="#334155"/><text x="560" y="99" font-family="JetBrains Mono, monospace" font-size="10" fill="#cbd5e1" text-anchor="middle">complaints</text>
    <rect x="616" y="81" width="85" height="28" rx="6" fill="#0f172a" stroke="#334155"/><text x="658" y="99" font-family="JetBrains Mono, monospace" font-size="10" fill="#cbd5e1" text-anchor="middle">projects</text>
    <rect x="709" y="81" width="95" height="28" rx="6" fill="#0f172a" stroke="#334155"/><text x="756" y="99" font-family="JetBrains Mono, monospace" font-size="10" fill="#cbd5e1" text-anchor="middle">contractors</text>
    <rect x="812" y="81" width="165" height="28" rx="6" fill="#0f172a" stroke="#334155"/><text x="894" y="99" font-family="JetBrains Mono, monospace" font-size="10" fill="#cbd5e1" text-anchor="middle">budget_variance_reasons</text>
    <rect x="1140" y="81" width="260" height="28" rx="6" fill="#064e3b" stroke="#10b981"/><text x="1270" y="99" font-family="JetBrains Mono, monospace" font-size="10" font-weight="700" fill="#a7f3d0" text-anchor="middle">✓ row_to_jsonb_audit() WKT ACTIVE</text>

    <!-- Center Master Audit Log Table (audit_log table) -->
    {data_table(
        244, 134, 1172,
        "Append-Only PostgreSQL Trigger Audit Trail (audit_log table)",
        "Populated by AFTER INSERT OR UPDATE OR DELETE triggers on complaints, projects, contractors, roads, budget_variance_reasons",
        ["Audit ID", "Changed At (UTC)", "Target Table", "Record ID", "TG_OP Action", "Changed By (app.changed_by)", "JSONB Mutation Summary"],
        [100, 155, 175, 95, 120, 185, 310],
        [
            ["#AUD-9941", "2026-10-22 14:32:04", "complaints", "18981", ("UPDATE", "in_progress"), "er_rajesh_mcgm_kw", "status: 'routed' → 'in_progress' (Selected)"],
            ["#AUD-9940", "2026-10-22 14:30:00", "complaints", "18940", ("UPDATE", "critical"), "pg_sla_cron_worker", "escalation_level: 1 → 2, sla_breached_at set"],
            ["#AUD-9938", "2026-10-22 11:15:22", "budget_variance_reasons", "2", ("INSERT", "routed"), "mcgm_commissioner", "Added +₹1.30 Cr variance on Project #3"],
            ["#AUD-9935", "2026-10-21 19:04:10", "contractors", "10", ("UPDATE", "critical"), "vigilance_board", "blacklisted: false → true (CON-00010 Omega)"],
            ["#AUD-9931", "2026-10-21 16:40:00", "projects", "3", ("UPDATE", "warning"), "se_mcgm_kwest", "status: 'in_progress' → 'halted', delay=378"],
            ["#AUD-9928", "2026-10-21 09:42:11", "complaints", "18981", ("INSERT", "resolved"), "citizen_kanak_030", "New pothole POINT(72.8364 19.1197) on SV-RD-01"],
        ],
        row_h=38
    )}

    <!-- Bottom Forensic Side-by-Side JSONB Diff Inspector -->
    <rect x="244" y="466" width="1172" height="386" rx="10" fill="#131c2e" stroke="#3b82f6" stroke-width="1.2"/>
    <text x="266" y="494" font-family="Inter, sans-serif" font-size="14" font-weight="800" fill="#ffffff">Forensic JSONB Tuple Diff Inspector — Audit Record #AUD-9941 (complaints.id = 18981)</text>
    <text x="266" y="512" font-family="JetBrains Mono, monospace" font-size="10" fill="#38bdf8">Helper function row_to_jsonb_audit() automatically serializes PostGIS GEOMETRY columns into WKT via ST_AsText(geom)</text>

    <!-- Left Box: old_values JSONB -->
    <rect x="264" y="526" width="554" height="308" rx="8" fill="#090d16" stroke="#f43f5e" stroke-width="1"/>
    <rect x="264" y="526" width="554" height="32" rx="8" fill="#4c0519"/>
    <text x="280" y="547" font-family="JetBrains Mono, monospace" font-size="10.5" font-weight="700" fill="#fecdd3">OLD_VALUES (JSONB BEFORE UPDATE)</text>
    <text x="280" y="578" font-family="JetBrains Mono, monospace" font-size="10.5" fill="#cbd5e1">{{</text>
    <text x="296" y="598" font-family="JetBrains Mono, monospace" font-size="10.5" fill="#94a3b8">"id": 18981,</text>
    <text x="296" y="618" font-family="JetBrains Mono, monospace" font-size="10.5" fill="#94a3b8">"client_temp_id": "8f94c120-7e4a-4b92-9c11",</text>
    <text x="296" y="638" font-family="JetBrains Mono, monospace" font-size="10.5" fill="#94a3b8">"title": "Deep crater near Andheri Subway Northbound",</text>
    <text x="296" y="658" font-family="JetBrains Mono, monospace" font-size="10.5" fill="#94a3b8">"category": "pothole",</text>
    <text x="296" y="678" font-family="JetBrains Mono, monospace" font-size="10.5" fill="#38bdf8">"geom": "POINT(72.8364 19.1197)",</text>
    <rect x="290" y="686" width="510" height="22" rx="4" fill="#4c0519"/>
    <text x="296" y="701" font-family="JetBrains Mono, monospace" font-size="10.5" font-weight="700" fill="#fecdd3">- "status": "routed",</text>
    <text x="296" y="724" font-family="JetBrains Mono, monospace" font-size="10.5" fill="#94a3b8">"priority": 4, "escalation_level": 0,</text>
    <text x="296" y="744" font-family="JetBrains Mono, monospace" font-size="10.5" fill="#94a3b8">"assigned_authority_id": 1, "road_id": 3,</text>
    <rect x="290" y="752" width="510" height="22" rx="4" fill="#4c0519"/>
    <text x="296" y="767" font-family="JetBrains Mono, monospace" font-size="10.5" font-weight="700" fill="#fecdd3">- "updated_at": "2026-10-22T09:43:02Z"</text>
    <text x="280" y="792" font-family="JetBrains Mono, monospace" font-size="10.5" fill="#cbd5e1">}}</text>

    <!-- Right Box: new_values JSONB -->
    <rect x="842" y="526" width="554" height="308" rx="8" fill="#090d16" stroke="#10b981" stroke-width="1"/>
    <rect x="842" y="526" width="554" height="32" rx="8" fill="#064e3b"/>
    <text x="858" y="547" font-family="JetBrains Mono, monospace" font-size="10.5" font-weight="700" fill="#a7f3d0">NEW_VALUES (JSONB AFTER UPDATE)</text>
    <text x="858" y="578" font-family="JetBrains Mono, monospace" font-size="10.5" fill="#cbd5e1">{{</text>
    <text x="874" y="598" font-family="JetBrains Mono, monospace" font-size="10.5" fill="#94a3b8">"id": 18981,</text>
    <text x="874" y="618" font-family="JetBrains Mono, monospace" font-size="10.5" fill="#94a3b8">"client_temp_id": "8f94c120-7e4a-4b92-9c11",</text>
    <text x="874" y="638" font-family="JetBrains Mono, monospace" font-size="10.5" fill="#94a3b8">"title": "Deep crater near Andheri Subway Northbound",</text>
    <text x="874" y="658" font-family="JetBrains Mono, monospace" font-size="10.5" fill="#94a3b8">"category": "pothole",</text>
    <text x="874" y="678" font-family="JetBrains Mono, monospace" font-size="10.5" fill="#38bdf8">"geom": "POINT(72.8364 19.1197)",</text>
    <rect x="868" y="686" width="510" height="22" rx="4" fill="#064e3b"/>
    <text x="874" y="701" font-family="JetBrains Mono, monospace" font-size="10.5" font-weight="700" fill="#a7f3d0">+ "status": "in_progress",</text>
    <text x="874" y="724" font-family="JetBrains Mono, monospace" font-size="10.5" fill="#94a3b8">"priority": 4, "escalation_level": 0,</text>
    <text x="874" y="744" font-family="JetBrains Mono, monospace" font-size="10.5" fill="#94a3b8">"assigned_authority_id": 1, "road_id": 3,</text>
    <rect x="868" y="752" width="510" height="22" rx="4" fill="#064e3b"/>
    <text x="874" y="767" font-family="JetBrains Mono, monospace" font-size="10.5" font-weight="700" fill="#a7f3d0">+ "updated_at": "2026-10-22T14:32:04Z"</text>
    <text x="858" y="792" font-family="JetBrains Mono, monospace" font-size="10.5" fill="#cbd5e1">}}</text>
    """
    return desktop_shell(20, "Immutable PostgreSQL Audit Log & JSONB Diff Forensics", "System / Forensic Audit Log", "audit", "audit_log, complaints, projects, contractors, roads, budget_variance_reasons", inner)


# ---------------------------------------------------------------------------
# METADATA & MASTER PIPELINE
# ---------------------------------------------------------------------------

FRAMES_SPEC = [
    (1, "Frame_01_Civic_Portal_Landing_Hero", "Frame 01: Civic Portal Landing & Live Accountability Overview", "Desktop (1440×900)", 1440, 900, "regions, authorities, roads, projects, contractors, complaints", build_frame_01),
    (2, "Frame_02_Geospatial_Road_Registry_Map", "Frame 02: Interactive Geospatial Road Registry & PostGIS Explorer", "Desktop (1440×900)", 1440, 900, "roads, authorities, contractors, projects, road_defect_history", build_frame_02),
    (3, "Frame_03_Mobile_Wizard_Step1_GPS_Snap", "Frame 03: Defect Wizard Step 1 — GPS Pinpoint & PostGIS Auto-Snap", "Mobile PWA (390×844)", 390, 844, "complaints, roads, authorities, project_warranties", build_frame_03),
    (4, "Frame_04_Mobile_Wizard_Step2_AI_Vision", "Frame 04: Defect Wizard Step 2 — Photo Upload & AI Vision Triage", "Mobile PWA (390×844)", 390, 844, "complaints, sla_config, road_documents", build_frame_04),
    (5, "Frame_05_Mobile_Duplicate_And_Offline_Sync", "Frame 05: Spatial Duplicate Check & Offline IndexedDB Sync Queue", "Mobile PWA (390×844)", 390, 844, "complaints, citizen_notifications, road_documents", build_frame_05),
    (6, "Frame_06_Mobile_Citizen_SLA_Timeline", "Frame 06: Citizen 'My Reports' Dashboard & SLA Lifecycle Timeline", "Mobile PWA (390×844)", 390, 844, "complaints, sla_escalations, routing_feedback", build_frame_06),
    (7, "Frame_07_AI_Accountability_Chat_RAG", "Frame 07: AI Accountability Chat Assistant & Photo Triage RAG", "Desktop (1440×900)", 1440, 900, "roads, projects, contractors, authorities, complaints, sla_config", build_frame_07),
    (8, "Frame_08_3D_Digital_Twin_Inspection", "Frame 08: 3D Digital Twin & Sub-Surface Structural Inspection", "Desktop (1440×900)", 1440, 900, "roads, road_materials, project_warranties, road_documents, projects", build_frame_08),
    (9, "Frame_09_IoT_Pavement_Sensor_Network", "Frame 09: IoT Pavement Sensor Network HUD & Stress Monitor", "Desktop (1440×900)", 1440, 900, "roads, road_defect_history, road_materials, complaints", build_frame_09),
    (10, "Frame_10_Historical_Deterioration_Playback", "Frame 10: Historical Road Deterioration Playback & Snapshot Analyzer", "Desktop (1440×900)", 1440, 900, "road_defect_history, roads, projects, complaints", build_frame_10),
    (11, "Frame_11_Municipal_Operations_Command", "Frame 11: Municipal Operations Command Center & Live System Log", "Desktop (1440×900)", 1440, 900, "complaints, authorities, authority_webhooks, notification_log, audit_log", build_frame_11),
    (12, "Frame_12_Automated_SLA_Escalation_Engine", "Frame 12: Automated SLA Escalation Engine & Response Time Tracker", "Desktop (1440×900)", 1440, 900, "sla_config, sla_escalations, complaints, authorities, notification_log", build_frame_12),
    (13, "Frame_13_Geospatial_Conflict_Resolver", "Frame 13: Geospatial Jurisdiction Boundary & Conflict Resolver", "Desktop (1440×900)", 1440, 900, "road_region_crossings, region_overlap_routes, road_conflict_groups, road_aliases", build_frame_13),
    (14, "Frame_14_Field_Repair_Milestone_Scheduler", "Frame 14: Field Maintenance Repair Scheduler & Milestone Execution", "Desktop (1440×900)", 1440, 900, "projects, project_milestones, contractors, roads, approval_trail", build_frame_14),
    (15, "Frame_15_Multi_Region_Hub_Data_Catalog", "Frame 15: Multi-Region Governance Hub & Data Quality Catalog", "Desktop (1440×900)", 1440, 900, "regions, region_import_log, cpi_data, roads, authorities", build_frame_15),
    (16, "Frame_16_Public_Spend_Sankey_CostPerKM", "Frame 16: Public Spend Transparency, Sankey Flow & Cost-Per-KM", "Desktop (1440×900)", 1440, 900, "projects, fund_sources, cost_per_km_view, project_beneficiaries", build_frame_16),
    (17, "Frame_17_Budget_Variance_Approval_Trail", "Frame 17: Budget Variance Drill-Down, Contingency & Approval Trail", "Desktop (1440×900)", 1440, 900, "budget_variance_reasons, contingency_reserves, approval_trail, projects", build_frame_17),
    (18, "Frame_18_Contractor_Scorecards_Blacklist", "Frame 18: Contractor Scorecards, Performance Index & Blacklist Registry", "Desktop (1440×900)", 1440, 900, "contractors, projects, project_warranties, complaints, audit_log", build_frame_18),
    (19, "Frame_19_Public_Procurement_Tenders_Matrix", "Frame 19: Public Procurement Ledger, Tenders & Bid Evaluation Matrix", "Desktop (1440×900)", 1440, 900, "tenders, tender_bids, evaluation_criteria, contractors, authorities", build_frame_19),
    (20, "Frame_20_Immutable_Database_Audit_Log", "Frame 20: Immutable PostgreSQL Audit Log & JSONB Diff Forensics", "Desktop (1440×900)", 1440, 900, "audit_log, complaints, projects, contractors, roads, budget_variance_reasons", build_frame_20),
]


def generate_all():
    import subprocess
    chrome_bin = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

    svg_contents = {}
    master_canvas_items = []

    # 4 columns x 5 rows master Figma canvas layout
    col_x_Step = 1560
    row_y_Step = 1040

    for idx, (f_num, slug, title, device, w, h, tables, builder_fn) in enumerate(FRAMES_SPEC):
        svg_str = builder_fn()
        svg_contents[f_num] = svg_str
        svg_path = os.path.join(SVG_DIR, f"{slug}.svg")
        with open(svg_path, "w", encoding="utf-8") as f:
            f.write(svg_str)
        print(f"Saved SVG: {svg_path}")

        # Add to master combined Figma canvas
        col = idx % 4
        row = idx // 4
        cx = 100 + col * col_x_Step + (1440 - w) // 2
        cy = 140 + row * row_y_Step

        # Strip outer <svg ...> and </svg> to nest inside master <g id="Frame_XX">
        inner_body = svg_str.split(">", 1)[1].rsplit("</svg>", 1)[0]
        master_canvas_items.append(f"""
        <g id="{slug}" transform="translate({cx}, {cy})">
          <text x="0" y="-14" font-family="Inter, sans-serif" font-size="18" font-weight="800" fill="#38bdf8">{esc(title)} [{esc(device)}]</text>
          {inner_body}
        </g>
        """)

        # Render PNG via Headless Chrome
        png_path = os.path.join(PNG_DIR, f"{slug}.png")
        cmd = [
            chrome_bin,
            "--headless",
            "--disable-gpu",
            "--hide-scrollbars",
            f"--window-size={w},{h}",
            f"--screenshot={png_path}",
            f"file://{svg_path}"
        ]
        subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if os.path.exists(png_path):
            print(f"Rendered PNG: {png_path} ({os.path.getsize(png_path)} bytes)")

    # Write combined Master Figma Canvas SVG
    master_w = 100 + 4 * col_x_Step
    master_h = 140 + 5 * row_y_Step
    master_svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {master_w} {master_h}" width="{master_w}" height="{master_h}">
      {svg_defs()}
      <rect id="Figma_Canvas_Backdrop" x="0" y="0" width="{master_w}" height="{master_h}" fill="#070b14"/>
      <text x="100" y="70" font-family="Inter, sans-serif" font-size="34" font-weight="800" fill="#ffffff">ROADWATCH DBMS — Complete 20 High-Fidelity UI Wireframe Frames</text>
      <text x="100" y="102" font-family="JetBrains Mono, monospace" font-size="16" font-weight="600" fill="#38bdf8">Team: Kanak Waradkar (24B-CO-030) • Krushna Surve (24B-CO-031) • Manjunath Subhash Gavada (24B-CO-035)</text>
      {''.join(master_canvas_items)}
    </svg>"""
    master_svg_path = os.path.join(BASE_DIR, "ROADWATCH_All_20_Figma_Frames.svg")
    with open(master_svg_path, "w", encoding="utf-8") as f:
        f.write(master_svg)
    print(f"Saved Master Figma Canvas SVG: {master_svg_path}")

    build_interactive_wireframes_html(svg_contents, master_svg)


def build_interactive_wireframes_html(svg_contents, master_svg):
    import json
    wireframes_dir = os.path.join(BASE_DIR, "wireframes")
    os.makedirs(wireframes_dir, exist_ok=True)
    html_path = os.path.join(wireframes_dir, "index.html")

    cards_html = []
    svg_js_map = {}

    for f_num, slug, title, device, w, h, tables, _ in FRAMES_SPEC:
        svg_raw = svg_contents[f_num]
        svg_js_map[str(f_num)] = svg_raw
        is_mobile = (w == 390)
        cat = (
            "citizen" if f_num <= 7 else
            "twin" if f_num <= 10 else
            "ops" if f_num <= 15 else
            "ledger"
        )
        aspect_class = "mobile-artboard" if is_mobile else "desktop-artboard"
        cards_html.append(f"""
        <div class="figma-frame-card {aspect_class}" data-cat="{cat}" data-frame="{f_num}" id="card-frame-{f_num}">
          <div class="frame-toolbar">
            <div class="frame-meta">
              <span class="frame-num">FRAME #{f_num:02d}</span>
              <span class="frame-slug">{esc(slug)}</span>
              <span class="frame-dim">{esc(device)}</span>
            </div>
            <div class="frame-actions">
              <button class="btn-action btn-copy" onclick="copySingleFrame({f_num}, this)">Copy SVG for Figma (⌘V)</button>
              <button class="btn-action btn-zoom" onclick="openInspector({f_num})">100% Zoom</button>
              <a class="btn-action btn-dl" href="../figma_frames/{slug}.svg" download="{slug}.svg">.SVG</a>
            </div>
          </div>
          <div class="frame-title-bar">
            <h3>{esc(title)}</h3>
            <span class="db-pill">DB Relations: {esc(tables)}</span>
          </div>
          <div class="artboard-viewport {'mobile-vp' if is_mobile else 'desktop-vp'}" onclick="openInspector({f_num})">
            {svg_raw}
          </div>
        </div>
        """)

    html_doc = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>ROADWATCH DBMS — 20 High-Fidelity Figma Wireframe Frames</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;600;700&display=swap" rel="stylesheet">
  <style>
    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{
      background: #060911;
      color: #f8fafc;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      min-height: 100vh;
    }}
    .top-figma-bar {{
      position: sticky;
      top: 0;
      z-index: 100;
      background: rgba(9, 13, 22, 0.96);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid #1e293b;
      padding: 14px 28px;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }}
    .brand-col h1 {{
      font-size: 17px;
      font-weight: 800;
      color: #ffffff;
      letter-spacing: -0.01em;
    }}
    .brand-col p {{
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      color: #38bdf8;
      margin-top: 3px;
    }}
    .filter-pills {{
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }}
    .pill-btn {{
      background: #131c2e;
      color: #94a3b8;
      border: 1px solid #1e293b;
      padding: 7px 13px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
    }}
    .pill-btn:hover, .pill-btn.active {{
      background: #1e3a8a;
      color: #ffffff;
      border-color: #3b82f6;
    }}
    .master-actions {{
      display: flex;
      gap: 10px;
      align-items: center;
    }}
    .btn-master {{
      background: linear-gradient(135deg, #2563eb, #0284c7);
      color: #ffffff;
      border: none;
      padding: 9px 16px;
      border-radius: 7px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.35);
    }}
    .btn-master.secondary {{
      background: #064e3b;
      border: 1px solid #10b981;
      box-shadow: none;
    }}
    .canvas-instructions {{
      background: #0c1526;
      border-bottom: 1px solid #1e293b;
      padding: 10px 28px;
      font-size: 12px;
      color: #cbd5e1;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }}
    .canvas-instructions code {{
      font-family: 'JetBrains Mono', monospace;
      color: #38bdf8;
      background: #131c2e;
      padding: 2px 6px;
      border-radius: 4px;
    }}
    .canvas-grid {{
      padding: 28px;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(640px, 1fr));
      gap: 28px;
      max-width: 1920px;
      margin: 0 auto;
    }}
    .figma-frame-card {{
      background: #0d1524;
      border: 1px solid #1e293b;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.45);
      display: flex;
      flex-direction: column;
    }}
    .frame-toolbar {{
      background: #090d16;
      padding: 10px 16px;
      border-bottom: 1px solid #1e293b;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
    }}
    .frame-meta {{
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }}
    .frame-num {{
      background: #1e3a8a;
      color: #93c5fd;
      font-family: 'JetBrains Mono', monospace;
      font-size: 10.5px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 4px;
    }}
    .frame-slug {{
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      color: #e2e8f0;
      font-weight: 600;
    }}
    .frame-dim {{
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px;
      color: #64748b;
    }}
    .frame-actions {{
      display: flex;
      gap: 6px;
    }}
    .btn-action {{
      background: #1e293b;
      color: #e2e8f0;
      border: 1px solid #334155;
      padding: 5px 10px;
      border-radius: 5px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
    }}
    .btn-action.btn-copy {{
      background: #1e3a8a;
      border-color: #3b82f6;
      color: #ffffff;
    }}
    .frame-title-bar {{
      padding: 10px 16px;
      background: #111a2e;
      border-bottom: 1px solid #1e293b;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }}
    .frame-title-bar h3 {{
      font-size: 13.5px;
      font-weight: 700;
      color: #f8fafc;
    }}
    .db-pill {{
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px;
      color: #38bdf8;
      background: rgba(56, 189, 248, 0.1);
      padding: 3px 8px;
      border-radius: 4px;
    }}
    .artboard-viewport {{
      width: 100%;
      background: #070b12;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 12px;
      cursor: zoom-in;
    }}
    .artboard-viewport svg {{
      width: 100%;
      height: auto;
      border-radius: 6px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.6);
    }}
    .artboard-viewport.mobile-vp svg {{
      max-width: 310px;
    }}
    /* Fullscreen 100% Inspector Modal */
    .inspector-modal {{
      display: none;
      position: fixed;
      inset: 0;
      z-index: 999;
      background: rgba(5, 8, 15, 0.94);
      backdrop-filter: blur(8px);
      flex-direction: column;
    }}
    .inspector-modal.open {{
      display: flex;
    }}
    .inspector-header {{
      padding: 14px 28px;
      background: #090d16;
      border-bottom: 1px solid #1e293b;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }}
    .inspector-body {{
      flex: 1;
      overflow: auto;
      padding: 32px;
      display: flex;
      justify-content: center;
      align-items: flex-start;
    }}
    .inspector-body svg {{
      flex-shrink: 0;
      box-shadow: 0 16px 48px rgba(0, 0, 0, 0.8);
    }}
  </style>
</head>
<body>
  <header class="top-figma-bar">
    <div class="brand-col">
      <h1>ROADWATCH DBMS — 20 High-Fidelity UI Wireframe Frames (Figma Canvas Suite)</h1>
      <p>Kanak Waradkar (24B-CO-030) • Krushna Surve (24B-CO-031) • Manjunath Subhash Gavada (24B-CO-035)</p>
    </div>
    <div class="filter-pills">
      <button class="pill-btn active" onclick="filterFrames('all', this)">All 20 Frames</button>
      <button class="pill-btn" onclick="filterFrames('citizen', this)">Public &amp; Citizen Mobile (01–07)</button>
      <button class="pill-btn" onclick="filterFrames('twin', this)">3D Twin &amp; IoT (08–10)</button>
      <button class="pill-btn" onclick="filterFrames('ops', this)">Operations &amp; GIS (11–15)</button>
      <button class="pill-btn" onclick="filterFrames('ledger', this)">Spend, Tenders &amp; Audit (16–20)</button>
    </div>
    <div class="master-actions">
      <button class="btn-master" onclick="copyMasterCanvas(this)">Copy All 20 Frames for Figma (⌘V)</button>
      <a class="btn-master secondary" href="../ROADWATCH_All_20_Figma_Frames.svg" download="ROADWATCH_All_20_Figma_Frames.svg">Download Master Figma .SVG</a>
    </div>
  </header>

  <div class="canvas-instructions">
    <div>
      <strong>How to put these 20 Frames into Figma in 2 seconds:</strong>
      Click <code>Copy SVG for Figma (⌘V)</code> on any screen (or <code>Copy All 20 Frames for Figma (⌘V)</code> above), open your Figma file, and press <code>Cmd+V</code> (<code>Ctrl+V</code>) — or drag &amp; drop <code>ROADWATCH_All_20_Figma_Frames.svg</code> directly onto the Figma canvas.
    </div>
    <div><strong>Total Screens:</strong> 20 Standalone Full-Viewport Frames (16 Desktop 1440×900 + 4 Mobile 390×844)</div>
  </div>

  <main class="canvas-grid" id="framesGrid">
    {''.join(cards_html)}
  </main>

  <div class="inspector-modal" id="inspectorModal">
    <div class="inspector-header">
      <div>
        <strong id="inspectorTitle" style="font-size:15px;">Frame Inspector (100% Native Pixel Resolution)</strong>
      </div>
      <div style="display:flex; gap:10px;">
        <button class="btn-action" onclick="stepInspector(-1)">← Prev Frame</button>
        <button class="btn-action" onclick="stepInspector(1)">Next Frame →</button>
        <button class="btn-action btn-copy" onclick="copyCurrentInspector(this)">Copy This Frame SVG for Figma (⌘V)</button>
        <button class="btn-action" style="background:#dc2626;border-color:#ef4444;color:#fff;" onclick="closeInspector()">✕ Close (Esc)</button>
      </div>
    </div>
    <div class="inspector-body" id="inspectorBody"></div>
  </div>

  <script>
    const FRAME_SVGS = {json.dumps(svg_js_map)};
    const MASTER_SVG = {json.dumps(master_svg)};
    let currentFrame = 1;

    function filterFrames(cat, btn) {{
      document.querySelectorAll('.pill-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.figma-frame-card').forEach(card => {{
        if (cat === 'all' || card.dataset.cat === cat) {{
          card.style.display = 'flex';
        }} else {{
          card.style.display = 'none';
        }}
      }});
    }}

    async function copySingleFrame(num, btn) {{
      const svgText = FRAME_SVGS[String(num)];
      await navigator.clipboard.writeText(svgText);
      const orig = btn.textContent;
      btn.textContent = '✓ Copied! Press ⌘V in Figma';
      btn.style.background = '#059669';
      setTimeout(() => {{
        btn.textContent = orig;
        btn.style.background = '';
      }}, 2500);
    }}

    async function copyMasterCanvas(btn) {{
      await navigator.clipboard.writeText(MASTER_SVG);
      const orig = btn.textContent;
      btn.textContent = '✓ All 20 Frames Copied! Press ⌘V in Figma';
      setTimeout(() => {{ btn.textContent = orig; }}, 3000);
    }}

    function openInspector(num) {{
      currentFrame = num;
      const modal = document.getElementById('inspectorModal');
      const body = document.getElementById('inspectorBody');
      const titleEl = document.getElementById('inspectorTitle');
      const card = document.getElementById('card-frame-' + num);
      titleEl.textContent = card.querySelector('h3').textContent + ' — 100% Native Resolution';
      body.innerHTML = FRAME_SVGS[String(num)];
      modal.classList.add('open');
    }}

    function closeInspector() {{
      document.getElementById('inspectorModal').classList.remove('open');
    }}

    function stepInspector(delta) {{
      let next = currentFrame + delta;
      if (next < 1) next = 20;
      if (next > 20) next = 1;
      openInspector(next);
    }}

    function copyCurrentInspector(btn) {{
      copySingleFrame(currentFrame, btn);
    }}

    window.addEventListener('keydown', (e) => {{
      if (e.key === 'Escape') closeInspector();
    }});
  </script>
</body>
</html>
"""
    with open(html_path, "w", encoding="utf-8") as f:
        f.write(html_doc)
    print(f"Saved Interactive Figma Showcase HTML: {html_path} ({os.path.getsize(html_path)} bytes)")



if __name__ == "__main__":
    generate_all()

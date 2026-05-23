import sqlite3
import re
import math
import json
import os

# Custom WKT Parser
def parse_wkt(wkt_str):
    if not wkt_str:
        return None
    wkt_str = wkt_str.strip().upper()
    
    # POINT(lon lat)
    point_match = re.match(r'POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)', wkt_str)
    if point_match:
        return ('POINT', (float(point_match.group(1)), float(point_match.group(2))))
        
    # LINESTRING(lon1 lat1, lon2 lat2, ...)
    linestring_match = re.match(r'LINESTRING\s*\(([^)]+)\)', wkt_str)
    if linestring_match:
        coords_str = linestring_match.group(1)
        coords = []
        for part in coords_str.split(','):
            x_y = part.strip().split()
            if len(x_y) == 2:
                coords.append((float(x_y[0]), float(x_y[1])))
        return ('LINESTRING', coords)
        
    # POLYGON((lon1 lat1, lon2 lat2, ..., lon1 lat1))
    polygon_match = re.match(r'POLYGON\s*\(\s*\(([^)]+)\)\s*\)', wkt_str)
    if polygon_match:
        coords_str = polygon_match.group(1)
        coords = []
        for part in coords_str.split(','):
            x_y = part.strip().split()
            if len(x_y) == 2:
                coords.append((float(x_y[0]), float(x_y[1])))
        return ('POLYGON', coords)
        
    return None

# Spatial function implementations
def st_geom_from_text(wkt, srid=4326):
    return wkt

def st_point(lon, lat):
    return f"POINT({lon} {lat})"

def st_setsrid(geom, srid):
    return geom

def st_contains(poly_wkt, point_wkt):
    poly = parse_wkt(poly_wkt)
    point = parse_wkt(point_wkt)
    if not poly or not point or poly[0] != 'POLYGON' or point[0] != 'POINT':
        return 0
        
    px, py = point[1]
    poly_coords = poly[1]
    
    # Ray casting algorithm
    n = len(poly_coords)
    inside = False
    p1x, p1y = poly_coords[0]
    for i in range(n + 1):
        p2x, p2y = poly_coords[i % n]
        if py > min(p1y, p2y):
            if py <= max(p1y, p2y):
                if px <= max(p1x, p2x):
                    if p1y != p2y:
                        xints = (py - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                    if p1x == p2x or px <= xints:
                        inside = not inside
        p1x, p1y = p2x, p2y
    return 1 if inside else 0

def point_to_segment_distance(px, py, x1, y1, x2, y2):
    dx = x2 - x1
    dy = y2 - y1
    if dx == 0 and dy == 0:
        return math.hypot(px - x1, py - y1)
    t = ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)
    t = max(0.0, min(1.0, t))
    cx = x1 + t * dx
    cy = y1 + t * dy
    return math.hypot(px - cx, py - cy)

def point_to_linestring_distance(px, py, linestring_coords):
    min_dist = float('inf')
    for i in range(len(linestring_coords) - 1):
        x1, y1 = linestring_coords[i]
        x2, y2 = linestring_coords[i+1]
        dist = point_to_segment_distance(px, py, x1, y1, x2, y2)
        if dist < min_dist:
            min_dist = dist
    return min_dist

def st_dwithin(geom1_wkt, geom2_wkt, max_distance):
    g1 = parse_wkt(geom1_wkt)
    g2 = parse_wkt(geom2_wkt)
    if not g1 or not g2:
        return 0
        
    if g1[0] == 'LINESTRING' and g2[0] == 'POINT':
        px, py = g2[1]
        dist = point_to_linestring_distance(px, py, g1[1])
        return 1 if dist <= max_distance else 0
    elif g1[0] == 'POINT' and g2[0] == 'LINESTRING':
        px, py = g1[1]
        dist = point_to_linestring_distance(px, py, g2[1])
        return 1 if dist <= max_distance else 0
    elif g1[0] == 'POINT' and g2[0] == 'POINT':
        dist = math.hypot(g1[1][0] - g2[1][0], g1[1][1] - g2[1][1])
        return 1 if dist <= max_distance else 0
    return 0

def st_as_geojson(wkt_str):
    geom = parse_wkt(wkt_str)
    if not geom:
        return None
    gtype, coords = geom
    if gtype == 'POINT':
        return json.dumps({"type": "Point", "coordinates": coords})
    elif gtype == 'LINESTRING':
        return json.dumps({"type": "LineString", "coordinates": coords})
    elif gtype == 'POLYGON':
        return json.dumps({"type": "Polygon", "coordinates": [coords]})
    return None

class Database:
    def __init__(self):
        self.conn = sqlite3.connect(':memory:', check_same_thread=False)
        self.conn.row_factory = sqlite3.Row
        
        # Register custom spatial functions
        self.conn.create_function("ST_GeomFromText", 1, st_geom_from_text)
        self.conn.create_function("ST_GeomFromText", 2, st_geom_from_text)
        self.conn.create_function("ST_Point", 2, st_point)
        self.conn.create_function("ST_SetSRID", 2, st_setsrid)
        self.conn.create_function("ST_Contains", 2, st_contains)
        self.conn.create_function("ST_DWithin", 3, st_dwithin)
        self.conn.create_function("ST_AsGeoJSON", 1, st_as_geojson)
        
        self.init_schema()
        self.seed_data()
        
    def init_schema(self):
        cursor = self.conn.cursor()
        
        # 1. Authorities Table
        cursor.execute("""
        CREATE TABLE authorities (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            department_code TEXT NOT NULL UNIQUE,
            contact_email TEXT NOT NULL,
            contact_phone TEXT,
            geom_boundary TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """)
        
        # 2. Contractors Table
        cursor.execute("""
        CREATE TABLE contractors (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            license_number TEXT NOT NULL UNIQUE,
            registration_date TEXT NOT NULL,
            contact_email TEXT NOT NULL,
            contact_phone TEXT,
            rating REAL DEFAULT 5.00,
            projects_completed INTEGER DEFAULT 0,
            projects_delayed INTEGER DEFAULT 0,
            blacklisted INTEGER DEFAULT 0,
            blacklisted_reason TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """)
        
        # 3. Roads Table
        cursor.execute("""
        CREATE TABLE roads (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            road_code TEXT UNIQUE,
            status TEXT NOT NULL DEFAULT 'good',
            length_km REAL NOT NULL,
            authority_id INTEGER REFERENCES authorities(id) ON DELETE SET NULL,
            geom TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """)
        
        # 4. Projects Table
        cursor.execute("""
        CREATE TABLE projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            road_id INTEGER NOT NULL REFERENCES roads(id) ON DELETE CASCADE,
            contractor_id INTEGER NOT NULL REFERENCES contractors(id) ON DELETE RESTRICT,
            authority_id INTEGER NOT NULL REFERENCES authorities(id) ON DELETE RESTRICT,
            budget_allocated REAL NOT NULL,
            budget_spent REAL DEFAULT 0.00,
            status TEXT NOT NULL DEFAULT 'planned',
            start_date TEXT NOT NULL,
            target_end_date TEXT NOT NULL,
            actual_end_date TEXT,
            delay_days INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """)
        
        # 5. Complaints Table
        cursor.execute("""
        CREATE TABLE complaints (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            client_temp_id TEXT,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            category TEXT NOT NULL,
            geom TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            image_url TEXT,
            assigned_authority_id INTEGER REFERENCES authorities(id) ON DELETE SET NULL,
            road_id INTEGER REFERENCES roads(id) ON DELETE SET NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """)
        
        self.conn.commit()

    def seed_data(self):
        # Locate docs/mock_data.sql
        # Let's search in multiple potential paths (absolute/relative)
        paths_to_try = [
            'docs/mock_data.sql',
            '../docs/mock_data.sql',
            '/Users/sanjaywaradkar/ROADWATCH/docs/mock_data.sql'
        ]
        
        mock_data_sql = None
        for p in paths_to_try:
            if os.path.exists(p):
                with open(p, 'r') as f:
                    mock_data_sql = f.read()
                break
                
        if not mock_data_sql:
            print("WARNING: Could not find docs/mock_data.sql. Seeding may fail.")
            return
            
        cursor = self.conn.cursor()
        
        # Parse and execute individual INSERT commands from SQL
        # We split by semicolon, but must be careful because of geometries
        # Fortunately, mock_data.sql consists of clean statements.
        # Let's clean up commands: remove TRUNCATE and compile SQL statements.
        statements = []
        current_statement = []
        for line in mock_data_sql.split('\n'):
            # Skip comments and empty lines
            if line.strip().startswith('--') or not line.strip():
                continue
            if 'TRUNCATE TABLE' in line:
                continue
            current_statement.append(line)
            if ';' in line:
                statements.append('\n'.join(current_statement))
                current_statement = []
                
        for stmt in statements:
            try:
                # Replace standard boolean inserts (FALSE/TRUE) with (0/1) for SQLite
                stmt_clean = stmt.replace(' FALSE,', ' 0,').replace(' TRUE,', ' 1,')
                stmt_clean = stmt_clean.replace(' FALSE)', ' 0)').replace(' TRUE)', ' 1)')
                cursor.execute(stmt_clean)
            except Exception as e:
                print(f"Error executing seed SQL statement: {stmt[:100]}... Error: {e}")
                
        self.conn.commit()
        
    def query(self, sql, params=()):
        cursor = self.conn.cursor()
        try:
            cursor.execute(sql, params)
            return [dict(row) for row in cursor.fetchall()]
        except Exception as e:
            print(f"Database Query Error: {sql} | Params: {params} | Error: {e}")
            return []

    def execute(self, sql, params=()):
        cursor = self.conn.cursor()
        try:
            cursor.execute(sql, params)
            self.conn.commit()
            return cursor.lastrowid
        except Exception as e:
            print(f"Database Execution Error: {sql} | Params: {params} | Error: {e}")
            self.conn.rollback()
            return None

# Singleton instance of database
db = Database()

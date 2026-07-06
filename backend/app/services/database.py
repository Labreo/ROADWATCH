import os
import psycopg2
from psycopg2.extras import RealDictCursor
from sqlalchemy import create_engine

# Database Connection Settings
db_user = os.environ.get("POSTGRES_USER", "postgres")
db_password = os.environ.get("POSTGRES_PASSWORD", "postgres")
db_host = os.environ.get("POSTGRES_HOST", "db")
db_port = os.environ.get("POSTGRES_PORT", "5432")
db_name = os.environ.get("POSTGRES_DB", "roadwatch")

DATABASE_URL = f"postgresql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"

def to_wkt(val):
    if val is None:
        return None
    # If it's already a WKT string, return it
    if isinstance(val, str) and (val.startswith('POINT') or val.startswith('LINESTRING') or val.startswith('POLYGON') or val.startswith('MULTIPOLYGON') or val.startswith('MULTILINESTRING')):
        return val
    
    # If it is a geoalchemy2 WKBElement
    try:
        from geoalchemy2.elements import WKBElement
        from geoalchemy2.shape import to_shape
        if isinstance(val, WKBElement):
            return to_shape(val).wkt
    except Exception:
        pass

    # If it is a hex string (PostGIS EWKB hex)
    if isinstance(val, str):
        try:
            from shapely import wkb
            geom = wkb.loads(val, hex=True)
            return geom.wkt
        except Exception:
            pass
            
    # If it is bytes
    if isinstance(val, bytes):
        try:
            from shapely import wkb
            geom = wkb.loads(val)
            return geom.wkt
        except Exception:
            pass
            
    return val

class Database:
    def __init__(self):
        # Create connection pool via SQLAlchemy
        self.engine = create_engine(
            DATABASE_URL,
            pool_size=10,
            max_overflow=20,
            pool_pre_ping=True
        )
        
    def query(self, sql, params=()):
        # Convert SQLite parameter placeholder (?) to Postgres (%s)
        sql = sql.replace('?', '%s')
        
        # Get raw connection from the SQLAlchemy connection pool
        conn = self.engine.raw_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute(sql, params)
                try:
                    results = cursor.fetchall()
                except psycopg2.ProgrammingError:
                    results = []
                
                # Postprocess rows to convert geometry columns to WKT
                processed_results = []
                for r in results:
                    row_dict = dict(r)
                    for col in ['geom', 'geom_boundary']:
                        if col in row_dict:
                            row_dict[col] = to_wkt(row_dict[col])
                    processed_results.append(row_dict)
                return processed_results
        except Exception as e:
            print(f"Database Query Error: {sql} | Params: {params} | Error: {e}")
            return []
        finally:
            conn.close()

    def execute(self, sql, params=()):
        # Convert SQLite parameter placeholder (?) to Postgres (%s)
        sql = sql.replace('?', '%s')
        
        is_insert = sql.strip().upper().startswith("INSERT INTO")
        if is_insert and "RETURNING" not in sql.upper():
            sql_clean = sql.strip().rstrip(';')
            sql_clean += " RETURNING id"
            sql = sql_clean

        conn = self.engine.raw_connection()
        try:
            with conn.cursor() as cursor:
                cursor.execute(sql, params)
                inserted_id = None
                if is_insert:
                    inserted_id = cursor.fetchone()[0]
                conn.commit()
                return inserted_id if is_insert else cursor.rowcount
        except Exception as e:
            print(f"Database Execution Error: {sql} | Params: {params} | Error: {e}")
            conn.rollback()
            return None
        finally:
            conn.close()

# Singleton instance of database
db = Database()

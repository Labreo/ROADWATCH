import os
import psycopg2
from psycopg2.extras import RealDictCursor
from sqlalchemy import create_engine
from app.services.audit_context import get_audit_user

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
                cursor.execute("SET app.changed_by = %s", (get_audit_user(),))
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
                cursor.execute("SET app.changed_by = %s", (get_audit_user(),))
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

    def init_pg_trgm(self):
        """Enable pg_trgm extension for text similarity queries."""
        try:
            conn = self.engine.raw_connection()
            with conn.cursor() as cursor:
                cursor.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
                conn.commit()
                print("pg_trgm extension enabled.")
            conn.close()
        except Exception as e:
            print(f"pg_trgm init error (non-fatal): {e}")

    def init_database(self, schema_path: str = "docs/schema.sql", seed_path: str = "docs/mock_data.sql"):
        """
        Initializes the database schema and seeds it if tables are empty.
        Reads schema.sql and mock_data.sql from the project docs directory.
        Safe to call multiple times — only runs if tables are empty or missing.
        """
        try:
            conn = self.engine.raw_connection()
            with conn.cursor() as cursor:
                cursor.execute("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'authorities')")
                table_exists = cursor.fetchone()[0]
                if table_exists:
                    cursor.execute("SELECT COUNT(*) FROM authorities")
                    count = cursor.fetchone()[0]
                    if count > 0:
                        conn.close()
                        print("Database already seeded, skipping initialization.")
                        return

                base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
                schema_file = os.path.join(base_dir, schema_path)
                seed_file = os.path.join(base_dir, seed_path)

                if os.path.exists(schema_file):
                    print(f"Executing schema: {schema_file}")
                    with open(schema_file, 'r') as f:
                        schema_sql = f.read()
                    cursor.execute(schema_sql)
                    conn.commit()
                    print("Schema applied successfully.")
                else:
                    print(f"Schema file not found at {schema_file}, skipping.")

                if os.path.exists(seed_file) and (not table_exists):
                    print(f"Executing seed data: {seed_file}")
                    with open(seed_file, 'r') as f:
                        seed_sql = f.read()
                    cursor.execute(seed_sql)
                    conn.commit()
                    print("Seed data inserted successfully.")
            conn.close()
        except Exception as e:
            print(f"Database initialization error (non-fatal): {e}")
            try:
                conn.rollback()
            except Exception:
                pass


# Singleton instance of database
db = Database()
# Auto-initialize schema and seed data on module load
db.init_pg_trgm()
db.init_database()

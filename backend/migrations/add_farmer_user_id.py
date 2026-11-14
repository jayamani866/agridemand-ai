import sqlite3
DB_PATH = "agridemand.db"
conn = sqlite3.connect(DB_PATH)
try:
    columns = conn.execute("PRAGMA table_info(farmers)").fetchall()
    column_names = [column[1] for column in columns]
    if "user_id" not in column_names:
        conn.execute(
            "ALTER TABLE farmers ADD COLUMN user_id INTEGER REFERENCES users(id)"
        )
        print("Added farmers.user_id column.")
    else:
        print("farmers.user_id already exists.")
    conn.execute("""
        CREATE UNIQUE INDEX IF NOT EXISTS
        ix_farmers_user_id ON farmers(user_id)
    """)
    conn.commit()
    print("Unique index created or already exists.")
    print("\nUPDATED FARMERS SCHEMA:")
    print(conn.execute("PRAGMA table_info(farmers)").fetchall())
except Exception:
    conn.rollback()
    raise
finally:
    conn.close()

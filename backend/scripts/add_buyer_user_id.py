import sqlite3
conn = sqlite3.connect("agridemand.db")
try:
    columns = [
        row[1]
        for row in conn.execute("PRAGMA table_info(buyer_requests)")
    ]
    if "user_id" not in columns:
        conn.execute(
            "ALTER TABLE buyer_requests ADD COLUMN user_id INTEGER REFERENCES users(id)"
        )
        print("Added buyer_requests.user_id")
    else:
        print("buyer_requests.user_id already exists")
    conn.execute("""
        CREATE INDEX IF NOT EXISTS
        ix_buyer_requests_user_id
        ON buyer_requests(user_id)
    """)
    conn.commit()
    print("Migration successful")
except Exception:
    conn.rollback()
    raise
finally:
    conn.close()

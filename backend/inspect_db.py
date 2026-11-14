import sqlite3
conn = sqlite3.connect("agridemand.db")
print("TABLES:")
print(conn.execute(
    "SELECT name FROM sqlite_master WHERE type='table'"
).fetchall())
print("\nFARMERS:")
print(conn.execute("PRAGMA table_info(farmers)").fetchall())
print("\nUSERS:")
print(conn.execute("PRAGMA table_info(users)").fetchall())
conn.close()

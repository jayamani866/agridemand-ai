import sqlite3
db = "backend/agridemand.db"
conn = sqlite3.connect(db)
columns = {
    "payment_method": "VARCHAR(30) NOT NULL DEFAULT 'not_selected'",
    "payment_status": "VARCHAR(30) NOT NULL DEFAULT 'pending'",
    "payment_reference": "VARCHAR(100)",
    "payment_order_id": "VARCHAR(100)",
    "paid_at": "DATETIME",
}
existing = {
    row[1] for row in conn.execute("PRAGMA table_info(orders)")
}
for name, definition in columns.items():
    if name not in existing:
        conn.execute(f"ALTER TABLE orders ADD COLUMN {name} {definition}")
conn.commit()
print("Updated orders columns:")
print([row[1] for row in conn.execute("PRAGMA table_info(orders)")])
conn.close()

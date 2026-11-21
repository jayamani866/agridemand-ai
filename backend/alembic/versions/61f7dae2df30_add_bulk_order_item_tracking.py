
"""add bulk order item tracking

Revision ID: 61f7dae2df30
Revises: f7b6a09d1b96
"""

from alembic import op
import sqlalchemy as sa

revision = "61f7dae2df30"
down_revision = "f7b6a09d1b96"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    # Add only missing OrderItem columns.
    columns = {
        column["name"]
        for column in inspector.get_columns("order_items")
    }

    if "status" not in columns:
        op.add_column(
            "order_items",
            sa.Column(
                "status",
                sa.String(30),
                nullable=False,
                server_default="pending",
            ),
        )

    if "updated_at" not in columns:
        op.add_column(
            "order_items",
            sa.Column("updated_at", sa.DateTime(), nullable=True),
        )

    # Backfill existing records.
    op.execute(
        "UPDATE order_items "
        "SET updated_at = CURRENT_TIMESTAMP "
        "WHERE updated_at IS NULL"
    )

    # Add missing OrderItem indexes only.
    inspector = sa.inspect(bind)
    indexes = {
        index["name"]
        for index in inspector.get_indexes("order_items")
    }

    if "ix_order_items_farmer_id" not in indexes:
        op.create_index(
            "ix_order_items_farmer_id",
            "order_items",
            ["farmer_id"],
        )

    if "ix_order_items_status" not in indexes:
        op.create_index(
            "ix_order_items_status",
            "order_items",
            ["status"],
        )

    # Preserve existing history table.
    if not inspector.has_table("bulk_order_status_history"):
        op.create_table(
            "bulk_order_status_history",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column(
                "order_item_id",
                sa.Integer(),
                sa.ForeignKey("order_items.id"),
                nullable=False,
            ),
            sa.Column("status", sa.String(30), nullable=False),
            sa.Column(
                "updated_by_user_id",
                sa.Integer(),
                sa.ForeignKey("users.id"),
                nullable=False,
            ),
            sa.Column("note", sa.String(250), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(),
                nullable=False,
                server_default=sa.func.current_timestamp(),
            ),
        )

    # Add missing history indexes only.
    inspector = sa.inspect(bind)
    history_indexes = {
        index["name"]
        for index in inspector.get_indexes(
            "bulk_order_status_history"
        )
    }

    if "ix_bulk_order_status_history_order_item_id" not in history_indexes:
        op.create_index(
            "ix_bulk_order_status_history_order_item_id",
            "bulk_order_status_history",
            ["order_item_id"],
        )

    if "ix_bulk_order_status_history_updated_by_user_id" not in history_indexes:
        op.create_index(
            "ix_bulk_order_status_history_updated_by_user_id",
            "bulk_order_status_history",
            ["updated_by_user_id"],
        )


def downgrade() -> None:
    # Intentionally preserve existing data and schema.
    # Do not drop tables or columns that may have existed
    # before this migration was applied.
    pass

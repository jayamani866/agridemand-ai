
"""baseline existing database

Revision ID: 2f62349b00d7
Revises:
Create Date: 2026-11-14

"""
from typing import Sequence, Union

from alembic import op

revision: str = "2f62349b00d7"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Existing database schema is already present.
    # This baseline only establishes Alembic migration history.
    pass


def downgrade() -> None:
    # Intentionally do not drop existing application tables.
    pass

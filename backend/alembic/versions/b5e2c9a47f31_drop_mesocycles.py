"""drop mesocycles table and sessions.mesocycle_id

Revision ID: b5e2c9a47f31
Revises: a3f8d2c4b1e6
Create Date: 2026-06-29 17:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'b5e2c9a47f31'
down_revision: Union[str, Sequence[str], None] = 'a3f8d2c4b1e6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Drop the column first so its FK to mesocycles goes with it, then the table.
    op.drop_column('sessions', 'mesocycle_id')
    op.drop_table('mesocycles')


def downgrade() -> None:
    """Downgrade schema."""
    op.create_table(
        'mesocycles',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('goal', sa.String(), nullable=False),
        sa.Column('total_weeks', sa.Integer(), nullable=False),
        sa.Column('start_date', sa.Date(), nullable=False),
        sa.Column('end_date', sa.Date(), nullable=True),
        sa.Column('is_deload', sa.Boolean(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.add_column('sessions', sa.Column('mesocycle_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key('sessions_mesocycle_id_fkey', 'sessions', 'mesocycles', ['mesocycle_id'], ['id'])

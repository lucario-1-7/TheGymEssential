"""user token_version for logout-everywhere

Revision ID: a3f8d2c4b1e6
Revises: 37d90c35195b
Create Date: 2026-06-29 16:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a3f8d2c4b1e6'
down_revision: Union[str, Sequence[str], None] = '37d90c35195b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('users', sa.Column('token_version', sa.Integer(), nullable=False, server_default='0'))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('users', 'token_version')

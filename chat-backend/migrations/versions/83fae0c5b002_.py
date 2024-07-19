"""empty message

Revision ID: 83fae0c5b002
Revises: a0f3056824c3
Create Date: 2024-05-14 10:09:54.216848

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '83fae0c5b002'
down_revision: Union[str, None] = 'a0f3056824c3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass

"""Add CPF to users.

Revision ID: 20260826_0002
Revises: 20260825_0001
"""

import sqlalchemy as sa
from alembic import op

revision = "20260826_0002"
down_revision = "20260825_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("users") as batch_op:
        batch_op.add_column(sa.Column("cpf", sa.String(11), nullable=True))
        batch_op.create_unique_constraint("uq_user_company_cpf", ["company_id", "cpf"])


def downgrade() -> None:
    with op.batch_alter_table("users") as batch_op:
        batch_op.drop_constraint("uq_user_company_cpf", type_="unique")
        batch_op.drop_column("cpf")

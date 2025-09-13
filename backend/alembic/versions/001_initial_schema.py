"""Initial schema for populations and jobs

Revision ID: 001
Revises: 
Create Date: 2024-01-12

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create populations table
    op.create_table('populations',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('patient_count', sa.Integer(), default=0),
        sa.Column('config', sa.JSON(), nullable=False),
        sa.Column('status', sa.Enum('PENDING', 'GENERATING', 'COMPLETED', 'FAILED', name='populationstatus'), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.Column('storage_path', sa.String(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create generation_jobs table
    op.create_table('generation_jobs',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('population_id', sa.String(), nullable=True),
        sa.Column('started_at', sa.DateTime(), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.Column('progress', sa.Integer(), default=0),
        sa.Column('logs', sa.Text(), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('celery_task_id', sa.String(), nullable=True),
        sa.ForeignKeyConstraint(['population_id'], ['populations.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes
    op.create_index('ix_populations_status', 'populations', ['status'])
    op.create_index('ix_populations_created_at', 'populations', ['created_at'])
    op.create_index('ix_generation_jobs_population_id', 'generation_jobs', ['population_id'])


def downgrade() -> None:
    op.drop_index('ix_generation_jobs_population_id', table_name='generation_jobs')
    op.drop_index('ix_populations_created_at', table_name='populations')
    op.drop_index('ix_populations_status', table_name='populations')
    op.drop_table('generation_jobs')
    op.drop_table('populations')
    op.execute('DROP TYPE IF EXISTS populationstatus')
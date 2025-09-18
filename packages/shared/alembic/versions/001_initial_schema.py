"""Initial schema with FHIR resources and populations

Revision ID: 001
Revises: 
Create Date: 2024-01-01 00:00:00.000000

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
        sa.Column('id', sa.String(50), primary_key=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text()),
        sa.Column('patient_count', sa.Integer(), nullable=False),
        sa.Column('config', postgresql.JSONB(), nullable=False),
        sa.Column('status', sa.String(20), server_default='PENDING'),
        sa.Column('progress', sa.Integer(), server_default='0'),
        sa.Column('storage_path', sa.String(500)),
        sa.Column('started_at', sa.DateTime()),
        sa.Column('completed_at', sa.DateTime()),
        sa.Column('total_resources', sa.Integer(), server_default='0'),
        sa.Column('total_conditions', sa.Integer(), server_default='0'),
        sa.Column('total_observations', sa.Integer(), server_default='0'),
        sa.Column('total_procedures', sa.Integer(), server_default='0'),
        sa.Column('total_medications', sa.Integer(), server_default='0'),
        sa.Column('total_encounters', sa.Integer(), server_default='0'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now(), onupdate=sa.func.now()),
    )
    
    # Create generation_jobs table
    op.create_table('generation_jobs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('population_id', sa.String(50), sa.ForeignKey('populations.id'), nullable=False),
        sa.Column('celery_task_id', sa.String(255)),
        sa.Column('status', sa.String(20), server_default='PENDING'),
        sa.Column('progress', sa.Integer(), server_default='0'),
        sa.Column('progress_message', sa.Text()),
        sa.Column('started_at', sa.DateTime()),
        sa.Column('completed_at', sa.DateTime()),
        sa.Column('logs', sa.Text()),
        sa.Column('error_message', sa.Text()),
        sa.Column('output_path', sa.String(500)),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now(), onupdate=sa.func.now()),
    )
    
    # Create FHIR resources table with JSONB storage
    op.create_table('fhir_resources',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('resource_type', sa.String(50), nullable=False),
        sa.Column('resource_id', sa.String(255), nullable=False),
        sa.Column('resource', postgresql.JSONB(), nullable=False),
        sa.Column('patient_id', sa.String(255)),
        sa.Column('population_id', sa.String(255), sa.ForeignKey('populations.id')),
        sa.Column('version_id', sa.String(50), server_default='1'),
        sa.Column('last_updated', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now(), onupdate=sa.func.now()),
    )
    
    # Create FHIR bundles table
    op.create_table('fhir_bundles',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('bundle_type', sa.String(50), nullable=False),
        sa.Column('bundle', postgresql.JSONB(), nullable=False),
        sa.Column('status', sa.String(50), server_default='pending'),
        sa.Column('processed_at', sa.DateTime()),
        sa.Column('error_message', sa.Text()),
        sa.Column('resource_count', sa.Integer(), server_default='0'),
        sa.Column('population_id', sa.String(255), sa.ForeignKey('populations.id')),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now(), onupdate=sa.func.now()),
    )
    
    # Create indexes for efficient querying
    op.create_index('idx_fhir_resource_type', 'fhir_resources', ['resource_type'])
    op.create_index('idx_fhir_patient_id', 'fhir_resources', ['patient_id'])
    op.create_index('idx_fhir_population_id', 'fhir_resources', ['population_id'])
    op.create_index('idx_fhir_resource_type_id', 'fhir_resources', ['resource_type', 'resource_id'], unique=True)
    op.create_index('idx_fhir_patient_population', 'fhir_resources', ['patient_id', 'population_id'])
    
    # Create GIN index for JSONB searches
    op.execute('CREATE INDEX idx_fhir_resource_gin ON fhir_resources USING gin(resource)')
    op.execute('CREATE INDEX idx_fhir_bundle_gin ON fhir_bundles USING gin(bundle)')
    
    # Create indexes for generation_jobs
    op.create_index('idx_job_population_id', 'generation_jobs', ['population_id'])
    op.create_index('idx_job_status', 'generation_jobs', ['status'])


def downgrade() -> None:
    # Drop indexes
    op.drop_index('idx_job_status')
    op.drop_index('idx_job_population_id')
    op.execute('DROP INDEX idx_fhir_bundle_gin')
    op.execute('DROP INDEX idx_fhir_resource_gin')
    op.drop_index('idx_fhir_patient_population')
    op.drop_index('idx_fhir_resource_type_id')
    op.drop_index('idx_fhir_population_id')
    op.drop_index('idx_fhir_patient_id')
    op.drop_index('idx_fhir_resource_type')
    
    # Drop tables
    op.drop_table('fhir_bundles')
    op.drop_table('fhir_resources')
    op.drop_table('generation_jobs')
    op.drop_table('populations')
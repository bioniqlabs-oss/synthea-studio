"""add_fhir_resources_table

Revision ID: 002
Revises: 001
Create Date: 2025-09-19

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None


def upgrade():
    # Create fhir_resources table for storing FHIR data
    op.create_table(
        'fhir_resources',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('resource_type', sa.String(50), nullable=False),
        sa.Column('resource_id', sa.String(255), nullable=False),
        sa.Column('population_id', sa.String(255), nullable=False),
        sa.Column('resource_data', postgresql.JSONB, nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('resource_type', 'resource_id', name='uq_resource_type_id')
    )

    # Create indexes for better query performance
    op.create_index('idx_fhir_population', 'fhir_resources', ['population_id'])
    op.create_index('idx_fhir_resource_type', 'fhir_resources', ['resource_type'])
    op.create_index('idx_fhir_resource_id', 'fhir_resources', ['resource_id'])

    # Create GIN index for JSONB queries
    op.create_index(
        'idx_fhir_resource_data',
        'fhir_resources',
        ['resource_data'],
        postgresql_using='gin'
    )

    # Add foreign key to populations table
    op.create_foreign_key(
        'fk_fhir_resources_population',
        'fhir_resources',
        'populations',
        ['population_id'],
        ['id'],
        ondelete='CASCADE'
    )


def downgrade():
    op.drop_constraint('fk_fhir_resources_population', 'fhir_resources', type_='foreignkey')
    op.drop_index('idx_fhir_resource_data', 'fhir_resources')
    op.drop_index('idx_fhir_resource_id', 'fhir_resources')
    op.drop_index('idx_fhir_resource_type', 'fhir_resources')
    op.drop_index('idx_fhir_population', 'fhir_resources')
    op.drop_table('fhir_resources')
"""
FHIR Resource model for storing FHIR data in PostgreSQL
"""
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
import uuid

from app.core.database import Base


class FhirResource(Base):
    __tablename__ = "fhir_resources"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    resource_type = Column(String(50), nullable=False, index=True)  # Patient, Condition, etc.
    resource_id = Column(String(255), nullable=False, index=True)   # FHIR resource ID
    population_id = Column(String, ForeignKey("populations.id", ondelete="CASCADE"), nullable=False, index=True)
    resource_data = Column(JSONB, nullable=False)  # Complete FHIR resource as JSON
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationship to Population
    population = relationship("Population", back_populates="fhir_resources")

    def __repr__(self):
        return f"<FhirResource {self.resource_type}/{self.resource_id} from {self.population_id}>"
"""FHIR Resource Models

Stores FHIR resources as JSONB with indexed fields for efficient querying.
"""

from typing import Optional, Dict, Any
import uuid
from datetime import datetime

from sqlalchemy import Column, String, DateTime, Index, Integer, Boolean, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.ext.hybrid import hybrid_property

from .base import Base, TimestampMixin


class FHIRResource(Base, TimestampMixin):
    """Generic FHIR Resource storage with JSONB"""
    __tablename__ = "fhir_resources"
    
    # Primary identification
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    resource_type = Column(String(50), nullable=False, index=True)
    resource_id = Column(String(255), nullable=False)
    
    # FHIR Resource as JSONB
    resource = Column(JSONB, nullable=False)
    
    # Denormalized fields for efficient querying
    patient_id = Column(String(255), index=True)  # Reference to patient if applicable
    population_id = Column(String(255), ForeignKey("populations.id"), index=True)
    
    # Metadata
    version_id = Column(String(50), default="1")
    last_updated = Column(DateTime, default=datetime.utcnow)
    
    # Indexes for common queries
    __table_args__ = (
        Index("idx_resource_type_id", "resource_type", "resource_id", unique=True),
        Index("idx_resource_gin", "resource", postgresql_using="gin"),
        Index("idx_patient_population", "patient_id", "population_id"),
    )
    
    @hybrid_property
    def display_name(self):
        """Extract display name from resource"""
        if self.resource_type == "Patient":
            names = self.resource.get("name", [])
            if names:
                name = names[0]
                given = " ".join(name.get("given", []))
                family = name.get("family", "")
                return f"{given} {family}".strip()
        return f"{self.resource_type}/{self.resource_id}"
    
    def to_fhir(self) -> Dict[str, Any]:
        """Return the FHIR resource"""
        resource = dict(self.resource)
        # Ensure meta information is present
        if "meta" not in resource:
            resource["meta"] = {}
        resource["meta"]["versionId"] = self.version_id
        resource["meta"]["lastUpdated"] = self.last_updated.isoformat()
        return resource
    
    @classmethod
    def from_fhir(cls, resource: Dict[str, Any], population_id: Optional[str] = None):
        """Create from a FHIR resource"""
        # Extract patient reference if present
        patient_id = None
        if "subject" in resource:
            ref = resource["subject"].get("reference", "")
            if ref.startswith("Patient/"):
                patient_id = ref.replace("Patient/", "")
        elif resource.get("resourceType") == "Patient":
            patient_id = resource.get("id")
        
        return cls(
            resource_type=resource.get("resourceType"),
            resource_id=resource.get("id"),
            resource=resource,
            patient_id=patient_id,
            population_id=population_id,
            version_id=resource.get("meta", {}).get("versionId", "1"),
        )


class FHIRBundle(Base, TimestampMixin):
    """Store FHIR Bundles for transaction processing"""
    __tablename__ = "fhir_bundles"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    bundle_type = Column(String(50), nullable=False)  # transaction, batch, etc.
    bundle = Column(JSONB, nullable=False)
    
    # Processing status
    status = Column(String(50), default="pending")  # pending, processing, completed, failed
    processed_at = Column(DateTime)
    error_message = Column(Text)
    
    # Track resources created
    resource_count = Column(Integer, default=0)
    population_id = Column(String(255), ForeignKey("populations.id"))
    
    def process(self, session):
        """Process bundle entries and create individual resources"""
        if self.bundle.get("type") not in ["transaction", "batch"]:
            raise ValueError(f"Unsupported bundle type: {self.bundle.get('type')}")
        
        created_resources = []
        for entry in self.bundle.get("entry", []):
            resource = entry.get("resource")
            if not resource:
                continue
            
            fhir_resource = FHIRResource.from_fhir(resource, self.population_id)
            session.add(fhir_resource)
            created_resources.append(fhir_resource)
        
        self.resource_count = len(created_resources)
        self.status = "completed"
        self.processed_at = datetime.utcnow()
        
        return created_resources
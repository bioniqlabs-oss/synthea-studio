"""Population and Generation Job Models"""

from enum import Enum
from typing import Optional, Dict, Any
import uuid
from datetime import datetime

from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text, Float
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from .base import Base, TimestampMixin


class PopulationStatus(str, Enum):
    """Population generation status"""
    PENDING = "PENDING"
    GENERATING = "GENERATING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


class Population(Base, TimestampMixin):
    """Population model representing a generated synthetic population"""
    __tablename__ = "populations"
    
    # Identification
    id = Column(String(50), primary_key=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    
    # Generation configuration
    patient_count = Column(Integer, nullable=False)
    config = Column(JSONB, nullable=False, default=dict)
    
    # Status tracking
    status = Column(String(20), default=PopulationStatus.PENDING)
    progress = Column(Integer, default=0)  # 0-100
    
    # Storage
    storage_path = Column(String(500))
    
    # Timing
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    
    # Relationships
    jobs = relationship("GenerationJob", back_populates="population", cascade="all, delete-orphan")
    fhir_resources = relationship("FHIRResource", backref="population", cascade="all, delete-orphan")
    
    # Statistics
    total_resources = Column(Integer, default=0)
    total_conditions = Column(Integer, default=0)
    total_observations = Column(Integer, default=0)
    total_procedures = Column(Integer, default=0)
    total_medications = Column(Integer, default=0)
    total_encounters = Column(Integer, default=0)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API responses"""
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "patient_count": self.patient_count,
            "config": self.config,
            "status": self.status,
            "progress": self.progress,
            "storage_path": self.storage_path,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "statistics": {
                "total_resources": self.total_resources,
                "total_conditions": self.total_conditions,
                "total_observations": self.total_observations,
                "total_procedures": self.total_procedures,
                "total_medications": self.total_medications,
                "total_encounters": self.total_encounters,
            }
        }


class GenerationJob(Base, TimestampMixin):
    """Track individual generation jobs"""
    __tablename__ = "generation_jobs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    population_id = Column(String(50), ForeignKey("populations.id"), nullable=False)
    celery_task_id = Column(String(255))
    
    # Status
    status = Column(String(20), default="PENDING")
    progress = Column(Integer, default=0)
    progress_message = Column(Text)
    
    # Timing
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    
    # Results
    logs = Column(Text)
    error_message = Column(Text)
    output_path = Column(String(500))
    
    # Relationships
    population = relationship("Population", back_populates="jobs")
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API responses"""
        return {
            "id": str(self.id),
            "population_id": self.population_id,
            "celery_task_id": self.celery_task_id,
            "status": self.status,
            "progress": self.progress,
            "progress_message": self.progress_message,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "logs": self.logs,
            "error_message": self.error_message,
        }
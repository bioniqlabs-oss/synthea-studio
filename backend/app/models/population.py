"""
Population model
"""
from datetime import datetime
from sqlalchemy import Column, String, Integer, JSON, DateTime, Enum
from sqlalchemy.orm import relationship
import enum

from app.core.database import Base


class PopulationStatus(str, enum.Enum):
    PENDING = "PENDING"
    GENERATING = "GENERATING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class Population(Base):
    __tablename__ = "populations"
    
    id = Column(String, primary_key=True)  # pop_20240112_001
    name = Column(String, nullable=False)
    description = Column(String)
    patient_count = Column(Integer, default=0)
    config = Column(JSON, nullable=False)  # Synthea parameters
    status = Column(Enum(PopulationStatus), default=PopulationStatus.PENDING)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime)
    storage_path = Column(String)  # Path to stored artifacts
    
    # Relationships
    jobs = relationship("GenerationJob", back_populates="population", cascade="all, delete-orphan")
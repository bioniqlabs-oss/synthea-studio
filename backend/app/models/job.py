"""
Generation job model
"""
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
import uuid

from app.core.database import Base


class GenerationJob(Base):
    __tablename__ = "generation_jobs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    population_id = Column(String, ForeignKey("populations.id"))
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime)
    progress = Column(Integer, default=0)  # 0-100
    logs = Column(Text)
    error_message = Column(Text)
    celery_task_id = Column(String)
    
    # Relationships
    population = relationship("Population", back_populates="jobs")
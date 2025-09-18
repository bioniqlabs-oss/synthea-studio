"""Pydantic schemas for Population API"""

from typing import Optional, Dict, Any, List
from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field, ConfigDict, field_validator


class PopulationStatus(str, Enum):
    """Population generation status"""
    PENDING = "PENDING"
    GENERATING = "GENERATING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


class PopulationConfig(BaseModel):
    """Configuration for population generation"""
    modules: List[str] = Field(default_factory=list, description="Disease modules to include")
    age_range: List[int] = Field(default=[0, 100], min_length=2, max_length=2)
    gender_distribution: Dict[str, float] = Field(default={"M": 0.5, "F": 0.5})
    state: str = Field(default="Massachusetts")
    city: Optional[str] = None
    export_fhir: bool = Field(default=True)
    export_csv: bool = Field(default=False)
    export_ccda: bool = Field(default=False)
    
    @field_validator("gender_distribution")
    @classmethod
    def validate_gender_distribution(cls, v: Dict[str, float]) -> Dict[str, float]:
        total = sum(v.values())
        if abs(total - 1.0) > 0.01:  # Allow small floating point errors
            raise ValueError(f"Gender distribution must sum to 1.0, got {total}")
        return v


class PopulationCreate(BaseModel):
    """Schema for creating a new population"""
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    size: int = Field(..., ge=1, le=10000, description="Number of patients to generate")
    config: PopulationConfig = Field(default_factory=PopulationConfig)


class PopulationUpdate(BaseModel):
    """Schema for updating a population"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None


class PopulationStatistics(BaseModel):
    """Population statistics"""
    total_resources: int = 0
    total_conditions: int = 0
    total_observations: int = 0
    total_procedures: int = 0
    total_medications: int = 0
    total_encounters: int = 0


class PopulationResponse(BaseModel):
    """Schema for population API responses"""
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    name: str
    description: Optional[str]
    patient_count: int
    config: Dict[str, Any]
    status: PopulationStatus
    progress: int = Field(ge=0, le=100)
    storage_path: Optional[str]
    created_at: datetime
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    statistics: Optional[PopulationStatistics] = None


class GenerationJobCreate(BaseModel):
    """Schema for creating a generation job"""
    population_id: str
    celery_task_id: Optional[str] = None


class GenerationJobResponse(BaseModel):
    """Schema for generation job responses"""
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    population_id: str
    celery_task_id: Optional[str]
    status: str
    progress: int = Field(ge=0, le=100)
    progress_message: Optional[str]
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    logs: Optional[str]
    error_message: Optional[str]


class ProgressUpdate(BaseModel):
    """Schema for progress updates via WebSocket/Redis"""
    population_id: str
    job_id: Optional[str]
    progress: int = Field(ge=0, le=100)
    message: str
    status: Optional[PopulationStatus] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
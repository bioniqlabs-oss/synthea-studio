"""Pydantic schemas for FHIR resources"""

from typing import Optional, Dict, Any, List, Literal
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, ConfigDict


class FHIRMeta(BaseModel):
    """FHIR Meta information"""
    versionId: Optional[str] = None
    lastUpdated: Optional[str] = None
    profile: Optional[List[str]] = None
    tag: Optional[List[Dict[str, str]]] = None


class FHIRIdentifier(BaseModel):
    """FHIR Identifier"""
    system: Optional[str] = None
    value: str
    use: Optional[str] = None
    type: Optional[Dict[str, Any]] = None


class FHIRHumanName(BaseModel):
    """FHIR HumanName"""
    use: Optional[str] = None
    family: Optional[str] = None
    given: Optional[List[str]] = None
    prefix: Optional[List[str]] = None
    suffix: Optional[List[str]] = None


class FHIRReference(BaseModel):
    """FHIR Reference"""
    reference: Optional[str] = None
    display: Optional[str] = None
    type: Optional[str] = None


class FHIRCodeableConcept(BaseModel):
    """FHIR CodeableConcept"""
    coding: Optional[List[Dict[str, Any]]] = None
    text: Optional[str] = None


class FHIRPatient(BaseModel):
    """FHIR Patient resource schema"""
    resourceType: Literal["Patient"] = "Patient"
    id: Optional[str] = None
    meta: Optional[FHIRMeta] = None
    identifier: Optional[List[FHIRIdentifier]] = None
    active: Optional[bool] = True
    name: Optional[List[FHIRHumanName]] = None
    gender: Optional[str] = None
    birthDate: Optional[str] = None
    address: Optional[List[Dict[str, Any]]] = None
    telecom: Optional[List[Dict[str, Any]]] = None


class FHIRCondition(BaseModel):
    """FHIR Condition resource schema"""
    resourceType: Literal["Condition"] = "Condition"
    id: Optional[str] = None
    meta: Optional[FHIRMeta] = None
    identifier: Optional[List[FHIRIdentifier]] = None
    clinicalStatus: Optional[FHIRCodeableConcept] = None
    verificationStatus: Optional[FHIRCodeableConcept] = None
    code: Optional[FHIRCodeableConcept] = None
    subject: FHIRReference
    onsetDateTime: Optional[str] = None
    recordedDate: Optional[str] = None


class FHIRObservation(BaseModel):
    """FHIR Observation resource schema"""
    resourceType: Literal["Observation"] = "Observation"
    id: Optional[str] = None
    meta: Optional[FHIRMeta] = None
    identifier: Optional[List[FHIRIdentifier]] = None
    status: str
    code: FHIRCodeableConcept
    subject: FHIRReference
    effectiveDateTime: Optional[str] = None
    valueQuantity: Optional[Dict[str, Any]] = None
    valueCodeableConcept: Optional[FHIRCodeableConcept] = None
    valueString: Optional[str] = None


class FHIRBundleEntry(BaseModel):
    """FHIR Bundle entry"""
    fullUrl: Optional[str] = None
    resource: Dict[str, Any]
    search: Optional[Dict[str, str]] = None
    request: Optional[Dict[str, str]] = None
    response: Optional[Dict[str, str]] = None


class FHIRBundle(BaseModel):
    """FHIR Bundle resource schema"""
    resourceType: Literal["Bundle"] = "Bundle"
    id: Optional[str] = None
    meta: Optional[FHIRMeta] = None
    type: str  # transaction, batch, searchset, etc.
    total: Optional[int] = None
    link: Optional[List[Dict[str, str]]] = None
    entry: Optional[List[FHIRBundleEntry]] = None


class FHIRResourceCreate(BaseModel):
    """Schema for creating a FHIR resource in the database"""
    resource_type: str
    resource_id: str
    resource: Dict[str, Any]
    patient_id: Optional[str] = None
    population_id: Optional[str] = None


class FHIRResourceResponse(BaseModel):
    """Schema for FHIR resource database responses"""
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    resource_type: str
    resource_id: str
    resource: Dict[str, Any]
    patient_id: Optional[str]
    population_id: Optional[str]
    version_id: str
    created_at: datetime
    updated_at: datetime
    last_updated: datetime


class FHIRSearchParameters(BaseModel):
    """Common FHIR search parameters"""
    _count: int = Field(default=20, ge=1, le=100)
    _offset: int = Field(default=0, ge=0)
    _sort: Optional[str] = None
    _include: Optional[List[str]] = None
    _revinclude: Optional[List[str]] = None
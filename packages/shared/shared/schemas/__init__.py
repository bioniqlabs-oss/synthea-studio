"""Shared Pydantic schemas for API contracts"""

from .population import (
    PopulationStatus,
    PopulationConfig,
    PopulationCreate,
    PopulationUpdate,
    PopulationResponse,
    PopulationStatistics,
    GenerationJobCreate,
    GenerationJobResponse,
    ProgressUpdate,
)

from .fhir import (
    FHIRMeta,
    FHIRIdentifier,
    FHIRHumanName,
    FHIRReference,
    FHIRCodeableConcept,
    FHIRPatient,
    FHIRCondition,
    FHIRObservation,
    FHIRBundle,
    FHIRBundleEntry,
    FHIRResourceCreate,
    FHIRResourceResponse,
    FHIRSearchParameters,
)

__all__ = [
    # Population schemas
    "PopulationStatus",
    "PopulationConfig",
    "PopulationCreate",
    "PopulationUpdate",
    "PopulationResponse",
    "PopulationStatistics",
    "GenerationJobCreate",
    "GenerationJobResponse",
    "ProgressUpdate",
    # FHIR schemas
    "FHIRMeta",
    "FHIRIdentifier",
    "FHIRHumanName",
    "FHIRReference",
    "FHIRCodeableConcept",
    "FHIRPatient",
    "FHIRCondition",
    "FHIRObservation",
    "FHIRBundle",
    "FHIRBundleEntry",
    "FHIRResourceCreate",
    "FHIRResourceResponse",
    "FHIRSearchParameters",
]
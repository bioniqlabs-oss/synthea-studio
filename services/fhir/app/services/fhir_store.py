"""PostgreSQL-backed FHIR Store"""

import json
import logging
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime
import uuid

from sqlalchemy import select, and_, or_, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.dialects.postgresql import JSONB

from shared.models import FHIRResource, FHIRBundle
from shared.schemas import FHIRSearchParameters
from shared.utils import create_bundle_response

logger = logging.getLogger(__name__)


class FHIRStore:
    """PostgreSQL-backed FHIR resource store"""
    
    def __init__(self, session: AsyncSession):
        self.session = session
    
    async def create_resource(self, resource: Dict[str, Any], 
                            population_id: Optional[str] = None) -> Dict[str, Any]:
        """Create a new FHIR resource"""
        # Generate ID if not provided
        if "id" not in resource:
            resource["id"] = str(uuid.uuid4())
        
        # Add metadata
        if "meta" not in resource:
            resource["meta"] = {}
        resource["meta"]["versionId"] = "1"
        resource["meta"]["lastUpdated"] = datetime.utcnow().isoformat()
        
        # Create database record
        fhir_resource = FHIRResource.from_fhir(resource, population_id)
        self.session.add(fhir_resource)
        await self.session.commit()
        await self.session.refresh(fhir_resource)
        
        return fhir_resource.to_fhir()
    
    async def get_resource(self, resource_type: str, resource_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific resource by type and ID"""
        result = await self.session.execute(
            select(FHIRResource).where(
                and_(
                    FHIRResource.resource_type == resource_type,
                    FHIRResource.resource_id == resource_id
                )
            )
        )
        resource = result.scalar_one_or_none()
        
        if resource:
            return resource.to_fhir()
        return None
    
    async def update_resource(self, resource_type: str, resource_id: str, 
                            resource: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update an existing resource"""
        result = await self.session.execute(
            select(FHIRResource).where(
                and_(
                    FHIRResource.resource_type == resource_type,
                    FHIRResource.resource_id == resource_id
                )
            )
        )
        existing = result.scalar_one_or_none()
        
        if not existing:
            return None
        
        # Update version
        current_version = int(existing.version_id)
        resource["id"] = resource_id
        resource["meta"] = resource.get("meta", {})
        resource["meta"]["versionId"] = str(current_version + 1)
        resource["meta"]["lastUpdated"] = datetime.utcnow().isoformat()
        
        # Update database record
        existing.resource = resource
        existing.version_id = str(current_version + 1)
        existing.last_updated = datetime.utcnow()
        
        await self.session.commit()
        await self.session.refresh(existing)
        
        return existing.to_fhir()
    
    async def delete_resource(self, resource_type: str, resource_id: str) -> bool:
        """Delete a resource"""
        result = await self.session.execute(
            select(FHIRResource).where(
                and_(
                    FHIRResource.resource_type == resource_type,
                    FHIRResource.resource_id == resource_id
                )
            )
        )
        resource = result.scalar_one_or_none()
        
        if resource:
            await self.session.delete(resource)
            await self.session.commit()
            return True
        return False
    
    async def search_resources(self, resource_type: str, 
                              params: FHIRSearchParameters,
                              **search_params) -> Dict[str, Any]:
        """Search for resources with filters"""
        query = select(FHIRResource).where(FHIRResource.resource_type == resource_type)
        
        # Apply search filters based on resource type
        if resource_type == "Patient":
            query = await self._apply_patient_filters(query, search_params)
        elif resource_type == "Condition":
            query = await self._apply_condition_filters(query, search_params)
        elif resource_type == "Observation":
            query = await self._apply_observation_filters(query, search_params)
        else:
            query = await self._apply_generic_filters(query, search_params)
        
        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await self.session.execute(count_query)
        total = total_result.scalar() or 0
        
        # Apply pagination
        query = query.offset(params._offset).limit(params._count)
        
        # Apply sorting
        if params._sort:
            # TODO: Implement sorting based on _sort parameter
            pass
        else:
            query = query.order_by(FHIRResource.last_updated.desc())
        
        # Execute query
        result = await self.session.execute(query)
        resources = result.scalars().all()
        
        # Convert to FHIR format
        fhir_resources = [r.to_fhir() for r in resources]
        
        # Create bundle response
        return create_bundle_response(fhir_resources, "searchset", total)
    
    async def _apply_patient_filters(self, query, filters: Dict[str, Any]):
        """Apply Patient-specific search filters"""
        if "name" in filters:
            # Search in name fields using JSONB operators
            name_search = filters["name"].lower()
            query = query.where(
                or_(
                    FHIRResource.resource["name"].op("@>")(
                        [{"family": name_search}]
                    ),
                    FHIRResource.resource["name"].op("@>")(
                        [{"given": [name_search]}]
                    )
                )
            )
        
        if "gender" in filters:
            query = query.where(
                FHIRResource.resource["gender"].astext == filters["gender"]
            )
        
        if "birthdate" in filters:
            query = query.where(
                FHIRResource.resource["birthDate"].astext == filters["birthdate"]
            )
        
        if "identifier" in filters:
            # Search for identifier value
            query = query.where(
                FHIRResource.resource["identifier"].op("@>")(
                    [{"value": filters["identifier"]}]
                )
            )
        
        return query
    
    async def _apply_condition_filters(self, query, filters: Dict[str, Any]):
        """Apply Condition-specific search filters"""
        if "patient" in filters:
            patient_ref = filters["patient"]
            if not patient_ref.startswith("Patient/"):
                patient_ref = f"Patient/{patient_ref}"
            query = query.where(
                FHIRResource.patient_id == patient_ref.replace("Patient/", "")
            )
        
        if "code" in filters:
            # Search in code.coding array
            query = query.where(
                FHIRResource.resource["code"]["coding"].op("@>")(
                    [{"code": filters["code"]}]
                )
            )
        
        return query
    
    async def _apply_observation_filters(self, query, filters: Dict[str, Any]):
        """Apply Observation-specific search filters"""
        if "patient" in filters:
            patient_ref = filters["patient"]
            if not patient_ref.startswith("Patient/"):
                patient_ref = f"Patient/{patient_ref}"
            query = query.where(
                FHIRResource.patient_id == patient_ref.replace("Patient/", "")
            )
        
        if "code" in filters:
            query = query.where(
                FHIRResource.resource["code"]["coding"].op("@>")(
                    [{"code": filters["code"]}]
                )
            )
        
        if "date" in filters:
            query = query.where(
                FHIRResource.resource["effectiveDateTime"].astext.like(f"{filters['date']}%")
            )
        
        if "category" in filters:
            query = query.where(
                FHIRResource.resource["category"][0]["coding"].op("@>")(
                    [{"code": filters["category"]}]
                )
            )
        
        return query
    
    async def _apply_generic_filters(self, query, filters: Dict[str, Any]):
        """Apply generic filters for other resource types"""
        if "patient" in filters:
            patient_ref = filters["patient"]
            if not patient_ref.startswith("Patient/"):
                patient_ref = f"Patient/{patient_ref}"
            query = query.where(
                FHIRResource.patient_id == patient_ref.replace("Patient/", "")
            )
        
        return query
    
    async def process_bundle(self, bundle: Dict[str, Any], 
                           population_id: Optional[str] = None) -> Dict[str, Any]:
        """Process a FHIR Bundle transaction"""
        if bundle.get("type") not in ["transaction", "batch"]:
            raise ValueError(f"Unsupported bundle type: {bundle.get('type')}")
        
        # Store bundle for tracking
        fhir_bundle = FHIRBundle(
            bundle_type=bundle.get("type"),
            bundle=bundle,
            population_id=population_id
        )
        self.session.add(fhir_bundle)
        
        # Process entries
        response_bundle = {
            "resourceType": "Bundle",
            "type": "transaction-response",
            "entry": []
        }
        
        for entry in bundle.get("entry", []):
            resource = entry.get("resource")
            if not resource:
                continue
            
            try:
                # Create resource
                created = await self.create_resource(resource, population_id)
                
                # Add to response
                response_bundle["entry"].append({
                    "response": {
                        "status": "201",
                        "location": f"{resource['resourceType']}/{resource['id']}"
                    }
                })
            except Exception as e:
                logger.error(f"Failed to process bundle entry: {e}")
                response_bundle["entry"].append({
                    "response": {
                        "status": "422",
                        "outcome": {
                            "issue": [{
                                "severity": "error",
                                "code": "processing",
                                "details": {"text": str(e)}
                            }]
                        }
                    }
                })
        
        # Update bundle status
        fhir_bundle.status = "completed"
        fhir_bundle.processed_at = datetime.utcnow()
        fhir_bundle.resource_count = len([e for e in response_bundle["entry"] 
                                         if e["response"]["status"].startswith("20")])
        
        await self.session.commit()
        
        return response_bundle
    
    async def get_patient_everything(self, patient_id: str) -> Dict[str, Any]:
        """Get all resources related to a patient"""
        # Get patient
        patient = await self.get_resource("Patient", patient_id)
        if not patient:
            return None
        
        # Get all related resources
        result = await self.session.execute(
            select(FHIRResource).where(FHIRResource.patient_id == patient_id)
        )
        resources = result.scalars().all()
        
        # Convert to FHIR format
        fhir_resources = [patient] + [r.to_fhir() for r in resources if r.resource_id != patient_id]
        
        return create_bundle_response(fhir_resources, "searchset", len(fhir_resources))
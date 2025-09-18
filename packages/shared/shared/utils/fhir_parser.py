"""FHIR parsing and processing utilities"""

import json
import os
from pathlib import Path
from typing import List, Dict, Any, Optional, Generator
import glob


def load_bundles(output_path: str) -> List[Dict[str, Any]]:
    """Load FHIR bundles from Synthea output directory"""
    bundles = []
    fhir_path = Path(output_path) / "fhir"
    
    if not fhir_path.exists():
        return bundles
    
    # Find all JSON files in the FHIR directory
    bundle_files = glob.glob(str(fhir_path / "*.json"))
    
    for bundle_file in bundle_files:
        try:
            with open(bundle_file, 'r') as f:
                bundle_data = json.load(f)
                if bundle_data.get("resourceType") == "Bundle":
                    bundles.append(bundle_data)
        except (json.JSONDecodeError, IOError) as e:
            print(f"Error loading bundle from {bundle_file}: {e}")
            continue
    
    return bundles


def extract_resources(bundle: Dict[str, Any]) -> Generator[Dict[str, Any], None, None]:
    """Extract individual resources from a FHIR bundle"""
    if bundle.get("resourceType") != "Bundle":
        return
    
    for entry in bundle.get("entry", []):
        resource = entry.get("resource")
        if resource:
            yield resource


def extract_patient_id(resource: Dict[str, Any]) -> Optional[str]:
    """Extract patient ID from a FHIR resource"""
    resource_type = resource.get("resourceType")
    
    # If it's a Patient resource, return its ID
    if resource_type == "Patient":
        return resource.get("id")
    
    # For other resources, look for subject/patient reference
    subject = resource.get("subject") or resource.get("patient")
    if subject and isinstance(subject, dict):
        reference = subject.get("reference", "")
        if reference.startswith("Patient/"):
            return reference.replace("Patient/", "")
    
    return None


def count_resources_by_type(bundles: List[Dict[str, Any]]) -> Dict[str, int]:
    """Count resources by type in a list of bundles"""
    counts = {}
    
    for bundle in bundles:
        for resource in extract_resources(bundle):
            resource_type = resource.get("resourceType")
            if resource_type:
                counts[resource_type] = counts.get(resource_type, 0) + 1
    
    return counts


def validate_bundle(bundle: Dict[str, Any]) -> List[str]:
    """Basic validation of a FHIR bundle"""
    errors = []
    
    if bundle.get("resourceType") != "Bundle":
        errors.append("Not a valid Bundle resource")
    
    if "type" not in bundle:
        errors.append("Bundle type is required")
    
    entries = bundle.get("entry", [])
    if not entries:
        errors.append("Bundle has no entries")
    
    for i, entry in enumerate(entries):
        resource = entry.get("resource")
        if not resource:
            errors.append(f"Entry {i} has no resource")
        elif "resourceType" not in resource:
            errors.append(f"Entry {i} resource has no resourceType")
        elif "id" not in resource:
            errors.append(f"Entry {i} resource has no id")
    
    return errors


def create_bundle_response(resources: List[Dict[str, Any]], 
                          bundle_type: str = "searchset",
                          total: Optional[int] = None) -> Dict[str, Any]:
    """Create a FHIR Bundle response"""
    bundle = {
        "resourceType": "Bundle",
        "type": bundle_type,
        "total": total or len(resources),
        "entry": []
    }
    
    for resource in resources:
        bundle["entry"].append({
            "fullUrl": f"urn:uuid:{resource.get('id')}",
            "resource": resource,
            "search": {"mode": "match"}
        })
    
    return bundle
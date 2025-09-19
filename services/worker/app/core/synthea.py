"""Synthea wrapper for generating synthetic patients"""

import os
import subprocess
import json
import logging
from pathlib import Path
from typing import Dict, Any, Optional, Callable, List
import shutil

from app.core.config import settings

logger = logging.getLogger(__name__)


class SyntheaWrapper:
    """Wrapper for Synthea Java application"""
    
    def __init__(self):
        self.jar_path = settings.SYNTHEA_JAR_PATH
        self.output_base = Path(settings.STORAGE_PATH)
        
        # Verify JAR exists
        if not os.path.exists(self.jar_path):
            raise FileNotFoundError(f"Synthea JAR not found at {self.jar_path}")
        
        # Create output directory
        self.output_base.mkdir(parents=True, exist_ok=True)
    
    def generate_population(
        self,
        population_id: str,
        size: int,
        config: Dict[str, Any],
        progress_callback: Optional[Callable[[int, int, str], None]] = None
    ) -> Dict[str, Any]:
        """Generate a synthetic population using Synthea
        
        Args:
            population_id: Unique identifier for the population
            size: Number of patients to generate
            config: Generation configuration
            progress_callback: Callback for progress updates (current, total, message)
        
        Returns:
            Dictionary with generation results
        """
        # Create output directory for this population
        output_path = self.output_base / population_id
        output_path.mkdir(parents=True, exist_ok=True)
        
        # Build Synthea command
        cmd = self._build_command(size, config, output_path)
        
        logger.info(f"Starting Synthea generation for {population_id}")
        logger.debug(f"Command: {' '.join(cmd)}")
        
        # Run Synthea with progress tracking
        try:
            process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                bufsize=1
            )
            
            # Track progress
            generated_count = 0
            for line in process.stdout:
                if progress_callback and "generated" in line.lower():
                    generated_count += 1
                    progress_callback(generated_count, size, f"Generating {generated_count}/{size} patients...")
            
            # Wait for completion
            process.wait()
            
            if process.returncode != 0:
                stderr = process.stderr.read()
                raise RuntimeError(f"Synthea generation failed: {stderr}")
            
            # Get output files
            files = self._collect_output_files(output_path)
            
            # Count generated patients
            patient_count = self._count_patients(output_path / "fhir")
            
            logger.info(f"Successfully generated {patient_count} patients for {population_id}")
            
            return {
                "success": True,
                "population_id": population_id,
                "patient_count": patient_count,
                "output_path": str(output_path),
                "files": files
            }
            
        except Exception as e:
            logger.error(f"Failed to generate population {population_id}: {e}")
            # Cleanup on failure
            if output_path.exists():
                shutil.rmtree(output_path)
            raise
    
    def _build_command(self, size: int, config: Dict[str, Any], output_path: Path) -> List[str]:
        """Build Synthea command with parameters"""
        cmd = [
            "java", "-jar", self.jar_path,
            "-p", str(size),
            "--exporter.baseDirectory", str(output_path)
        ]
        
        # Add state if specified
        state = config.get("state", settings.SYNTHEA_DEFAULT_STATE)
        if state:
            cmd.extend(["--", state])
        
        # Add city if specified
        city = config.get("city")
        if city:
            cmd.extend(["--", city])
        
        # Configure exporters
        if config.get("export_fhir", True):
            cmd.extend(["--exporter.fhir.export", "true"])
        else:
            cmd.extend(["--exporter.fhir.export", "false"])
        
        if config.get("export_csv", False):
            cmd.extend(["--exporter.csv.export", "true"])
        
        if config.get("export_ccda", False):
            cmd.extend(["--exporter.ccda.export", "true"])
        
        # Add age range if specified
        age_range = config.get("age_range")
        if age_range and len(age_range) == 2:
            cmd.extend(["--generate.min_age", str(age_range[0])])
            cmd.extend(["--generate.max_age", str(age_range[1])])
        
        # Add gender distribution if specified
        gender_dist = config.get("gender_distribution")
        if gender_dist:
            # Synthea expects gender ratio as percentage of females
            female_pct = int(gender_dist.get("F", 0.5) * 100)
            cmd.extend(["--generate.gender_ratio", str(female_pct)])
        
        # Add disease modules if specified
        modules = config.get("modules", [])
        if modules:
            # Enable only specified modules
            cmd.extend(["--generate.only_dead_patients", "false"])
            for module in modules:
                cmd.extend([f"--generate.{module}", "true"])
        
        return cmd
    
    def _collect_output_files(self, output_path: Path) -> Dict[str, List[str]]:
        """Collect paths of generated files"""
        files = {
            "fhir": [],
            "csv": [],
            "ccda": [],
            "metadata": []
        }
        
        # Collect FHIR files
        fhir_path = output_path / "fhir"
        if fhir_path.exists():
            files["fhir"] = [str(f) for f in fhir_path.glob("*.json")]
        
        # Collect CSV files
        csv_path = output_path / "csv"
        if csv_path.exists():
            files["csv"] = [str(f) for f in csv_path.glob("*.csv")]
        
        # Collect CCDA files
        ccda_path = output_path / "ccda"
        if ccda_path.exists():
            files["ccda"] = [str(f) for f in ccda_path.glob("*.xml")]
        
        # Collect metadata
        metadata_file = output_path / "metadata.json"
        if metadata_file.exists():
            files["metadata"] = [str(metadata_file)]
        
        return files
    
    def _count_patients(self, fhir_path: Path) -> int:
        """Count number of patients in FHIR output"""
        if not fhir_path.exists():
            return 0
        
        patient_count = 0
        for json_file in fhir_path.glob("*.json"):
            # Skip practitioner and hospital information files
            if "practitioner" in json_file.name.lower() or "hospital" in json_file.name.lower():
                continue
            
            try:
                with open(json_file, 'r') as f:
                    data = json.load(f)
                    if data.get("resourceType") == "Bundle":
                        # Count Patient resources in bundle
                        for entry in data.get("entry", []):
                            resource = entry.get("resource", {})
                            if resource.get("resourceType") == "Patient":
                                patient_count += 1
            except (json.JSONDecodeError, IOError):
                continue
        
        return patient_count
    
    def cleanup_output(self, population_id: str):
        """Clean up output files for a population"""
        output_path = self.output_base / population_id
        if output_path.exists():
            shutil.rmtree(output_path)
            logger.info(f"Cleaned up output for population {population_id}")
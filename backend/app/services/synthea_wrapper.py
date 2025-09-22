"""
Synthea Java wrapper for generating synthetic patients
"""
import os
import json
import subprocess
import tempfile
from pathlib import Path
from typing import Dict, List, Optional, Any
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)


class SyntheaWrapper:
    """Wrapper for Synthea synthetic patient generator"""
    
    def __init__(self):
        self.synthea_jar = Path(settings.SYNTHEA_JAR_PATH)
        self.temp_output_path = Path(settings.SYNTHEA_OUTPUT_PATH)  # Temp generation path
        self.storage_path = Path(settings.STORAGE_PATH)  # Permanent storage path

        # Ensure directories exist
        self.temp_output_path.mkdir(parents=True, exist_ok=True)
        self.storage_path.mkdir(parents=True, exist_ok=True)
    
    def generate_population(
        self,
        population_id: str,
        size: int,
        config: Dict[str, Any],
        progress_callback: Optional[callable] = None
    ) -> Dict[str, Any]:
        """
        Generate a synthetic population using Synthea
        
        Args:
            population_id: Unique identifier for this population
            size: Number of patients to generate
            config: Configuration parameters
            progress_callback: Optional callback for progress updates
            
        Returns:
            Dictionary with generation results and paths to output files
        """
        # Generate to temp directory first
        temp_output = self.temp_output_path / population_id
        temp_output.mkdir(parents=True, exist_ok=True)

        # Final storage location
        final_output = self.storage_path / population_id
        
        # Build Synthea command
        cmd = self._build_command(size, config, temp_output)

        logger.info(f"Starting Synthea generation for {population_id}")
        logger.info(f"Command: {' '.join(cmd)}")
        logger.info(f"Config received: {config}")
        
        try:
            # Run Synthea with proper output handling
            process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )

            # Wait for the process to complete with timeout
            import time

            # Send initial progress
            if progress_callback:
                progress_callback(10, f"Starting Synthea generation...")

            try:
                stdout, stderr = process.communicate(timeout=300)  # 5 minute timeout
                return_code = process.returncode

                # Send completion progress
                if progress_callback and return_code == 0:
                    progress_callback(90, f"Generation complete, processing files...")

            except subprocess.TimeoutExpired:
                process.kill()
                stdout, stderr = process.communicate()
                raise RuntimeError(f"Synthea generation timed out after 5 minutes")

            if return_code != 0:
                logger.error(f"Synthea stderr: {stderr}")
                raise RuntimeError(f"Synthea failed with code {return_code}: {stderr}")

            logger.info(f"Synthea completed successfully. Output: {stdout[:500]}")

            # Move files from temp to permanent storage
            import shutil
            if final_output.exists():
                shutil.rmtree(final_output)
            shutil.move(str(temp_output), str(final_output))

            # Collect generated files from permanent location
            result = self._collect_output_files(final_output)

            # Count actual patient files generated (exclude hospital and practitioner info)
            actual_patient_count = len([
                f for f in result.get("fhir", [])
                if not any(x in f.lower() for x in ["hospital", "practitioner"])
            ])

            logger.info(f"Successfully generated {actual_patient_count} patients for {population_id} (requested: {size})")

            return {
                "population_id": population_id,
                "patient_count": actual_patient_count,
                "output_path": str(final_output),
                "files": result
            }
            
        except Exception as e:
            logger.error(f"Synthea generation failed: {str(e)}")
            raise
    
    def _create_properties_file(self, config: Dict[str, Any], output_path: Path) -> Optional[Path]:
        """Create a properties file for advanced Synthea configuration"""
        props_needed = False
        props_content = []

        # Check if we need a properties file
        if config.get("only_alive", False):
            props_content.append("generate.only_alive_patients = true")
            props_needed = True

        # Disease prevalence settings
        prevalence = config.get("prevalence", {})
        if prevalence.get("diabetes", 0) > 0:
            props_content.append(f"generate.diabetes.prevalence = {prevalence['diabetes']}")
            props_needed = True
        if prevalence.get("hypertension", 0) > 0:
            props_content.append(f"generate.hypertension.prevalence = {prevalence['hypertension']}")
            props_needed = True
        if prevalence.get("cardiovascular", 0) > 0:
            props_content.append(f"generate.cardiovascular_disease.prevalence = {prevalence['cardiovascular']}")
            props_needed = True
        if prevalence.get("obesity", 0) > 0:
            props_content.append(f"generate.obesity.prevalence = {prevalence['obesity']}")
            props_needed = True

        # FHIR Extensions
        if config.get("enable_social_determinants", False):
            props_content.append("exporter.fhir.extensions.social_determinants = true")
            props_needed = True
        if config.get("enable_us_core", False):
            props_content.append("exporter.fhir.extensions.us_core = true")
            props_needed = True
        if config.get("expanded_observations", False):
            props_content.append("exporter.fhir.observation.value_sets = expanded")
            props_needed = True

        if not props_needed:
            return None

        # Write properties file
        props_file = output_path / "synthea.properties"
        with open(props_file, "w") as f:
            f.write("\n".join(props_content))
            f.write("\n")

        logger.info(f"Created properties file with content:\n{chr(10).join(props_content)}")
        return props_file

    def _build_command(
        self,
        size: int,
        config: Dict[str, Any],
        output_path: Path
    ) -> List[str]:
        """Build Synthea command line arguments"""
        # Create properties file if needed
        props_file = self._create_properties_file(config, output_path)

        cmd = [
            "java",
            "-jar",
            str(self.synthea_jar),
            "-p", str(size),  # Population size
            f"--exporter.baseDirectory={str(output_path)}"
        ]

        # Add properties file if created
        if props_file:
            cmd.extend(["-c", str(props_file)])
        
        # Add optional parameters
        if config.get("seed"):
            cmd.extend(["-s", str(config["seed"])])

        if config.get("clinician_seed"):
            cmd.extend(["-cs", str(config["clinician_seed"])])

        if config.get("reference_date"):
            # Format: YYYYMMDD
            date_str = config["reference_date"].replace("-", "")
            cmd.extend(["-r", date_str])

        if config.get("end_date"):
            # Format: YYYYMMDD
            date_str = config["end_date"].replace("-", "")
            cmd.extend(["-e", date_str])

        if config.get("overflow_population", 0) > 0:
            cmd.extend(["-o", str(config["overflow_population"])])

        if "age_range" in config:
            min_age, max_age = config["age_range"]
            cmd.extend(["-a", f"{min_age}-{max_age}"])

        if "gender" in config:
            cmd.extend(["-g", config["gender"]])
        
        # Export formats
        if config.get("export_fhir", True):
            cmd.append("--exporter.fhir.export=true")
        else:
            cmd.append("--exporter.fhir.export=false")
        
        if config.get("export_csv", False):
            cmd.append("--exporter.csv.export=true")
        
        if config.get("export_ccda", False):
            cmd.append("--exporter.ccda.export=true")
        
        # Disease modules - Synthea uses modules differently
        # We'll enable them via configuration properties
        if "modules" in config and config["modules"]:
            # For specific disease modules, we can use generate.only_dead_patients
            # or other module-specific settings
            pass
        
        # State and city are positional arguments at the end
        state = config.get("state", settings.SYNTHEA_DEFAULT_STATE)
        cmd.append(state)

        # Only add city if it's not empty
        city = config.get("city", "")
        if city and city.strip():
            cmd.append(city)
        
        return cmd
    
    def _collect_output_files(self, output_path: Path) -> Dict[str, List[str]]:
        """Collect and categorize generated output files"""
        result = {
            "fhir": [],
            "csv": [],
            "ccda": [],
            "metadata": []
        }
        
        # Collect FHIR bundles
        fhir_path = output_path / "fhir"
        if fhir_path.exists():
            result["fhir"] = [
                str(f) for f in fhir_path.glob("*.json")
            ]
        
        # Collect CSV files
        csv_path = output_path / "csv"
        if csv_path.exists():
            result["csv"] = [
                str(f) for f in csv_path.glob("*.csv")
            ]
        
        # Collect CCDA files
        ccda_path = output_path / "ccda"
        if ccda_path.exists():
            result["ccda"] = [
                str(f) for f in ccda_path.glob("*.xml")
            ]
        
        # Generate metadata
        metadata_file = output_path / "metadata.json"
        metadata = {
            "fhir_count": len(result["fhir"]),
            "csv_count": len(result["csv"]),
            "ccda_count": len(result["ccda"]),
            "total_files": sum(len(v) for v in result.values())
        }
        
        with open(metadata_file, "w") as f:
            json.dump(metadata, f, indent=2)
        
        result["metadata"].append(str(metadata_file))
        
        return result
    
    def validate_synthea_installation(self) -> bool:
        """Check if Synthea is properly installed and accessible"""
        if not self.synthea_jar.exists():
            logger.error(f"Synthea JAR not found at {self.synthea_jar}")
            return False
        
        try:
            # Try to run Synthea with help flag
            result = subprocess.run(
                ["java", "-jar", str(self.synthea_jar), "--help"],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            return result.returncode == 0
            
        except Exception as e:
            logger.error(f"Failed to validate Synthea: {str(e)}")
            return False
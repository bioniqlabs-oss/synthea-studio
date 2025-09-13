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
        self.output_path = Path(settings.SYNTHEA_OUTPUT_PATH)
        
        # Ensure output directory exists
        self.output_path.mkdir(parents=True, exist_ok=True)
    
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
        # Create unique output directory for this population
        population_output = self.output_path / population_id
        population_output.mkdir(parents=True, exist_ok=True)
        
        # Build Synthea command
        cmd = self._build_command(size, config, population_output)
        
        logger.info(f"Starting Synthea generation for {population_id}")
        logger.debug(f"Command: {' '.join(cmd)}")
        
        try:
            # Run Synthea with progress monitoring
            process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                bufsize=1
            )
            
            # Monitor output for progress
            generated_count = 0
            for line in process.stdout:
                # Parse Synthea output for progress
                if "generated" in line.lower():
                    generated_count += 1
                    if progress_callback:
                        progress = int((generated_count / size) * 100)
                        progress_callback(progress, f"Generated {generated_count}/{size} patients")
                
                logger.debug(f"Synthea: {line.strip()}")
            
            # Wait for completion
            return_code = process.wait()
            
            if return_code != 0:
                stderr = process.stderr.read()
                raise RuntimeError(f"Synthea failed with code {return_code}: {stderr}")
            
            # Collect generated files
            result = self._collect_output_files(population_output)
            
            logger.info(f"Successfully generated {size} patients for {population_id}")
            
            return {
                "population_id": population_id,
                "patient_count": size,
                "output_path": str(population_output),
                "files": result
            }
            
        except Exception as e:
            logger.error(f"Synthea generation failed: {str(e)}")
            raise
    
    def _build_command(
        self,
        size: int,
        config: Dict[str, Any],
        output_path: Path
    ) -> List[str]:
        """Build Synthea command line arguments"""
        cmd = [
            "java",
            "-jar",
            str(self.synthea_jar),
            "-p", str(size),  # Population size
            "--exporter.baseDirectory", str(output_path)
        ]
        
        # Add configuration options
        if "state" in config:
            cmd.extend(["-s", config["state"]])
        else:
            cmd.extend(["-s", settings.SYNTHEA_DEFAULT_STATE])
        
        if "city" in config:
            cmd.extend(["-cs", config["city"]])
        
        if "modules" in config:
            for module in config["modules"]:
                cmd.extend(["-m", module])
        
        if "age_range" in config:
            min_age, max_age = config["age_range"]
            cmd.extend(["-a", f"{min_age}-{max_age}"])
        
        if "gender" in config:
            cmd.extend(["-g", config["gender"]])
        
        if "seed" in config:
            cmd.extend(["-seed", str(config["seed"])])
        
        # Export formats
        if config.get("export_fhir", True):
            cmd.append("--exporter.fhir.export=true")
        else:
            cmd.append("--exporter.fhir.export=false")
        
        if config.get("export_csv", False):
            cmd.append("--exporter.csv.export=true")
        
        if config.get("export_ccda", False):
            cmd.append("--exporter.ccda.export=true")
        
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
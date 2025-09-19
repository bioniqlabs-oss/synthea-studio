"""Tests for FHIR import tasks"""

import pytest
import json
from pathlib import Path
from unittest.mock import MagicMock, patch

from app.tasks.import_fhir import (
    import_population_to_fhir,
    reimport_population,
    get_import_stats
)
from shared.models import Population, FHIRResource, FHIRBundle


class TestImportTasks:
    """Test FHIR import tasks"""

    @patch('app.tasks.import_fhir.RedisPublisher')
    @patch('app.tasks.import_fhir.load_bundles')
    def test_import_population_success(self, mock_load_bundles, mock_redis_cls,
                                      db_manager, test_database, sample_fhir_bundle):
        """Test successful FHIR import"""
        # Setup
        mock_redis = MagicMock()
        mock_redis_cls.return_value = mock_redis
        mock_load_bundles.return_value = [sample_fhir_bundle]

        # Create population
        population = Population(
            id="test-pop-123",
            name="Test Population",
            status="COMPLETED",
            size=1
        )
        test_database.add(population)
        test_database.commit()

        # Create mock task
        task = MagicMock()
        task.db_manager = db_manager
        task.update_state = MagicMock()

        # Bind task
        import_population_to_fhir.bind(task)

        # Execute task
        result = import_population_to_fhir(
            task,
            population_id="test-pop-123",
            output_path="/tmp/test-output"
        )

        # Verify results
        assert result["success"] is True
        assert result["population_id"] == "test-pop-123"
        assert result["imported_resources"] == 2  # Patient + Condition
        assert result["failed_resources"] == 0

        # Verify resources were imported
        resources = test_database.query(FHIRResource).filter_by(
            population_id="test-pop-123"
        ).all()
        assert len(resources) == 2

        # Verify resource types
        resource_types = [r.resource_type for r in resources]
        assert "Patient" in resource_types
        assert "Condition" in resource_types

        # Verify progress was published
        assert mock_redis.publish_progress.called
        mock_redis.publish_complete.assert_called_once()

    @patch('app.tasks.import_fhir.load_bundles')
    def test_import_population_no_bundles(self, mock_load_bundles, db_manager, test_database):
        """Test import with no FHIR bundles found"""
        # Setup
        mock_load_bundles.return_value = []

        # Create mock task
        task = MagicMock()
        task.db_manager = db_manager
        task.update_state = MagicMock()

        # Bind task
        import_population_to_fhir.bind(task)

        # Execute task
        result = import_population_to_fhir(
            task,
            population_id="test-pop-456",
            output_path="/tmp/empty-output"
        )

        # Verify results
        assert result["success"] is False
        assert result["message"] == "No FHIR bundles found"

    @patch('app.tasks.import_fhir.import_population_to_fhir')
    def test_reimport_population(self, mock_import_task, db_manager, test_database):
        """Test re-importing existing population"""
        # Create population with existing resources
        population = Population(
            id="test-pop-789",
            name="Test Population",
            status="COMPLETED",
            storage_path="/tmp/test-output",
            size=1
        )
        test_database.add(population)

        # Add existing resources
        resource1 = FHIRResource(
            id="old-resource-1",
            population_id="test-pop-789",
            resource_type="Patient",
            resource_id="patient-old",
            resource={"resourceType": "Patient", "id": "patient-old"}
        )
        resource2 = FHIRResource(
            id="old-resource-2",
            population_id="test-pop-789",
            resource_type="Condition",
            resource_id="condition-old",
            resource={"resourceType": "Condition", "id": "condition-old"}
        )
        test_database.add_all([resource1, resource2])
        test_database.commit()

        # Mock the import task
        mock_import_task.apply.return_value.get.return_value = {
            "success": True,
            "imported_resources": 3
        }

        # Create mock task
        task = MagicMock()
        task.db_manager = db_manager

        # Bind task
        reimport_population.bind(task)

        # Execute reimport
        result = reimport_population(task, population_id="test-pop-789")

        # Verify old resources were deleted
        old_resources = test_database.query(FHIRResource).filter_by(
            population_id="test-pop-789"
        ).all()
        assert len(old_resources) == 0  # All deleted before reimport

        # Verify import was called
        mock_import_task.apply.assert_called_once()

    def test_get_import_stats(self, db_manager, test_database):
        """Test getting import statistics"""
        # Create population with resources
        population = Population(
            id="test-pop-stats",
            name="Test Population",
            status="COMPLETED",
            size=3
        )
        test_database.add(population)

        # Add various resource types
        resources = [
            FHIRResource(
                population_id="test-pop-stats",
                resource_type="Patient",
                resource_id="patient-1",
                resource={"resourceType": "Patient"}
            ),
            FHIRResource(
                population_id="test-pop-stats",
                resource_type="Patient",
                resource_id="patient-2",
                resource={"resourceType": "Patient"}
            ),
            FHIRResource(
                population_id="test-pop-stats",
                resource_type="Condition",
                resource_id="condition-1",
                resource={"resourceType": "Condition"}
            ),
            FHIRResource(
                population_id="test-pop-stats",
                resource_type="Observation",
                resource_id="obs-1",
                resource={"resourceType": "Observation"}
            ),
        ]
        test_database.add_all(resources)
        test_database.commit()

        # Get stats
        stats = get_import_stats(population_id="test-pop-stats")

        # Verify statistics
        assert stats["population_id"] == "test-pop-stats"
        assert stats["statistics"]["Patient"] == 2
        assert stats["statistics"]["Condition"] == 1
        assert stats["statistics"]["Observation"] == 1
        assert stats["statistics"]["Procedure"] == 0
        assert stats["statistics"]["total"] == 4
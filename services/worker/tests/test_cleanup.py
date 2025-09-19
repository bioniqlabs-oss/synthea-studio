"""Tests for cleanup tasks"""

import pytest
from datetime import datetime, timedelta
from pathlib import Path
import tempfile

from app.tasks.cleanup import (
    cleanup_old_populations,
    cleanup_failed_populations,
    cleanup_orphaned_resources
)
from shared.models import Population, PopulationStatus, FHIRResource


class TestCleanupTasks:
    """Test cleanup tasks"""

    def test_cleanup_old_populations(self, db_manager, test_database):
        """Test cleanup of old completed populations"""
        # Create populations with different ages
        old_date = datetime.utcnow() - timedelta(days=40)
        recent_date = datetime.utcnow() - timedelta(days=5)

        # Old completed population (should be removed)
        old_pop = Population(
            id="old-pop-1",
            name="Old Population",
            status=PopulationStatus.COMPLETED,
            created_at=old_date,
            size=10
        )

        # Recent completed population (should be kept)
        recent_pop = Population(
            id="recent-pop-1",
            name="Recent Population",
            status=PopulationStatus.COMPLETED,
            created_at=recent_date,
            size=10
        )

        # Old pending population (should be kept - not completed)
        old_pending = Population(
            id="old-pending-1",
            name="Old Pending",
            status=PopulationStatus.PENDING,
            created_at=old_date,
            size=10
        )

        test_database.add_all([old_pop, recent_pop, old_pending])

        # Add resources for old population
        for i in range(5):
            resource = FHIRResource(
                population_id="old-pop-1",
                resource_type="Patient",
                resource_id=f"patient-{i}",
                resource={"resourceType": "Patient"}
            )
            test_database.add(resource)

        test_database.commit()

        # Execute cleanup
        result = cleanup_old_populations(days_old=30)

        # Verify results
        assert result["removed_populations"] == 1
        assert result["removed_resources"] == 5

        # Verify old population was removed
        remaining_pops = test_database.query(Population).all()
        pop_ids = [p.id for p in remaining_pops]
        assert "old-pop-1" not in pop_ids
        assert "recent-pop-1" in pop_ids
        assert "old-pending-1" in pop_ids

        # Verify resources were removed
        remaining_resources = test_database.query(FHIRResource).filter_by(
            population_id="old-pop-1"
        ).count()
        assert remaining_resources == 0

    def test_cleanup_failed_populations(self, db_manager, test_database):
        """Test cleanup of failed populations"""
        # Create failed populations with different ages
        old_date = datetime.utcnow() - timedelta(days=10)
        recent_date = datetime.utcnow() - timedelta(days=3)

        # Old failed population (should be removed)
        old_failed = Population(
            id="failed-old-1",
            name="Old Failed",
            status=PopulationStatus.FAILED,
            created_at=old_date,
            size=10
        )

        # Recent failed population (should be kept)
        recent_failed = Population(
            id="failed-recent-1",
            name="Recent Failed",
            status=PopulationStatus.FAILED,
            created_at=recent_date,
            size=10
        )

        test_database.add_all([old_failed, recent_failed])

        # Add partial resources for old failed population
        resource = FHIRResource(
            population_id="failed-old-1",
            resource_type="Patient",
            resource_id="patient-partial",
            resource={"resourceType": "Patient"}
        )
        test_database.add(resource)
        test_database.commit()

        # Execute cleanup
        result = cleanup_failed_populations()

        # Verify results
        assert result["removed_failed"] == 1

        # Verify old failed population was removed
        remaining_pops = test_database.query(Population).all()
        pop_ids = [p.id for p in remaining_pops]
        assert "failed-old-1" not in pop_ids
        assert "failed-recent-1" in pop_ids

        # Verify partial resources were removed
        remaining_resources = test_database.query(FHIRResource).filter_by(
            population_id="failed-old-1"
        ).count()
        assert remaining_resources == 0

    def test_cleanup_orphaned_resources(self, db_manager, test_database):
        """Test cleanup of orphaned resources"""
        # Create a population
        population = Population(
            id="existing-pop",
            name="Existing Population",
            status=PopulationStatus.COMPLETED,
            size=10
        )
        test_database.add(population)

        # Add resources - some with valid population, some orphaned
        valid_resource = FHIRResource(
            id="valid-1",
            population_id="existing-pop",
            resource_type="Patient",
            resource_id="patient-valid",
            resource={"resourceType": "Patient"}
        )

        orphaned_resource1 = FHIRResource(
            id="orphan-1",
            population_id="non-existent-pop",
            resource_type="Patient",
            resource_id="patient-orphan-1",
            resource={"resourceType": "Patient"}
        )

        orphaned_resource2 = FHIRResource(
            id="orphan-2",
            population_id="deleted-pop",
            resource_type="Condition",
            resource_id="condition-orphan",
            resource={"resourceType": "Condition"}
        )

        test_database.add_all([valid_resource, orphaned_resource1, orphaned_resource2])
        test_database.commit()

        # Execute cleanup
        result = cleanup_orphaned_resources()

        # Verify results
        assert result["removed_orphaned"] == 2

        # Verify orphaned resources were removed
        remaining_resources = test_database.query(FHIRResource).all()
        resource_ids = [r.id for r in remaining_resources]
        assert "valid-1" in resource_ids
        assert "orphan-1" not in resource_ids
        assert "orphan-2" not in resource_ids

    def test_cleanup_with_storage_path(self, db_manager, test_database):
        """Test cleanup removes storage directories"""
        with tempfile.TemporaryDirectory() as tmpdir:
            # Create population with storage
            storage_path = Path(tmpdir) / "test-pop"
            storage_path.mkdir(parents=True, exist_ok=True)

            # Create some test files
            (storage_path / "test.json").write_text('{"test": "data"}')

            old_date = datetime.utcnow() - timedelta(days=40)
            population = Population(
                id="pop-with-storage",
                name="Population with Storage",
                status=PopulationStatus.COMPLETED,
                created_at=old_date,
                storage_path=str(storage_path),
                size=10
            )
            test_database.add(population)
            test_database.commit()

            # Verify storage exists
            assert storage_path.exists()

            # Execute cleanup
            result = cleanup_old_populations(days_old=30)

            # Verify population was removed
            assert result["removed_populations"] == 1

            # Verify storage was removed
            assert not storage_path.exists()
"""Tests for generation tasks"""

import pytest
from unittest.mock import MagicMock, patch, call
from datetime import datetime

from app.tasks.generation import generate_population
from shared.models import Population, PopulationStatus, GenerationJob


class TestGenerationTask:
    """Test population generation task"""

    @patch('app.tasks.generation.import_population_to_fhir')
    @patch('app.tasks.generation.RedisPublisher')
    def test_generate_population_success(self, mock_redis_cls, mock_import_task,
                                        db_manager, mock_synthea_wrapper, test_database):
        """Test successful population generation"""
        # Setup
        mock_redis = MagicMock()
        mock_redis_cls.return_value = mock_redis

        # Create test population
        population = Population(
            id="test-pop-123",
            name="Test Population",
            status=PopulationStatus.PENDING,
            size=10
        )
        test_database.add(population)
        test_database.commit()

        # Create mock task
        task = MagicMock()
        task.request.id = "celery-task-123"
        task.db_manager = db_manager
        task.synthea_wrapper = mock_synthea_wrapper

        # Bind task
        generate_population.bind(task)

        # Execute task
        config = {"state": "MA", "export_fhir": True}
        result = generate_population(
            task,
            population_id="test-pop-123",
            size=10,
            config=config
        )

        # Verify results
        assert result["success"] is True
        assert result["population_id"] == "test-pop-123"
        assert result["patient_count"] == 10

        # Verify population was updated
        updated_pop = test_database.query(Population).filter_by(id="test-pop-123").first()
        assert updated_pop.status == PopulationStatus.COMPLETED
        assert updated_pop.patient_count == 10

        # Verify Redis progress was published
        assert mock_redis.publish_progress.called
        assert mock_redis.publish_complete.called

        # Verify import task was triggered
        mock_import_task.delay.assert_called_once_with(
            "test-pop-123",
            "/tmp/test-output"
        )

    @patch('app.tasks.generation.RedisPublisher')
    def test_generate_population_failure(self, mock_redis_cls, db_manager,
                                        mock_synthea_wrapper, test_database):
        """Test population generation failure handling"""
        # Setup
        mock_redis = MagicMock()
        mock_redis_cls.return_value = mock_redis

        # Create test population
        population = Population(
            id="test-pop-456",
            name="Test Population 2",
            status=PopulationStatus.PENDING,
            size=10
        )
        test_database.add(population)
        test_database.commit()

        # Make Synthea fail
        mock_synthea_wrapper.generate_population.side_effect = Exception("Synthea failed")

        # Create mock task
        task = MagicMock()
        task.request.id = "celery-task-456"
        task.db_manager = db_manager
        task.synthea_wrapper = mock_synthea_wrapper

        # Bind task
        generate_population.bind(task)

        # Execute task and expect failure
        with pytest.raises(Exception) as exc_info:
            generate_population(
                task,
                population_id="test-pop-456",
                size=10,
                config={}
            )

        assert "Synthea failed" in str(exc_info.value)

        # Verify population status was updated to FAILED
        updated_pop = test_database.query(Population).filter_by(id="test-pop-456").first()
        assert updated_pop.status == PopulationStatus.FAILED

        # Verify error was published
        mock_redis.publish_error.assert_called_once_with(
            "test-pop-456",
            "Synthea failed"
        )

    def test_generate_population_missing_population(self, db_manager, test_database):
        """Test generation with missing population record"""
        # Create mock task
        task = MagicMock()
        task.request.id = "celery-task-789"
        task.db_manager = db_manager

        # Bind task
        generate_population.bind(task)

        # Execute task with non-existent population
        with pytest.raises(ValueError) as exc_info:
            generate_population(
                task,
                population_id="non-existent",
                size=10,
                config={}
            )

        assert "Population non-existent not found" in str(exc_info.value)
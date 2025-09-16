import React from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { deletePopulation } from '../services/api';
import { useSyntheaConfig } from '../contexts/SyntheaContext';
import type { Population } from '../services/api';

interface PopulationCardProps {
  population: Population;
  onDelete?: () => void;
}

export default function PopulationCard({ population, onDelete }: PopulationCardProps) {
  const config = useSyntheaConfig();

  const deleteMutation = useMutation({
    mutationFn: () => deletePopulation(config.apiUrl, population.id),
    onSuccess: () => {
      if (onDelete) onDelete();
    },
  });

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete "${population.name}"?`)) {
      deleteMutation.mutate();
    }
  };

  const statusColors = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    GENERATING: 'bg-blue-100 text-blue-800',
    COMPLETED: 'bg-green-100 text-green-800',
    FAILED: 'bg-red-100 text-red-800',
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="bg-white shadow rounded-lg p-6 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div>
          <Link
            to={`/population/${population.id}`}
            className="text-lg font-medium text-gray-900 hover:text-blue-600"
          >
            {population.name}
          </Link>
          <p className="text-sm text-gray-500 mt-1">
            {population.description || 'No description'}
          </p>
        </div>
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            statusColors[population.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'
          }`}
        >
          {population.status}
        </span>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">Patients:</span>
          <span className="font-medium">{population.patient_count.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Created:</span>
          <span className="font-medium">{formatDate(population.created_at)}</span>
        </div>
        {population.completed_at && (
          <div className="flex justify-between">
            <span className="text-gray-500">Completed:</span>
            <span className="font-medium">{formatDate(population.completed_at)}</span>
          </div>
        )}
      </div>

      <div className="mt-4 flex gap-2">
        <Link
          to={`/population/${population.id}`}
          className="flex-1 text-center px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-500"
        >
          View Details
        </Link>
        {config.features.allowDelete && (
          <button
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="flex-1 text-center px-3 py-1.5 text-sm font-medium text-red-600 hover:text-red-500 disabled:opacity-50"
          >
            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
          </button>
        )}
      </div>
    </div>
  );
}
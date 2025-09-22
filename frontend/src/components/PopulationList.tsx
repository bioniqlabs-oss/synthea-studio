/**
 * Population List Component
 */

import React from 'react';

interface Population {
  id: string;
  name: string;
  size: number;
  status: string;
  patient_count?: number;
  created_at: string;
  completed_at?: string;
}

interface PopulationListProps {
  populations: Population[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function PopulationList({
  populations,
  selectedId,
  onSelect,
  onDelete,
}: PopulationListProps) {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'generating':
      case 'importing':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-4 py-3 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Populations</h2>
        <p className="text-sm text-gray-500">{populations.length} total</p>
      </div>
      <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
        {populations.map((population) => (
          <div
            key={population.id}
            className={`p-4 hover:bg-gray-50 cursor-pointer transition ${
              selectedId === population.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
            }`}
            onClick={() => onSelect(population.id)}
          >
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-medium text-gray-900 truncate pr-2">
                {population.name}
              </h3>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(population.id);
                }}
                className="text-red-600 hover:text-red-800 text-sm"
              >
                Delete
              </button>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(
                    population.status
                  )}`}
                >
                  {population.status}
                </span>
                <span className="text-sm text-gray-500">
                  {population.patient_count || 0} / {population.size}
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Created {formatDate(population.created_at)}
              </p>
            </div>
          </div>
        ))}
        {populations.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            No populations yet. Create one to get started.
          </div>
        )}
      </div>
    </div>
  );
}
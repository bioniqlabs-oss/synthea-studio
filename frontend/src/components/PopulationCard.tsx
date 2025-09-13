import { Link } from 'react-router-dom';
import { useState } from 'react';
import { populationApi } from '../services/api';
import type { Population } from '../services/api';

interface PopulationCardProps {
  population: Population;
  onDelete?: () => void;
}

export default function PopulationCard({ population, onDelete }: PopulationCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  
  const statusColors = {
    pending: 'bg-gray-100 text-gray-800',
    generating: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
  };
  
  const statusIcons = {
    pending: '⏳',
    generating: '🔄',
    completed: '✅',
    failed: '❌',
  };
  
  const handleDelete = async () => {
    if (!confirm(`Delete population "${population.name}"? This cannot be undone.`)) {
      return;
    }
    
    setIsDeleting(true);
    try {
      await populationApi.delete(population.id);
      if (onDelete) onDelete();
    } catch (error) {
      console.error('Failed to delete population:', error);
      alert('Failed to delete population');
    } finally {
      setIsDeleting(false);
    }
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };
  
  return (
    <div className="bg-white shadow rounded-lg p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <Link 
            to={`/population/${population.id}`}
            className="text-lg font-medium text-gray-900 hover:text-blue-600"
          >
            {population.name}
          </Link>
          
          <p className="mt-1 text-sm text-gray-500 line-clamp-2">
            {population.description || 'No description'}
          </p>
          
          <div className="mt-4 flex items-center gap-4 text-sm">
            <span className="text-gray-500">
              👥 {population.patient_count.toLocaleString()} patients
            </span>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[population.status]}`}>
              {statusIcons[population.status]} {population.status}
            </span>
          </div>
          
          <div className="mt-2 text-xs text-gray-400">
            Created: {formatDate(population.created_at)}
            {population.completed_at && (
              <span className="block">
                Completed: {formatDate(population.completed_at)}
              </span>
            )}
          </div>
        </div>
      </div>
      
      <div className="mt-4 flex gap-2">
        <Link
          to={`/population/${population.id}`}
          className="inline-flex items-center px-3 py-1 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
        >
          View Details
        </Link>
        
        {population.status === 'completed' && (
          <button
            onClick={() => populationApi.export(population.id, 'fhir')}
            className="inline-flex items-center px-3 py-1 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
          >
            📥 Export
          </button>
        )}
        
        {population.status === 'pending' && (
          <button
            onClick={() => populationApi.startGeneration(population.id)}
            className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700"
          >
            ▶️ Start
          </button>
        )}
        
        {population.status === 'generating' && (
          <button
            onClick={() => populationApi.stopGeneration(population.id)}
            className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-white bg-red-600 hover:bg-red-700"
          >
            ⏹️ Stop
          </button>
        )}
        
        <button
          onClick={handleDelete}
          disabled={isDeleting || population.status === 'generating'}
          className="inline-flex items-center px-3 py-1 border border-red-300 text-xs font-medium rounded text-red-700 bg-white hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isDeleting ? '...' : '🗑️'} Delete
        </button>
      </div>
    </div>
  );
}
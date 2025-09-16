import React, { useState } from 'react';
import { useExport } from '../hooks/useExport';
import { usePopulations } from '../hooks/usePopulations';

export const ExportPanel: React.FC = () => {
  const { populations } = usePopulations();
  const { exportPopulation, isExporting } = useExport();
  const [selectedPopulation, setSelectedPopulation] = useState('');
  const [format, setFormat] = useState<'fhir' | 'csv' | 'ccda' | 'ndjson'>('fhir');

  const completedPopulations = populations.filter(p => p.status.toLowerCase() === 'completed');

  const handleExport = async () => {
    if (!selectedPopulation) return;

    await exportPopulation(selectedPopulation, format);
  };

  return (
    <div className="max-w-2xl">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Export Population Data</h2>

      {completedPopulations.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">No completed populations available for export.</p>
          <p className="text-sm text-yellow-600 mt-2">
            Generate a population first, then come back here to export the data.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Select Population</label>
            <select
              value={selectedPopulation}
              onChange={(e) => setSelectedPopulation(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">Choose a population...</option>
              {completedPopulations.map((pop) => (
                <option key={pop.id} value={pop.id}>
                  {pop.name} ({pop.patient_count} patients)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Export Format</label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="fhir"
                  checked={format === 'fhir'}
                  onChange={(e) => setFormat(e.target.value as any)}
                  className="mr-2"
                />
                <span className="text-sm">FHIR (JSON)</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="csv"
                  checked={format === 'csv'}
                  onChange={(e) => setFormat(e.target.value as any)}
                  className="mr-2"
                />
                <span className="text-sm">CSV</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="ccda"
                  checked={format === 'ccda'}
                  onChange={(e) => setFormat(e.target.value as any)}
                  className="mr-2"
                />
                <span className="text-sm">C-CDA (XML)</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="ndjson"
                  checked={format === 'ndjson'}
                  onChange={(e) => setFormat(e.target.value as any)}
                  className="mr-2"
                />
                <span className="text-sm">NDJSON</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleExport}
              disabled={!selectedPopulation || isExporting}
              className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting ? 'Exporting...' : 'Export Data'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
/**
 * Population Details Component
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { populationApi, analyticsApi } from '../services/api';
import PatientList from './PatientList';
import PatientDetails from './PatientDetails';
import FhirResourceBrowser from './FhirResourceBrowser';
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

interface PopulationDetailsProps {
  populationId: string;
  onImport: (id: string, outputPath: string) => void;
  onExport?: (id: string, format: 'fhir' | 'csv' | 'ccda' | 'ndjson') => void;
}

export default function PopulationDetails({ populationId, onImport, onExport }: PopulationDetailsProps) {
  const [showPatients, setShowPatients] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [showResourceBrowser, setShowResourceBrowser] = useState(false);

  // Fetch population details
  const { data: population, isLoading: popLoading } = useQuery({
    queryKey: ['population', populationId],
    queryFn: () => populationApi.get(populationId),
    enabled: !!populationId,
  });

  // Fetch population statistics
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['population-stats', populationId],
    queryFn: () => populationApi.getStatistics(populationId),
    enabled: !!populationId,
  });

  // Fetch analytics
  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['population-analytics', populationId],
    queryFn: () => analyticsApi.getPopulationAnalytics(populationId),
    enabled: !!populationId,
  });

  const isLoading = popLoading || statsLoading || analyticsLoading;

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!population) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-500">Population not found</p>
      </div>
    );
  }

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <div className="space-y-6">
      {/* Population Info */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{population.name}</h2>
            <p className="text-sm text-gray-500">ID: {population.id}</p>
          </div>
          {population.status === 'COMPLETED' && (
            <div className="flex gap-2">
              {population.storage_path && (
                <button
                  onClick={() => onImport(population.id, population.storage_path)}
                  className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition"
                >
                  Manual Import
                </button>
              )}
              {onExport && (
                <div className="flex gap-1">
                  <button
                    onClick={() => onExport(population.id, 'fhir')}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition"
                    title="Download FHIR Bundle"
                  >
                    FHIR
                  </button>
                  <button
                    onClick={() => onExport(population.id, 'csv')}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition"
                    title="Download CSV"
                  >
                    CSV
                  </button>
                  <button
                    onClick={() => onExport(population.id, 'ccda')}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition"
                    title="Download C-CDA"
                  >
                    C-CDA
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded p-3">
            <p className="text-xs text-gray-500">Status</p>
            <p className="font-semibold capitalize">{population.status}</p>
          </div>
          <div className="bg-gray-50 rounded p-3">
            <p className="text-xs text-gray-500">Size</p>
            <p className="font-semibold">{population.size}</p>
          </div>
          <div className="bg-gray-50 rounded p-3">
            <p className="text-xs text-gray-500">Patients</p>
            <p className="font-semibold">{population.patient_count || 0}</p>
          </div>
          <div className="bg-gray-50 rounded p-3">
            <p className="text-xs text-gray-500">Resources</p>
            <p className="font-semibold">{population.total_resources || 0}</p>
          </div>
        </div>

        {population.config && (
          <div className="mt-4 p-3 bg-gray-50 rounded">
            <p className="text-sm font-medium text-gray-700 mb-2">Configuration</p>
            <pre className="text-xs text-gray-600 overflow-x-auto">
              {JSON.stringify(population.config, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Resource Statistics */}
      {stats && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Resource Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">
                {stats.statistics?.Condition || 0}
              </p>
              <p className="text-sm text-gray-500">Conditions</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {stats.statistics?.Observation || 0}
              </p>
              <p className="text-sm text-gray-500">Observations</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">
                {stats.statistics?.Procedure || 0}
              </p>
              <p className="text-sm text-gray-500">Procedures</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-600">
                {stats.statistics?.MedicationRequest || 0}
              </p>
              <p className="text-sm text-gray-500">Medications</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">
                {stats.statistics?.Encounter || 0}
              </p>
              <p className="text-sm text-gray-500">Encounters</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-indigo-600">
                {stats.statistics?.total || 0}
              </p>
              <p className="text-sm text-gray-500">Total Resources</p>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Charts */}
      {analytics && (
        <>
          {/* Age Distribution */}
          {analytics.age_distribution && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Age Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.age_distribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="range" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#0088FE" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Gender Distribution */}
          {analytics.gender_distribution && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Gender Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={analytics.gender_distribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {analytics.gender_distribution.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Top Conditions */}
          {analytics.top_conditions && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Conditions</h3>
              <div className="space-y-2">
                {analytics.top_conditions.map((condition: any, index: number) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700 truncate flex-1">
                      {condition.name}
                    </span>
                    <span className="text-sm font-medium text-gray-900 ml-2">
                      {condition.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Patients Section */}
      {population.status === 'COMPLETED' && (
        <div className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Patients</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setShowResourceBrowser(!showResourceBrowser)}
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition"
              >
                {showResourceBrowser ? 'Hide Resource Browser' : 'Resource Browser'}
              </button>
              <button
                onClick={() => setShowPatients(!showPatients)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
              >
                {showPatients ? 'Hide Patients' : 'View Patients'}
              </button>
            </div>
          </div>

          {showResourceBrowser && (
            <div className="bg-white rounded-lg shadow" style={{ height: '600px' }}>
              <FhirResourceBrowser populationId={populationId} />
            </div>
          )}

          {showPatients && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
              <PatientList
                populationId={populationId}
                onSelectPatient={setSelectedPatientId}
              />
              {selectedPatientId && (
                <PatientDetails
                  patientId={selectedPatientId}
                  onClose={() => setSelectedPatientId(null)}
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
/**
 * EHR Simulator Component
 * Main component for EHR simulation interface
 */

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { populationApi, fhirApi } from '../services/api';
import EHRPatientList from './EHRPatientList';
import FhirResourceBrowser from './FhirResourceBrowser';
import PopulationForm from './PopulationForm';
import FHIRCommandTester from './FHIRCommandTester';

type TabType = 'config' | 'patients' | 'fhir';

interface SimulatorStatus {
  status: 'operational' | 'error';
  totalPatients: number;
  populationCount: number;
}

export default function EHRSimulator() {
  const [activeTab, setActiveTab] = useState<TabType>('config');
  const [activePatient, setActivePatient] = useState<string | null>(null);
  const [selectedPopulation, setSelectedPopulation] = useState<string>('all');

  // Fetch all populations for the dropdown
  const { data: populationsData } = useQuery({
    queryKey: ['populations'],
    queryFn: populationApi.list,
  });

  const populations = populationsData?.populations || [];

  // Calculate simulator status
  const { data: allPatients } = useQuery({
    queryKey: ['all-patients'],
    queryFn: () => fhirApi.search('Patient', { _count: 1 }),
  });

  const simulatorStatus: SimulatorStatus = {
    status: 'operational',
    totalPatients: allPatients?.total || 0,
    populationCount: Array.isArray(populations) ? populations.length : 0,
  };

  const tabs = [
    { id: 'config' as TabType, label: 'Configuration' },
    { id: 'patients' as TabType, label: 'Patients' },
    { id: 'fhir' as TabType, label: 'FHIR Testing' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Status */}
      <div className="bg-white border-b">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">EHR Simulator</h1>
              <p className="text-sm text-gray-600 mt-1">
                Unified interface for EHR simulation and testing
              </p>
            </div>
            <div className="flex items-center space-x-6 text-sm">
              <div className="flex items-center">
                {simulatorStatus.status === 'operational' ? (
                  <svg
                    className="h-5 w-5 text-green-500 mr-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                ) : (
                  <svg
                    className="h-5 w-5 text-red-500 mr-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                )}
                <span className="font-medium">
                  Status: {simulatorStatus.status}
                </span>
              </div>
              <div className="text-gray-600">
                Patients: {simulatorStatus.totalPatients}
              </div>
              <div className="text-gray-600">
                Populations: {simulatorStatus.populationCount}
              </div>
              {activePatient && (
                <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
                  Active: {activePatient}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6">
          <nav className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  py-3 px-1 border-b-2 font-medium text-sm transition
                  ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="px-6 py-6">
        {/* Configuration Tab */}
        {activeTab === 'config' && (
          <div className="max-w-4xl space-y-6">
            {/* Population Settings */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Population Settings</h2>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Active Population
                </label>
                <select
                  value={selectedPopulation}
                  onChange={(e) => setSelectedPopulation(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Populations</option>
                  {Array.isArray(populations) && populations
                    .filter((p: any) => p.status === 'COMPLETED')
                    .map((pop: any) => (
                      <option key={pop.id} value={pop.id}>
                        {pop.name} ({pop.patient_count} patients)
                      </option>
                    ))}
                </select>
              </div>

              {selectedPopulation !== 'all' && (
                <div className="mt-4 p-3 bg-gray-50 rounded">
                  <p className="text-sm font-medium text-gray-700">Population Details</p>
                  {Array.isArray(populations) && populations
                    .filter((p: any) => p.id === selectedPopulation)
                    .map((pop: any) => (
                      <div key={pop.id} className="mt-2 text-sm text-gray-600">
                        <p>ID: {pop.id}</p>
                        <p>Status: {pop.status}</p>
                        <p>Patients: {pop.patient_count}</p>
                        <p>Created: {new Date(pop.created_at).toLocaleDateString()}</p>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* EHR Settings */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">EHR Settings</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    FHIR Server Endpoint
                  </label>
                  <input
                    type="text"
                    value="http://localhost:8001/fhir"
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Connected to internal FHIR server
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Export Formats
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input type="checkbox" checked readOnly className="mr-2" />
                      <span className="text-sm">FHIR R4 (JSON)</span>
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" checked readOnly className="mr-2" />
                      <span className="text-sm">CSV</span>
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" checked readOnly className="mr-2" />
                      <span className="text-sm">C-CDA (XML)</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Patients Tab */}
        {activeTab === 'patients' && (
          <EHRPatientList
            selectedPopulation={selectedPopulation === 'all' ? undefined : selectedPopulation}
            activePatient={activePatient}
            onSelectPatient={setActivePatient}
          />
        )}

        {/* FHIR Testing Tab */}
        {activeTab === 'fhir' && (
          <div className="space-y-6">
            {/* FHIR Command Tester */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b">
                <h2 className="text-lg font-semibold">FHIR Command Tester</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Execute custom FHIR queries and commands
                </p>
              </div>
              <FHIRCommandTester />
            </div>

            {/* FHIR Resource Browser */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b">
                <h2 className="text-lg font-semibold">FHIR Resource Browser</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Browse and view FHIR resources
                </p>
              </div>
              <div style={{ height: '600px' }}>
                <FhirResourceBrowser
                  populationId={selectedPopulation === 'all' ? undefined : selectedPopulation}
                  patientId={activePatient || undefined}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
/**
 * EHR Patient List Component
 * Shows patients with population tags and pagination
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fhirApi, populationApi } from '../services/api';

interface EHRPatientListProps {
  selectedPopulation?: string;
  activePatient: string | null;
  onSelectPatient: (patientId: string) => void;
}

interface Patient {
  id: string;
  name: string;
  age: number;
  gender: string;
  birthDate: string;
  city: string;
  state: string;
  populationId?: string;
  populationName?: string;
}

export default function EHRPatientList({
  selectedPopulation,
  activePatient,
  onSelectPatient,
}: EHRPatientListProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // Fetch populations for mapping IDs to names
  const { data: populationsData } = useQuery({
    queryKey: ['populations'],
    queryFn: populationApi.list,
  });

  const populations = populationsData?.populations || [];

  // Create population map
  const populationMap = React.useMemo(() => {
    const map: Record<string, string> = {};
    populations.forEach((pop: any) => {
      map[pop.id] = pop.name;
    });
    return map;
  }, [populations]);

  // Fetch patients
  const { data: patientsBundle, isLoading, refetch } = useQuery({
    queryKey: ['ehr-patients', selectedPopulation, currentPage],
    queryFn: async () => {
      const params: any = {
        _count: pageSize,
        _offset: (currentPage - 1) * pageSize,
      };
      if (selectedPopulation) {
        params.population_id = selectedPopulation;
      }
      return fhirApi.search('Patient', params);
    },
  });

  // Process patients data
  const patients: Patient[] = React.useMemo(() => {
    if (!patientsBundle?.entry) return [];

    return patientsBundle.entry.map((entry: any) => {
      const resource = entry.resource;
      const name = resource.name?.[0];
      const fullName = name
        ? `${name.given?.join(' ')} ${name.family}`
        : 'Unknown Name';

      // Extract population ID from identifier
      const populationIdentifier = resource.identifier?.find(
        (id: any) => id.system === 'http://synthea-studio/population'
      );
      const populationId = populationIdentifier?.value;

      return {
        id: resource.id,
        name: fullName,
        age: resource.birthDate
          ? new Date().getFullYear() - new Date(resource.birthDate).getFullYear()
          : 0,
        gender: resource.gender || 'unknown',
        birthDate: resource.birthDate || '',
        city: resource.address?.[0]?.city || 'Unknown',
        state: resource.address?.[0]?.state || 'Unknown',
        populationId: populationId,
        populationName: populationId ? populationMap[populationId] || populationId : '',
      };
    });
  }, [patientsBundle, populationMap]);

  const totalPatients = patientsBundle?.total || 0;
  const totalPages = Math.ceil(totalPatients / pageSize);

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Patient List</h2>
            <p className="text-sm text-gray-500 mt-1">
              Showing {((currentPage - 1) * pageSize) + 1} to{' '}
              {Math.min(currentPage * pageSize, totalPatients)} of {totalPatients} patients
            </p>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="p-6">
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">Loading patients...</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Patient ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Age
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Gender
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Population
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Birth Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {patients.map((patient) => (
                    <tr
                      key={patient.id}
                      className={activePatient === patient.id ? 'bg-blue-50' : ''}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">
                        {patient.id.substring(0, 8)}...
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {patient.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {patient.age}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                        {patient.gender}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className="px-2 py-1 text-xs bg-gray-100 rounded">
                          {patient.populationName || 'Unknown'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {patient.city}, {patient.state}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {patient.birthDate}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => onSelectPatient(patient.id)}
                          className={`px-3 py-1 rounded text-sm transition ${
                            activePatient === patient.id
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          {activePatient === patient.id ? 'Active' : 'Select'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1 || isLoading}
                  className="px-3 py-1 border rounded text-sm disabled:opacity-50 hover:bg-gray-50 transition"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages || isLoading}
                  className="px-3 py-1 border rounded text-sm disabled:opacity-50 hover:bg-gray-50 transition"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
/**
 * Patient List Component - Shows all patients in a population
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fhirApi } from '../services/api';

interface PatientListProps {
  populationId: string;
  onSelectPatient?: (patientId: string) => void;
}

export default function PatientList({ populationId, onSelectPatient }: PatientListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGender, setSelectedGender] = useState<string>('');

  // Fetch patients
  const { data: patients, isLoading, error } = useQuery({
    queryKey: ['patients', populationId, searchTerm, selectedGender],
    queryFn: () => fhirApi.search('Patient', {
      population_id: populationId,
      _count: 100,
    }),
    enabled: !!populationId,
  });

  // Filter patients locally based on search
  const filteredPatients = React.useMemo(() => {
    if (!patients?.entry) return [];

    return patients.entry.filter((entry: any) => {
      const patient = entry.resource;

      // Name filter
      if (searchTerm) {
        const fullName = patient.name?.[0]
          ? `${patient.name[0].given?.join(' ')} ${patient.name[0].family}`.toLowerCase()
          : '';
        if (!fullName.includes(searchTerm.toLowerCase())) {
          return false;
        }
      }

      // Gender filter
      if (selectedGender && patient.gender !== selectedGender) {
        return false;
      }

      return true;
    });
  }, [patients, searchTerm, selectedGender]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-red-600">Error loading patients</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Patients ({filteredPatients.length})
        </h3>

        {/* Search and Filters */}
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Search by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <select
            value={selectedGender}
            onChange={(e) => setSelectedGender(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Genders</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      {/* Patient List */}
      <div className="max-h-96 overflow-y-auto">
        {filteredPatients.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            No patients found
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredPatients.map((entry: any) => {
              const patient = entry.resource;
              const name = patient.name?.[0];
              const fullName = name
                ? `${name.given?.join(' ')} ${name.family}`
                : 'Unknown Name';
              const birthDate = patient.birthDate;
              const age = birthDate
                ? new Date().getFullYear() - new Date(birthDate).getFullYear()
                : 'Unknown';

              return (
                <div
                  key={patient.id}
                  className="p-4 hover:bg-gray-50 cursor-pointer transition"
                  onClick={() => onSelectPatient?.(patient.id)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-900">{fullName}</p>
                      <p className="text-sm text-gray-500">
                        {patient.gender} • Age {age} • Born {birthDate}
                      </p>
                    </div>
                    <span className="text-xs text-gray-400">
                      ID: {patient.id}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
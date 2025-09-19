/**
 * Patient Details Component - Shows individual patient information
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fhirApi } from '../services/api';

interface PatientDetailsProps {
  patientId: string;
  onClose?: () => void;
}

export default function PatientDetails({ patientId, onClose }: PatientDetailsProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'conditions' | 'medications' | 'observations'>('overview');

  // Fetch patient details
  const { data: patient, isLoading: patientLoading } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: () => fhirApi.get('Patient', patientId),
    enabled: !!patientId,
  });

  // Fetch conditions
  const { data: conditions } = useQuery({
    queryKey: ['conditions', patientId],
    queryFn: () => fhirApi.search('Condition', { patient: patientId }),
    enabled: !!patientId && activeTab === 'conditions',
  });

  // Fetch medications
  const { data: medications } = useQuery({
    queryKey: ['medications', patientId],
    queryFn: () => fhirApi.search('MedicationRequest', { patient: patientId }),
    enabled: !!patientId && activeTab === 'medications',
  });

  // Fetch observations
  const { data: observations } = useQuery({
    queryKey: ['observations', patientId],
    queryFn: () => fhirApi.search('Observation', { patient: patientId }),
    enabled: !!patientId && activeTab === 'observations',
  });

  if (patientLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-red-600">Patient not found</p>
      </div>
    );
  }

  const name = patient.name?.[0];
  const fullName = name ? `${name.given?.join(' ')} ${name.family}` : 'Unknown Name';
  const birthDate = patient.birthDate;
  const age = birthDate
    ? new Date().getFullYear() - new Date(birthDate).getFullYear()
    : 'Unknown';

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{fullName}</h2>
            <p className="text-gray-500">
              {patient.gender} • Age {age} • Born {birthDate}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              Patient ID: {patient.id}
            </p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex">
          {(['overview', 'conditions', 'medications', 'observations'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 text-sm font-medium capitalize transition ${
                activeTab === tab
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Demographics</h3>
              <div className="mt-2 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Gender</p>
                  <p className="font-medium">{patient.gender}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Birth Date</p>
                  <p className="font-medium">{birthDate}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Race</p>
                  <p className="font-medium">
                    {patient.extension?.find((e: any) => e.url?.includes('race'))?.extension?.[0]?.valueCoding?.display || 'Unknown'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Ethnicity</p>
                  <p className="font-medium">
                    {patient.extension?.find((e: any) => e.url?.includes('ethnicity'))?.extension?.[0]?.valueCoding?.display || 'Unknown'}
                  </p>
                </div>
              </div>
            </div>

            {patient.address?.[0] && (
              <div>
                <h3 className="text-sm font-medium text-gray-500">Address</h3>
                <div className="mt-2">
                  <p className="font-medium">
                    {patient.address[0].line?.join(', ')}
                  </p>
                  <p className="text-gray-600">
                    {patient.address[0].city}, {patient.address[0].state} {patient.address[0].postalCode}
                  </p>
                </div>
              </div>
            )}

            {patient.telecom && (
              <div>
                <h3 className="text-sm font-medium text-gray-500">Contact</h3>
                <div className="mt-2 space-y-1">
                  {patient.telecom.map((contact: any, idx: number) => (
                    <p key={idx} className="text-gray-600">
                      {contact.system}: {contact.value}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'conditions' && (
          <div className="space-y-2">
            {!conditions?.entry || conditions.entry.length === 0 ? (
              <p className="text-gray-500">No conditions recorded</p>
            ) : (
              conditions.entry.map((entry: any) => (
                <div key={entry.resource.id} className="p-3 bg-gray-50 rounded">
                  <p className="font-medium">{entry.resource.code?.text || 'Unknown Condition'}</p>
                  <p className="text-sm text-gray-600">
                    Status: {entry.resource.clinicalStatus?.coding?.[0]?.code || 'Unknown'}
                  </p>
                  <p className="text-sm text-gray-500">
                    Onset: {entry.resource.onsetDateTime || 'Unknown'}
                  </p>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'medications' && (
          <div className="space-y-2">
            {!medications?.entry || medications.entry.length === 0 ? (
              <p className="text-gray-500">No medications recorded</p>
            ) : (
              medications.entry.map((entry: any) => (
                <div key={entry.resource.id} className="p-3 bg-gray-50 rounded">
                  <p className="font-medium">
                    {entry.resource.medicationCodeableConcept?.text || 'Unknown Medication'}
                  </p>
                  <p className="text-sm text-gray-600">
                    Status: {entry.resource.status || 'Unknown'}
                  </p>
                  <p className="text-sm text-gray-500">
                    Date: {entry.resource.authoredOn || 'Unknown'}
                  </p>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'observations' && (
          <div className="space-y-2">
            {!observations?.entry || observations.entry.length === 0 ? (
              <p className="text-gray-500">No observations recorded</p>
            ) : (
              observations.entry.map((entry: any) => (
                <div key={entry.resource.id} className="p-3 bg-gray-50 rounded">
                  <p className="font-medium">{entry.resource.code?.text || 'Unknown Observation'}</p>
                  <p className="text-sm text-gray-600">
                    Value: {entry.resource.valueQuantity?.value} {entry.resource.valueQuantity?.unit}
                  </p>
                  <p className="text-sm text-gray-500">
                    Date: {entry.resource.effectiveDateTime || 'Unknown'}
                  </p>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
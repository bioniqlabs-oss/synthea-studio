/**
 * FHIR Resource Browser Component
 * Allows browsing and viewing all FHIR resources in the system
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fhirApi } from '../services/api';

interface FhirResourceBrowserProps {
  populationId?: string;
  patientId?: string;
}

const RESOURCE_TYPES = [
  'Patient',
  'Condition',
  'Observation',
  'MedicationRequest',
  'Procedure',
  'Encounter',
  'AllergyIntolerance',
  'Immunization',
  'CarePlan',
  'DiagnosticReport',
  'DocumentReference',
  'Goal',
  'ImagingStudy',
  'MedicationStatement',
  'Organization',
  'Practitioner',
  'ProcedureRequest',
  'Claim',
  'ExplanationOfBenefit',
];

export default function FhirResourceBrowser({ populationId, patientId }: FhirResourceBrowserProps) {
  const [selectedResourceType, setSelectedResourceType] = useState<string>('Patient');
  const [selectedResource, setSelectedResource] = useState<any>(null);
  const [searchParams, setSearchParams] = useState<Record<string, string>>({});
  const [viewMode, setViewMode] = useState<'json' | 'formatted'>('formatted');

  // Build search parameters
  const buildSearchParams = () => {
    const params: Record<string, string> = { ...searchParams };
    if (populationId) params.population_id = populationId;
    if (patientId) params.patient = patientId;
    params._count = '50';
    return params;
  };

  // Fetch resources
  const { data: resources, isLoading, refetch } = useQuery({
    queryKey: ['fhir-resources', selectedResourceType, populationId, patientId, searchParams],
    queryFn: () => fhirApi.search(selectedResourceType, buildSearchParams()),
    enabled: !!selectedResourceType,
  });

  const handleResourceSelect = (resource: any) => {
    setSelectedResource(resource);
  };

  const handleSearchParamChange = (key: string, value: string) => {
    setSearchParams(prev => {
      const updated = { ...prev };
      if (value) {
        updated[key] = value;
      } else {
        delete updated[key];
      }
      return updated;
    });
  };

  const formatResourceForDisplay = (resource: any) => {
    if (!resource) return null;

    // Extract key fields based on resource type
    const resourceType = resource.resourceType;
    let summary: Record<string, any> = {
      'Resource Type': resourceType,
      'ID': resource.id,
    };

    switch (resourceType) {
      case 'Patient':
        const name = resource.name?.[0];
        summary['Name'] = name ? `${name.given?.join(' ')} ${name.family}` : 'Unknown';
        summary['Gender'] = resource.gender;
        summary['Birth Date'] = resource.birthDate;
        break;

      case 'Condition':
        summary['Condition'] = resource.code?.text || resource.code?.coding?.[0]?.display || 'Unknown';
        summary['Status'] = resource.clinicalStatus?.coding?.[0]?.code;
        summary['Onset'] = resource.onsetDateTime;
        break;

      case 'Observation':
        summary['Observation'] = resource.code?.text || resource.code?.coding?.[0]?.display || 'Unknown';
        if (resource.valueQuantity) {
          summary['Value'] = `${resource.valueQuantity.value} ${resource.valueQuantity.unit}`;
        }
        summary['Date'] = resource.effectiveDateTime;
        break;

      case 'MedicationRequest':
        summary['Medication'] = resource.medicationCodeableConcept?.text || 'Unknown';
        summary['Status'] = resource.status;
        summary['Date'] = resource.authoredOn;
        break;

      case 'Procedure':
        summary['Procedure'] = resource.code?.text || resource.code?.coding?.[0]?.display || 'Unknown';
        summary['Status'] = resource.status;
        summary['Date'] = resource.performedDateTime || resource.performedPeriod?.start;
        break;

      case 'Encounter':
        summary['Type'] = resource.type?.[0]?.text || resource.type?.[0]?.coding?.[0]?.display || 'Unknown';
        summary['Status'] = resource.status;
        summary['Period'] = resource.period?.start ? `${resource.period.start} - ${resource.period.end || 'ongoing'}` : 'Unknown';
        break;

      default:
        // For other resource types, show first few fields
        Object.keys(resource).slice(0, 5).forEach(key => {
          if (key !== 'resourceType' && key !== 'id' && key !== 'meta') {
            summary[key] = JSON.stringify(resource[key])?.substring(0, 100);
          }
        });
    }

    return summary;
  };

  return (
    <div className="h-full flex">
      {/* Left Panel - Resource List */}
      <div className="w-1/3 border-r border-gray-200 flex flex-col">
        {/* Resource Type Selector */}
        <div className="p-4 border-b border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Resource Type
          </label>
          <select
            value={selectedResourceType}
            onChange={(e) => {
              setSelectedResourceType(e.target.value);
              setSelectedResource(null);
              setSearchParams({});
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {RESOURCE_TYPES.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        {/* Search Parameters */}
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Search Parameters</h3>
          <div className="space-y-2">
            {selectedResourceType === 'Patient' && (
              <>
                <input
                  type="text"
                  placeholder="Name contains..."
                  value={searchParams.name || ''}
                  onChange={(e) => handleSearchParamChange('name', e.target.value)}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                />
                <input
                  type="text"
                  placeholder="Identifier..."
                  value={searchParams.identifier || ''}
                  onChange={(e) => handleSearchParamChange('identifier', e.target.value)}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                />
              </>
            )}

            {(selectedResourceType === 'Condition' || selectedResourceType === 'Observation') && (
              <input
                type="text"
                placeholder="Code..."
                value={searchParams.code || ''}
                onChange={(e) => handleSearchParamChange('code', e.target.value)}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
              />
            )}

            <button
              onClick={() => refetch()}
              className="w-full px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition"
            >
              Search
            </button>
          </div>
        </div>

        {/* Resource List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-4">
              <div className="animate-pulse space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-12 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          ) : resources?.entry?.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              No {selectedResourceType} resources found
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {resources?.entry?.map((entry: any) => {
                const resource = entry.resource;
                const summary = formatResourceForDisplay(resource);
                return (
                  <div
                    key={resource.id}
                    className={`p-3 hover:bg-gray-50 cursor-pointer transition ${
                      selectedResource?.id === resource.id ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => handleResourceSelect(resource)}
                  >
                    <div className="text-sm font-medium text-gray-900">
                      {summary?.Name || summary?.Condition || summary?.Observation || summary?.Medication || summary?.Type || resource.resourceType}
                    </div>
                    <div className="text-xs text-gray-500">
                      ID: {resource.id}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Resource Details */}
      <div className="flex-1 flex flex-col">
        {selectedResource ? (
          <>
            {/* View Mode Toggle */}
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">
                {selectedResource.resourceType}/{selectedResource.id}
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode('formatted')}
                  className={`px-3 py-1 text-sm rounded transition ${
                    viewMode === 'formatted'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Formatted
                </button>
                <button
                  onClick={() => setViewMode('json')}
                  className={`px-3 py-1 text-sm rounded transition ${
                    viewMode === 'json'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  JSON
                </button>
              </div>
            </div>

            {/* Resource Content */}
            <div className="flex-1 overflow-auto p-4">
              {viewMode === 'formatted' ? (
                <div className="space-y-4">
                  {Object.entries(formatResourceForDisplay(selectedResource) || {}).map(([key, value]) => (
                    <div key={key}>
                      <dt className="text-sm font-medium text-gray-500">{key}</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                      </dd>
                    </div>
                  ))}

                  {/* Show full resource structure */}
                  <details className="mt-6">
                    <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                      View Complete Resource
                    </summary>
                    <pre className="mt-2 p-3 bg-gray-50 rounded text-xs overflow-x-auto">
                      {JSON.stringify(selectedResource, null, 2)}
                    </pre>
                  </details>
                </div>
              ) : (
                <pre className="p-4 bg-gray-50 rounded text-sm overflow-x-auto">
                  {JSON.stringify(selectedResource, null, 2)}
                </pre>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Select a resource to view details
          </div>
        )}
      </div>
    </div>
  );
}
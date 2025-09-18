import React, { useState, useEffect } from 'react';
import { FHIRClient } from '../../services/fhirClient';
import type { Patient } from '../../types';
import './FHIRViewer.css';

interface FHIRViewerProps {
  apiUrl?: string;
  mode?: 'standalone' | 'embedded';
  patientId?: string;
  resourceType?: 'Patient' | 'Condition' | 'Observation' | 'Bundle';
}

export const FHIRViewer: React.FC<FHIRViewerProps> = ({
  apiUrl,
  mode = 'standalone',
  patientId,
  resourceType = 'Patient',
}) => {
  const [resource, setResource] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedResourceType, setSelectedResourceType] = useState(resourceType);
  const [selectedPatientId, setSelectedPatientId] = useState(patientId || '');
  const [viewMode, setViewMode] = useState<'json' | 'formatted'>('formatted');

  const fhirClient = new FHIRClient(apiUrl, mode);

  const loadResource = async () => {
    if (!selectedPatientId && selectedResourceType === 'Patient') {
      // Load all patients
      setLoading(true);
      try {
        const bundle = await fhirClient.getPatients();
        setResource(bundle);
        setError(null);
      } catch (err: any) {
        setError(err.message);
        setResource(null);
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!selectedPatientId) {
      setError('Please enter a patient ID');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let data;
      switch (selectedResourceType) {
        case 'Patient':
          data = await fhirClient.getPatient(selectedPatientId);
          break;
        case 'Condition':
          data = await fhirClient.getConditions(selectedPatientId);
          break;
        case 'Observation':
          data = await fhirClient.getObservations(selectedPatientId);
          break;
        case 'Bundle':
          data = await fhirClient.getPatientEverything(selectedPatientId);
          break;
        default:
          throw new Error('Invalid resource type');
      }
      setResource(data);
    } catch (err: any) {
      setError(err.message);
      setResource(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (patientId) {
      setSelectedPatientId(patientId);
      loadResource();
    }
  }, [patientId]);

  const formatResource = (res: any) => {
    if (!res) return null;

    if (viewMode === 'json') {
      return (
        <pre className="fhir-json">
          {JSON.stringify(res, null, 2)}
        </pre>
      );
    }

    // Formatted view
    if (res.resourceType === 'Patient') {
      const patient = res as Patient;
      const name = patient.name?.[0];
      const address = patient.address?.[0];

      return (
        <div className="fhir-formatted">
          <h3>Patient Information</h3>
          <dl>
            <dt>ID:</dt>
            <dd>{patient.id}</dd>
            <dt>Name:</dt>
            <dd>{name?.given?.join(' ')} {name?.family}</dd>
            <dt>Gender:</dt>
            <dd>{patient.gender}</dd>
            <dt>Birth Date:</dt>
            <dd>{patient.birthDate}</dd>
            <dt>Address:</dt>
            <dd>
              {address?.city}, {address?.state} {address?.postalCode}
            </dd>
          </dl>
        </div>
      );
    }

    if (res.resourceType === 'Bundle') {
      return (
        <div className="fhir-formatted">
          <h3>Bundle</h3>
          <p>Type: {res.type}</p>
          <p>Entries: {res.entry?.length || 0}</p>
          <ul>
            {res.entry?.map((entry: any, index: number) => (
              <li key={index}>
                {entry.resource?.resourceType} - {entry.resource?.id}
              </li>
            ))}
          </ul>
        </div>
      );
    }

    // Default to JSON for other resource types
    return (
      <pre className="fhir-json">
        {JSON.stringify(res, null, 2)}
      </pre>
    );
  };

  return (
    <div className="fhir-viewer">
      <div className="fhir-viewer-header">
        <h2>FHIR Resource Viewer</h2>
        <div className="fhir-viewer-controls">
          <select
            value={selectedResourceType}
            onChange={(e) => setSelectedResourceType(e.target.value as any)}
            className="resource-select"
          >
            <option value="Patient">Patient</option>
            <option value="Condition">Conditions</option>
            <option value="Observation">Observations</option>
            <option value="Bundle">Everything</option>
          </select>
          <input
            type="text"
            placeholder="Patient ID (optional)"
            value={selectedPatientId}
            onChange={(e) => setSelectedPatientId(e.target.value)}
            className="patient-id-input"
          />
          <button onClick={loadResource} className="load-btn">
            Load
          </button>
          <div className="view-mode-toggle">
            <button
              className={viewMode === 'formatted' ? 'active' : ''}
              onClick={() => setViewMode('formatted')}
            >
              Formatted
            </button>
            <button
              className={viewMode === 'json' ? 'active' : ''}
              onClick={() => setViewMode('json')}
            >
              JSON
            </button>
          </div>
        </div>
      </div>

      <div className="fhir-viewer-content">
        {loading && <div className="fhir-loading">Loading...</div>}
        {error && <div className="fhir-error">Error: {error}</div>}
        {resource && !loading && !error && formatResource(resource)}
        {!resource && !loading && !error && (
          <div className="fhir-empty">
            Select a resource type and click Load to view FHIR data
          </div>
        )}
      </div>
    </div>
  );
};
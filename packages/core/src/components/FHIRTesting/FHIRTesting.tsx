import React, { useState } from 'react';
import { useSyntheaConfig } from '../../contexts/SyntheaContext';
import './FHIRTesting.css';

interface FHIRRequest {
  method: string;
  url: string;
  params?: Record<string, any>;
  body?: any;
  timestamp: string;
}

interface FHIRResponse {
  status: number;
  data: any;
  responseTime: number;
  timestamp: string;
}

interface TestEndpoint {
  name: string;
  path: string;
  method: string;
  params?: Record<string, any>;
  body?: any;
}

interface FHIRTestingProps {
  apiUrl?: string;
  mode?: 'standalone' | 'embedded';
}

export const FHIRTesting: React.FC<FHIRTestingProps> = ({
  apiUrl = '',
  mode = 'standalone',
}) => {
  const config = useSyntheaConfig();
  const baseUrl = apiUrl || config.apiUrl;
  const [loading, setLoading] = useState(false);
  const [request, setRequest] = useState<FHIRRequest | null>(null);
  const [response, setResponse] = useState<FHIRResponse | null>(null);
  const [selectedEndpoint, setSelectedEndpoint] = useState('patients');
  const [customPath, setCustomPath] = useState('/Patient');
  const [customMethod, setCustomMethod] = useState('GET');
  const [customParams, setCustomParams] = useState('{"_count": "10"}');
  const [customBody, setCustomBody] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [lastPatientId, setLastPatientId] = useState<string>('[PATIENT_ID]');

  const testEndpoints: Record<string, TestEndpoint> = {
    metadata: {
      name: 'Server Metadata',
      path: '/metadata',
      method: 'GET'
    },
    patients: {
      name: 'List Patients',
      path: '/Patient',
      method: 'GET',
      params: { _count: 10 }
    },
    patient: {
      name: 'Get Patient',
      path: '/Patient/[PATIENT_ID]',
      method: 'GET'
    },
    everything: {
      name: 'Patient Everything',
      path: '/Patient/[PATIENT_ID]/$everything',
      method: 'GET'
    },
    conditions: {
      name: 'List Conditions',
      path: '/Condition',
      method: 'GET',
      params: { _count: 10 }
    },
    observations: {
      name: 'List Observations',
      path: '/Observation',
      method: 'GET',
      params: { _count: 10 }
    },
    medications: {
      name: 'List Medications',
      path: '/MedicationRequest',
      method: 'GET',
      params: { _count: 10 }
    },
    procedures: {
      name: 'List Procedures',
      path: '/Procedure',
      method: 'GET',
      params: { _count: 10 }
    },
    encounters: {
      name: 'List Encounters',
      path: '/Encounter',
      method: 'GET',
      params: { _count: 10 }
    },
  };

  const executeRequest = async (endpoint?: TestEndpoint) => {
    setLoading(true);
    setResponse(null);

    let testEndpoint: TestEndpoint;

    if (endpoint) {
      testEndpoint = endpoint;
    } else {
      // Custom request
      try {
        const params = customParams ? JSON.parse(customParams) : undefined;
        const body = customBody ? JSON.parse(customBody) : undefined;
        testEndpoint = {
          name: 'Custom Request',
          path: customPath,
          method: customMethod,
          params,
          body,
        };
      } catch (error) {
        alert('Invalid JSON in parameters or body');
        setLoading(false);
        return;
      }
    }

    // Replace [PATIENT_ID] with actual patient ID
    let path = testEndpoint.path;
    if (path.includes('[PATIENT_ID]')) {
      if (lastPatientId === '[PATIENT_ID]') {
        // Try to get a patient ID first
        try {
          const patientsResponse = await fetch(`${baseUrl}/fhir/Patient?_count=1`);
          const data = await patientsResponse.json();
          if (data.entry && data.entry.length > 0) {
            const patientId = data.entry[0].resource.id;
            setLastPatientId(patientId);
            path = path.replace(/\[PATIENT_ID\]/g, patientId);
          } else {
            alert('No patients found. Please generate patients first.');
            setLoading(false);
            return;
          }
        } catch (error) {
          alert('Failed to fetch patient ID');
          setLoading(false);
          return;
        }
      } else {
        path = path.replace(/\[PATIENT_ID\]/g, lastPatientId);
      }
    }

    const requestData: FHIRRequest = {
      method: testEndpoint.method,
      url: path,
      params: testEndpoint.params,
      body: testEndpoint.body,
      timestamp: new Date().toISOString(),
    };
    setRequest(requestData);

    try {
      const startTime = performance.now();
      let result;

      const url = new URL(`${baseUrl}/fhir${path}`);
      if (testEndpoint.params) {
        Object.entries(testEndpoint.params).forEach(([key, value]) => {
          url.searchParams.append(key, String(value));
        });
      }

      const fetchOptions: RequestInit = {
        method: testEndpoint.method,
        headers: {
          'Content-Type': 'application/json',
        },
      };

      if (testEndpoint.body) {
        fetchOptions.body = JSON.stringify(testEndpoint.body);
      }

      const fetchResponse = await fetch(url.toString(), fetchOptions);
      const responseData = await fetchResponse.json();
      result = {
        data: responseData,
        status: fetchResponse.status,
        headers: Object.fromEntries(fetchResponse.headers.entries()),
      };

      const responseTime = performance.now() - startTime;

      setResponse({
        status: result.status || 200,
        data: result.data,
        responseTime,
        timestamp: new Date().toISOString(),
      });

      // Extract patient ID if we just fetched patients
      if (path === '/Patient' && result.data.entry && result.data.entry.length > 0) {
        setLastPatientId(result.data.entry[0].resource.id);
      }
    } catch (error: any) {
      const responseTime = 0;
      setResponse({
        status: error.response?.status || 500,
        data: error.response?.data || { error: error.message },
        responseTime,
        timestamp: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fhir-testing">
      <div className="testing-header">
        <h2>FHIR API Testing</h2>
        <p>Test FHIR endpoints and view responses</p>
      </div>

      <div className="testing-content">
        {/* Endpoint Selection */}
        <div className="endpoint-section">
          <div className="endpoint-tabs">
            <button
              className={`endpoint-tab ${!showCustom ? 'active' : ''}`}
              onClick={() => setShowCustom(false)}
            >
              Predefined Endpoints
            </button>
            <button
              className={`endpoint-tab ${showCustom ? 'active' : ''}`}
              onClick={() => setShowCustom(true)}
            >
              Custom Request
            </button>
          </div>

          {!showCustom ? (
            <div className="predefined-endpoints">
              <div className="endpoint-grid">
                {Object.entries(testEndpoints).map(([key, endpoint]) => (
                  <button
                    key={key}
                    className={`endpoint-button ${selectedEndpoint === key ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedEndpoint(key);
                      executeRequest(endpoint);
                    }}
                    disabled={loading}
                  >
                    <span className="endpoint-method">{endpoint.method}</span>
                    <span className="endpoint-name">{endpoint.name}</span>
                    <span className="endpoint-path">{endpoint.path}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="custom-endpoint">
              <div className="custom-controls">
                <div className="control-group">
                  <label>Method</label>
                  <select
                    value={customMethod}
                    onChange={(e) => setCustomMethod(e.target.value)}
                    className="method-select"
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="DELETE">DELETE</option>
                  </select>
                </div>
                <div className="control-group flex-1">
                  <label>Path</label>
                  <input
                    type="text"
                    value={customPath}
                    onChange={(e) => setCustomPath(e.target.value)}
                    placeholder="/Patient/123"
                    className="path-input"
                  />
                </div>
              </div>

              {customMethod === 'GET' && (
                <div className="control-group">
                  <label>Query Parameters (JSON)</label>
                  <textarea
                    value={customParams}
                    onChange={(e) => setCustomParams(e.target.value)}
                    placeholder='{"_count": "10", "_sort": "date"}'
                    className="params-input"
                    rows={3}
                  />
                </div>
              )}

              {(customMethod === 'POST' || customMethod === 'PUT') && (
                <div className="control-group">
                  <label>Request Body (JSON)</label>
                  <textarea
                    value={customBody}
                    onChange={(e) => setCustomBody(e.target.value)}
                    placeholder='{"resourceType": "Patient", ...}'
                    className="body-input"
                    rows={6}
                  />
                </div>
              )}

              <button
                onClick={() => executeRequest()}
                disabled={loading}
                className="execute-button"
              >
                {loading ? 'Executing...' : 'Execute Request'}
              </button>
            </div>
          )}
        </div>

        {/* Request/Response Display */}
        <div className="results-section">
          {request && (
            <div className="request-display">
              <div className="display-header">
                <h3>Request</h3>
                <span className="timestamp">{request.timestamp}</span>
              </div>
              <div className="display-content">
                <div className="request-line">
                  <span className="method-badge">{request.method}</span>
                  <span className="url">{request.url}</span>
                </div>
                {request.params && Object.keys(request.params).length > 0 && (
                  <div className="params-display">
                    <strong>Parameters:</strong>
                    <pre>{JSON.stringify(request.params, null, 2)}</pre>
                  </div>
                )}
                {request.body && (
                  <div className="body-display">
                    <strong>Body:</strong>
                    <pre>{JSON.stringify(request.body, null, 2)}</pre>
                  </div>
                )}
              </div>
            </div>
          )}

          {response && (
            <div className="response-display">
              <div className="display-header">
                <h3>Response</h3>
                <div className="response-meta">
                  <span className={`status-badge status-${Math.floor(response.status / 100)}xx`}>
                    {response.status}
                  </span>
                  <span className="response-time">{response.responseTime.toFixed(2)}ms</span>
                </div>
              </div>
              <div className="display-content">
                <pre className="response-data">
                  {JSON.stringify(response.data, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
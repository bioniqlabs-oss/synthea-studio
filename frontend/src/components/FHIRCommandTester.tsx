/**
 * FHIR Command Tester Component
 * Allows running custom FHIR queries and commands
 */

import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { fhirApi } from '../services/api';
import toast from 'react-hot-toast';

interface QueryHistoryItem {
  id: string;
  timestamp: Date;
  method: string;
  url: string;
  body?: any;
  response?: any;
  error?: string;
  duration: number;
}

interface QueryPreset {
  name: string;
  description: string;
  method: string;
  path: string;
  body?: string;
}

const QUERY_PRESETS: QueryPreset[] = [
  {
    name: 'All Patients',
    description: 'Get all patients in the system',
    method: 'GET',
    path: '/Patient',
  },
  {
    name: 'Patient by ID',
    description: 'Get a specific patient (replace {id})',
    method: 'GET',
    path: '/Patient/{id}',
  },
  {
    name: 'Search Conditions',
    description: 'Search for conditions with parameters',
    method: 'GET',
    path: '/Condition?patient={patientId}',
  },
  {
    name: 'Search Observations',
    description: 'Search for observations',
    method: 'GET',
    path: '/Observation?patient={patientId}&code={code}',
  },
  {
    name: 'Patient Everything',
    description: 'Get all resources for a patient',
    method: 'GET',
    path: '/Patient/{id}/$everything',
  },
  {
    name: 'Create Patient',
    description: 'Create a new patient resource',
    method: 'POST',
    path: '/Patient',
    body: JSON.stringify({
      resourceType: 'Patient',
      name: [{ family: 'Test', given: ['John'] }],
      gender: 'male',
      birthDate: '1990-01-01'
    }, null, 2),
  },
  {
    name: 'Update Patient',
    description: 'Update an existing patient',
    method: 'PUT',
    path: '/Patient/{id}',
    body: JSON.stringify({
      resourceType: 'Patient',
      id: '{id}',
      name: [{ family: 'Updated', given: ['Name'] }]
    }, null, 2),
  },
  {
    name: 'Delete Patient',
    description: 'Delete a patient resource',
    method: 'DELETE',
    path: '/Patient/{id}',
  },
  {
    name: 'Bundle Search',
    description: 'Search multiple resource types',
    method: 'GET',
    path: '/?_type=Patient,Condition,Observation&_count=10',
  },
  {
    name: 'Capability Statement',
    description: 'Get server capability statement',
    method: 'GET',
    path: '/metadata',
  },
];

export default function FHIRCommandTester() {
  const [method, setMethod] = useState<string>('GET');
  const [path, setPath] = useState<string>('/Patient');
  const [headers, setHeaders] = useState<string>('');
  const [body, setBody] = useState<string>('');
  const [response, setResponse] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [queryHistory, setQueryHistory] = useState<QueryHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string>('');

  const executeQuery = async () => {
    setIsLoading(true);
    const startTime = performance.now();

    try {
      // Parse headers if provided
      let customHeaders: Record<string, string> = {};
      if (headers.trim()) {
        try {
          customHeaders = JSON.parse(headers);
        } catch {
          // Try parsing as key: value lines
          headers.split('\n').forEach(line => {
            const [key, value] = line.split(':').map(s => s.trim());
            if (key && value) {
              customHeaders[key] = value;
            }
          });
        }
      }

      // Build full URL
      const baseUrl = '/fhir';
      const fullPath = path.startsWith('/') ? path : `/${path}`;
      const url = `${baseUrl}${fullPath}`;

      // Prepare request options
      const requestOptions: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/fhir+json',
          ...customHeaders,
        },
      };

      // Add body for POST/PUT/PATCH
      if (['POST', 'PUT', 'PATCH'].includes(method) && body.trim()) {
        requestOptions.body = body;
      }

      // Make the request directly using fetch for more control
      const apiResponse = await fetch(`http://localhost:8001${url}`, requestOptions);
      const responseData = await apiResponse.text();

      let parsedResponse;
      try {
        parsedResponse = JSON.parse(responseData);
      } catch {
        parsedResponse = responseData;
      }

      const duration = performance.now() - startTime;

      // Add to history
      const historyItem: QueryHistoryItem = {
        id: `query-${Date.now()}`,
        timestamp: new Date(),
        method,
        url: fullPath,
        body: body.trim() ? JSON.parse(body) : undefined,
        response: parsedResponse,
        error: apiResponse.ok ? undefined : `${apiResponse.status} ${apiResponse.statusText}`,
        duration,
      };

      setQueryHistory(prev => [historyItem, ...prev.slice(0, 49)]); // Keep last 50
      setResponse({
        status: apiResponse.status,
        statusText: apiResponse.statusText,
        headers: Object.fromEntries(apiResponse.headers.entries()),
        data: parsedResponse,
      });

      if (!apiResponse.ok) {
        toast.error(`Request failed: ${apiResponse.status} ${apiResponse.statusText}`);
      } else {
        toast.success(`Request completed in ${duration.toFixed(2)}ms`);
      }
    } catch (error: any) {
      const duration = performance.now() - startTime;

      const historyItem: QueryHistoryItem = {
        id: `query-${Date.now()}`,
        timestamp: new Date(),
        method,
        url: path,
        body: body.trim() ? JSON.parse(body) : undefined,
        error: error.message,
        duration,
      };

      setQueryHistory(prev => [historyItem, ...prev.slice(0, 49)]);
      setResponse({
        error: error.message,
        details: error,
      });
      toast.error(`Request failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPreset = (preset: QueryPreset) => {
    setMethod(preset.method);
    setPath(preset.path);
    setBody(preset.body || '');
    setSelectedPreset(preset.name);
    toast.success(`Loaded preset: ${preset.name}`);
  };

  const loadFromHistory = (item: QueryHistoryItem) => {
    setMethod(item.method);
    setPath(item.url);
    setBody(item.body ? JSON.stringify(item.body, null, 2) : '');
    setShowHistory(false);
    toast.success('Loaded from history');
  };

  const clearAll = () => {
    setMethod('GET');
    setPath('/Patient');
    setHeaders('');
    setBody('');
    setResponse(null);
    setSelectedPreset('');
  };

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Query Builder */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">FHIR Query Builder</h3>

          {/* Presets */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Query Presets
            </label>
            <select
              value={selectedPreset}
              onChange={(e) => {
                const preset = QUERY_PRESETS.find(p => p.name === e.target.value);
                if (preset) loadPreset(preset);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a preset...</option>
              {QUERY_PRESETS.map(preset => (
                <option key={preset.name} value={preset.name}>
                  {preset.name} - {preset.description}
                </option>
              ))}
            </select>
          </div>

          {/* Method and Path */}
          <div className="flex gap-2">
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="PATCH">PATCH</option>
              <option value="DELETE">DELETE</option>
            </select>
            <input
              type="text"
              value={path}
              onChange={(e) => setPath(e.target.value)}
              placeholder="/Patient"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Headers */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Headers (JSON or key: value format)
            </label>
            <textarea
              value={headers}
              onChange={(e) => setHeaders(e.target.value)}
              placeholder='{"Accept": "application/fhir+json"}'
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            />
          </div>

          {/* Body */}
          {['POST', 'PUT', 'PATCH'].includes(method) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Request Body (JSON)
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder='{"resourceType": "Patient", ...}'
                rows={10}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={executeQuery}
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {isLoading ? 'Executing...' : 'Execute Query'}
            </button>
            <button
              onClick={clearAll}
              className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition"
            >
              Clear
            </button>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition"
            >
              History ({queryHistory.length})
            </button>
          </div>
        </div>

        {/* Response Viewer */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Response</h3>

          {response && (
            <div className="space-y-2">
              {/* Response Status */}
              {response.status && (
                <div className={`p-2 rounded ${response.status >= 200 && response.status < 300 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {response.status} {response.statusText}
                </div>
              )}

              {/* Response Headers */}
              {response.headers && (
                <details className="border rounded p-2">
                  <summary className="cursor-pointer font-medium">Response Headers</summary>
                  <pre className="mt-2 text-xs overflow-auto">
                    {JSON.stringify(response.headers, null, 2)}
                  </pre>
                </details>
              )}

              {/* Response Body */}
              <div className="border rounded p-4 bg-gray-50 max-h-[600px] overflow-auto">
                <pre className="text-sm font-mono whitespace-pre-wrap">
                  {typeof response.data === 'string'
                    ? response.data
                    : JSON.stringify(response.data || response.error || response, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {!response && (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center text-gray-500">
              Execute a query to see the response here
            </div>
          )}
        </div>
      </div>

      {/* Query History Modal */}
      {showHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold">Query History</h3>
            </div>
            <div className="overflow-auto max-h-[60vh]">
              {queryHistory.length === 0 ? (
                <p className="p-4 text-gray-500">No queries in history</p>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Time</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Method</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Path</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Status</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Duration</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {queryHistory.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm">
                          {item.timestamp.toLocaleTimeString()}
                        </td>
                        <td className="px-4 py-2 text-sm font-mono">{item.method}</td>
                        <td className="px-4 py-2 text-sm font-mono truncate max-w-xs" title={item.url}>
                          {item.url}
                        </td>
                        <td className="px-4 py-2 text-sm">
                          {item.error ? (
                            <span className="text-red-600">Error</span>
                          ) : (
                            <span className="text-green-600">Success</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-sm">{item.duration.toFixed(2)}ms</td>
                        <td className="px-4 py-2">
                          <button
                            onClick={() => loadFromHistory(item)}
                            className="text-blue-600 hover:text-blue-800 text-sm"
                          >
                            Load
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="p-4 border-t">
              <button
                onClick={() => setShowHistory(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
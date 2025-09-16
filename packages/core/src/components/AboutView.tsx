import React from 'react';
import { useSyntheaConfig } from '../contexts/SyntheaContext';

export const AboutView: React.FC = () => {
  const config = useSyntheaConfig();

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-4">About Synthea Studio</h2>
        <p className="text-lg text-gray-600">
          A modern web interface for Synthea™ Patient Generator - creating realistic synthetic patient data for healthcare innovation.
        </p>
      </div>

      {/* Synthea Attribution */}
      <div className="bg-blue-50 border-l-4 border-blue-400 p-6 rounded-r-lg">
        <div className="flex items-start">
          <svg className="h-6 w-6 text-blue-600 mt-1 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 className="text-lg font-semibold text-blue-900 mb-2">Powered by Synthea™</h3>
            <p className="text-blue-800 mb-3">
              Synthea™ is a Synthetic Patient Population Simulator that models the medical history of synthetic patients.
              It provides high-quality, synthetic, realistic but not real, patient data and associated health records 
              covering every aspect of healthcare.
            </p>
            <p className="text-sm text-blue-700">
              Synthea™ is open source software developed by The MITRE Corporation.
              <br />
              © 2024 The MITRE Corporation. All Rights Reserved.
            </p>
            <div className="mt-3">
              <a
                href="https://github.com/synthetichealth/synthea"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium"
              >
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" clipRule="evenodd" />
                </svg>
                Visit Synthea on GitHub
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* API Documentation */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">API Documentation</h3>
        <p className="text-gray-600 mb-4">
          Synthea Studio provides a RESTful API for programmatic access to all features.
          The API is currently connected to: <code className="bg-gray-100 px-2 py-1 rounded text-sm">{config.apiUrl}</code>
        </p>

        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Core Endpoints</h4>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2 font-mono text-sm">
              <div><span className="text-green-600">GET</span> /api/populations - List all populations</div>
              <div><span className="text-green-600">GET</span> /api/populations/:id - Get population details</div>
              <div><span className="text-blue-600">POST</span> /api/populations - Create new population</div>
              <div><span className="text-red-600">DELETE</span> /api/populations/:id - Delete population</div>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 mb-2">Generation Endpoints</h4>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2 font-mono text-sm">
              <div><span className="text-blue-600">POST</span> /api/generation/:id/start - Start generation</div>
              <div><span className="text-blue-600">POST</span> /api/generation/:id/stop - Stop generation</div>
              <div><span className="text-green-600">GET</span> /api/generation/progress/:id - Get progress</div>
              <div><span className="text-purple-600">WS</span> /api/generation/ws/:id - WebSocket for live updates</div>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 mb-2">Export Endpoints</h4>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2 font-mono text-sm">
              <div><span className="text-green-600">GET</span> /api/export/:id?format=fhir - Export as FHIR</div>
              <div><span className="text-green-600">GET</span> /api/export/:id?format=csv - Export as CSV</div>
              <div><span className="text-green-600">GET</span> /api/export/:id?format=ccda - Export as C-CDA</div>
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>Authentication:</strong> If configured, include your API key in the <code className="bg-yellow-100 px-1">X-API-Key</code> header.
          </p>
        </div>
      </div>

      {/* Project Links */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Project Links</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a
            href="https://github.com/synthetichealth/synthea"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <svg className="w-8 h-8 mr-3 text-gray-700" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" clipRule="evenodd" />
            </svg>
            <div>
              <div className="font-medium text-gray-900">Synthea on GitHub</div>
              <div className="text-sm text-gray-500">Source code & documentation</div>
            </div>
          </a>

          <a
            href="https://synthetichealth.github.io/synthea/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <svg className="w-8 h-8 mr-3 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <div>
              <div className="font-medium text-gray-900">Documentation</div>
              <div className="text-sm text-gray-500">Guides & tutorials</div>
            </div>
          </a>

          <a
            href="https://github.com/synthetichealth/synthea/wiki"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <svg className="w-8 h-8 mr-3 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <div>
              <div className="font-medium text-gray-900">Wiki</div>
              <div className="text-sm text-gray-500">In-depth information</div>
            </div>
          </a>

          <a
            href="https://groups.google.com/g/synthea"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <svg className="w-8 h-8 mr-3 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
            </svg>
            <div>
              <div className="font-medium text-gray-900">Community</div>
              <div className="text-sm text-gray-500">Discussion & support</div>
            </div>
          </a>
        </div>
      </div>

      {/* License Information */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">License Information</h3>
        <p className="text-gray-700 mb-3">
          Synthea™ is open source software made available under the Apache License, Version 2.0.
        </p>
        <p className="text-sm text-gray-600">
          Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
          You may obtain a copy of the License at{' '}
          <a href="http://www.apache.org/licenses/LICENSE-2.0" className="text-blue-600 hover:text-blue-800" target="_blank" rel="noopener noreferrer">
            http://www.apache.org/licenses/LICENSE-2.0
          </a>
        </p>
      </div>

      {/* Version Information */}
      <div className="text-center text-sm text-gray-500 pb-8">
        <p>Synthea Studio v1.0.0 | Synthea Engine v3.2.0</p>
        <p className="mt-1">Built with React, TypeScript, and Tailwind CSS</p>
      </div>
    </div>
  );
};
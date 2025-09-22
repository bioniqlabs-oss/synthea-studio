/**
 * About Page Component
 * Provides information about Synthea Studio and attribution to Synthea
 */

import React from 'react';

export default function About() {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">About Synthea Studio</h1>
        <p className="text-xl text-gray-600">
          A modern web interface for synthetic patient generation and EHR simulation
        </p>
      </div>

      {/* Synthea Attribution */}
      <div className="bg-blue-50 border-l-4 border-blue-400 p-6 rounded-lg">
        <h2 className="text-2xl font-semibold text-blue-900 mb-4">
          Powered by Synthea™
        </h2>
        <div className="space-y-3 text-gray-700">
          <p>
            Synthea Studio is built on top of{' '}
            <a
              href="https://github.com/synthetichealth/synthea"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline font-semibold"
            >
              Synthea™ Patient Generator
            </a>
            , an open-source synthetic patient generator that models the medical history of
            synthetic patients.
          </p>
          <p>
            Synthea™ is developed and maintained by{' '}
            <a
              href="https://mitre.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline"
            >
              The MITRE Corporation
            </a>
            {' '}and provides high-quality, synthetic, realistic but not real, patient data
            and associated health records covering every aspect of healthcare.
          </p>
          <div className="mt-4 p-4 bg-white rounded">
            <p className="text-sm text-gray-600 italic">
              Synthea™ is a Trademark of the MITRE Corporation. All rights reserved.
            </p>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Features</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold text-lg text-gray-800 mb-2">
              Population Generation
            </h3>
            <ul className="list-disc list-inside text-gray-600 space-y-1">
              <li>Create custom populations with specific demographics</li>
              <li>Configure disease prevalence and conditions</li>
              <li>Set age ranges, location, and gender distribution</li>
              <li>Generate FHIR R4, CSV, and C-CDA formats</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-lg text-gray-800 mb-2">
              EHR Simulation
            </h3>
            <ul className="list-disc list-inside text-gray-600 space-y-1">
              <li>Browse and search generated patients</li>
              <li>Query FHIR resources with advanced filters</li>
              <li>Test FHIR operations and endpoints</li>
              <li>Export data in multiple formats</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-lg text-gray-800 mb-2">
              Clinical Trial Support
            </h3>
            <ul className="list-disc list-inside text-gray-600 space-y-1">
              <li>Configure disease prevalence rates</li>
              <li>Generate only alive patients</li>
              <li>Include social determinants of health</li>
              <li>Support for US Core profiles</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-lg text-gray-800 mb-2">
              Data Management
            </h3>
            <ul className="list-disc list-inside text-gray-600 space-y-1">
              <li>PostgreSQL storage with JSONB for FHIR</li>
              <li>Population-based organization</li>
              <li>Automatic FHIR resource import</li>
              <li>Manual import fallback options</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Technical Details */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Technical Stack</h2>
        <div className="grid md:grid-cols-3 gap-4 text-sm">
          <div>
            <h3 className="font-semibold text-gray-800 mb-2">Frontend</h3>
            <ul className="text-gray-600 space-y-1">
              <li>React with TypeScript</li>
              <li>Vite build system</li>
              <li>TailwindCSS</li>
              <li>React Query</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-gray-800 mb-2">Backend</h3>
            <ul className="text-gray-600 space-y-1">
              <li>FastAPI (Python)</li>
              <li>SQLAlchemy ORM</li>
              <li>Celery task queue</li>
              <li>Redis pub/sub</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-gray-800 mb-2">Infrastructure</h3>
            <ul className="text-gray-600 space-y-1">
              <li>Docker Compose</li>
              <li>PostgreSQL 15</li>
              <li>WebSocket support</li>
              <li>FHIR R4 compliant</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Links and Resources */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Resources</h2>
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            <a
              href="https://github.com/synthetichealth/synthea"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline"
            >
              Synthea GitHub Repository
            </a>
          </div>
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <a
              href="https://github.com/synthetichealth/synthea/wiki"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline"
            >
              Synthea Documentation
            </a>
          </div>
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
            </svg>
            <a
              href="https://www.youtube.com/watch?v=JTn1kIjsDBE"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline"
            >
              Synthea Overview Video
            </a>
          </div>
        </div>
      </div>

      {/* License */}
      <div className="bg-gray-100 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">License Information</h2>
        <div className="space-y-3 text-sm text-gray-600">
          <p>
            Synthea™ is licensed under the Apache License, Version 2.0.
            See the{' '}
            <a
              href="https://github.com/synthetichealth/synthea/blob/master/LICENSE"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline"
            >
              LICENSE
            </a>
            {' '}file for details.
          </p>
          <p>
            Synthea Studio is an independent project that utilizes Synthea™ for synthetic
            patient generation. This project is not affiliated with or endorsed by The MITRE Corporation.
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center pt-8 border-t border-gray-200">
        <p className="text-gray-500 text-sm">
          © 2024 Synthea Studio | Built with ❤️ for the healthcare simulation community
        </p>
      </div>
    </div>
  );
}
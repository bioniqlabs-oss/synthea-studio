// Bootstrap file for standalone development mode
import React from 'react';
import ReactDOM from 'react-dom/client';
import { SyntheaStudio } from './SyntheaStudio';

// This is only used when running the core module in standalone development mode
const DevApp = () => {
  return (
    <div style={{ padding: '20px' }}>
      <h1 style={{ marginBottom: '20px' }}>Synthea Studio Core - Development Mode</h1>
      <SyntheaStudio
        apiUrl="http://localhost:8001"
        mode="full"
        features={{
          showHeader: true,
          showNavigation: true,
          allowCreate: true,
          allowDelete: true,
          allowExport: true,
          showAdvancedConfig: true,
        }}
        onPopulationCreated={(pop) => console.log('Population created:', pop)}
        onPatientsGenerated={(patients) => console.log('Patients generated:', patients)}
        onExportRequested={(data) => console.log('Export requested:', data)}
        onError={(error) => console.error('Error:', error)}
      />
    </div>
  );
};

// Only mount if we're running standalone (not being consumed as a module)
if (process.env.NODE_ENV === 'development' && !window.__POWERED_BY_WEBPACK_MODULE_FEDERATION__) {
  const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
  root.render(
    <React.StrictMode>
      <DevApp />
    </React.StrictMode>
  );
}
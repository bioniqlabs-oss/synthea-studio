import React from 'react';
import SyntheaStudio from '@synthea-studio/core';
import '@synthea-studio/core/dist/synthea-studio.css';

function App() {
  return (
    <div className="app">
      <SyntheaStudio
        apiUrl={import.meta.env.VITE_API_URL || 'http://localhost:8001'}
        mode="full"
        features={{
          showHeader: true,
          showNavigation: true,
          allowCreate: true,
          allowDelete: true,
          allowExport: true,
          showAdvancedConfig: true,
          enablePatients: true,
          enableFHIR: true,
          enableConfiguration: true
        }}
        defaultTab="generate"
      />
    </div>
  );
}

export default App;
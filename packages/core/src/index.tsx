import React from 'react';
import ReactDOM from 'react-dom/client';
import { SyntheaStudio } from './SyntheaStudio';
import './styles/index.css';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <SyntheaStudio
      mode="full"
      features={{
        showHeader: true,
        showNavigation: true,
        allowCreate: true,
        allowDelete: true,
        allowExport: true,
        showAdvancedConfig: true,
      }}
    />
  </React.StrictMode>
);
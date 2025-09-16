import React from 'react';

// Completely standalone component with no external dependencies
const StandaloneComponent: React.FC = () => {
  return React.createElement('div', {
    style: {
      padding: '20px',
      backgroundColor: '#4CAF50',
      color: 'white',
      textAlign: 'center' as const,
      borderRadius: '8px',
      margin: '20px'
    }
  }, 'Standalone Component Loaded Successfully! Module Federation is Working!');
};

export default StandaloneComponent;
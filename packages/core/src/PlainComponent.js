// Plain JavaScript Component - No TypeScript
import React from 'react';

function PlainComponent() {
  return React.createElement('div', {
    style: {
      padding: '20px',
      backgroundColor: '#2196F3',
      color: 'white',
      textAlign: 'center',
      borderRadius: '8px',
      margin: '20px'
    }
  }, 'Plain JS Component Works! Module Federation is functioning!');
}

// Use ESM export syntax
export default PlainComponent;
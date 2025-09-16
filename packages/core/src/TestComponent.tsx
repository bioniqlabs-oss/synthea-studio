import React from 'react';

const TestComponent: React.FC = () => {
  return (
    <div style={{ padding: '20px', background: '#f0f0f0', textAlign: 'center' }}>
      <h1>Test Component from Module Federation</h1>
      <p>If you can see this, module federation is working!</p>
    </div>
  );
};

export default TestComponent;
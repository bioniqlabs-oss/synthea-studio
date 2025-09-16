import React, { useState } from 'react';

const SimpleTestApp: React.FC = () => {
  const [status, setStatus] = useState<string>('Initial render');
  const [remoteComponent, setRemoteComponent] = useState<React.ComponentType | null>(null);

  console.log('SimpleTestApp rendering with status:', status);

  const loadRemoteModule = async () => {
    setStatus('Loading remote module...');
    console.log('Attempting to load remote module...');

    try {
      // Dynamic import of the remote module
      const module = await import('syntheaCore/TestComponent');
      console.log('Remote module loaded successfully:', module);

      if (module.default) {
        setRemoteComponent(() => module.default);
        setStatus('Remote module loaded successfully!');
      } else {
        setStatus('Remote module loaded but no default export found');
      }
    } catch (error) {
      console.error('Failed to load remote module:', error);
      setStatus(`Error loading remote: ${error}`);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Shell Application is Running!</h1>
      <p>Status: {status}</p>
      <p>Time: {new Date().toISOString()}</p>

      <div style={{ marginTop: '20px', padding: '10px', border: '1px solid #ccc' }}>
        <h2>Module Federation Test</h2>
        <button
          onClick={loadRemoteModule}
          style={{ padding: '10px 20px', fontSize: '16px', marginBottom: '10px' }}
        >
          Load Remote Module
        </button>

        {remoteComponent && (
          <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#f0f0f0' }}>
            <h3>Remote Component Loaded:</h3>
            {React.createElement(remoteComponent)}
          </div>
        )}
      </div>
    </div>
  );
};

export default SimpleTestApp;
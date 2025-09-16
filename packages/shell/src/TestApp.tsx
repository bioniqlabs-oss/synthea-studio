import React, { useState, useEffect, Suspense } from 'react';

console.log('TestApp module loading...');

const TestApp: React.FC = () => {
  console.log('TestApp component executing...');

  const [RemoteComponent, setRemoteComponent] = useState<React.ComponentType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    console.log(message);
    setLogs(prev => [...prev, `${new Date().toISOString()}: ${message}`]);
  };

  useEffect(() => {
    console.log('TestApp useEffect running...');
    const loadRemote = async () => {
      try {
        addLog('Starting to load remote module...');

        // Use dynamic import with webpack's Module Federation
        const module = await import('syntheaCore/TestComponent');
        addLog('Module imported successfully');
        addLog(`Module keys: ${Object.keys(module).join(', ')}`);

        if (module.default) {
          addLog('Found default export');
          setRemoteComponent(() => module.default);
        } else {
          addLog('No default export found');
          setError('No default export in module');
        }
      } catch (err: any) {
        addLog(`Error loading remote: ${err.message}`);
        setError(err.message);
        console.error('Full error:', err);
      }
    };

    loadRemote();
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Module Federation Test</h1>

      <div style={{ marginBottom: '20px' }}>
        <h2>Status</h2>
        {error ? (
          <div style={{ color: 'red' }}>Error: {error}</div>
        ) : RemoteComponent ? (
          <div style={{ color: 'green' }}>✅ Remote component loaded successfully!</div>
        ) : (
          <div>Loading remote component...</div>
        )}
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h2>Logs</h2>
        <div style={{
          backgroundColor: '#f0f0f0',
          padding: '10px',
          maxHeight: '300px',
          overflow: 'auto',
          fontSize: '12px'
        }}>
          {logs.map((log, i) => (
            <div key={i}>{log}</div>
          ))}
        </div>
      </div>

      {RemoteComponent && (
        <div style={{ border: '2px solid green', padding: '20px', marginTop: '20px' }}>
          <h2>Remote Component Rendered:</h2>
          <Suspense fallback={<div>Loading component...</div>}>
            <RemoteComponent />
          </Suspense>
        </div>
      )}
    </div>
  );
};

export default TestApp;
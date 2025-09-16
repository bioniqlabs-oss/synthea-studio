import React, { useEffect, useState } from 'react';

const TestSimple: React.FC = () => {
  const [status, setStatus] = useState<string>('Initializing...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const testModuleFederation = async () => {
      try {
        setStatus('Checking if remoteEntry.js is accessible...');

        // First, check if the URL is accessible
        const response = await fetch('http://localhost:3002/remoteEntry.js');
        if (!response.ok) {
          throw new Error(`Failed to fetch remoteEntry.js: ${response.status}`);
        }

        setStatus('remoteEntry.js is accessible. Loading script...');

        // Load the script dynamically
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'http://localhost:3002/remoteEntry.js';
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });

        setStatus('Script loaded. Checking for syntheaCore...');

        // Check if syntheaCore is available
        if (!(window as any).syntheaCore) {
          throw new Error('syntheaCore not found on window');
        }

        setStatus('✅ Module Federation is working! syntheaCore is loaded.');

      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setStatus('❌ Failed to load Module Federation');
      }
    };

    testModuleFederation();
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Module Federation Test</h1>
      <p>Status: {status}</p>
      {error && (
        <div style={{ color: 'red', marginTop: '10px' }}>
          <strong>Error:</strong> {error}
        </div>
      )}
      <div style={{ marginTop: '20px', fontSize: '12px', color: '#666' }}>
        <p>Core URL: http://localhost:3002/remoteEntry.js</p>
        <p>Time: {new Date().toISOString()}</p>
      </div>
    </div>
  );
};

export default TestSimple;
import React, { lazy, Suspense, useState, useEffect } from 'react';

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

interface RemoteLoaderProps {
  fallback?: React.ReactNode;
  error?: React.ReactNode;
  children?: (Component: React.ComponentType<any>) => React.ReactNode;
}

export const RemoteLoader: React.FC<RemoteLoaderProps> = ({
  fallback = <div>Loading...</div>,
  error: errorComponent,
  children
}) => {
  const [Component, setComponent] = useState<React.ComponentType<any> | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const loadComponent = async () => {
      try {
        // Try to load the remote module
        const module = await import('syntheaCore/SyntheaStudio');
        setComponent(() => module.default || module);
        setError(null);
      } catch (err) {
        console.error('Failed to load remote module:', err);
        setError(err as Error);

        // Retry if we haven't exceeded max retries
        if (retryCount < MAX_RETRIES) {
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
          }, RETRY_DELAY);
        }
      }
    };

    loadComponent();
  }, [retryCount]);

  if (error && retryCount >= MAX_RETRIES) {
    if (errorComponent) {
      return <>{errorComponent}</>;
    }
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center p-8 bg-red-50 rounded-lg">
          <h2 className="text-2xl font-bold text-red-600 mb-2">Failed to load Synthea Studio</h2>
          <p className="text-gray-700 mb-4">{error.message}</p>
          <button
            onClick={() => setRetryCount(0)}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!Component) {
    return <>{fallback}</>;
  }

  if (children) {
    return <>{children(Component)}</>;
  }

  return <Component />;
};
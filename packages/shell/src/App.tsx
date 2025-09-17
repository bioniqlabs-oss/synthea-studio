import React, { useState, useEffect } from 'react';
import './styles.css';

// Try to load the remote module with retries
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;

const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
      <p className="mt-4 text-gray-600">Loading Synthea Studio Module...</p>
    </div>
  </div>
);

const ErrorFallback = ({ error, onRetry }: { error: Error; onRetry: () => void }) => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-center p-8 bg-red-50 rounded-lg max-w-2xl">
      <h2 className="text-2xl font-bold text-red-600 mb-2">Failed to load Synthea Studio</h2>
      <p className="text-gray-700 mb-4">{error.message}</p>
      <details className="text-left mb-4">
        <summary className="cursor-pointer text-sm text-gray-600">Error Details</summary>
        <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">{error.stack}</pre>
      </details>
      <div className="space-x-4">
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          Reload Page
        </button>
      </div>
    </div>
  </div>
);

class ErrorBoundary extends React.Component<
  { children: React.ReactNode; onRetry?: () => void },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode; onRetry?: () => void }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return <ErrorFallback
        error={this.state.error}
        onRetry={() => {
          this.setState({ hasError: false, error: null });
          if (this.props.onRetry) this.props.onRetry();
        }}
      />;
    }

    return this.props.children;
  }
}

function App() {
  const [SyntheaStudio, setSyntheaStudio] = useState<React.ComponentType<any> | null>(null);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const loadRemoteModule = async () => {
      try {
        // Wait a bit to ensure the remote is ready
        if (retryCount === 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Load the SyntheaStudio component from the remote module
        const module = await import('syntheaCore/SyntheaStudio');
        console.log('Loaded module:', module);
        console.log('Module keys:', Object.keys(module));

        // The module should have a default export that is the component
        let Component = module.default;

        // If default is a getter, call it
        if (Component && Object.getOwnPropertyDescriptor(module, 'default')?.get) {
          console.log('Default is a getter, calling it...');
          Component = module.default;
        }

        // If default doesn't exist or is not a function, try named export
        if (!Component || typeof Component !== 'function') {
          Component = module.SyntheaStudio;
        }

        console.log('Component type:', typeof Component);
        console.log('Component:', Component);

        if (!Component || typeof Component !== 'function') {
          console.error('Component validation failed:', {
            Component,
            type: typeof Component,
            keys: Object.keys(module),
            module,
            default: module.default,
            SyntheaStudio: module.SyntheaStudio,
            descriptor: Object.getOwnPropertyDescriptor(module, 'default')
          });
          throw new Error('Invalid SyntheaStudio component - not a function');
        }

        setSyntheaStudio(() => Component);
        setLoadError(null);
      } catch (error) {
        console.error('Failed to load remote module:', error);
        setLoadError(error as Error);

        // Retry if we haven't exceeded max retries
        if (retryCount < MAX_RETRIES - 1) {
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
          }, RETRY_DELAY);
        }
      }
    };

    loadRemoteModule();
  }, [retryCount]);

  const handleRetry = () => {
    setRetryCount(0);
    setLoadError(null);
  };

  if (loadError && retryCount >= MAX_RETRIES - 1) {
    return <ErrorFallback error={loadError} onRetry={handleRetry} />;
  }

  if (!SyntheaStudio) {
    return <LoadingFallback />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ErrorBoundary onRetry={handleRetry}>
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
          onPopulationCreated={(population: any) => {
            console.log('Population created:', population);
          }}
          onPatientsGenerated={(patients: any) => {
            console.log('Patients generated:', patients);
          }}
        />
      </ErrorBoundary>
    </div>
  );
}

export default App;
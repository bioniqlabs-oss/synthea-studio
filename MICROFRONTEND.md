# Synthea Studio Micro-Frontend Integration Guide

## Overview

Synthea Studio is implemented as a micro-frontend using Webpack 5 Module Federation. This allows it to be:
- Run as a standalone application
- Embedded into other applications (like the Realization Engine)
- Deployed and scaled independently

## Quick Start

### Running Synthea Studio Standalone

```bash
# Start all services
docker-compose -f docker-compose.dev.yml up

# Access the application
open http://localhost:3001
```

### Embedding in Your Application

#### 1. Configure Webpack Module Federation

Add to your webpack.config.js:

```javascript
const ModuleFederationPlugin = require('webpack/lib/container/ModuleFederationPlugin');

module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      name: 'yourApp',
      remotes: {
        syntheaCore: 'syntheaCore@http://your-synthea-host:3002/remoteEntry.js',
      },
      shared: {
        react: { singleton: true, requiredVersion: '^18.0.0' },
        'react-dom': { singleton: true, requiredVersion: '^18.0.0' },
        '@tanstack/react-query': { singleton: true },
      },
    }),
  ],
};
```

#### 2. Use the Bootstrap Pattern

Create a separate bootstrap file to avoid eager consumption errors:

**index.js:**
```javascript
import('./bootstrap');
```

**bootstrap.js:**
```javascript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
```

#### 3. Import and Use Components

```javascript
import React, { lazy, Suspense } from 'react';

const SyntheaStudio = lazy(() => import('syntheaCore/SyntheaStudio'));

function App() {
  return (
    <Suspense fallback={<div>Loading Synthea Studio...</div>}>
      <SyntheaStudio
        mode="full"
        apiUrl="http://localhost:8001"
        features={{
          showHeader: true,
          showNavigation: true,
          allowCreate: true,
          allowDelete: true,
          allowExport: true,
        }}
        onPopulationCreated={(population) => {
          console.log('Population created:', population);
        }}
        onPatientsGenerated={(patients) => {
          console.log('Patients generated:', patients);
        }}
      />
    </Suspense>
  );
}
```

## Component Props

### SyntheaStudio Props

| Prop | Type | Description |
|------|------|-------------|
| `mode` | `'full' \| 'compact' \| 'widget'` | Display mode |
| `apiUrl` | `string` | Backend API URL |
| `features` | `object` | Feature flags |
| `onPopulationCreated` | `function` | Callback when population is created |
| `onPatientsGenerated` | `function` | Callback when patients are generated |

### Feature Flags

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `showHeader` | `boolean` | `true` | Show application header |
| `showNavigation` | `boolean` | `true` | Show navigation menu |
| `allowCreate` | `boolean` | `true` | Allow creating populations |
| `allowDelete` | `boolean` | `true` | Allow deleting populations |
| `allowExport` | `boolean` | `true` | Allow exporting data |
| `showAdvancedConfig` | `boolean` | `false` | Show advanced configuration options |

## Architecture

```
┌─────────────────────────────────────┐
│         Host Application            │
│  (Realization Engine or Shell)      │
│                                     │
│  ┌─────────────────────────────┐   │
│  │   Module Federation Loader   │   │
│  └──────────┬──────────────────┘   │
│             │                       │
└─────────────┼───────────────────────┘
              │
              │ Loads remoteEntry.js
              │
┌─────────────▼───────────────────────┐
│       Synthea Core Module           │
│         (Port 3002)                 │
│                                     │
│  ┌─────────────────────────────┐   │
│  │     SyntheaStudio           │   │
│  │     PopulationManager       │   │
│  │     PatientGenerator        │   │
│  └─────────────────────────────┘   │
│                                     │
└─────────────────────────────────────┘
```

## Docker Setup

### Development Environment

```yaml
services:
  # Core module - exposes components
  synthea-core:
    build:
      context: ./packages/core
      dockerfile: Dockerfile.dev
    ports:
      - "3002:3002"
    environment:
      NODE_ENV: development
      PORT: 3002

  # Shell application - consumes core
  synthea-shell:
    build:
      context: ./packages/shell
      dockerfile: Dockerfile.dev
    ports:
      - "3001:3001"
    environment:
      NODE_ENV: development
      PORT: 3001
    depends_on:
      - synthea-core
```

## Testing

### Verify Module Federation

1. Open the verification page:
```bash
open http://localhost:8080/verify-federation.html
```

2. Check browser console for any errors

3. Verify the following loads successfully:
   - `/syntheaCore/remoteEntry.js`
   - Shared React modules
   - SyntheaStudio component

### Manual Testing

1. Access the shell application at `http://localhost:3001`
2. Create a new population
3. Generate patients
4. Export data
5. Verify all features work as expected

## Troubleshooting

### Common Issues

#### "Loading script failed"
- Ensure core module is running on port 3002
- Check proxy configuration in webpack
- Verify CORS headers are set

#### "Shared module is not available for eager consumption"
- Use the bootstrap pattern
- Ensure shared modules are not marked as eager

#### "Module not found: Error: Can't resolve 'syntheaCore/SyntheaStudio'"
- Check that the core module is exposing the component
- Verify the remote URL is correct
- Ensure Module Federation plugin is configured

### Debug Tips

1. **Check Network Tab**: Verify remoteEntry.js loads successfully
2. **Console Errors**: Look for specific Module Federation errors
3. **Container Logs**: Check Docker logs for compilation errors
4. **Test in Isolation**: Use the test HTML files to isolate issues

## Production Deployment

### Building for Production

```bash
# Build core module
cd packages/core
npm run build

# Build shell application
cd packages/shell
npm run build
```

### Deployment Options

1. **Same Origin**: Deploy both modules on the same domain
2. **Different Origins**: Use CORS headers and absolute URLs
3. **CDN**: Host remoteEntry.js on a CDN for better performance

### Security Considerations

- Always use HTTPS in production
- Implement proper CORS policies
- Validate all data from federated modules
- Use Content Security Policy headers

## API Integration

The micro-frontend expects the following backend endpoints:

- `GET /api/populations` - List populations
- `POST /api/populations` - Create population
- `DELETE /api/populations/{id}` - Delete population
- `POST /api/populations/{id}/generate` - Generate patients
- `GET /api/populations/{id}/patients` - List patients
- `POST /api/export` - Export data

Ensure your backend implements these endpoints or configure the `apiUrl` prop accordingly.
# Synthea Studio - Micro-Frontend Integration Guide

## Overview

Synthea Studio is designed as a **micro-frontend** that can run:
1. **Standalone** - As an independent application
2. **Embedded** - Within other applications like the Realization Engine

## Architecture

```
synthea-studio/
├── packages/
│   ├── core/          # Micro-frontend module (shared)
│   └── shell/         # Standalone wrapper app
└── backend/           # API backend
```

## Integration Methods

### 1. Module Federation (Recommended)

The core module exposes components via Webpack Module Federation:

```javascript
// In your host application
const SyntheaStudio = lazy(() =>
  import('syntheaCore/SyntheaStudio')
);

// Use it as a component
<SyntheaStudio
  mode="compact"
  onPopulationCreated={handlePopulation}
/>
```

### 2. NPM Package

```bash
npm install @synthea-studio/core
```

```javascript
import { SyntheaStudio } from '@synthea-studio/core';
```

### 3. Script Tag

```html
<script src="https://synthea.yourdomain.com/remoteEntry.js"></script>
<div id="synthea-root"></div>
<script>
  syntheaCore.mount('synthea-root', {
    mode: 'widget'
  });
</script>
```

## Development Setup

### Running Standalone

```bash
# Start all services
docker-compose up

# Access at http://localhost:3001
```

### Integration with Realization Engine

The Realization Engine's `docker-compose.dev.yml` includes Synthea Studio services:

```bash
# From realization-engine directory
docker-compose -f docker-compose.dev.yml up

# Synthea Studio core module: http://localhost:3002
# Realization Engine with integration: http://localhost:3000
```

## Configuration

### Environment Variables

```bash
# Synthea Studio
SYNTHEA_CORE_URL=http://localhost:3002/remoteEntry.js
API_URL=http://localhost:8001

# For production
SYNTHEA_CORE_URL=https://cdn.synthea.io/remoteEntry.js
API_URL=https://api.synthea.io
```

### API Configuration

The micro-frontend accepts an `apiUrl` prop:

```javascript
<SyntheaStudio
  apiUrl="https://api.synthea.io"
  apiKey="your-api-key"
/>
```

## Features Configuration

Control which features are available:

```javascript
<SyntheaStudio
  features={{
    showHeader: false,      // Hide header in embedded mode
    showNavigation: false,  // Hide navigation
    allowCreate: true,      // Allow creating populations
    allowDelete: false,     // Disable deletion
    allowExport: true,      // Enable export
    showAdvancedConfig: false // Hide advanced settings
  }}
/>
```

## Styling

The micro-frontend uses scoped styles with CSS-in-JS. Custom themes can be provided:

```javascript
<SyntheaStudio
  theme={{
    primaryColor: '#007bff',
    fontFamily: 'Inter, sans-serif',
    borderRadius: '8px'
  }}
/>
```

## Communication

### Event Callbacks

```javascript
<SyntheaStudio
  onPopulationCreated={(population) => {
    console.log('New population:', population);
  }}
  onPatientsGenerated={(patients) => {
    loadIntoWorkflow(patients);
  }}
  onError={(error) => {
    handleError(error);
  }}
/>
```

### Programmatic API

```javascript
import { api } from 'syntheaCore/api';

// Direct API calls
const populations = await api.getPopulations();
const newPop = await api.createPopulation({
  name: 'Diabetes Study',
  size: 100
});
```

## Production Deployment

### Using Docker

```bash
# Build images
docker-compose -f docker-compose.prod.yml build

# Deploy
docker-compose -f docker-compose.prod.yml up -d
```

### CDN Deployment

1. Build the core module:
```bash
cd packages/core
npm run build
```

2. Upload `dist/remoteEntry.js` and chunks to CDN

3. Configure host applications to load from CDN:
```javascript
const SYNTHEA_CORE_URL = 'https://cdn.synthea.io/remoteEntry.js';
```

## Security Considerations

1. **CORS**: Configure CORS headers for cross-origin module loading
2. **Authentication**: Use API keys or OAuth for backend access
3. **CSP**: Update Content Security Policy to allow module loading
4. **Isolation**: Modules run in isolated contexts

## Troubleshooting

### Module Not Loading

1. Check CORS headers on the module server
2. Verify the `remoteEntry.js` URL is accessible
3. Ensure shared dependencies match versions

### Style Conflicts

- Use CSS modules or CSS-in-JS
- Prefix all class names with `synthea-`
- Use Shadow DOM for complete isolation

### State Management

- Each instance maintains its own state
- Use callbacks for cross-module communication
- Consider a shared event bus for complex integrations

## Repository Structure

**Open Source (Public)**
- Repository: `github.com/your-org/synthea-studio`
- License: Apache 2.0
- Contains: Core module, shell app, backend

**Proprietary (Private)**
- Repository: Internal GitLab/GitHub
- Contains: Realization Engine
- Integrates: Synthea Studio via module federation

## Support

For issues and questions:
- Synthea Studio: [GitHub Issues](https://github.com/your-org/synthea-studio/issues)
- Integration Support: contact@your-org.com
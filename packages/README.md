# Synthea Studio Packages

This directory contains the micro-frontend architecture for Synthea Studio.

## Structure

```
packages/
├── core/       # The micro-frontend module (can be embedded in other apps)
└── shell/      # The standalone application wrapper
```

## Core Package (`@synthea-studio/core`)

The core package is the main micro-frontend module that:
- Exposes all Synthea Studio functionality via Module Federation
- Can be embedded in other applications
- Contains all UI components, services, and business logic
- Runs on port 3002 in development

### Exposed Modules:
- `./SyntheaStudio` - Main component
- `./PopulationManager` - Population management component
- `./PatientGenerator` - Patient generation component
- `./ExportPanel` - Data export component
- `./hooks/*` - React hooks for integration
- `./api` - API service functions

## Shell Package (`@synthea-studio/shell`)

The shell package is a minimal wrapper that:
- Provides a standalone application experience
- Consumes the core module via Module Federation
- Adds routing and basic application structure
- Runs on port 3001 in development

## Development

### Run both packages together:
```bash
# From synthea-studio root directory
docker-compose -f docker-compose.dev.yml up
```

### Run packages individually:
```bash
# Core module
cd packages/core
npm install
npm run dev

# Shell application
cd packages/shell
npm install
npm run dev
```

## Integration

To integrate Synthea Studio into your application:

1. **Via Module Federation:**
```javascript
// In your webpack config
new ModuleFederationPlugin({
  remotes: {
    syntheaCore: 'syntheaCore@http://localhost:3002/remoteEntry.js'
  }
})

// In your component
const SyntheaStudio = lazy(() => import('syntheaCore/SyntheaStudio'));
```

2. **Via NPM (future):**
```bash
npm install @synthea-studio/core
```

## Building for Production

```bash
# Build core module
cd packages/core
npm run build

# Build shell application
cd packages/shell
npm run build
```

## Testing

```bash
# Run tests for core
cd packages/core
npm test

# Run tests for shell
cd packages/shell
npm test
```
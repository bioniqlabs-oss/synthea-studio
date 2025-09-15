# Synthea Studio Frontend

React-based web interface for Synthea Studio population management.

## Technology Stack

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite 7** - Build tool and dev server
- **Tailwind CSS 4** - Styling
- **React Query** - Server state management
- **React Router** - Client-side routing
- **Axios** - HTTP client

## Development

### Prerequisites

- Node.js 20+
- npm or yarn

### Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Type checking
npm run typecheck

# Linting
npm run lint
```

### Environment Variables

Create a `.env` file in the frontend directory:

```env
VITE_API_URL=http://localhost:8001
VITE_WS_URL=ws://localhost:8001
```

## Project Structure

```
src/
├── components/       # Reusable UI components
├── pages/           # Route-based page components
├── services/        # API client and services
├── utils/           # Utility functions
├── hooks/           # Custom React hooks
├── types/           # TypeScript type definitions
└── styles/          # Global styles and themes
```

## Key Features

### Population Management
- Create, view, update, and delete populations
- Real-time generation progress tracking
- Batch operations support

### Templates
- Pre-configured population templates
- Template customization
- Quick start for common scenarios

### Data Export
- FHIR bundle export
- CSV export
- C-CDA export

## API Integration

The frontend communicates with the FastAPI backend through:
- RESTful API endpoints for CRUD operations
- WebSocket connections for real-time updates
- File download endpoints for exports

## Testing

```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e
```

## Building for Production

```bash
# Build optimized production bundle
npm run build

# Preview production build
npm run preview

# Build and analyze bundle size
npm run build:analyze
```

## Docker

```bash
# Build Docker image
docker build -t synthea-studio-frontend .

# Run container
docker run -p 3000:80 synthea-studio-frontend
```

## Contributing

See the main [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.

## License

Apache License 2.0
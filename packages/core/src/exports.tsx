// Module federation exports
// Export SyntheaStudio as the default export
import { SyntheaStudio } from './SyntheaStudio';

export default SyntheaStudio;

// Also export as named export for flexibility
export { SyntheaStudio };

// Re-export other components
export { PopulationManager } from './components/PopulationManager';
export { PatientGenerator } from './components/PatientGenerator';
export { ExportPanel } from './components/ExportPanel';
export { PopulationDashboard } from './components/PopulationDashboard';

// Re-export hooks
export { usePopulations } from './hooks/usePopulations';
export { useGenerator } from './hooks/useGenerator';
export { useExport } from './hooks/useExport';

// Re-export API functions
export * as api from './services/api';

// Re-export types
export type {
  Population,
  PopulationConfig,
  ExportFormat,
  Patient,
  GenerationJob,
  ExportRequest,
  ApiResponse,
  PaginatedResponse,
} from './types';
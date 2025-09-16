declare module 'syntheaCore/WorkingExport';
declare module 'syntheaCore/PlainComponent';
declare module 'syntheaCore/StandaloneComponent';
declare module 'syntheaCore/TestComponent';
declare module 'syntheaCore/SimpleExport';
declare module 'syntheaCore/DirectExport';
declare module 'syntheaCore/SyntheaStudio';
declare module 'syntheaCore/SyntheaStudioDirect';
declare module 'syntheaCore/exports';
declare module 'syntheaCore/PopulationManager';
declare module 'syntheaCore/PatientGenerator';
declare module 'syntheaCore/ExportPanel';
declare module 'syntheaCore/hooks/usePopulations';
declare module 'syntheaCore/hooks/useGenerator';
declare module 'syntheaCore/api';

interface Window {
  syntheaCore: any;
  __webpack_init_sharing__: (scope: string) => Promise<void>;
  __webpack_share_scopes__: any;
}
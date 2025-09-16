// Remote Module Loader with proper initialization

declare global {
  interface Window {
    [key: string]: any;
  }
}

export async function loadRemoteModule(remoteName: string, moduleName: string) {
  console.log(`Loading remote module: ${remoteName}/${moduleName}`);

  // Ensure the remote container is loaded
  if (!window[remoteName]) {
    throw new Error(`Remote container ${remoteName} not found`);
  }

  // Initialize the container with shared dependencies
  try {
    await window[remoteName].init(__webpack_share_scopes__.default);
    console.log(`Initialized ${remoteName} container`);
  } catch (e) {
    console.log(`Container ${remoteName} already initialized or error:`, e);
  }

  // Get the module factory
  const factory = await window[remoteName].get(moduleName);
  console.log(`Got factory for ${moduleName}:`, factory);

  // Execute the factory to get the module
  const Module = factory();
  console.log(`Module ${moduleName} loaded:`, Module);

  return Module;
}

export async function loadComponent(remoteName: string, moduleName: string) {
  try {
    const Module = await loadRemoteModule(remoteName, moduleName);

    // Try to extract the component
    const Component = Module.default || Module;

    if (typeof Component === 'function') {
      return Component;
    }

    throw new Error(`Module ${moduleName} is not a valid React component`);
  } catch (error) {
    console.error(`Failed to load component ${remoteName}/${moduleName}:`, error);
    throw error;
  }
}
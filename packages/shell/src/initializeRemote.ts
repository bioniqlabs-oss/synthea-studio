// Initialize remote container before webpack tries to use it
declare global {
  interface Window {
    syntheaCore?: any;
  }
}

export async function initializeRemote(): Promise<void> {
  // Check if already loaded - try both window and global scope
  if (window.syntheaCore || (window as any)['syntheaCore']) {
    console.log('Remote container already loaded');
    return;
  }

  console.log('Loading remote container from http://localhost:3002/remoteEntry.js');

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'http://localhost:3002/remoteEntry.js';
    script.async = true;

    script.onload = () => {
      console.log('Remote container script loaded');

      // Try to find syntheaCore in various places
      const container = window.syntheaCore || (window as any)['syntheaCore'] || (globalThis as any).syntheaCore;

      if (container) {
        console.log('syntheaCore container is available');
        // Make sure it's on window for webpack to find
        window.syntheaCore = container;
        resolve();
      } else {
        // The script loaded but syntheaCore isn't global - this is expected with module federation
        // The container will be available to webpack's module system
        console.log('Container loaded (will be available to webpack module system)');
        resolve();
      }
    };

    script.onerror = () => {
      reject(new Error('Failed to load remote container script'));
    };

    document.head.appendChild(script);
  });
}
// Test entry to ensure TestComponent chunk is generated
import('./TestComponent.tsx').then(module => {
  console.log('TestComponent loaded:', module);
});
// This is the entry point that webpack sees
// Standard Module Federation bootstrap pattern
import('./bootstrap')
  .then(() => {
    console.log('Bootstrap loaded successfully');
  })
  .catch(err => {
    console.error('Failed to load bootstrap:', err);
  });
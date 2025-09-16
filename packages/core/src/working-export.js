// Working Export - Explicit function export
const React = require('react');

// Create component as a function
function WorkingComponent() {
  return React.createElement('div', {
    style: {
      padding: '20px',
      backgroundColor: '#FF9800',
      color: 'white',
      textAlign: 'center',
      borderRadius: '8px',
      margin: '20px',
      fontSize: '18px',
      fontWeight: 'bold'
    }
  }, '🎉 SUCCESS! Module Federation is working! This component loaded correctly!');
}

// Log for debugging
console.log('[WorkingExport] Component type:', typeof WorkingComponent);
console.log('[WorkingExport] Component:', WorkingComponent);

// Return the component directly
export default WorkingComponent;
// Simple Node.js test to verify Module Federation exports
const https = require('http');

async function testModuleFederation() {
  console.log('Testing Module Federation...');

  try {
    // Test 1: Check if remoteEntry.js is accessible
    const response = await fetch('http://localhost:3002/remoteEntry.js');
    if (response.ok) {
      console.log('✅ remoteEntry.js is accessible');
      const content = await response.text();

      // Test 2: Check if modules are properly exposed
      const hasTestComponent = content.includes('"./TestComponent"');
      const hasWorkingExport = content.includes('"./WorkingExport"');
      const hasNoErrors = !content.includes('Cannot find module');

      console.log(`✅ TestComponent exposed: ${hasTestComponent}`);
      console.log(`✅ WorkingExport exposed: ${hasWorkingExport}`);
      console.log(`✅ No module errors: ${hasNoErrors}`);

      if (hasTestComponent && hasWorkingExport && hasNoErrors) {
        console.log('🎉 Module Federation appears to be working correctly!');
        console.log('You can now test the shell application at http://localhost:3001');
      } else {
        console.log('❌ Module Federation has issues');
      }
    } else {
      console.log('❌ remoteEntry.js is not accessible');
    }
  } catch (error) {
    console.error('❌ Error testing Module Federation:', error.message);
  }
}

testModuleFederation();
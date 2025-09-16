// Node.js script to test if Module Federation actually works

async function testModuleFederation() {
  console.log('Testing Module Federation in actual browser...');

  // First, let's do a simple HTTP test
  try {
    const response = await fetch('http://localhost:3001/');
    if (response.ok) {
      console.log('✅ Shell app is accessible');
    }
  } catch (error) {
    console.log('❌ Shell app not accessible:', error.message);
    return;
  }

  // Test if we can actually load and execute the remote
  console.log('\nTesting if TestComponent can actually be loaded...');

  // We'll use eval to simulate what the browser does
  try {
    // This simulates what happens in the browser
    console.log('Fetching remoteEntry.js...');
    const remoteResponse = await fetch('http://localhost:3002/remoteEntry.js');
    const remoteCode = await remoteResponse.text();

    // Check if the remote defines the expected container
    if (remoteCode.includes('syntheaCore') && remoteCode.includes('./TestComponent')) {
      console.log('✅ Remote entry contains syntheaCore and TestComponent');
    } else {
      console.log('❌ Remote entry missing expected exports');
    }

    // Check if TestComponent chunk exists
    const chunkResponse = await fetch('http://localhost:3002/src_TestComponent_tsx.js');
    if (chunkResponse.ok) {
      console.log('✅ TestComponent chunk is accessible');
    } else {
      console.log('❌ TestComponent chunk not found');
    }

    console.log('\n🔍 To fully verify, open http://localhost:3001 in your browser');
    console.log('   Click "Load Remote Module" button and check if TestComponent renders');

  } catch (error) {
    console.log('❌ Error testing federation:', error.message);
  }
}

testModuleFederation();
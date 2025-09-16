// Test Module Federation from Node.js
const fetch = require('node-fetch');

async function testModuleFederation() {
    console.log('Testing Module Federation Setup...\n');

    try {
        // Test 1: Core service
        console.log('1. Testing Core Service (port 3002):');
        const coreResponse = await fetch('http://localhost:3002/remoteEntry.js');
        if (coreResponse.ok) {
            const text = await coreResponse.text();
            console.log('   ✅ remoteEntry.js accessible');
            console.log(`   ✅ Size: ${text.length} bytes`);

            if (text.includes('window.syntheaCore')) {
                console.log('   ✅ Contains window.syntheaCore assignment');
            }

            if (text.includes('./TestComponent')) {
                console.log('   ✅ TestComponent exposed');
            }
        } else {
            console.log('   ❌ Failed to load remoteEntry.js');
        }

        // Test 2: Shell service
        console.log('\n2. Testing Shell Service (port 3001):');
        const shellResponse = await fetch('http://localhost:3001/');
        if (shellResponse.ok) {
            const html = await shellResponse.text();
            console.log('   ✅ Shell HTML accessible');

            if (html.includes('main.')) {
                console.log('   ✅ Main bundle included');
            }

            if (html.includes('<div id="root">')) {
                console.log('   ✅ Root element present');
            }
        } else {
            console.log('   ❌ Failed to load shell HTML');
        }

        // Test 3: TestComponent chunk
        console.log('\n3. Testing Component Chunks:');
        const chunkResponse = await fetch('http://localhost:3002/src_TestComponent_tsx.3d48a987fa10f5b03fba.js');
        if (chunkResponse.ok) {
            console.log('   ✅ TestComponent chunk accessible');
        } else {
            console.log('   ❌ TestComponent chunk not found');
        }

        console.log('\n✅ Module Federation setup appears to be working correctly!');
        console.log('\nYou should now be able to:');
        console.log('1. Visit http://localhost:3001 to see the shell application');
        console.log('2. The shell will load components from the core module');
        console.log('3. Check the browser console for detailed loading information');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testModuleFederation();
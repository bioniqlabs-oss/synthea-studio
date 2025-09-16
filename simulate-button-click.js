// This simulates what happens when "Load Remote Module" button is clicked
// Based on SimpleTestApp.tsx loadRemoteModule() function

const vm = require('vm');

async function simulateButtonClick() {
    console.log('\n🖱️  Simulating "Load Remote Module" button click...\n');
    console.log('This simulates the code from SimpleTestApp.tsx loadRemoteModule():\n');

    try {
        // Step 1: Fetch remoteEntry.js (simulating script tag load)
        console.log('[1] Fetching http://localhost:3002/remoteEntry.js...');
        const remoteResponse = await fetch('http://localhost:3002/remoteEntry.js');

        if (!remoteResponse.ok) {
            throw new Error(`Failed to fetch remoteEntry.js: ${remoteResponse.status}`);
        }

        const remoteCode = await remoteResponse.text();
        console.log(`✅ Fetched remoteEntry.js (${remoteCode.length} bytes)`);

        // Step 2: Create a simulated browser environment
        console.log('\n[2] Creating simulated browser environment...');
        const sandbox = {
            window: {},
            document: { createElement: () => ({}) },
            console: console,
            self: {},
            __webpack_require__: function(moduleId) {
                console.log(`  → webpack requiring module: ${moduleId}`);
                return {};
            }
        };

        // Step 3: Execute remoteEntry.js in sandbox
        console.log('\n[3] Executing remoteEntry.js to create syntheaCore container...');
        try {
            vm.createContext(sandbox);
            vm.runInContext(remoteCode, sandbox);

            if (sandbox.window.syntheaCore || sandbox.syntheaCore) {
                console.log('✅ syntheaCore container created');
            } else {
                console.log('❌ syntheaCore container NOT created');
                console.log('Available properties:', Object.keys(sandbox));
            }
        } catch (execError) {
            console.log('❌ Error executing remoteEntry.js:', execError.message);
        }

        // Step 4: Simulate the dynamic import that happens in the browser
        console.log('\n[4] Simulating: await import("syntheaCore/TestComponent")');
        console.log('In a real browser, this would:');
        console.log('  a) Check if syntheaCore container exists');
        console.log('  b) Call syntheaCore.get("./TestComponent")');
        console.log('  c) Load the chunk: src_TestComponent_tsx.js');

        // Step 5: Check if the TestComponent chunk is accessible
        console.log('\n[5] Checking if TestComponent chunk would load...');
        const chunkResponse = await fetch('http://localhost:3002/src_TestComponent_tsx.js');

        if (chunkResponse.ok) {
            const chunkSize = chunkResponse.headers.get('content-length');
            console.log(`✅ TestComponent chunk is accessible (${chunkSize} bytes)`);
            console.log('✅ In browser, this would successfully load TestComponent');
        } else {
            console.log(`❌ TestComponent chunk returned ${chunkResponse.status}`);
            console.log('❌ This would cause: ScriptExternalLoadError in browser');
        }

        // Step 6: Check other required chunks
        console.log('\n[6] Checking dependency chunks...');
        const chunks = [
            'vendors.js',
            'webpack_sharing_consume_default_react_react.js'
        ];

        for (const chunk of chunks) {
            const url = `http://localhost:3002/${chunk}`;
            const response = await fetch(url);
            if (response.ok) {
                console.log(`✅ ${chunk} is available`);
            } else {
                console.log(`⚠️  ${chunk} returned ${response.status} (might be dynamically named)`);
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('SUMMARY:');
        console.log('If all checks above passed, the button click should work.');
        console.log('If you still see errors, the issue might be:');
        console.log('  1. Browser caching old files');
        console.log('  2. Timing issue with async loading');
        console.log('  3. React version mismatch between shell and core');
        console.log('='.repeat(60));

    } catch (error) {
        console.error('\n❌ Simulation failed:', error.message);
        console.error('\nThis error would translate to ScriptExternalLoadError in browser');
    }
}

simulateButtonClick();
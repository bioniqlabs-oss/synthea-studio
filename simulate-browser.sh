#!/bin/bash

echo "Simulating browser Module Federation loading sequence..."
echo "============================================="

# Step 1: Check if shell app loads
echo "1. Loading shell app..."
if curl -s http://localhost:3001/ > /dev/null; then
    echo "✅ Shell app loads"
else
    echo "❌ Shell app failed to load"
    exit 1
fi

# Step 2: Check if remoteEntry.js is accessible from browser perspective
echo "2. Loading remoteEntry.js (as browser would)..."
REMOTE_SIZE=$(curl -s http://localhost:3002/remoteEntry.js | wc -c)
if [ $REMOTE_SIZE -gt 1000 ]; then
    echo "✅ remoteEntry.js accessible (size: $REMOTE_SIZE bytes)"
else
    echo "❌ remoteEntry.js not accessible or too small"
    exit 1
fi

# Step 3: Check if TestComponent chunk exists
echo "3. Checking if TestComponent chunk is loadable..."
CHUNK_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3002/src_TestComponent_tsx.js)
if [ $CHUNK_STATUS -eq 200 ]; then
    echo "✅ TestComponent chunk exists (HTTP $CHUNK_STATUS)"
else
    echo "❌ TestComponent chunk missing (HTTP $CHUNK_STATUS)"
    echo "   This would cause: ScriptExternalLoadError"
    exit 1
fi

# Step 4: Check for common chunk dependencies
echo "4. Checking for vendor chunks..."
VENDOR_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3002/vendors.js)
if [ $VENDOR_STATUS -eq 200 ]; then
    echo "✅ Vendor chunk exists"
else
    echo "⚠️  Vendor chunk might be named differently or loaded on-demand"
fi

# Step 5: Check CORS headers
echo "5. Checking CORS headers..."
CORS_HEADER=$(curl -s -I http://localhost:3002/remoteEntry.js | grep -i "access-control-allow-origin")
if [[ $CORS_HEADER == *"*"* ]]; then
    echo "✅ CORS headers are set correctly"
else
    echo "❌ CORS headers missing or incorrect"
    echo "   Found: $CORS_HEADER"
fi

echo ""
echo "============================================="
echo "If all checks pass but you still see errors in the browser:"
echo "1. Open browser DevTools Network tab"
echo "2. Click 'Load Remote Module' button"
echo "3. Look for any red (failed) requests"
echo "4. Check the Console for the specific error message"
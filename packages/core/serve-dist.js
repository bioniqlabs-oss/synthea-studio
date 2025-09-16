const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3003;

// Enable CORS for all origins
app.use(cors());

// Serve static files from dist directory
app.use(express.static(path.join(__dirname, 'dist')));

// Log requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

app.listen(PORT, () => {
  console.log(`Serving production build on http://localhost:${PORT}`);
  console.log(`remoteEntry.js available at http://localhost:${PORT}/remoteEntry.js`);
});
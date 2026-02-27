const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('=== DAFC OTB Frontend - Azure Startup ===');
console.log(`Node version: ${process.version}`);
console.log(`PORT: ${process.env.PORT || 3000}`);
console.log(`Environment: ${process.env.NODE_ENV || 'production'}`);

const standaloneDir = path.join(__dirname, '.next', 'standalone');
const serverPath = path.join(standaloneDir, 'server.js');

// Check if standalone server exists
if (!fs.existsSync(serverPath)) {
  console.error('ERROR: Standalone server not found at', serverPath);
  console.error('Please run "npm run build" first.');
  process.exit(1);
}

// Copy static assets if needed
require('./scripts/copy-assets.js');

// Set environment
process.env.PORT = process.env.PORT || process.env.WEBSITES_PORT || '3000';
process.env.HOSTNAME = '0.0.0.0';

// Start the standalone server
console.log('Starting standalone server...');
const server = spawn('node', [serverPath], {
  cwd: standaloneDir,
  stdio: 'inherit',
  env: {
    ...process.env,
    PORT: process.env.PORT,
    HOSTNAME: '0.0.0.0',
  },
});

server.on('error', (err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

server.on('close', (code) => {
  console.log(`Server exited with code ${code}`);
  process.exit(code);
});

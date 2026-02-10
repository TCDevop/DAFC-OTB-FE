const fs = require('fs');
const path = require('path');

console.log('=== Copying static assets to standalone folder ===');

const standaloneDir = path.join(__dirname, '..', '.next', 'standalone');

// Check if standalone folder exists
if (!fs.existsSync(standaloneDir)) {
  console.log('Standalone folder not found. Skipping asset copy.');
  process.exit(0);
}

// Copy public folder
const publicSrc = path.join(__dirname, '..', 'public');
const publicDest = path.join(standaloneDir, 'public');

if (fs.existsSync(publicSrc)) {
  copyFolderSync(publicSrc, publicDest);
  console.log('✓ Copied public/');
}

// Copy .next/static folder
const staticSrc = path.join(__dirname, '..', '.next', 'static');
const staticDest = path.join(standaloneDir, '.next', 'static');

if (fs.existsSync(staticSrc)) {
  fs.mkdirSync(path.join(standaloneDir, '.next'), { recursive: true });
  copyFolderSync(staticSrc, staticDest);
  console.log('✓ Copied .next/static/');
}

console.log('=== Done ===');

// Helper function to copy folder recursively
function copyFolderSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyFolderSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

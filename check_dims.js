const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

// Minimal PNG header parsing to get dimensions
function getPngDimensions(buffer) {
  if (buffer.toString('ascii', 1, 4) !== 'PNG') {
    return null;
  }
  // IHDR chunk starts at byte 8
  // Width is 4 bytes at byte 16
  // Height is 4 bytes at byte 20
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  return { width, height };
}

async function scanDir(dir) {
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await scanDir(fullPath);
    } else if (entry.name.endsWith('.png')) {
      const buffer = await fs.promises.readFile(fullPath);
      const dims = getPngDimensions(buffer);
      if (dims) {
        console.log(`${entry.name}: ${dims.width}x${dims.height}`);
      }
    }
  }
}

scanDir('c:/Users/Diegu/People/public/assets_dog/Pet Dogs Pack');

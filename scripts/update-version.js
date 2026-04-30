/**
 * Script para actualizar automáticamente la versión desde package.json
 * Ejecuta: node scripts/update-version.js
 *
 * Sincroniza:
 *   - src/app/version.ts (APP_VERSION)
 *   - public/sw.js       (CACHE_NAME = 'people-v<version>')
 *
 * Bumpear CACHE_NAME garantiza que cada deploy invalide el cache viejo del
 * service worker (evita el bug del loading screen infinito post-rebuild).
 */

const fs = require('fs');
const path = require('path');

const packageJsonPath = path.join(__dirname, '..', 'package.json');
const versionTsPath = path.join(__dirname, '..', 'src', 'app', 'version.ts');
const swPath = path.join(__dirname, '..', 'public', 'sw.js');

function syncVersionTs(version) {
  const current = fs.existsSync(versionTsPath) ? fs.readFileSync(versionTsPath, 'utf8') : '';
  const currentVersion = current.match(/APP_VERSION\s*=\s*['"]([^'"]+)['"]/)?.[1];
  if (currentVersion === version) {
    console.log(`⏭️  version.ts ya en ${version}`);
    return;
  }
  const content = `/**
 * Versión de la aplicación
 * Este archivo se genera automáticamente desde package.json
 * Ejecuta: npm run update-version
 * Última actualización: ${new Date().toISOString()}
 */
export const APP_VERSION = '${version}';
`;
  fs.writeFileSync(versionTsPath, content, 'utf8');
  console.log(`✅ version.ts → ${version}`);
}

function syncServiceWorker(version) {
  if (!fs.existsSync(swPath)) {
    console.log(`sw.js no existe - skip`);
    return;
  }
  const current = fs.readFileSync(swPath, 'utf8');
  // Build ID = timestamp -> cache nuevo en cada build aunque version no cambie
  const buildId = Date.now().toString(36);
  const desired = `'people-v${version}-${buildId}'`;
  const updated = current.replace(/(const\s+CACHE_NAME\s*=\s*)'[^']+'/, `$1${desired}`);
  fs.writeFileSync(swPath, updated, 'utf8');
  console.log(`sw.js CACHE_NAME -> people-v${version}-${buildId}`);
}

try {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const version = packageJson.version;

  if (!version) {
    console.error('❌ No se encontró la versión en package.json');
    process.exit(1);
  }

  syncVersionTs(version);
  syncServiceWorker(version);
} catch (error) {
  console.error('❌ Error al actualizar la versión:', error.message);
  process.exit(1);
}

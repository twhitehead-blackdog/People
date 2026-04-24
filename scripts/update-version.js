/**
 * Script para actualizar automáticamente la versión desde package.json
 * Ejecuta: node scripts/update-version.js
 */

const fs = require('fs');
const path = require('path');

// Leer package.json
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const versionTsPath = path.join(__dirname, '..', 'src', 'app', 'version.ts');

try {
  // Leer package.json
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const version = packageJson.version;

  if (!version) {
    console.error('❌ No se encontró la versión en package.json');
    process.exit(1);
  }

  const currentContent = fs.existsSync(versionTsPath)
    ? fs.readFileSync(versionTsPath, 'utf8')
    : '';
  const currentVersion = currentContent.match(/APP_VERSION\s*=\s*['"]([^'"]+)['"]/)?.[1];
  if (currentVersion === version) {
    console.log(`✅ Versión ya sincronizada: ${version}`);
    console.log(`⏭️ Archivo sin cambios: ${versionTsPath}`);
    process.exit(0);
  }

  // Generar contenido del archivo version.ts
  const versionTsContent = `/**
 * Versión de la aplicación
 * Este archivo se genera automáticamente desde package.json
 * Ejecuta: npm run update-version
 * Última actualización: ${new Date().toISOString()}
 */
export const APP_VERSION = '${version}';
`;

  // Escribir el archivo
  fs.writeFileSync(versionTsPath, versionTsContent, 'utf8');
  
  console.log(`✅ Versión actualizada a: ${version}`);
  console.log(`📝 Archivo actualizado: ${versionTsPath}`);
} catch (error) {
  console.error('❌ Error al actualizar la versión:', error.message);
  process.exit(1);
}

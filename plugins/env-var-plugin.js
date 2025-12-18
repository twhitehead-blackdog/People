import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Cargar variables de entorno desde .env
const envPath = resolve(process.cwd(), '.env');
let envVars = {};

try {
  const envFile = readFileSync(envPath, 'utf-8');
  
  // Parsear manualmente el archivo .env
  // Primero, unir líneas que continúan (líneas que no tienen = y no son comentarios)
  const lines = envFile.split('\n');
  const processedLines = [];
  let currentLine = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Si la línea está vacía o es un comentario, procesar la línea actual y continuar
    if (!line || line.startsWith('#')) {
      if (currentLine) {
        processedLines.push(currentLine);
        currentLine = '';
      }
      continue;
    }
    
    // Si la línea tiene un =, es una nueva variable
    if (line.includes('=')) {
      // Si hay una línea acumulada, procesarla primero
      if (currentLine) {
        processedLines.push(currentLine);
      }
      currentLine = line;
    } else {
      // Si no tiene =, es continuación de la línea anterior
      if (currentLine) {
        currentLine += line; // Unir sin espacios para valores JWT
      }
    }
  }
  
  // Agregar la última línea si existe
  if (currentLine) {
    processedLines.push(currentLine);
  }
  
  // Procesar las líneas unidas
  processedLines.forEach((line) => {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith('#')) {
      return;
    }
    
    // Buscar el primer = que separa la clave del valor
    const equalIndex = trimmedLine.indexOf('=');
    if (equalIndex === -1) {
      return;
    }
    
    const key = trimmedLine.substring(0, equalIndex).trim();
    let value = trimmedLine.substring(equalIndex + 1).trim();
    
    // Remover comillas si existen
    if ((value.startsWith('"') && value.endsWith('"')) || 
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    
    // Solo procesar variables que empiecen con ENV_
    if (key.startsWith('ENV_')) {
      envVars[key] = value;
    }
  });
  
  console.log('[ENV Plugin] ✅ Variables cargadas desde .env:', Object.keys(envVars).join(', '));
} catch (error) {
  console.warn('[ENV Plugin] ⚠️ No se pudo cargar .env, usando process.env:', error.message);
}

// También cargar desde process.env (para variables ya cargadas o desde dotenv)
config();
for (const key in process.env) {
  if (key.startsWith('ENV_')) {
    // process.env tiene prioridad sobre el .env parseado manualmente
    envVars[key] = process.env[key];
  }
}

const envVarPlugin = {
  name: 'env-var-plugin',
  setup(build) {
    const options = build.initialOptions;
    // Usar las variables parseadas del .env y process.env
    options.define['process.env'] = JSON.stringify(envVars);
    console.log('[ENV Plugin] 🔧 Variables inyectadas en build:', Object.keys(envVars).length);
  },
};

export default envVarPlugin;

import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// IMPORTANTE: En Railway, las variables de entorno están en process.env directamente
// En desarrollo local, pueden estar en un archivo .env
// Priorizamos process.env (Railway) sobre .env (desarrollo local)

let envVars = {};

// PRIMERO: Cargar desde process.env (Railway y variables del sistema)
// Esto tiene la máxima prioridad
for (const key in process.env) {
  if (key.startsWith('ENV_')) {
    envVars[key] = process.env[key];
  }
}

// SEGUNDO: Intentar cargar desde .env solo si no existe en process.env (desarrollo local)
// Esto es un fallback para desarrollo local
const envPath = resolve(process.cwd(), '.env');
try {
  const envFile = readFileSync(envPath, 'utf-8');
  
  // Parsear manualmente el archivo .env
  const lines = envFile.split('\n');
  const processedLines = [];
  let currentLine = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (!line || line.startsWith('#')) {
      if (currentLine) {
        processedLines.push(currentLine);
        currentLine = '';
      }
      continue;
    }
    
    if (line.includes('=')) {
      if (currentLine) {
        processedLines.push(currentLine);
      }
      currentLine = line;
    } else {
      if (currentLine) {
        currentLine += line;
      }
    }
  }
  
  if (currentLine) {
    processedLines.push(currentLine);
  }
  
  // Procesar las líneas unidas
  processedLines.forEach((line) => {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith('#')) {
      return;
    }
    
    const equalIndex = trimmedLine.indexOf('=');
    if (equalIndex === -1) {
      return;
    }
    
    const key = trimmedLine.substring(0, equalIndex).trim();
    let value = trimmedLine.substring(equalIndex + 1).trim();
    
    if ((value.startsWith('"') && value.endsWith('"')) || 
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    
    // Solo agregar si no existe ya en envVars (process.env tiene prioridad)
    if (key.startsWith('ENV_') && !envVars[key]) {
      envVars[key] = value;
    }
  });
  
  console.log('[ENV Plugin] ✅ Variables cargadas desde .env (fallback):', Object.keys(envVars).filter(k => !process.env[k]).join(', ') || 'ninguna');
} catch (error) {
  // En Railway, el archivo .env puede no existir, eso está bien
  // console.warn('[ENV Plugin] ⚠️ No se pudo cargar .env (normal en Railway):', error.message);
}

// TERCERO: Usar dotenv como último recurso (solo si no está en process.env ni .env)
config();
for (const key in process.env) {
  if (key.startsWith('ENV_') && !envVars[key]) {
    envVars[key] = process.env[key];
  }
}

const envVarPlugin = {
  name: 'env-var-plugin',
  setup(build) {
    const options = build.initialOptions;
    
    // Asegurar que options.define existe
    if (!options.define) {
      options.define = {};
    }
    
    // Inyectar cada variable individualmente para mejor compatibilidad
    for (const key in envVars) {
      options.define[`process.env.${key}`] = JSON.stringify(envVars[key]);
    }
    
    // También inyectar el objeto completo
    options.define['process.env'] = JSON.stringify(envVars);
    
    console.log('[ENV Plugin] 🔧 Variables inyectadas en build:', Object.keys(envVars).length);
    console.log('[ENV Plugin] 🔧 Variables:', Object.keys(envVars).join(', '));
    
    // Verificar específicamente ENV_SUPABASE_SERVICE_ROLE_KEY
    if (envVars['ENV_SUPABASE_SERVICE_ROLE_KEY']) {
      console.log('[ENV Plugin] ✅ ENV_SUPABASE_SERVICE_ROLE_KEY encontrada (longitud:', envVars['ENV_SUPABASE_SERVICE_ROLE_KEY'].length + ')');
    } else {
      console.warn('[ENV Plugin] ⚠️ ENV_SUPABASE_SERVICE_ROLE_KEY NO encontrada');
    }
  },
};

export default envVarPlugin;

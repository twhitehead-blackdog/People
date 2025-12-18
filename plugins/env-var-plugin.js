const envVarRegex = /^ENV_/i;

// Función para limpiar valores de variables de entorno
// Remueve comillas dobles/simples y espacios en blanco
const cleanEnvValue = (value) => {
  if (!value || typeof value !== 'string') return value;
  let cleaned = value.trim();
  // Remover comillas dobles o simples del inicio y final
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || 
      (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  return cleaned;
};

const envVarPlugin = {
  name: 'env-var-plugin',
  setup(build) {
    const options = build.initialOptions;
    const envVars = {};
    for (const key in process.env) {
      if (envVarRegex.test(key)) {
        // Limpiar el valor antes de agregarlo
        envVars[key] = cleanEnvValue(process.env[key]);
      }
    }
    options.define['process.env'] = JSON.stringify(envVars);
  },
};

export default envVarPlugin;

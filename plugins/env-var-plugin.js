const envVarRegex = /^ENV_/i;
const envVarPlugin = {
  name: 'env-var-plugin',
  setup(build) {
    const options = build.initialOptions;
    const envVars = {};
    for (const key in process.env) {
      if (envVarRegex.test(key)) {
        envVars[key] = process.env[key];
      }
    }
    options.define['process.env'] = JSON.stringify(envVars);
  },
};

export default envVarPlugin;

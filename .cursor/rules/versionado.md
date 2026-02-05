# Versión de la aplicación

- **Siempre que se hagan cambios** en el proyecto (funcionalidad, correcciones, mejoras), hay que **subir el número de versión** antes de dar por cerrado el trabajo.
- La versión se define en **`package.json`** (campo `"version"`). Usar semver:
  - **Patch** (3.1.0 → 3.1.1): correcciones de bugs, cambios menores.
  - **Minor** (3.1.0 → 3.2.0): nuevas funcionalidades sin romper compatibilidad.
  - **Major** (3.1.0 → 4.0.0): cambios que rompen compatibilidad.
- Tras cambiar `package.json`, ejecutar **`npm run update-version`** (o **`npm run build`**, que ya lo incluye) para que `src/app/version.ts` quede actualizado.
- Al finalizar una tarea con cambios, recordar: **actualizar versión en package.json y, si hace falta, ejecutar update-version o build**.

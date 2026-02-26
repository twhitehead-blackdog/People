# Refactor hr-disabilities.component.ts – Fase 1 (acciones, storage, validaciones)

Objetivo:
- Separar uploads/acciones, validaciones y listados. Mejorar rendimiento.

Pasos:
1) `hr-disabilities.actions.ts`: submit/approve/reject/load.
2) `hr-disabilities.storage.service.ts`: upload/download y manejo de errores.
3) `hr-disabilities.validators.ts`: fechas válidas, size/type de archivo.
4) `hr-disabilities.api.service.ts`: paginación y filtros server-side.

Criterios:
- Validaciones robustas, paginación y sin `.toPromise`.
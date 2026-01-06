# Refactor home.component.ts – Fase 1 (extracción lógica y datos)

Objetivo:
- Extraer lógica de negocio, acceso a datos y transformaciones a services/utils.

Pasos:
1) `home-api.service.ts` en `src/app/dashboard/services/` para llamadas HTTP/Supabase (usando `ApiUrlService`).
2) `home-utils/` con funciones puras (mapeos, agregaciones, orden, métricas, formato).
3) Reemplazar `.toPromise()` por `firstValueFrom/lastValueFrom`.
4) Mover validaciones complejas a utils.

Criterios:
- Componente más delgado, sin `console.log`, usar `LoggerService`.

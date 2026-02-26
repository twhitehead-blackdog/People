# Convergencia Employee Portal (dashboard vs src/app/employee-portal)

Objetivo:
- Reutilizar servicios/acciones del nuevo portal y eliminar duplicación.

Pasos:
1) Apuntar a `EmployeePortal*Service` y utils existentes.
2) Centralizar ENV y URLs en `ApiUrlService`.
3) El componente de dashboard se vuelve orquestador; sin lógica pesada.

Criterios:
- Comportamiento idéntico y menos duplicación.
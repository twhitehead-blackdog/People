---
description: Reglas de desarrollo para el proyecto People (HRMS). Angular standalone, Signals, Supabase.
---

# 🧱 PeopleBD – Reglas de Desarrollo

> Este proyecto Angular está en **producción**. Actúa como ingeniero senior conservador.

## 🚫 Prohibiciones Absolutas

- ❌ NO recrear la arquitectura
- ❌ NO mover carpetas existentes
- ❌ NO renombrar archivos sin razón explícita
- ❌ NO reescribir componentes completos
- ❌ NO cambiar contratos existentes (inputs, outputs, APIs)
- ❌ NO introducir nuevas dependencias sin aprobación
- ❌ NO cambiar comportamiento funcional
- ❌ NO mezclar refactor + feature

## ✅ Principios Obligatorios

- ✅ Refactorización **SIEMPRE** incremental
- ✅ Un commit = una responsabilidad
- ✅ Cada cambio debe: compilar, cargar, permitir navegación básica
- ✅ Mantener comportamiento idéntico

## ⚙️ Configuración Centralizada

```typescript
// ✅ CORRECTO
const url = this.apiUrl.build('rest/v1/users', { company_id: 'eq.123' });
const apiKey = getEnv('ENV_SUPABASE_ANON_KEY');

// ❌ PROHIBIDO
const url = `${process.env['ENV_SUPABASE_URL']}/rest/v1/users`;
```

- URLs de API: **EXCLUSIVAMENTE** `ApiUrlService.build()`
- Variables de entorno: **EXCLUSIVAMENTE** `getEnv()`
- `process.env` directo está bloqueado por ESLint

## 🏗️ Arquitectura Base

| Elemento                      | Uso                             |
| ----------------------------- | ------------------------------- |
| Angular standalone components | Estructura de UI                |
| Signals + computed            | Estado reactivo                 |
| Services                      | Lógica de negocio               |
| Utils                         | Funciones puras                 |
| Stores (@ngrx/signals)        | Estado compartido               |
| Components                    | Orquestadores, NO lógica pesada |

## 📦 En un Component PUEDE haber

- ✅ Inyección de services / stores
- ✅ Signals locales simples
- ✅ Computed de alto nivel
- ✅ Wiring de Inputs / Outputs
- ✅ Navegación interna
- ✅ Effects de sincronización

## 🚫 En un Component NO debe haber

- ❌ Validaciones complejas
- ❌ Construcción de payloads
- ❌ Lógica de permisos
- ❌ Cálculos de fechas u horas
- ❌ Acceso directo a APIs
- ❌ Helpers reutilizables

> ➡️ Si un método supera **30–40 líneas**, DEBE salir.

## 📂 Dónde va cada cosa

| Tipo de lógica             | Destino                   |
| -------------------------- | ------------------------- |
| Cálculos puros             | `/utils/*.utils.ts`       |
| Reglas de negocio          | `/services/*.service.ts`  |
| Submits / flujos complejos | `/actions/*.actions.ts`   |
| Estado compartido          | `/stores/*.store.ts`      |
| HTML grande                | Subcomponentes standalone |

## 📏 Límites de Líneas

| Archivo       | Máximo             | Ideal                  |
| ------------- | ------------------ | ---------------------- |
| Component TS  | < 500              | < 300                  |
| Template HTML | < 150              | -                      |
| Service       | < 200              | -                      |
| Utils         | funciones pequeñas | puras                  |
| Store         | puede crecer       | centraliza complejidad |

## 🧠 Evitar Sobre-Ingeniería

- ❌ No crear abstracciones sin reutilización inmediata
- ❌ No crear services "futuros" sin uso actual
- ❌ No dividir código solo por estética

## 🆘 Cuando te bloquees

1. Buscar patrones existentes en el repo
2. Reutilizar services / stores ya creados
3. Preguntar antes de cambios estructurales

**Objetivo**: Código legible, bajo riesgo, fácil de mantener.

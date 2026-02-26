---
description: Despliegue a producción del proyecto People
---

# Deploy Workflow

Este workflow guía el proceso de despliegue a producción.

## Pre-requisitos

- Estar en la rama `main` o `refactorizacion1.1`
- Todos los cambios commiteados

## Pasos

### 1. Verificar rama actual

```bash
git branch --show-current
```

Confirma que estás en la rama correcta.

### 2. Pull últimos cambios

```bash
git pull origin main
```

// turbo

### 3. Instalar dependencias

```bash
npm ci
```

// turbo

### 4. Ejecutar linting

```bash
npx nx lint
```

// turbo

### 5. Ejecutar typecheck

```bash
npx nx typecheck
```

// turbo

### 6. Ejecutar tests

```bash
npx nx test --coverage
```

Verificar cobertura mínima del 80%.

// turbo

### 7. Build de producción

```bash
npx nx build --configuration=production
```

### 8. Ejecutar script de deploy

**Windows:**

```powershell
.\scripts\deploy-production.ps1
```

**Linux/Ubuntu:**

```bash
./scripts/deploy-production.sh
```

## Post-deploy

- Verificar que la aplicación carga correctamente
- Revisar logs por errores
- Notificar al equipo

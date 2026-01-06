# 🐾 Black Dog - Adopciones

> Sistema de gestión de adopciones de mascotas desarrollado con Angular 20 + Nx

## 🚀 Inicio Rápido

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
npm run setup:env

# Verificar configuración
npm run verify

# Iniciar desarrollo completo
npm run start:dev
```

## 📋 Requisitos Previos

- **Node.js**: 18.16.9+
- **Nx**: 21.3.7+
- **Angular CLI**: 20.3.0+
- **Railway CLI** (opcional para deploy)

## 🏗️ Arquitectura del Proyecto

### Stack Tecnológico
- **Frontend**: Angular 20 con SSR
- **UI Framework**: PrimeNG + PrimeUI + TailwindCSS
- **State Management**: NgRx Signals
- **Backend**: Express.js + TypeScript
- **Base de Datos**: Supabase (PostgreSQL)
- **Autenticación**: Auth0
- **Testing**: Jest + Playwright
- **Deployment**: Railway + Docker

### Estructura Modular
```
src/app/
├── core/           # Servicios singleton, guards, interceptors
├── shared/         # Componentes reutilizables, pipes, directives
├── features/       # Módulos funcionales (pets, users, etc.)
├── layouts/        # Layouts principales
└── stores/         # Estado global con NgRx Signals
```

## 🎯 Mejores Prácticas (Cursor Rules)

Este proyecto sigue reglas estrictas definidas en `.cursorrules`. Las reglas principales incluyen:

### ✅ Arquitectura
- Componentes **standalone** con **OnPush** change detection
- **Signals** para estado reactivo local
- **NgRx Signals** para estado global complejo
- **SCAM pattern** para organización modular

### ✅ Performance
- Bundle inicial: **< 2MB**
- Component styles: **< 35KB**
- **Lazy loading** automático
- **Virtual scrolling** para listas grandes

### ✅ Code Quality
- **ESLint** + **Prettier** configurados
- Cobertura de tests: **> 80%**
- **Conventional commits**
- **TypeScript strict mode**

### ✅ UI/UX
- **PrimeNG** como framework principal
- **Responsive design** mobile-first
- **Tema oscuro/claro** automático
- **Accessibility** WCAG 2.1 AA

## 🛠️ Comandos Disponibles

### Desarrollo
```bash
# Frontend + Backend
npm run start:dev

# Solo frontend (puerto 3000)
nx serve

# Solo backend
npm run server
```

### Testing
```bash
# Unit tests con coverage
npm test

# E2E tests
nx run people:e2e

# Lint completo
nx run-many -t lint

# Verificar reglas de Cursor
npm run verify:rules
```

### Build & Deploy
```bash
# Build producción
npm run build

# Deploy (Railway)
nx run people:build:production
```

## 🔧 Configuración de Desarrollo

### Variables de Entorno
Copia `EJEMPLO-ENV.txt` a `.env` y configura:

```env
# Auth0
AUTH0_DOMAIN=tu-dominio.auth0.com
AUTH0_CLIENT_ID=tu-client-id
AUTH0_CLIENT_SECRET=tu-client-secret

# Supabase
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=tu-anon-key
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key

# Railway
RAILWAY_STATIC_URL=https://tu-app.railway.app
```

### Base de Datos
```bash
# Ejecutar migraciones
nx run people:supabase-run-migrations

# Reset database
nx run people:supabase-reset
```

## 🚀 Deployment

### Railway (Recomendado)
1. Conecta tu repo a Railway
2. Configura variables de entorno
3. Deploy automático en push a `main`

### Docker Local
```bash
# Build imagen
docker build -t black-dog .

# Ejecutar contenedor
docker run -p 3000:3000 black-dog
```

## 🧪 Testing Strategy

### Unit Tests (Jest)
- **Cobertura mínima**: 80%
- **Entorno**: Happy DOM
- **Configuración**: `jest.config.ts`

### E2E Tests (Playwright)
- **Navegadores**: Chrome, Firefox, Safari
- **Flujos críticos**: Login, adopción completa
- **Ejecución**: `nx run people:e2e`

## 📊 Monitoreo

### Métricas de Performance
- **Lighthouse Score**: > 90
- **FCP**: < 1.5s
- **LCP**: < 2.5s
- **CLS**: < 0.1

### Health Checks
- **API endpoints**: `/api/health`
- **Database**: Conexión automática
- **Auth0**: Token refresh

## 🤝 Contribución

### Proceso de Desarrollo
1. **Fork** el proyecto
2. Crea **feature branch**: `git checkout -b feature/nueva-funcionalidad`
3. **Conventional commits**: `git commit -m "feat: agregar nueva funcionalidad"`
4. **Push** y crea **Pull Request**
5. **Code review** obligatorio

### Conventional Commits
```bash
feat: nueva funcionalidad
fix: corrección de bug
docs: cambios en documentación
style: cambios de formato
refactor: refactorización de código
test: agregar o modificar tests
chore: cambios de build o configuración
```

## 📚 Documentación Adicional

- [📋 Cursor Rules](.cursorrules) - Reglas de desarrollo
- [🐛 Bugs e Issues](BUGS_AND_ISSUES.md)
- [🚀 Guía de Deploy](DEPLOY.md)
- [🛤️ Railway Setup](GUIA-RAILWAY-PASO-A-PASO.md)
- [⚙️ Configuración Railway](CONFIGURACION-RAILWAY-VARIABLES.md)
- [🔧 Variables de Entorno](VARIABLES-RAILWAY.md)
- [🐳 Docker Setup](DOCKER.md)

## 📞 Soporte

- **Issues**: [GitHub Issues](https://github.com/tu-repo/issues)
- **Discussions**: [GitHub Discussions](https://github.com/tu-repo/discussions)
- **Email**: soporte@blackdog.com

---

## 🎉 ¡Únete a salvar vidas!

Black Dog es una plataforma dedicada a conectar mascotas con sus familias forever. Cada adopción es una vida salvada. 🐶❤️🐱

**Hecho con ❤️ por el equipo Black Dog**
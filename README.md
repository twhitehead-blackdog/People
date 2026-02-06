# People — Sistema de Gestión de RRHH y Tiempos

Sistema integral de gestión de empleados, horarios, nómina, marcaciones y portal del empleado para **Black Dog Panama**. Incluye control de acceso por roles, integración con Auth0 y Supabase, y módulos de tiempo (timetables, timelogs, reloj checador).

---

## Características principales

- **Empleados y organigrama**: altas, bajas, sucursales, departamentos, posiciones y permisos.
- **Horarios (timetables)**: armado de turnos por semana, aprobación en lote, advertencias por rol (gerente/subgerente, peluquero/asistente).
- **Marcaciones y reloj checador**: registro de entradas/salidas, tolerancia y reportes.
- **Nómina**: nóminas, deducciones, pagos y resúmenes.
- **Portal del empleado**: solicitudes de documentos, vacaciones, tiempo compensatorio, incapacidades.
- **Dashboard**: KPIs, gráficos, vista por sucursal y gerente de tienda.
- **Autenticación**: Auth0 (SSO), roles y permisos (admin, RRHH, aprobador de horarios, gerente, etc.).
- **Integración**: Supabase (PostgreSQL, Realtime), envío de correo (SMTP / Resend / Postmark).

---

## Stack tecnológico

| Área        | Tecnología |
|------------|------------|
| Frontend   | Angular 20, Nx, PrimeNG, Angular CDK, ApexCharts |
| Backend    | Node.js, Express (server.ts), JWT |
| Auth       | Auth0 (SPA) |
| Base de datos | Supabase (PostgreSQL, PostgREST) |
| Estilos    | PrimeNG Themes, Tailwind-style utilities, SASS |
| Herramientas | date-fns, RxJS, NgRx Signals |

---

## Requisitos

- **Node.js** 20.x o superior (recomendado 20.19+ / 22.12+)
- **npm** 9+
- Cuenta en **Supabase** y **Auth0**
- Archivo **.env** con las variables necesarias (ver más abajo)

---

## Instalación

```bash
# Clonar el repositorio
git clone https://github.com/twhitehead-blackdog/People.git
cd People

# Instalar dependencias
npm install

# Configurar variables de entorno
cp EJEMPLO-ENV.txt .env
# Editar .env con tus valores (Supabase, Auth0, ENV_APP_URL, etc.)
```

---

## Variables de entorno

Copia `EJEMPLO-ENV.txt` a `.env` y completa los valores. Mínimo necesario:

| Variable | Descripción |
|----------|-------------|
| `ENV_SUPABASE_URL` | URL del proyecto Supabase |
| `ENV_SUPABASE_API_KEY` | Clave anónima (anon key) de Supabase |
| `ENV_SUPABASE_TOKEN` | Token de servicio (service role) para operaciones de backend |
| `ENV_AUTH0_DOMAIN` | Dominio de la aplicación Auth0 |
| `ENV_AUTH0_CLIENT_ID` | Client ID de la aplicación Auth0 (SPA) |
| `ENV_AUTH0_AUDIENCE` | Audience del API (ej. `https://people.api`) |
| `ENV_APP_URL` | URL pública de la app (ej. `https://people.blackdogpanama.com` o `http://localhost:4200`) |

Opcionales: `ENV_SUPABASE_SERVICE_ROLE_KEY`, SMTP / Resend / Postmark para correos. Ver **EJEMPLO-ENV.txt** para la lista completa y ejemplos.

---

## Scripts

| Comando | Descripción |
|---------|-------------|
| `npm start` | Servidor de desarrollo (frontend) |
| `npm run start:dev` | Frontend + backend (tsx server.ts) en paralelo |
| `npm run build` | Build de producción (actualiza versión y genera `dist/people`) |
| `npm run update-version` | Actualiza `src/app/version.ts` desde `package.json` |
| `npm test` | Tests con Nx (Jest) |

---

## Estructura del proyecto (resumen)

```
People/
├── src/
│   ├── app/
│   │   ├── dashboard/          # Módulos principales (empleados, horarios, nómina, etc.)
│   │   ├── employee-portal/    # Portal del empleado
│   │   ├── guards/             # Auth, permisos, portal, timeclock
│   │   ├── stores/             # NgRx Signals (dashboard, employees, schedules…)
│   │   ├── services/           # API, Auth0, Supabase, organización…
│   │   └── login/              # Login y callback Auth0
│   └── ...
├── server.ts                   # Backend Node (API, correo, proxy)
├── database/                   # Migraciones y scripts SQL
├── docker/                     # Docker, Nginx, Railway, ejemplos de despliegue
├── EJEMPLO-ENV.txt             # Plantilla de variables de entorno
└── README.md
```

---

## Despliegue

- **Docker**: ver `docker/README.md`, `docker/QUICK-START.md` y `docker/prod/`.
- **Railway**: ver `docker/railway/` (configuración Auth0, variables, dominios).
- **Nginx**: ejemplos en `docker/nginx-prod.conf`, `docker/nginx-prueba.conf`.

La variable `ENV_APP_URL` debe coincidir con la URL pública de la aplicación (por ejemplo `https://people.blackdogpanama.com`) para que Auth0 y los enlaces funcionen correctamente.

---

## Licencia

MIT.

---

## Contacto

Repositorio mantenido por **Black Dog Panama**. Para soporte o contribuciones, abrir un issue o pull request en este repositorio.

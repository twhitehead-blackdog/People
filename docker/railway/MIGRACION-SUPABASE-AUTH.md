# Migración de Auth0 a Supabase Auth

## ✅ Cambios Completados

### 1. Instalación de Dependencias
- ✅ Instalado `@supabase/supabase-js`

### 2. Servicio de Autenticación
- ✅ Creado `src/app/services/supabase-auth.service.ts`
  - Métodos: `signInWithPassword()`, `signOut()`, `getAccessToken()`, etc.
  - Compatible con la interfaz de Auth0 para facilitar la migración
  - Manejo automático de sesiones y tokens

### 3. Archivos Actualizados
- ✅ `src/app/app.config.ts` - Removido `provideAuth0`, ahora usa Supabase Auth
- ✅ `guard.ts` - Actualizado para usar `SupabaseAuthService`
- ✅ `src/app/interceptors/http.interceptor.ts` - Usa tokens de Supabase
- ✅ `src/app/login/login.component.ts` - Actualizado para usar Supabase Auth
- ✅ `src/app/stores/auth.store.ts` - Actualizado para usar Supabase Auth
- ✅ `src/app/dashboard/dashboard.component.ts` - Actualizado para usar Supabase Auth
- ✅ `src/app/guards/employee-portal.guard.ts` - Actualizado para usar Supabase Auth

## 📋 Próximos Pasos

### 1. Configurar Supabase Auth

1. **Habilitar Autenticación en Supabase:**
   - Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
   - Navega a **Authentication** > **Providers**
   - Habilita **Email** provider (ya debería estar habilitado por defecto)

2. **Configurar URLs de Redirección:**
   - Ve a **Authentication** > **URL Configuration**
   - Agrega tus URLs:
     - **Site URL**: `https://tu-frontend.up.railway.app` (o `http://localhost:4200` para desarrollo)
     - **Redirect URLs**: 
       - `https://tu-frontend.up.railway.app/**`
       - `http://localhost:4200/**`

### 2. Crear Usuarios en Supabase Auth

Tienes dos opciones:

#### Opción A: Crear usuarios manualmente en Supabase Dashboard
1. Ve a **Authentication** > **Users**
2. Haz clic en **Add User** > **Create new user**
3. Ingresa email y contraseña
4. El usuario se creará en la tabla `auth.users` de Supabase

#### Opción B: Migrar usuarios existentes desde tu base de datos
Si ya tienes usuarios en la tabla `employees`, necesitarás:
1. Crear usuarios en Supabase Auth con los mismos emails
2. O crear un script de migración que sincronice `employees` con `auth.users`

### 3. Implementar Formulario de Login

El componente de login actualmente solo tiene un botón que muestra un mensaje. Necesitas implementar un formulario de login con email y contraseña.

**Ejemplo de implementación:**

```typescript
// En login.component.ts
async signIn() {
  // Mostrar formulario de login o usar un diálogo
  // Ejemplo con PrimeNG Dialog:
  const email = 'usuario@ejemplo.com'; // Obtener del formulario
  const password = 'contraseña'; // Obtener del formulario
  
  const { user, error } = await this.auth.signInWithPassword(email, password);
  
  if (error) {
    this.messageService.add({
      severity: 'error',
      summary: 'Error de autenticación',
      detail: error.message,
    });
    return;
  }
  
  if (user) {
    // Redirigir al dashboard
    this.router.navigate(['/']);
  }
}
```

### 4. Variables de Entorno

Asegúrate de tener estas variables configuradas en Railway:

- ✅ `ENV_SUPABASE_URL` - Ya configurado
- ✅ `ENV_SUPABASE_ANON_KEY` - Ya configurado
- ❌ **Remover** `ENV_AUTH0_DOMAIN` (ya no se necesita)
- ❌ **Remover** `ENV_AUTH0_CLIENT_ID` (ya no se necesita)
- ❌ **Remover** `ENV_AUTH0_AUDIENCE` (ya no se necesita)

### 5. Sincronización con Tabla `employees`

Supabase Auth crea usuarios en `auth.users`, pero tu aplicación también necesita verificar que el usuario exista en la tabla `employees`. 

El guard (`guard.ts`) ya hace esta verificación automáticamente:
1. Verifica que el usuario esté autenticado en Supabase Auth
2. Busca el email en la tabla `employees`
3. Si encuentra el empleado, permite el acceso
4. Si no lo encuentra, redirige a `/sin-acceso`

**Importante:** Asegúrate de que los emails en `auth.users` coincidan con los emails en `employees.work_email` o `employees.email`.

## 🔧 Funcionalidades Disponibles

### Métodos del Servicio SupabaseAuthService

- `signInWithPassword(email, password)` - Login con email/contraseña
- `signInWithOAuth(provider)` - Login con OAuth (Google, GitHub, Azure)
- `signUp(email, password, metadata)` - Registrar nuevo usuario
- `signOut()` - Cerrar sesión
- `getAccessToken()` - Obtener token de acceso
- `getAccessTokenSilently()` - Obtener token como Observable
- `resetPassword(email)` - Enviar email de recuperación
- `updatePassword(newPassword)` - Actualizar contraseña

### Compatibilidad con Código Existente

El servicio mantiene compatibilidad con el código existente:
- `user$` - Observable del usuario actual
- `isAuthenticated$` - Observable del estado de autenticación
- `getAccessTokenSilently()` - Compatible con interceptors

## ⚠️ Notas Importantes

1. **Bypass de Autenticación:** El bypass sigue funcionando para desarrollo/testing
2. **Tokens:** Los tokens de Supabase se usan automáticamente en las peticiones a Supabase
3. **Sesiones:** Las sesiones se persisten automáticamente en `localStorage`
4. **Refresh Tokens:** Se renuevan automáticamente

## 🐛 Troubleshooting

### Error: "Invalid API key"
- Verifica que `ENV_SUPABASE_ANON_KEY` esté configurado correctamente en Railway

### Error: "User not found" en guard
- Verifica que el email en `auth.users` coincida con `employees.work_email` o `employees.email`
- Verifica que el usuario tenga un registro en la tabla `employees`

### Error: "Email not confirmed"
- En desarrollo, puedes deshabilitar la confirmación de email en Supabase Dashboard
- Ve a **Authentication** > **Settings** > **Email Auth** > Desactiva **Confirm email**

## 📚 Recursos

- [Documentación de Supabase Auth](https://supabase.com/docs/guides/auth)
- [Guía de Migración de Auth0 a Supabase](https://supabase.com/docs/guides/auth/auth-helpers/auth-helpers-angular)















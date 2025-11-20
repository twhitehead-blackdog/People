# Lista de Pruebas - Sistema People

## 🎯 PRUEBAS PARA ADMINISTRADOR

### ✅ VERIFICACIONES PRELIMINARES (YA COMPLETADAS)

- [x] ✅ **Compilación**: El proyecto compila sin errores
- [x] ✅ **Linting**: No hay errores de linting
- [x] ✅ **Servidor**: El servidor de desarrollo inicia correctamente (puerto 4200)
- [x] ✅ **Carga inicial**: La aplicación carga sin errores en consola
- [x] ✅ **Supabase**: Conexión a Supabase configurada correctamente
- [x] ✅ **Dependencias**: Todos los módulos se cargan correctamente

### 1. Autenticación y Acceso

- [x] ⏳ **REQUIERE LOGIN** - Login con cuenta de administrador
- [x] Verificación de acceso correcto al dashboard
- [x] Verificación de permisos según rol (admin, schedule_admin, etc.)
- [x] Logout funciona correctamente
- [x] Redirección si intenta acceder sin permisos

### 2. Dashboard Principal (Home)

- [x] Carga correctamente la página de inicio
- [x] Muestra estadísticas generales
- [x] Navegación entre secciones funciona

### 3. Administración - Empleados

- [x] Ver lista de empleados
- [x] Búsqueda/filtrado de empleados funciona
- [x] Crear nuevo empleado
- [x] Editar empleado existente
- [ ] Ver detalle de empleado
- [ ] Validación de campos requeridos en formularios
- [ ] Guardar cambios funciona correctamente
- [ ] Cancelar edición no guarda cambios

### 4. Administración - Organización

- [ ] **Organigrama**: Visualiza correctamente la estructura
- [ ] **Empresas**: CRUD completo (crear, leer, actualizar, eliminar)
- [ ] **Cargos (Positions)**: CRUD completo
- [ ] **Sucursales (Branches)**: CRUD completo
- [ ] **Áreas (Departments)**: CRUD completo
- [ ] Validaciones en todos los formularios
- [ ] Mensajes de éxito/error se muestran correctamente

### 5. RRHH - Incapacidades

- [ ] Ver lista de incapacidades
- [ ] Filtrar incapacidades por estado (pendiente, aprobada, rechazada)
- [ ] Buscar incapacidades por empleado
- [ ] Aprobar incapacidad
- [ ] Rechazar incapacidad con comentario
- [ ] Ver detalle de incapacidad
- [ ] Descargar documento de incapacidad
- [ ] Ver tooltip con comentario de rechazo al hacer hover
- [ ] Filtros de fecha funcionan correctamente
- [ ] Paginación funciona

### 6. Portal de Empleado (Vista Admin)

- [ ] Acceder al portal del empleado desde admin
- [ ] Ver todas las pestañas del portal
- [ ] **Tab: Dashboard**: Estadísticas se muestran correctamente
- [ ] **Tab: Mi Perfil**: Información se muestra correctamente
- [ ] **Tab: Mis Marcaciones**: Tabla carga correctamente
- [ ] **Tab: Mis Tardanzas**: Lista se muestra correctamente
- [ ] **Tab: Incapacidades**:
  - [ ] Formulario de subir incapacidad funciona
  - [ ] Validación de fechas funciona
  - [ ] Subir archivo funciona (PDF/imágenes)
  - [ ] Lista de incapacidades se muestra
  - [ ] Descargar documento funciona
  - [ ] Tooltip en estado rechazado muestra comentario
  - [ ] Labels muestran "Inicio de Incapacidad" y "Fin de Incapacidad"
  - [ ] Textarea tiene el diseño correcto
- [ ] **Tab: Solicitar Documentos**: Crear solicitud funciona
- [ ] **Tab: Buzón de Quejas**: Enviar queja funciona

### 7. Nómina (Payroll)

- [ ] Acceder a módulo de nómina
- [ ] Ver listado de nóminas
- [ ] Crear nueva nómina
- [ ] Generar reportes
- [ ] Validaciones funcionan

### 8. Gestión de Tiempo

- [ ] **Timelogs**: Ver registros de marcaciones
- [ ] **Horarios (Schedules)**: CRUD completo
- [ ] **Time-offs**: Gestión de permisos/ausencias
- [ ] Filtrar por fecha funciona
- [ ] Exportar datos funciona

### 9. Reloj de Marcación (Timeclock)

- [ ] Acceder al reloj de marcación
- [ ] Marcar entrada funciona
- [ ] Marcar salida funciona
- [ ] Marcar inicio de almuerzo funciona
- [ ] Marcar fin de almuerzo funciona
- [ ] Validación de permisos funciona
- [ ] Código QR funciona

### 10. Configuración (Settings)

- [ ] Acceder a configuración
- [ ] Ver/editar configuraciones
- [ ] Guardar cambios funciona

### 11. Buzón de Quejas (Complaints Inbox)

- [ ] Ver lista de quejas
- [ ] Ver contador de no leídas
- [ ] Abrir conversación de queja
- [ ] Responder a queja
- [ ] Marcar como resuelta
- [ ] Ver mensajes sin leer
- [ ] Filtros funcionan

---

## 👤 PRUEBAS PARA EMPLEADO

### ✅ VERIFICACIONES PRELIMINARES (YA COMPLETADAS)

- [x] ✅ **Compilación**: El proyecto compila sin errores
- [x] ✅ **Linting**: No hay errores de linting
- [x] ✅ **Servidor**: El servidor de desarrollo inicia correctamente
- [x] ✅ **Carga inicial**: La aplicación carga sin errores
- [x] ✅ **Componentes**: Todos los componentes se cargan correctamente

### 1. Autenticación y Acceso

- [ ] ⏳ **REQUIERE LOGIN** - Login con cuenta de empleado
- [ ] Redirección automática al portal de empleado
- [ ] Verificación de acceso solo a portal (sin admin)
- [ ] Logout funciona correctamente

### 2. Portal de Empleado - Dashboard

- [ ] Página carga correctamente
- [ ] Tarjeta de bienvenida muestra nombre correcto
- [ ] Estadísticas se muestran:
  - [ ] Días trabajados este mes
  - [ ] Tardanzas este mes
  - [ ] Marcaciones recientes
  - [ ] Salario mensual
- [ ] Marcaciones recientes se muestran
- [ ] Información rápida (sucursal, departamento, etc.) es correcta

### 3. Mi Perfil

- [ ] Información personal se muestra correctamente
- [ ] Modo edición funciona
- [ ] Editar datos de contacto (email, teléfono, dirección)
- [ ] Validación de emails funciona
- [ ] Guardar cambios funciona
- [ ] Cancelar no guarda cambios
- [ ] Mensajes de éxito/error se muestran

### 4. Mis Marcaciones

- [ ] Tabla de marcaciones carga
- [ ] Seleccionar rango de fechas funciona
- [ ] Ver entrada, salida, almuerzos
- [ ] Ver horas trabajadas calculadas
- [ ] Ver horarios programados
- [ ] Ver retrasos marcados
- [ ] Paginación funciona
- [ ] Filtros funcionan

### 5. Mis Tardanzas

- [ ] Lista de tardanzas se muestra
- [ ] Fechas correctas
- [ ] Minutos de retraso correctos
- [ ] Colores según severidad (amarillo/rojo)
- [ ] Mensaje cuando no hay tardanzas

### 6. Incapacidades ⭐ (Recién modificado)

- [ ] Formulario de subir incapacidad visible
- [ ] **Campos del formulario**:
  - [ ] Label "Inicio de Incapacidad" (NO "Fecha de Inicio")
  - [ ] Label "Fin de Incapacidad" (NO "Fecha de Fin")
  - [ ] Datepickers funcionan
  - [ ] Textarea tiene diseño correcto (fondo oscuro, bordes, etc.)
  - [ ] Placeholder "Describe el motivo de la incapacidad..." visible
  - [ ] Selector de archivo funciona
- [ ] **Validaciones**:
  - [ ] Error si falta fecha de inicio
  - [ ] Error si falta fecha de fin
  - [ ] Error si falta archivo
  - [ ] Error si fecha fin es anterior a inicio
  - [ ] Error si fecha es muy futura (>1 día)
  - [ ] Error si rango es mayor a 1 año
  - [ ] Error si archivo es muy grande (>5MB)
  - [ ] Error si tipo de archivo no es válido
- [ ] **Subir incapacidad**:
  - [ ] Subir archivo a Supabase Storage funciona
  - [ ] Guardar registro en base de datos funciona
  - [ ] Mensaje de éxito se muestra
  - [ ] Formulario se resetea después de subir
  - [ ] Lista se actualiza automáticamente
- [ ] **Lista de incapacidades**:
  - [ ] Tabla muestra todas las incapacidades
  - [ ] Headers muestran "Inicio de Incapacidad" y "Fin de Incapacidad"
  - [ ] Fechas se formatean correctamente (mediumDate)
  - [ ] Días calculados correctamente
  - [ ] Estados se muestran con colores:
    - [ ] Pendiente (amarillo)
    - [ ] Aprobada (verde)
    - [ ] Rechazada (rojo)
  - [ ] **Tooltip en estado rechazado**:
    - [ ] Hacer hover sobre estado "Rechazada"
    - [ ] Tooltip muestra "Motivo: [comentario]"
    - [ ] Tooltip aparece correctamente
  - [ ] **Descargar documento**:
    - [ ] Botón de descarga visible cuando hay documento
    - [ ] Clic en descargar abre el archivo
    - [ ] URL se construye correctamente (no error "Cannot GET")
    - [ ] Funciona con URLs completas y relativas
  - [ ] Paginación funciona
  - [ ] Estados de carga se muestran

### 7. Solicitar Documentos

- [ ] Formulario de solicitud visible
- [ ] Seleccionar tipo de documento funciona
- [ ] Si es "Otro", campo adicional aparece
- [ ] Textarea de motivo funciona
- [ ] Selector de fecha requerida funciona
- [ ] Enviar solicitud funciona
- [ ] Lista de solicitudes muestra estado
- [ ] Si está aprobada, botón de descarga visible
- [ ] Descargar documento aprobado funciona

### 8. Buzón de Quejas

- [ ] Formulario de queja visible
- [ ] Seleccionar categoría funciona
- [ ] Textarea de descripción funciona
- [ ] Checkbox "Permitir contacto" funciona
- [ ] Si permite contacto, selector de método aparece
- [ ] Validación de mínimo de caracteres funciona
- [ ] Enviar queja funciona (anónima o identificada)
- [ ] Lista de quejas se muestra
- [ ] Ver conversación funciona
- [ ] Responder a mensaje de HR funciona
- [ ] Contador de no leídas se actualiza
- [ ] Mensajes se marcan como leídos al abrir

### 9. Navegación

- [ ] Menú lateral funciona correctamente
- [ ] Icono de incapacidades es "pi-file-plus" (o pi-plus según preferencia)
- [ ] Navegación por secciones funciona
- [ ] Fragmentos en URL funcionan (#dashboard, #disabilities, etc.)
- [ ] Scroll a secciones funciona
- [ ] Menú móvil funciona en dispositivos pequeños

### 10. Diseño y UX

- [ ] Textareas tienen diseño consistente (fondo #262626, borde #404040)
- [ ] Hover en textareas cambia borde
- [ ] Focus en textareas muestra borde amarillo
- [ ] Placeholders visibles y legibles
- [ ] Responsive en móvil funciona
- [ ] Tablas son scrollables si hay muchos datos
- [ ] Paginación funciona en todas las tablas
- [ ] Mensajes de toast aparecen correctamente

---

## 🔍 PRUEBAS CRUZADAS (Admin y Empleado)

### Incapacidades - Flujo Completo

1. **Como Empleado**:

   - [ ] Subir una incapacidad
   - [ ] Ver que aparece como "Pendiente"

2. **Como Admin**:

   - [ ] Ver la incapacidad en la lista de RRHH
   - [ ] Aprobar la incapacidad
   - [ ] Verificar que el empleado puede verla como "Aprobada"

3. **Como Admin**:

   - [ ] Rechazar otra incapacidad con comentario
   - [ ] Verificar que el empleado puede ver el comentario en tooltip

4. **Como Empleado**:
   - [ ] Intentar descargar documento de incapacidad
   - [ ] Verificar que descarga correctamente (sin error "Cannot GET")

### Documentos - Flujo Completo

1. **Como Empleado**:

   - [ ] Solicitar un documento
   - [ ] Ver que aparece como "Pendiente"

2. **Como Admin**:
   - [ ] Ver la solicitud
   - [ ] Aprobar y subir documento
   - [ ] Verificar que el empleado puede descargarlo

### Quejas - Flujo Completo

1. **Como Empleado**:

   - [ ] Enviar queja (anónima o identificada)
   - [ ] Ver que aparece en "Mis Quejas"

2. **Como Admin**:

   - [ ] Ver la queja en Buzón de Quejas
   - [ ] Responder a la queja
   - [ ] Verificar que el empleado recibe la respuesta

3. **Como Empleado**:
   - [ ] Ver que hay mensaje nuevo (contador/indicador)
   - [ ] Abrir conversación
   - [ ] Responder
   - [ ] Verificar que admin recibe la respuesta

---

## 📝 NOTAS PARA PRUEBAS

### Archivos Importantes a Verificar:

- Formularios con validación de campos
- Subida de archivos (tamaño, tipo)
- URLs de descarga de documentos
- Tooltips en estados rechazados
- Diseño consistente de textareas
- Labels correctos ("Inicio/Fin de Incapacidad")

### Errores Comunes a Verificar:

- ❌ "Cannot GET /disabilities/..." → Debe estar resuelto
- ❌ Tooltip no aparece → Verificar que rejection_comment se obtiene
- ❌ Textarea sin diseño → Verificar estilos CSS
- ❌ Labels incorrectos → Verificar texto en formularios
- ❌ Archivo no se sube → Verificar Storage API y permisos

### Datos de Prueba Necesarios:

- Usuario admin con permisos completos
- Usuario empleado regular
- Archivos de prueba (PDF, imágenes) de diferentes tamaños
- Incapacidades en diferentes estados (pendiente, aprobada, rechazada)

---

## ✅ Checklist Rápido - Lo Más Importante

### Para Admin:

- [ ] Ver y gestionar incapacidades
- [ ] Aprobar/rechazar con comentarios
- [ ] Ver tooltip en estado rechazado
- [ ] Descargar documentos funciona

### Para Empleado:

- [ ] Subir incapacidad con archivo
- [ ] Ver labels correctos ("Inicio/Fin de Incapacidad")
- [ ] Textarea tiene buen diseño
- [ ] Ver tooltip al hacer hover en estado rechazado
- [ ] Descargar documento funciona (sin error "Cannot GET")
- [ ] Solicitar documentos funciona
- [ ] Buzón de quejas funciona

---

**Fecha de creación**: 2025-01-21
**Última actualización**: 2025-01-21 - Después de mejoras en sección de incapacidades

---

## 📊 ESTADO DE VERIFICACIONES TÉCNICAS

### ✅ Completado (Sin necesidad de login):

- ✅ Compilación sin errores
- ✅ Linting sin errores
- ✅ Servidor inicia correctamente
- ✅ Aplicación carga en navegador
- ✅ No hay errores en consola del navegador
- ✅ Todos los módulos se cargan correctamente

### ⏳ Pendiente (Requiere login):

- ⏳ Todas las funcionalidades que requieren autenticación
- ⏳ Pruebas de formularios y validaciones
- ⏳ Pruebas de subida de archivos
- ⏳ Pruebas de descarga de documentos
- ⏳ Pruebas de CRUD en todas las secciones

### 🎯 Próximos Pasos Recomendados:

1. Hacer login como administrador
2. Probar funcionalidades de RRHH - Incapacidades (recientemente modificadas)
3. Hacer login como empleado
4. Probar portal de empleado - Incapacidades (recientemente modificadas)
5. Probar flujo completo: Empleado sube → Admin aprueba/rechaza → Empleado ve cambios

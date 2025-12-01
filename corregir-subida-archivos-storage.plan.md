# Corregir método de subida de archivos a Supabase Storage

## Problema identificado

El método actual en `src/app/job-fair/job-fair-form.component.ts` (líneas 1006-1018) está usando:

- Método: `PUT`
- Endpoint: `/storage/v1/object/job-applications/${encodedFileName}`
- Body: Enviando el `File` directamente
- Headers: `Content-Type` y `x-upsert: true`

El error 403 "new row violates row-level security policy" persiste, lo que indica que aunque las políticas RLS están configuradas, el método o formato de la petición puede estar incorrecto.

## Cambios necesarios

### 1. Cambiar de PUT a POST

Según la documentación oficial de Supabase Storage API, el método correcto para subir archivos es **POST**, no PUT.

### 2. Verificar el formato del endpoint

El endpoint correcto según la documentación es:

- `/storage/v1/object/{bucket}/{path}` con método POST
- El path debe incluir el nombre completo del archivo

### 3. Ajustar los headers

Los headers pueden necesitar ajustes:

- `Content-Type`: Debe ser el tipo MIME del archivo
- `x-upsert`: Debe ser `true` para permitir sobrescribir
- No debe haber headers adicionales que interfieran

## Archivos a modificar

1. `src/app/job-fair/job-fair-form.component.ts` - Método `uploadResume` (líneas 979-1135)

## Implementación

### Cambio 1: Cambiar de PUT a POST

```typescript
// Cambiar de PUT a POST
const response = await firstValueFrom(
  this.http.post<{ Key: string; message?: string }>(
    `${process.env['ENV_SUPABASE_URL']}/storage/v1/object/job-applications/${encodedFileName}`,
    file, // Enviar el File directamente como binario
    {
      headers: {
        'Content-Type': file.type || 'application/octet-stream',
        'x-upsert': 'true', // Permite sobrescribir si el archivo ya existe
      },
      responseType: 'json',
    }
  )
);
```

### Cambio 2: Verificar que el interceptor no interfiera

El interceptor ya está configurado para no interferir con Storage API, pero debemos asegurarnos de que no agregue headers innecesarios.

### Cambio 3: Mantener el manejo de errores mejorado

El manejo de errores actual es adecuado y proporciona información detallada para depuración.

## Notas importantes

- El método POST es el estándar para Supabase Storage API
- El endpoint `/storage/v1/object/{bucket}/{path}` es correcto
- El header `x-upsert: true` permite sobrescribir archivos existentes
- El `Content-Type` debe coincidir con el tipo MIME del archivo

# Script de Verificacion de Configuracion
# Peopletrak - Windows PowerShell

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Verificacion de Configuracion" -ForegroundColor Cyan
Write-Host "Peopletrak" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

$errors = 0
$warnings = 0

# Cargar variables desde .env
if (Test-Path ".env") {
    Get-Content ".env" | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            # Remover comillas si existen
            if ($value -match '^["'']') { $value = $value.Substring(1) }
            if ($value -match '["'']$') { $value = $value.Substring(0, $value.Length - 1) }
            [Environment]::SetEnvironmentVariable($key, $value, "Process")
        }
    }
}

# Verificar variables requeridas
$requiredVars = @(
    "ENV_SUPABASE_URL",
    "ENV_SUPABASE_API_KEY",
    "ENV_AUTH0_DOMAIN",
    "ENV_AUTH0_CLIENT_ID",
    "ENV_AUTH0_AUDIENCE"
)

Write-Host "Verificando variables de entorno..." -ForegroundColor Cyan
Write-Host ""

foreach ($var in $requiredVars) {
    $value = [Environment]::GetEnvironmentVariable($var, "Process")
    
    if ([string]::IsNullOrEmpty($value) -or $value -match "tu-|xxxxx|aqui") {
        Write-Host "  X $var - NO CONFIGURADA o valor de ejemplo" -ForegroundColor Red
        $errors++
    } else {
        Write-Host "  OK $var - Configurada" -ForegroundColor Green
    }
}

# Verificar ENV_APP_URL (opcional pero recomendado)
$appUrl = [Environment]::GetEnvironmentVariable("ENV_APP_URL", "Process")
if ([string]::IsNullOrEmpty($appUrl)) {
    Write-Host "  ! ENV_APP_URL - No configurada (usara default)" -ForegroundColor Yellow
    $warnings++
} else {
    Write-Host "  OK ENV_APP_URL - Configurada: $appUrl" -ForegroundColor Green
}

Write-Host ""
Write-Host "Verificando archivos del proyecto..." -ForegroundColor Cyan
Write-Host ""

# Verificar archivos importantes
$files = @(
    "package.json",
    "src/app/app.config.ts",
    "database/schema.sql"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "  OK $file" -ForegroundColor Green
    } else {
        Write-Host "  X $file - NO ENCONTRADO" -ForegroundColor Red
        $errors++
    }
}

Write-Host ""
Write-Host "Verificando dependencias..." -ForegroundColor Cyan
Write-Host ""

if (Test-Path "node_modules") {
    Write-Host "  OK node_modules existe" -ForegroundColor Green
    
    # Verificar algunas dependencias clave
    $keyDeps = @("@angular/core", "@auth0/auth0-angular")
    foreach ($dep in $keyDeps) {
        if (Test-Path "node_modules/$dep") {
            Write-Host "    OK $dep instalado" -ForegroundColor Gray
        } else {
            Write-Host "    ! $dep no encontrado - ejecuta: npm install" -ForegroundColor Yellow
            $warnings++
        }
    }
} else {
    Write-Host "  ! node_modules no existe - ejecuta: npm install" -ForegroundColor Yellow
    $warnings++
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan

if ($errors -eq 0 -and $warnings -eq 0) {
    Write-Host "OK Configuracion completa. Puedes iniciar la aplicacion." -ForegroundColor Green
    Write-Host ""
    Write-Host "Ejecuta: npm start" -ForegroundColor Cyan
} elseif ($errors -eq 0) {
    Write-Host "! Configuracion con advertencias. Revisa los mensajes arriba." -ForegroundColor Yellow
} else {
    Write-Host "X Hay errores en la configuracion. Por favor corrigelos antes de continuar." -ForegroundColor Red
    Write-Host ""
    Write-Host "Revisa el archivo SETUP.md para mas informacion." -ForegroundColor Yellow
}

Write-Host "============================================" -ForegroundColor Cyan

exit $errors

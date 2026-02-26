# ============================================
# Script de Despliegue a Producción
# ============================================
# Este script automatiza el despliegue a producción
# Uso: .\scripts\deploy-production.ps1

param(
    [string]$ProjectPath = ".",
    [switch]$SkipBuild = $false,
    [switch]$SkipGit = $false
)

$ErrorActionPreference = "Stop"

Write-Host "🚀 Iniciando despliegue a producción..." -ForegroundColor Green
Write-Host ""

# ============================================
# Paso 1: Actualizar código desde GitHub
# ============================================
if (-not $SkipGit) {
    Write-Host "📥 Paso 1: Actualizando código desde GitHub..." -ForegroundColor Cyan
    try {
        Push-Location $ProjectPath
        $currentBranch = git branch --show-current
        Write-Host "   Rama actual: $currentBranch" -ForegroundColor Yellow
        
        git fetch origin
        $status = git status --porcelain
        if ($status) {
            Write-Host "   ⚠️  Hay cambios sin commitear. Guardándolos..." -ForegroundColor Yellow
            git stash
        }
        
        git pull origin $currentBranch
        Write-Host "   ✅ Código actualizado" -ForegroundColor Green
    }
    catch {
        Write-Host "   ❌ Error al actualizar código: $_" -ForegroundColor Red
        exit 1
    }
    finally {
        Pop-Location
    }
}
else {
    Write-Host "⏭️  Paso 1: Omitido (--SkipGit)" -ForegroundColor Yellow
}

Write-Host ""

# ============================================
# Paso 2: Instalar dependencias
# ============================================
Write-Host "📦 Paso 2: Instalando dependencias..." -ForegroundColor Cyan
try {
    Push-Location $ProjectPath
    npm install
    Write-Host "   ✅ Dependencias instaladas" -ForegroundColor Green
}
catch {
    Write-Host "   ❌ Error al instalar dependencias: $_" -ForegroundColor Red
    exit 1
}
finally {
    Pop-Location
}

Write-Host ""

# ============================================
# Paso 3: Build de producción
# ============================================
if (-not $SkipBuild) {
    Write-Host "🔨 Paso 3: Construyendo aplicación para producción..." -ForegroundColor Cyan
    try {
        Push-Location $ProjectPath
        npm run build
        Write-Host "   ✅ Build completado" -ForegroundColor Green
    }
    catch {
        Write-Host "   ❌ Error en el build: $_" -ForegroundColor Red
        exit 1
    }
    finally {
        Pop-Location
    }
}
else {
    Write-Host "⏭️  Paso 3: Omitido (--SkipBuild)" -ForegroundColor Yellow
}

Write-Host ""

# ============================================
# Paso 4: Verificar archivos SQL
# ============================================
Write-Host "📋 Paso 4: Verificando archivos SQL necesarios..." -ForegroundColor Cyan
$storageScript = Join-Path $ProjectPath "database\migrations\setup-storage.sql"
$setupScript = Join-Path $ProjectPath "database\01-setup.sql"

if (-not (Test-Path $storageScript)) {
    Write-Host "   ❌ No se encuentra: $storageScript" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $setupScript)) {
    Write-Host "   ❌ No se encuentra: $setupScript" -ForegroundColor Red
    exit 1
}

Write-Host "   ✅ Archivos SQL encontrados" -ForegroundColor Green
Write-Host ""

# ============================================
# Resumen y próximos pasos
# ============================================
Write-Host "✅ Despliegue local completado" -ForegroundColor Green
Write-Host ""
Write-Host "📝 PRÓXIMOS PASOS MANUALES:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Ejecuta los scripts SQL en Supabase (PRODUCCIÓN):" -ForegroundColor White
Write-Host "   a) Ve a: https://app.supabase.com → Tu proyecto de producción" -ForegroundColor Gray
Write-Host "   b) SQL Editor → New Query" -ForegroundColor Gray
Write-Host "   c) Ejecuta: database\migrations\setup-storage.sql" -ForegroundColor Gray
Write-Host "   d) Ejecuta: database\01-setup.sql" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Verifica variables de entorno en producción:" -ForegroundColor White
Write-Host "   - ENV_SUPABASE_URL" -ForegroundColor Gray
Write-Host "   - ENV_SUPABASE_API_KEY" -ForegroundColor Gray
Write-Host "   - ENV_SUPABASE_SERVICE_ROLE_KEY" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Reinicia tu aplicación:" -ForegroundColor White
Write-Host "   pm2 restart all" -ForegroundColor Gray
Write-Host "   # O el comando que uses para reiniciar" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Verifica que todo funcione:" -ForegroundColor White
Write-Host "   - Bucket 'disabilities' existe en Storage" -ForegroundColor Gray
Write-Host "   - Puedes subir archivos de incapacidades" -ForegroundColor Gray
Write-Host "   - La aplicación carga correctamente" -ForegroundColor Gray
Write-Host ""


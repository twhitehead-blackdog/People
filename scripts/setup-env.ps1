# Script de Configuracion de Variables de Entorno
# Peopletrak - Windows PowerShell

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Configuracion de Variables de Entorno" -ForegroundColor Cyan
Write-Host "Peopletrak" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Verificar si existe .env
if (Test-Path ".env") {
    Write-Host "OK Archivo .env encontrado" -ForegroundColor Green
} else {
    Write-Host "! Archivo .env no encontrado" -ForegroundColor Yellow
    Write-Host "Creando .env desde .env.example..." -ForegroundColor Yellow
    
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
        Write-Host "OK Archivo .env creado. Por favor editelo con tus valores." -ForegroundColor Green
    } else {
        Write-Host "X Archivo .env.example no encontrado" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "Por favor, completa las siguientes variables en tu archivo .env:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. ENV_SUPABASE_URL - URL de tu proyecto Supabase" -ForegroundColor White
Write-Host "2. ENV_SUPABASE_API_KEY - API Key publica de Supabase" -ForegroundColor White
Write-Host "3. ENV_AUTH0_DOMAIN - Dominio de Auth0" -ForegroundColor White
Write-Host "4. ENV_AUTH0_CLIENT_ID - Client ID de Auth0" -ForegroundColor White
Write-Host "5. ENV_AUTH0_AUDIENCE - Audience de Auth0 API" -ForegroundColor White
Write-Host "6. ENV_APP_URL - URL de la aplicacion (default: http://localhost:4200)" -ForegroundColor White
Write-Host ""

# Cargar variables desde .env si existe
if (Test-Path ".env") {
    Write-Host "Cargando variables desde .env..." -ForegroundColor Cyan
    
    Get-Content ".env" | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            
            # Remover comillas si existen
            if ($value -match '^["'']') { $value = $value.Substring(1) }
            if ($value -match '["'']$') { $value = $value.Substring(0, $value.Length - 1) }
            
            [Environment]::SetEnvironmentVariable($key, $value, "Process")
            Write-Host "  OK $key" -ForegroundColor Gray
        }
    }
    
    Write-Host ""
    Write-Host "Variables cargadas en la sesion actual de PowerShell." -ForegroundColor Green
    Write-Host ""
    Write-Host "Para hacerlas permanentes, ejecuta este script antes de iniciar la aplicacion," -ForegroundColor Yellow
    Write-Host "o configura las variables en el sistema operativo." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Siguiente paso: Edita .env con tus valores reales" -ForegroundColor Cyan
Write-Host "Luego ejecuta: npm start" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

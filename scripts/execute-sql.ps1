# Script para ejecutar SQL en Supabase
# Uso: .\scripts\execute-sql.ps1 -SqlFile "database\disable-rls.sql"

param(
    [Parameter(Mandatory=$true)]
    [string]$SqlFile,
    
    [string]$SupabaseUrl = $env:ENV_SUPABASE_URL,
    [string]$SupabaseToken = $env:ENV_SUPABASE_TOKEN
)

if (-not $SupabaseUrl) {
    Write-Host "❌ Error: ENV_SUPABASE_URL no está configurado" -ForegroundColor Red
    Write-Host "Configura la variable de entorno o pásala como parámetro" -ForegroundColor Yellow
    exit 1
}

if (-not $SupabaseToken) {
    Write-Host "⚠️  Advertencia: ENV_SUPABASE_TOKEN no está configurado" -ForegroundColor Yellow
    Write-Host "Usando API Key pública (puede tener limitaciones)" -ForegroundColor Yellow
    $SupabaseToken = $env:ENV_SUPABASE_API_KEY
}

if (-not (Test-Path $SqlFile)) {
    Write-Host "❌ Error: Archivo no encontrado: $SqlFile" -ForegroundColor Red
    exit 1
}

$sqlContent = Get-Content $SqlFile -Raw

# Extraer el project ID de la URL
if ($SupabaseUrl -match 'https://([^.]+)\.supabase\.co') {
    $projectId = $Matches[1]
} else {
    Write-Host "❌ Error: URL de Supabase inválida" -ForegroundColor Red
    exit 1
}

$apiUrl = "$SupabaseUrl/rest/v1/rpc/exec_sql"

Write-Host "🚀 Ejecutando script SQL: $SqlFile" -ForegroundColor Green
Write-Host "📊 Proyecto: $projectId" -ForegroundColor Cyan

try {
    # Supabase no tiene un endpoint directo para ejecutar SQL arbitrario
    # Necesitas usar el SQL Editor o psql
    
    Write-Host "⚠️  Supabase REST API no soporta ejecutar SQL arbitrario" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "📋 Para ejecutar este script:" -ForegroundColor Cyan
    Write-Host "1. Ve a: https://app.supabase.com/project/$projectId/sql/new" -ForegroundColor White
    Write-Host "2. Copia el contenido del archivo: $SqlFile" -ForegroundColor White
    Write-Host "3. Pega y ejecuta en el SQL Editor" -ForegroundColor White
    Write-Host ""
    Write-Host "📄 Contenido del archivo:" -ForegroundColor Cyan
    Write-Host "----------------------------------------" -ForegroundColor Gray
    Write-Host $sqlContent -ForegroundColor White
    Write-Host "----------------------------------------" -ForegroundColor Gray
    
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
    exit 1
}



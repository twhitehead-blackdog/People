# Script para ejecutar todos los archivos SQL en orden
# Uso: .\scripts\execute-all-sql.ps1

param(
    [string]$SupabaseUrl = $env:ENV_SUPABASE_URL,
    [string]$SupabasePassword = $env:ENV_SUPABASE_PASSWORD,
    [string]$SupabaseDb = $env:ENV_SUPABASE_DB,
    [string]$SupabaseHost = $env:ENV_SUPABASE_HOST,
    [switch]$SkipSeed = $false,
    [switch]$DisableRLS = $false
)

$ErrorActionPreference = "Stop"

# Orden de ejecución de los archivos SQL
$sqlFiles = @(
    "database/schema.sql",
    "database/employee_portal_tables.sql",
    "database/employee_personal_data_tables.sql",
    "database/complaint_messages_table.sql",
    "database/settings_table.sql",
    "database/add_portal_access_field.sql",
    "database/add_account_approval_field.sql",
    "database/add_creator_employee_id_to_complaints.sql",
    "database/add_priority_to_complaints.sql",
    "database/fix-complaint-messages-rls.sql"
)

# Agregar RLS o deshabilitarlo
if ($DisableRLS) {
    $sqlFiles += "database/disable-rls.sql"
} else {
    $sqlFiles += "database/rls-policies.sql"
}

# Agregar seed si no se omite
if (-not $SkipSeed) {
    $sqlFiles += "database/seed.sql"
}

Write-Host "🚀 Ejecutando todos los scripts SQL..." -ForegroundColor Green
Write-Host "📋 Archivos a ejecutar: $($sqlFiles.Count)" -ForegroundColor Cyan
Write-Host ""

# Verificar si psql está disponible
$psqlPath = Get-Command psql -ErrorAction SilentlyContinue

if ($psqlPath) {
    Write-Host "✅ psql encontrado, ejecutando scripts directamente..." -ForegroundColor Green
    
    # Construir connection string
    if ($SupabaseHost -and $SupabaseDb -and $SupabasePassword) {
        $connectionString = "postgresql://postgres:$SupabasePassword@$SupabaseHost:5432/$SupabaseDb"
        
        foreach ($sqlFile in $sqlFiles) {
            if (Test-Path $sqlFile) {
                Write-Host "📄 Ejecutando: $sqlFile" -ForegroundColor Yellow
                try {
                    Get-Content $sqlFile -Raw | & $psqlPath.Path $connectionString
                    if ($LASTEXITCODE -eq 0) {
                        Write-Host "✅ $sqlFile ejecutado correctamente" -ForegroundColor Green
                    } else {
                        Write-Host "⚠️  $sqlFile tuvo errores (código: $LASTEXITCODE)" -ForegroundColor Yellow
                    }
                } catch {
                    Write-Host "❌ Error ejecutando $sqlFile : $_" -ForegroundColor Red
                }
            } else {
                Write-Host "⚠️  Archivo no encontrado: $sqlFile" -ForegroundColor Yellow
            }
        }
    } else {
        Write-Host "⚠️  Variables de entorno de Supabase no configuradas para psql" -ForegroundColor Yellow
        Write-Host "Necesitas: ENV_SUPABASE_HOST, ENV_SUPABASE_DB, ENV_SUPABASE_PASSWORD" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "📋 Continuando con método alternativo..." -ForegroundColor Cyan
        $psqlPath = $null
    }
}

# Si no hay psql o no hay credenciales, crear script combinado
if (-not $psqlPath) {
    Write-Host "📝 Creando script SQL combinado..." -ForegroundColor Cyan
    
    $combinedScript = @'
-- ============================================
-- Script SQL Combinado - Peopletrak
-- Generado automáticamente
-- ============================================
-- Ejecuta este script completo en el SQL Editor de Supabase
-- https://app.supabase.com/project/[TU_PROYECTO]/sql/new
-- ============================================

'@
    
    foreach ($sqlFile in $sqlFiles) {
        if (Test-Path $sqlFile) {
            Write-Host "📄 Agregando: $sqlFile" -ForegroundColor Yellow
            $combinedScript += "`n`n-- ============================================`n"
            $combinedScript += "-- Archivo: $sqlFile`n"
            $combinedScript += "-- ============================================`n`n"
            $combinedScript += Get-Content $sqlFile -Raw
            $combinedScript += "`n`n"
        } else {
            Write-Host "⚠️  Archivo no encontrado: $sqlFile" -ForegroundColor Yellow
        }
    }
    
    $outputFile = "database/all-scripts-combined.sql"
    $combinedScript | Out-File -FilePath $outputFile -Encoding UTF8
    
    Write-Host ""
    Write-Host "✅ Script combinado creado: $outputFile" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Para ejecutar:" -ForegroundColor Cyan
    Write-Host "1. Ve al SQL Editor de Supabase" -ForegroundColor White
    Write-Host "2. Abre el archivo: $outputFile" -ForegroundColor White
    Write-Host "3. Copia todo el contenido" -ForegroundColor White
    Write-Host "4. Pégalo en el SQL Editor y ejecuta (Ctrl+Enter)" -ForegroundColor White
    Write-Host ""
    
    # Mostrar el contenido del primer archivo como ejemplo
    if ($sqlFiles.Count -gt 0 -and (Test-Path $sqlFiles[0])) {
        Write-Host "📄 Vista previa del primer archivo ($($sqlFiles[0])):" -ForegroundColor Cyan
        Write-Host "----------------------------------------" -ForegroundColor Gray
        Get-Content $sqlFiles[0] -Head 20 | Write-Host
        Write-Host "... (archivo completo en $outputFile)" -ForegroundColor Gray
        Write-Host "----------------------------------------" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "✨ Proceso completado!" -ForegroundColor Green


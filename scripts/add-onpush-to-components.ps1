# Script para agregar changeDetection: OnPush a todos los componentes que no lo tienen

param(
    [switch]$Fix = $false,
    [switch]$Verbose = $false
)

Write-Host "Agregando changeDetection: OnPush a componentes..." -ForegroundColor Blue

$componentFiles = Get-ChildItem -Path "src/app" -Recurse -Filter "*.component.ts" -ErrorAction SilentlyContinue

$modifiedCount = 0
$totalCount = $componentFiles.Count

foreach ($file in $componentFiles) {
    $content = Get-Content $file.FullName -Raw

    # Verificar si ya tiene changeDetection configurado
    if ($content -match "changeDetection.*OnPush") {
        if ($Verbose) {
            Write-Host "Ya tiene OnPush: $($file.Name)" -ForegroundColor Green
        }
        continue
    }

    # Verificar si es un componente standalone
    if ($content -match "standalone:\s*true") {
        # Agregar changeDetection: OnPush después de standalone: true
        $replacement = "standalone: true,`r`n  changeDetection: import('@angular/core').ChangeDetectionStrategy.OnPush,"
        $newContent = $content -replace "standalone:\s*true,", $replacement

        if ($newContent -ne $content) {
            if ($Fix) {
                Set-Content -Path $file.FullName -Value $newContent -Encoding UTF8
                Write-Host "Agregado OnPush: $($file.Name)" -ForegroundColor Green
            } else {
                Write-Host "Necesita OnPush: $($file.Name)" -ForegroundColor Yellow
            }
            $modifiedCount++
        }
    } else {
        if ($Verbose) {
            Write-Host "No es standalone: $($file.Name)" -ForegroundColor Yellow
        }
    }
}

Write-Host "`nResumen:" -ForegroundColor Cyan
Write-Host "Total de componentes: $totalCount" -ForegroundColor White
Write-Host "Componentes modificados: $modifiedCount" -ForegroundColor Green

if (-not $Fix) {
    Write-Host "`nUsa -Fix para aplicar los cambios automaticamente" -ForegroundColor Blue
}
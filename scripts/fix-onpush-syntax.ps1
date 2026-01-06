# Script para corregir la sintaxis de changeDetection OnPush

param(
    [switch]$Verbose = $false
)

Write-Host "🔧 Corrigiendo sintaxis de changeDetection OnPush..." -ForegroundColor Blue

$componentFiles = Get-ChildItem -Path "src/app" -Recurse -Filter "*.component.ts" -ErrorAction SilentlyContinue

$modifiedCount = 0

foreach ($file in $componentFiles) {
    $content = Get-Content $file.FullName -Raw

    # Verificar si tiene la sintaxis problemática
    if ($content -match "changeDetection: import\('@angular/core'\)\.ChangeDetectionStrategy\.OnPush") {
        if ($Verbose) {
            Write-Host "Corrigiendo: $($file.Name)" -ForegroundColor Yellow
        }

        # Agregar ChangeDetectionStrategy al import si no está
        if ($content -match "import \{ ([^}]+) \} from '@angular/core'") {
            $currentImports = $matches[1]
            if ($currentImports -notmatch "ChangeDetectionStrategy") {
                $newImports = $currentImports + ", ChangeDetectionStrategy"
                $content = $content -replace "import \{ ([^}]+) \} from '@angular/core'", "import { $newImports } from '@angular/core'"
            }
        }

        # Corregir la sintaxis de changeDetection
        $content = $content -replace "changeDetection: import\('@angular/core'\)\.ChangeDetectionStrategy\.OnPush", "changeDetection: ChangeDetectionStrategy.OnPush"

        Set-Content -Path $file.FullName -Value $content -Encoding UTF8
        $modifiedCount++

        if ($Verbose) {
            Write-Host "✅ Corregido: $($file.Name)" -ForegroundColor Green
        }
    }
}

Write-Host "`n📊 Archivos corregidos: $modifiedCount" -ForegroundColor Cyan
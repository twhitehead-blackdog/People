# Script simple para agregar ChangeDetectionStrategy a todos los archivos que lo necesitan

Get-ChildItem -Path "src/app" -Recurse -Filter "*.component.ts" | ForEach-Object {
    $content = Get-Content $_.FullName -Raw

    # Agregar ChangeDetectionStrategy al import si no está
    if ($content -match "import \{ ([^}]+) \} from '@angular/core'" -and $content -match "ChangeDetectionStrategy\.OnPush") {
        $imports = $matches[1]
        if ($imports -notmatch "ChangeDetectionStrategy") {
            $newImports = $imports + ", ChangeDetectionStrategy"
            $content = $content -replace "import \{ ([^}]+) \} from '@angular/core'", "import { $newImports } from '@angular/core'"
        }
    }

    # Corregir cualquier sintaxis restante problemática
    $content = $content -replace "changeDetection: import\('@angular/core'\)\.ChangeDetectionStrategy\.OnPush", "changeDetection: ChangeDetectionStrategy.OnPush"

    Set-Content -Path $_.FullName -Value $content -Encoding UTF8
    Write-Host "Procesado: $($_.Name)"
}
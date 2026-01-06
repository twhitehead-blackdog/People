# 🚀 Verificación de Reglas de Cursor - Black Dog
# Script para auditar cumplimiento de mejores prácticas

param(
    [switch]$Fix = $false,
    [switch]$Verbose = $false
)

Write-Host "🐾 Verificando reglas de Cursor para Black Dog..." -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Yellow

$errors = 0
$warnings = 0
$successes = 0

function Write-Success {
    param([string]$message)
    Write-Host "✅ $message" -ForegroundColor Green
    $script:successes++
}

function Write-Warning {
    param([string]$message)
    Write-Host "⚠️  $message" -ForegroundColor Yellow
    $script:warnings++
}

function Write-Error {
    param([string]$message)
    Write-Host "❌ $message" -ForegroundColor Red
    $script:errors++
}

# 1. Verificar estructura de archivos
Write-Host "`n📁 Verificando estructura de archivos..." -ForegroundColor Blue

if (Test-Path "src\app\core") {
    Write-Success "Directorio core/ existe"
} else {
    Write-Error "Directorio core/ no encontrado"
}

if (Test-Path "src\app\shared") {
    Write-Success "Directorio shared/ existe"
} else {
    Write-Error "Directorio shared/ no encontrado"
}

if (Test-Path "src\app\features") {
    Write-Success "Directorio features/ existe"
} else {
    Write-Warning "Directorio features/ no encontrado (considerar crear)"
}

if (Test-Path "src\app\stores") {
    Write-Success "Directorio stores/ existe"
} else {
    Write-Warning "Directorio stores/ no encontrado (NgRx Signals)"
}

# 2. Verificar configuración Nx
Write-Host "`n🔧 Verificando configuración Nx..." -ForegroundColor Blue

if (Test-Path "nx.json") {
    $nxConfig = Get-Content "nx.json" | ConvertFrom-Json

    # Verificar cache activado
    if ($nxConfig.targetDefaults.'@nx/angular:application'.cache -eq $true) {
        Write-Success "Cache de Nx activado"
    } else {
        Write-Warning "Cache de Nx no activado"
    }

    # Verificar componentes standalone
    if ($nxConfig.generators.'@nx/angular:component'.standalone -eq $true) {
        Write-Success "Generador configura componentes standalone"
    } else {
        Write-Warning "Generador no configura standalone por defecto"
    }

    # Verificar OnPush
    if ($nxConfig.generators.'@nx/angular:component'.changeDetection -eq "OnPush") {
        Write-Success "Generador configura OnPush change detection"
    } else {
        Write-Warning "Generador no configura OnPush por defecto"
    }
} else {
    Write-Error "nx.json no encontrado"
}

# 3. Verificar dependencias críticas
Write-Host "`n📦 Verificando dependencias críticas..." -ForegroundColor Blue

$packageJson = Get-Content "package.json" | ConvertFrom-Json

$criticalDeps = @(
    "@angular/core",
    "@ngrx/signals",
    "primeng",
    "@supabase/supabase-js",
    "@auth0/auth0-angular"
)

foreach ($dep in $criticalDeps) {
    if ($packageJson.dependencies.$dep) {
        Write-Success "Dependencia $dep instalada"
    } else {
        Write-Error "Dependencia $dep no encontrada"
    }
}

# 4. Verificar configuración de testing
Write-Host "`n🧪 Verificando configuración de testing..." -ForegroundColor Blue

if (Test-Path "jest.config.ts") {
    Write-Success "Jest configurado"
} else {
    Write-Error "jest.config.ts no encontrado"
}

# Verificar playwright
if (Test-Path "playwright.config.ts") {
    Write-Success "Playwright configurado"
} else {
    Write-Warning "playwright.config.ts no encontrado"
}

# 5. Verificar bundle budgets
Write-Host "`n📊 Verificando límites de bundle..." -ForegroundColor Blue

if (Test-Path "project.json") {
    $projectConfig = Get-Content "project.json" | ConvertFrom-Json

    $budgets = $projectConfig.targets.build.configurations.production.budgets
    if ($budgets) {
        foreach ($budget in $budgets) {
            if ($budget.type -eq "initial" -and $budget.maximumError -eq "5mb") {
                Write-Success "Bundle budget inicial configurado (5MB)"
            }
            if ($budget.type -eq "anyComponentStyle" -and $budget.maximumError -eq "35kb") {
                Write-Success "Bundle budget de componentes configurado (35KB)"
            }
        }
    } else {
        Write-Warning "No se encontraron budgets configurados"
    }
} else {
    Write-Error "project.json no encontrado"
}

# 6. Verificar archivos de configuración
Write-Host "`n⚙️ Verificando archivos de configuración..." -ForegroundColor Blue

$configFiles = @(
    "../.cursorrules",
    "tailwind.config.js",
    "tsconfig.json",
    ".eslintrc.json",
    "docker-compose-fixed.yml",
    "Dockerfile"
)

foreach ($file in $configFiles) {
    if (Test-Path $file) {
        Write-Success "Archivo $file existe"
    } else {
        Write-Warning "Archivo $file no encontrado"
    }
}

# 7. Verificar scripts npm
Write-Host "`n📜 Verificando scripts npm..." -ForegroundColor Blue

$scripts = $packageJson.scripts
$requiredScripts = @(
    "start:dev",
    "build",
    "test",
    "setup:env",
    "verify"
)

foreach ($script in $requiredScripts) {
    if ($scripts.$script) {
        Write-Success "Script $script configurado"
    } else {
        Write-Warning "Script $script no encontrado"
    }
}

# 8. Verificar variables de entorno
Write-Host "`n🔐 Verificando configuración de entorno..." -ForegroundColor Blue

if (Test-Path ".env") {
    Write-Success "Archivo .env existe"
} else {
    Write-Warning "Archivo .env no encontrado (usar EJEMPLO-ENV.txt)"
}

if (Test-Path "EJEMPLO-ENV.txt") {
    Write-Success "Archivo EJEMPLO-ENV.txt existe"
} else {
    Write-Error "Archivo EJEMPLO-ENV.txt no encontrado"
}

# 9. Análisis de componentes (básico)
Write-Host "`n🧩 Análisis básico de componentes..." -ForegroundColor Blue

$componentFiles = Get-ChildItem -Path "src" -Recurse -Filter "*.component.ts" -ErrorAction SilentlyContinue

if ($componentFiles) {
    $standaloneCount = 0
    $totalComponents = $componentFiles.Count

    foreach ($file in $componentFiles) {
        $content = Get-Content $file.FullName -Raw
        if ($content -match "standalone:\s*true") {
            $standaloneCount++
        }
    }

    $standalonePercentage = [math]::Round(($standaloneCount / $totalComponents) * 100, 1)
    Write-Host "📊 Componentes analizados: $totalComponents" -ForegroundColor Cyan
    Write-Host "📊 Componentes standalone: $standaloneCount ($standalonePercentage%)" -ForegroundColor Cyan

    if ($standalonePercentage -ge 80) {
        Write-Success "Buen porcentaje de componentes standalone"
    } elseif ($standalonePercentage -ge 50) {
        Write-Warning "Porcentaje moderado de componentes standalone"
    } else {
        Write-Error "Bajo porcentaje de componentes standalone"
    }
} else {
    Write-Warning "No se encontraron archivos de componentes"
}

# 10. Verificar documentación
Write-Host "`n📚 Verificando documentación..." -ForegroundColor Blue

$docFiles = @(
    "README.md",
    "AGENTS.md",
    "DEPLOY.md",
    "BUGS_AND_ISSUES.md"
)

foreach ($file in $docFiles) {
    if (Test-Path $file) {
        Write-Success "Documento $file existe"
    } else {
        Write-Warning "Documento $file no encontrado"
    }
}

# Resultado final
Write-Host "`n==================================================" -ForegroundColor Yellow
Write-Host "📊 RESULTADO DE LA VERIFICACIÓN" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Yellow

Write-Host "✅ Correcto: $successes" -ForegroundColor Green
Write-Host "⚠️  Advertencias: $warnings" -ForegroundColor Yellow
Write-Host "❌ Errores: $errors" -ForegroundColor Red

$totalChecks = $successes + $warnings + $errors
$score = [math]::Round(($successes / $totalChecks) * 100, 1)

Write-Host "`n📈 Puntaje general: $score%" -ForegroundColor Cyan

if ($score -ge 90) {
    Write-Host "🎉 ¡Excelente cumplimiento de reglas!" -ForegroundColor Green
} elseif ($score -ge 75) {
    Write-Host "👍 Buen cumplimiento de reglas" -ForegroundColor Yellow
} elseif ($score -ge 50) {
    Write-Host "⚠️ Cumplimiento moderado, revisar advertencias" -ForegroundColor Yellow
} else {
    Write-Host "❌ Cumplimiento bajo, revisar errores críticos" -ForegroundColor Red
}

if ($Fix) {
    Write-Host "`nModo fix activado - aplicando correcciones automaticas..." -ForegroundColor Blue
    # Aqui irian las correcciones automaticas
    Write-Host "Correcciones automaticas no implementadas aun" -ForegroundColor Yellow
}

Write-Host "`nVerificacion completada!" -ForegroundColor Cyan
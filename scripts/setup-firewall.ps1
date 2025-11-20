# Script para configurar el firewall para desarrollo local
Write-Host "`n=== Configurando Firewall para Desarrollo ===" -ForegroundColor Cyan
Write-Host ""

# Verificar si se ejecuta como Administrador
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "ADVERTENCIA: Este script requiere permisos de Administrador." -ForegroundColor Yellow
    Write-Host "Por favor, ejecuta PowerShell como Administrador y vuelve a ejecutar este script." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "O ejecuta manualmente estos comandos:" -ForegroundColor Cyan
    Write-Host "  New-NetFirewallRule -DisplayName 'Angular Dev Server - 4200' -Direction Inbound -LocalPort 4200 -Protocol TCP -Action Allow" -ForegroundColor White
    Write-Host "  New-NetFirewallRule -DisplayName 'Node API Server - 4000' -Direction Inbound -LocalPort 4000 -Protocol TCP -Action Allow" -ForegroundColor White
    exit 1
}

# Puerto 4200 (Angular)
try {
    $existing = Get-NetFirewallRule -DisplayName "Angular Dev Server - 4200" -ErrorAction SilentlyContinue
    if ($existing) {
        Write-Host "✓ Regla para puerto 4200 ya existe" -ForegroundColor Green
    } else {
        New-NetFirewallRule -DisplayName "Angular Dev Server - 4200" -Direction Inbound -LocalPort 4200 -Protocol TCP -Action Allow | Out-Null
        Write-Host "✓ Regla de firewall para puerto 4200 creada exitosamente" -ForegroundColor Green
    }
} catch {
    Write-Host "✗ Error al crear regla para puerto 4200: $($_.Exception.Message)" -ForegroundColor Red
}

# Puerto 4000 (Node API)
try {
    $existing = Get-NetFirewallRule -DisplayName "Node API Server - 4000" -ErrorAction SilentlyContinue
    if ($existing) {
        Write-Host "✓ Regla para puerto 4000 ya existe" -ForegroundColor Green
    } else {
        New-NetFirewallRule -DisplayName "Node API Server - 4000" -Direction Inbound -LocalPort 4000 -Protocol TCP -Action Allow | Out-Null
        Write-Host "✓ Regla de firewall para puerto 4000 creada exitosamente" -ForegroundColor Green
    }
} catch {
    Write-Host "✗ Error al crear regla para puerto 4000: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "Configuración completada!" -ForegroundColor Green
Write-Host ""
Write-Host "Ahora puedes acceder desde otra laptop usando:" -ForegroundColor Cyan
Write-Host "  Frontend: http://192.168.32.143:4200" -ForegroundColor Green
Write-Host "  Backend API: http://192.168.32.143:4000" -ForegroundColor Green
Write-Host ""


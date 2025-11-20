# Script para obtener la IP local y mostrar cómo acceder desde otra laptop
Write-Host "`n=== Configuración de Acceso desde Red Local ===" -ForegroundColor Cyan
Write-Host ""

# Obtener la IP local
$ipAddresses = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { 
    $_.IPAddress -notlike "127.*" -and 
    $_.IPAddress -notlike "169.254.*" 
} | Select-Object -ExpandProperty IPAddress

if ($ipAddresses) {
    Write-Host "Tu IP local es: " -NoNewline -ForegroundColor Yellow
    $primaryIP = $ipAddresses[0]
    Write-Host $primaryIP -ForegroundColor Green
    Write-Host ""
    Write-Host "Desde otra laptop en la misma red, accede a:" -ForegroundColor Cyan
    Write-Host "  Frontend: " -NoNewline -ForegroundColor White
    Write-Host "http://$primaryIP:4200" -ForegroundColor Green
    Write-Host "  Backend API: " -NoNewline -ForegroundColor White
    Write-Host "http://$primaryIP:4000" -ForegroundColor Green
    Write-Host ""
    Write-Host "Asegúrate de:" -ForegroundColor Yellow
    Write-Host "  1. Que el firewall de Windows permita conexiones en los puertos 4200 y 4000" -ForegroundColor White
    Write-Host "  2. Que ambas laptops estén en la misma red Wi-Fi/Ethernet" -ForegroundColor White
    Write-Host "  3. Ejecutar 'npm run start:dev' para iniciar ambos servidores" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "No se pudo obtener la IP local." -ForegroundColor Red
    Write-Host "Asegúrate de estar conectado a una red." -ForegroundColor Yellow
}

Write-Host "`nPara abrir el firewall automáticamente, ejecuta como Administrador:" -ForegroundColor Cyan
Write-Host "  New-NetFirewallRule -DisplayName 'Angular Dev Server' -Direction Inbound -LocalPort 4200 -Protocol TCP -Action Allow" -ForegroundColor White
Write-Host "  New-NetFirewallRule -DisplayName 'Node API Server' -Direction Inbound -LocalPort 4000 -Protocol TCP -Action Allow" -ForegroundColor White
Write-Host ""


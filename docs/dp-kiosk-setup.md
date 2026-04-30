# DigitalPersona U.are.U 4500 — Setup de kiosko

Guía rápida para preparar una PC kiosko con lector de huellas DigitalPersona U.are.U 4500.

## Requisitos en cada PC kiosko
- Windows 10/11
- Conexión a internet
- Puerto USB libre para el lector U.are.U 4500
- Navegador moderno (Chrome / Edge)

## Pasos

### 1. Conectar el lector
Conecta el lector U.are.U 4500 a un puerto USB. Windows lo reconocerá pero **no funcionará** hasta instalar el Lite Client.

### 2. Instalar el DigitalPersona Lite Client
1. Abre `https://people.blackdogpanama.com/dp-timeclock` en el browser.
2. Si el Lite Client no está instalado verás un botón **"Descargar e instalar"**.
3. Descarga `dp-lite-client.exe`, ejecútalo como administrador y sigue el wizard.
4. Acepta el certificado SSL para `localhost` cuando lo pida (es necesario para el WebSocket seguro).
5. Reinicia el browser.

> **Nota**: el Lite Client corre como servicio de Windows escuchando en `wss://localhost:52181`. Sin él, no se puede leer la huella desde el browser.

### 3. Verificar
Recarga `https://people.blackdogpanama.com/dp-timeclock`. Debe mostrar **"Coloca tu dedo"** con un icono pulsante.

## Operación diaria
- El kiosko espera la huella → identifica al empleado → muestra cuatro botones: **Entrada / Inicio almuerzo / Fin almuerzo / Salida**.
- El empleado toca el botón correspondiente. Listo.

## Registro de empleados
1. Un administrador entra a `https://people.blackdogpanama.com` desde la PC kiosko (Auth0).
2. Va a **Empleados → [empleado] → tab Huella → Registrar (DigitalPersona)**.
3. Captura 4 muestras del mismo dedo. El sistema guarda el template extraído por SourceAFIS en Supabase.

## Subir el instalador al server
El binario `dp-lite-client.exe` debe estar en `/opt/people-prueba/installers/dp-lite-client.exe` para que el endpoint `/api/dp/lite-client-installer` pueda servirlo.

```bash
# desde la VPS
scp dp-lite-client.exe diego_bd@vps:/opt/people-prueba/installers/
chmod 644 /opt/people-prueba/installers/dp-lite-client.exe
```

## Stack técnico
| Componente | Dónde corre |
|---|---|
| `@digitalpersona/devices` (captura) | Browser del kiosko |
| DP Lite Client (servicio Windows) | PC kiosko |
| `sourceafis-js` (extract + match) | Server Express (VPS) — requiere Java 17 |
| Templates (base64) | Supabase `dp_fingerprint_templates` |

## Troubleshooting

**"Lite Client no detectado"** — El servicio Windows está caído. Buscar `DigitalPersona` en *Servicios* de Windows, iniciar.

**"Lector no conectado"** — El lector USB no responde. Probar otro puerto USB. Reinstalar drivers desde el installer.

**Identificación falla siempre** — La calidad del template enrolado puede ser baja. Re-enrolar en el detalle del empleado.

**WebSocket bloqueado por Windows Firewall** — `localhost:52181` debe estar permitido (lo configura el installer).

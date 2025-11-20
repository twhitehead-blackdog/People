import express from 'express';

// The Express app is exported so that it can be used by serverless Functions.
export function app(): express.Express {
  const server = express();

  // Configurar Express para confiar en proxies (necesario para obtener IP real en producción/VPS)
  // Esto permite que req.ip funcione correctamente cuando hay un proxy reverso (nginx, etc.)
  server.set('trust proxy', true);

  // Middleware para parsear JSON
  server.use(express.json());
  
  // CORS middleware para permitir requests desde el frontend
  server.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }
    next();
  });

  // Endpoint proxy para Wassenger (evita problemas de CORS)
  server.post('/api/wassenger/send-message', async (req, res) => {
    try {
      const { phoneNumber, message, apiKey } = req.body;

      if (!phoneNumber || !message || !apiKey) {
        return res.status(400).json({
          error: 'Missing required fields: phoneNumber, message, apiKey',
        });
      }

      // Formatear número de teléfono
      const cleanPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');

      // Hacer solicitud a Wassenger desde el servidor (sin problemas de CORS)
      const wassengerResponse = await fetch('https://api.wassenger.com/v1/messages', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: cleanPhone,
          message: message,
        }),
      });

      let responseData: any;
      const contentType = wassengerResponse.headers.get('content-type');
      
      try {
        // Leer el body como texto primero
        const textData = await wassengerResponse.text();
        
        if (contentType && contentType.includes('application/json') && textData) {
          try {
            responseData = JSON.parse(textData);
          } catch {
            responseData = { message: textData || 'Error desconocido de Wassenger' };
          }
        } else {
          responseData = { message: textData || 'Error desconocido de Wassenger' };
        }
      } catch (parseError) {
        // Si no se puede parsear la respuesta, usar un mensaje genérico
        responseData = { message: 'Error al procesar respuesta de Wassenger' };
      }

      if (!wassengerResponse.ok) {
        return res.status(wassengerResponse.status).json({
          error: responseData.message || responseData.error || 'Error al enviar mensaje por Wassenger',
          details: responseData,
        });
      }

      return res.json({ success: true, data: responseData });
    } catch (error: any) {
      console.error('Error en proxy de Wassenger:', error);
      return res.status(500).json({
        error: 'Error interno del servidor',
        message: error.message,
      });
    }
  });

  // Health check endpoint
  server.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Server is running' });
  });

  // Endpoint para obtener la IP real del cliente
  // Funciona tanto en localhost como en producción/VPS
  server.get('/api/client-ip', (req, res) => {
    // Intentar obtener la IP real del cliente desde varios headers
    // X-Forwarded-For: usado por proxies y load balancers
    // X-Real-IP: usado por algunos proxies
    // req.ip: IP directa de la conexión
    // req.connection.remoteAddress: IP de la conexión (legacy)
    
    let clientIP: string | undefined;
    
    // 1. Intentar desde X-Forwarded-For (puede tener múltiples IPs, tomar la primera)
    const forwardedFor = req.headers['x-forwarded-for'];
    if (forwardedFor) {
      const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
      clientIP = ips.split(',')[0].trim();
    }
    
    // 2. Intentar desde X-Real-IP
    if (!clientIP) {
      const realIP = req.headers['x-real-ip'];
      if (realIP) {
        clientIP = Array.isArray(realIP) ? realIP[0] : realIP;
      }
    }
    
    // 3. Usar req.ip (Express confía en el proxy si está configurado)
    if (!clientIP && req.ip) {
      clientIP = req.ip;
    }
    
    // 4. Usar req.connection.remoteAddress (fallback)
    if (!clientIP && req.socket.remoteAddress) {
      clientIP = req.socket.remoteAddress;
    }
    
    // 5. Si es IPv6 localhost, convertir a IPv4
    if (clientIP === '::1' || clientIP === '::ffff:127.0.0.1') {
      clientIP = '127.0.0.1';
    }
    
    // 6. Limpiar IPv6 mapped IPv4 (::ffff:192.168.1.1 -> 192.168.1.1)
    if (clientIP && clientIP.startsWith('::ffff:')) {
      clientIP = clientIP.substring(7);
    }
    
    // Si no se pudo obtener la IP, devolver null
    if (!clientIP) {
      res.status(500).json({ 
        error: 'No se pudo determinar la IP del cliente',
        ip: null 
      });
      return;
    }
    
    res.json({ ip: clientIP });
  });

  return server;
}

function run(): void {
  const port = Number(process.env['PORT']) || 4000;

  // Start up the Node server
  const server = app();
  server.listen(port, '0.0.0.0', () => {
    console.log(`Node Express server listening on http://0.0.0.0:${port}`);
    console.log(`Accesible desde la red en: http://[TU_IP_LOCAL]:${port}`);
  });
}

run();

import express from 'express';
import { join } from 'path';
import { existsSync } from 'fs';

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

  // Servir archivos estáticos en producción (después de las rutas de API)
  // Angular con SSR genera archivos en dist/people/browser
  const distPath = join(process.cwd(), 'dist/people');
  const browserPath = join(distPath, 'browser');
  const isProduction = process.env['NODE_ENV'] === 'production' || process.env['RAILWAY_ENVIRONMENT'] !== undefined;
  
  if (isProduction) {
    // Verificar primero si existe browser/ (estructura con SSR)
    let staticPath = browserPath;
    let indexPath = join(browserPath, 'index.html');
    
    if (!existsSync(browserPath)) {
      // Si no existe browser/, intentar directamente en dist/people
      staticPath = distPath;
      indexPath = join(distPath, 'index.html');
    }
    
    // Verificar que la ruta de archivos estáticos existe
    if (existsSync(staticPath)) {
      console.log(`Serving static files from: ${staticPath}`);
      // Servir archivos estáticos
      server.use(express.static(staticPath));
      
      // Servir index.html para todas las rutas no-API (SPA routing)
      server.get('*', (req, res) => {
        // No servir index.html para rutas de API (ya manejadas arriba)
        if (req.path.startsWith('/api/')) {
          res.status(404).json({ error: 'Not found' });
          return;
        }
        
        if (existsSync(indexPath)) {
          res.sendFile(indexPath);
        } else {
          console.error(`index.html not found at: ${indexPath}`);
          console.error(`Tried paths: ${browserPath}, ${distPath}`);
          res.status(500).json({ error: 'Static files not found. Build may be incomplete.' });
        }
      });
    } else {
      console.warn(`WARNING: Static files directory not found at: ${staticPath}`);
      console.warn(`Also checked: ${browserPath}`);
      console.warn('Static file serving disabled. API endpoints will still work.');
      // Endpoint de fallback para rutas no-API cuando no hay build
      server.get('*', (req, res) => {
        if (req.path.startsWith('/api/')) {
          res.status(404).json({ error: 'Not found' });
        } else {
          res.status(503).json({ 
            error: 'Service temporarily unavailable',
            message: 'Static files not built. Please run npm run build first.'
          });
        }
      });
    }
  } else {
    console.log('Development mode: Static file serving disabled');
  }

  return server;
}

function run(): void {
  // Railway siempre proporciona PORT, es crítico usarlo
  const portEnv = process.env['PORT'];
  if (!portEnv) {
    console.error('❌ ERROR: PORT environment variable is not set!');
    console.error('Railway should automatically set PORT. This may indicate a configuration issue.');
    process.exit(1);
  }
  
  const port = parseInt(portEnv, 10);
  if (isNaN(port) || port <= 0) {
    console.error(`❌ ERROR: Invalid PORT value: ${portEnv}`);
    process.exit(1);
  }
  
  const host = process.env['HOST'] || '0.0.0.0';

  // Log información de diagnóstico
  console.log('=== Server Startup Information ===');
  console.log(`PORT from environment: ${portEnv} (parsed as: ${port})`);
  console.log(`HOST from environment: ${process.env['HOST'] || 'not set (using default 0.0.0.0)'}`);
  console.log(`NODE_ENV: ${process.env['NODE_ENV'] || 'not set'}`);
  console.log(`RAILWAY_ENVIRONMENT: ${process.env['RAILWAY_ENVIRONMENT'] || 'not set'}`);
  console.log(`Working directory: ${process.cwd()}`);
  console.log('===================================');

  // Start up the Node server
  const appInstance = app();
  
  // server.listen() devuelve un objeto Server de Node.js, no Express
  const httpServer = appInstance.listen(port, host, () => {
    console.log(`✅ Node Express server listening on http://${host}:${port}`);
    console.log(`📁 Static files will be served from: ${join(process.cwd(), 'dist/people')}`);
    console.log(`🌐 Server is ready to accept connections`);
  });

  // Manejo de errores del servidor HTTP
  httpServer.on('error', (error: NodeJS.ErrnoException) => {
    if (error.syscall !== 'listen') {
      throw error;
    }

    const bind = typeof port === 'string' ? 'Pipe ' + port : 'Port ' + port;

    switch (error.code) {
      case 'EACCES':
        console.error(`${bind} requires elevated privileges`);
        process.exit(1);
        break;
      case 'EADDRINUSE':
        console.error(`${bind} is already in use`);
        process.exit(1);
        break;
      default:
        throw error;
    }
  });

  // Manejo de señales de terminación
  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    httpServer.close(() => {
      console.log('HTTP server closed');
    });
  });

  process.on('SIGINT', () => {
    console.log('SIGINT signal received: closing HTTP server');
    httpServer.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  });
}

run();

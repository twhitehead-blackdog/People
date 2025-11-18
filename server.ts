import express from 'express';

// The Express app is exported so that it can be used by serverless Functions.
export function app(): express.Express {
  const server = express();

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

  return server;
}

function run(): void {
  const port = process.env['PORT'] || 4000;

  // Start up the Node server
  const server = app();
  server.listen(port, () => {
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

run();

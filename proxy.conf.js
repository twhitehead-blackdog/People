const PROXY_CONFIG = {
  "/api": {
    target: "http://localhost:4000",
    secure: false,
    changeOrigin: true,
    logLevel: "warn", // Reducir el nivel de log para menos ruido
    timeout: 3000, // Timeout más corto para fallar rápido si el servidor no está disponible
    proxyTimeout: 3000,
    // Manejar errores del proxy silenciosamente
    // El cliente ya maneja estos errores con fallback a WebRTC
    onError: function(err, req, res) {
      // Solo responder si no se ha enviado respuesta
      if (res && !res.headersSent) {
        res.writeHead(503, {
          'Content-Type': 'application/json'
        });
        res.end(JSON.stringify({ 
          error: 'Service temporarily unavailable',
          message: 'Backend server is not running. Using fallback method.'
        }));
      }
    }
  }
};

module.exports = PROXY_CONFIG;

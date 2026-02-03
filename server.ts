import dotenv from 'dotenv';
import express from 'express';
import nodemailer from 'nodemailer';
import path from 'path';

// Cargar variables de entorno desde .env
dotenv.config();

// Helper para logging seguro en producción
const isProduction = process.env['NODE_ENV'] === 'production';
const safeLogger = {
  log: (...args: any[]) => {
    if (!isProduction) console.log(...args);
  },
  error: (message: string, error?: any) => {
    if (isProduction) {
      console.error(message);
      if (error?.message) console.error('Error:', error.message);
    } else {
      console.error(message, error);
    }
  },
  warn: (message: string, ...args: any[]) => {
    if (isProduction) {
      console.warn(message);
    } else {
      console.warn(message, ...args);
    }
  },
  safeLog: (message: string, data?: Record<string, any>) => {
    if (!isProduction && data) {
      const safeData = Object.keys(data).reduce((acc, key) => {
        const value = data[key];
        if (typeof value === 'string' && value.length > 3) {
          acc[key] = `${value.substring(0, 3)}***`;
        } else if (typeof value === 'object' && value !== null) {
          acc[key] = '[Object]';
        } else {
          acc[key] = value;
        }
        return acc;
      }, {} as Record<string, any>);
      console.log(message, safeData);
    } else if (isProduction) {
      console.log(message);
    }
  },
};

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
    res.header(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, DELETE, OPTIONS'
    );
    res.header(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept, Authorization'
    );
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }
    next();
  });

  /**
   * Health Check Endpoint
   * Used by Railway for deployment verification.
   * Must return 200 OK without auth or heavy logic.
   */
  server.get('/health', (req, res) => {
    res.status(200).send('ok');
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
      const wassengerResponse = await fetch(
        'https://api.wassenger.com/v1/messages',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            phone: cleanPhone,
            message: message,
          }),
        }
      );

      let responseData: any;
      const contentType = wassengerResponse.headers.get('content-type');

      try {
        // Leer el body como texto primero
        const textData = await wassengerResponse.text();

        if (
          contentType &&
          contentType.includes('application/json') &&
          textData
        ) {
          try {
            responseData = JSON.parse(textData);
          } catch {
            responseData = {
              message: textData || 'Error desconocido de Wassenger',
            };
          }
        } else {
          responseData = {
            message: textData || 'Error desconocido de Wassenger',
          };
        }
      } catch (parseError) {
        // Si no se puede parsear la respuesta, usar un mensaje genérico
        responseData = { message: 'Error al procesar respuesta de Wassenger' };
      }

      if (!wassengerResponse.ok) {
        return res.status(wassengerResponse.status).json({
          error:
            responseData.message ||
            responseData.error ||
            'Error al enviar mensaje por Wassenger',
          details: responseData,
        });
      }

      return res.json({ success: true, data: responseData });
    } catch (error: any) {
      safeLogger.error('Error en proxy de Wassenger', error);
      return res.status(500).json({
        error: 'Error interno del servidor',
        message: error.message,
      });
    }
  });

  // Helper para verificar si el envío de emails está habilitado
  async function isEmailEnabled(): Promise<boolean> {
    try {
      const supabaseUrl = process.env['ENV_SUPABASE_URL'];
      const supabaseKey =
        process.env['ENV_SUPABASE_SERVICE_KEY'] ||
        process.env['ENV_SUPABASE_ANON_KEY'];

      if (!supabaseUrl || !supabaseKey) {
        console.warn(
          '[Email] No se pudo verificar email_enabled: Supabase no configurado'
        );
        return true; // Por defecto habilitado si no se puede verificar
      }

      const response = await fetch(
        `${supabaseUrl}/rest/v1/settings?key=eq.email_enabled&select=value`,
        {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
        }
      );

      if (!response.ok) {
        console.warn(
          '[Email] Error al verificar email_enabled:',
          response.status
        );
        return true; // Por defecto habilitado si hay error
      }

      const data = await response.json();
      if (data && data.length > 0) {
        const enabled = data[0].value === 'true';
        if (!enabled) {
          console.log(
            '[Email] ⚠️ Envío de emails deshabilitado por configuración'
          );
        }
        return enabled;
      }

      return true; // Por defecto habilitado si no existe la configuración
    } catch (error) {
      console.error('[Email] Error verificando email_enabled:', error);
      return true; // Por defecto habilitado si hay error
    }
  }

  // Endpoint para enviar emails
  server.post('/api/email/send', async (req, res) => {
    console.log('[DEBUG Server] 📧 === NUEVA PETICIÓN DE EMAIL ===');
    console.log('[DEBUG Server] 📧 Headers importantes:', {
      'content-type': req.headers['content-type'],
      'user-agent': req.headers['user-agent'],
      origin: req.headers.origin,
    });
    console.log(
      '[DEBUG Server] 📧 Body completo:',
      JSON.stringify(req.body, null, 2)
    );

    try {
      // Verificar si el envío de emails está habilitado (master switch)
      const emailEnabled = await isEmailEnabled();
      if (!emailEnabled) {
        console.log(
          '[DEBUG Server] ⚠️ Email bloqueado: envío deshabilitado por configuración'
        );
        return res.json({
          success: true,
          data: {
            messageId: 'disabled',
            skipped: true,
            reason:
              'El envío de correos está deshabilitado en la configuración del sistema',
          },
        });
      }

      const { to, subject, html, text, fromEmail, fromName } = req.body;

      console.log('[DEBUG Server] 📧 Validando campos requeridos...');
      console.log('[DEBUG Server] 📧 to:', to);
      console.log('[DEBUG Server] 📧 subject:', subject);
      console.log('[DEBUG Server] 📧 html length:', html?.length || 0);
      console.log('[DEBUG Server] 📧 fromEmail:', fromEmail);
      console.log('[DEBUG Server] 📧 fromName:', fromName);

      if (!to || !subject || !html) {
        console.error('[DEBUG Server] ❌ ERROR: Faltan campos requeridos');
        console.error(
          '[DEBUG Server] ❌ to:',
          !!to,
          'subject:',
          !!subject,
          'html:',
          !!html
        );
        return res.status(400).json({
          error: 'Missing required fields: to, subject, html',
        });
      }

      // Preparar destinatarios (puede ser string o array)
      const recipients = Array.isArray(to) ? to : [to];
      console.log('[DEBUG Server] 📧 Destinatarios procesados:', recipients);

      // Intentar usar Resend primero (más confiable y fácil de configurar)
      const resendApiKey = process.env['ENV_RESEND_API_KEY'];
      console.log('[DEBUG Server] 🔍 Verificando configuración Resend...');
      console.log(
        '[DEBUG Server] 🔍 ENV_RESEND_API_KEY presente:',
        !!resendApiKey
      );

      if (resendApiKey) {
        console.log('[DEBUG Server] ✅ Usando Resend para envío de email');
        try {
          // Usar SMTP de Resend (más confiable que la API REST en algunos entornos)
          const noreplyEmail =
            process.env['ENV_RESEND_FROM_EMAIL'] || 'onboarding@resend.dev';
          const noreplyName = process.env['ENV_RESEND_FROM_NAME'] || 'People';
          const senderEmail = fromEmail || noreplyEmail;
          const senderName = fromName || noreplyName;

          // Configurar SMTP de Resend
          // Host: smtp.resend.com
          // Puertos: 465 (SSL) o 587 (TLS)
          // User: resend
          // Password: API key
          const envPortRaw = process.env['ENV_RESEND_SMTP_PORT'];
          const envPort = envPortRaw ? parseInt(envPortRaw) : undefined;
          const portsToTry = envPort ? [envPort] : [465, 587];

          let info: any;
          let lastError: any;
          for (const port of portsToTry) {
            try {
              const transporter = nodemailer.createTransport({
                host: 'smtp.resend.com',
                port,
                secure: port === 465, // SSL para 465; para 587 se usa STARTTLS
                requireTLS: port === 587,
                auth: {
                  user: 'resend',
                  pass: resendApiKey,
                },
              });

              info = await transporter.sendMail({
                from: `${senderName} <${senderEmail}>`,
                to: recipients.join(', '),
                subject: subject,
                html: html,
                text: text || html.replace(/<[^>]*>/g, ''),
              });

              safeLogger.safeLog('✅ Email enviado via Resend SMTP', {
                to: recipients.join(', '),
                port,
              });
              break;
            } catch (err: any) {
              lastError = err;
              safeLogger.error(`❌ Error con Resend SMTP (port ${port})`, err);
            }
          }

          if (!info) {
            throw lastError || new Error('No se pudo enviar por Resend SMTP');
          }

          safeLogger.safeLog('✅ Email enviado exitosamente via Resend SMTP', {
            to: recipients.join(', '),
            messageId: info.messageId,
          });

          return res.json({
            success: true,
            data: { messageId: info.messageId },
          });
        } catch (resendError: any) {
          safeLogger.error('❌ Error con Resend SMTP', resendError);
          // Si Resend está configurado pero falló, devolver el error directamente
          let errorMessage = 'Error desconocido de Resend SMTP';
          if (resendError.code === 'EAUTH') {
            errorMessage =
              'Error de autenticación Resend SMTP. Verifica ENV_RESEND_API_KEY';
          } else if (resendError.code === 'ECONNECTION') {
            errorMessage =
              'No se pudo conectar al servidor SMTP de Resend. Verifica la conexión';
          } else if (resendError.message) {
            errorMessage = resendError.message;
          }

          return res.status(500).json({
            error: 'Error al enviar email via Resend SMTP',
            message: errorMessage,
            details:
              process.env['NODE_ENV'] === 'development'
                ? {
                    code: resendError.code,
                    message: resendError.message,
                    stack: resendError.stack,
                  }
                : undefined,
          });
        }
      }

      // Intentar usar Postmark si Resend no está configurado
      const postmarkApiKey = process.env['ENV_POSTMARK_API_KEY'];
      console.log('[DEBUG Server] 🔍 Verificando configuración Postmark...');
      console.log(
        '[DEBUG Server] 🔍 ENV_POSTMARK_API_KEY presente:',
        !!postmarkApiKey
      );

      if (postmarkApiKey) {
        console.log('[DEBUG Server] ✅ Usando Postmark para envío de email');
        try {
          const noreplyEmail =
            process.env['ENV_POSTMARK_FROM_EMAIL'] || 'noreply@tu-dominio.com';
          const noreplyName = process.env['ENV_POSTMARK_FROM_NAME'] || 'People';
          const senderEmail = fromEmail || noreplyEmail;
          const senderName = fromName || noreplyName;

          // Configurar SMTP de Postmark
          // Host: smtp.postmarkapp.com
          // Puertos: 587 (TLS) o 2525 (alternativo)
          // User: Server API Token
          // Password: Server API Token (mismo que user)
          const envPortRaw = process.env['ENV_POSTMARK_SMTP_PORT'];
          const envPort = envPortRaw ? parseInt(envPortRaw) : undefined;
          const portsToTry = envPort ? [envPort] : [587, 2525];

          let info: any;
          let lastError: any;
          for (const port of portsToTry) {
            try {
              const transporter = nodemailer.createTransport({
                host: 'smtp.postmarkapp.com',
                port,
                secure: false, // false para STARTTLS
                requireTLS: true,
                auth: {
                  user: postmarkApiKey, // Server API Token como username
                  pass: postmarkApiKey, // Server API Token como password
                },
              });

              info = await transporter.sendMail({
                from: `${senderName} <${senderEmail}>`,
                to: recipients.join(', '),
                subject: subject,
                html: html,
                text: text || html.replace(/<[^>]*>/g, ''),
              });

              safeLogger.safeLog('✅ Email enviado via Postmark SMTP', {
                to: recipients.join(', '),
                port,
              });
              break;
            } catch (err: any) {
              lastError = err;
              safeLogger.error(
                `❌ Error con Postmark SMTP (port ${port})`,
                err
              );
            }
          }

          if (!info) {
            throw lastError || new Error('No se pudo enviar por Postmark SMTP');
          }

          return res.json({
            success: true,
            data: { messageId: info.messageId },
          });
        } catch (postmarkError: any) {
          safeLogger.error('❌ Error con Postmark SMTP', postmarkError);
          let errorMessage = 'Error desconocido de Postmark SMTP';
          if (postmarkError.code === 'EAUTH') {
            errorMessage =
              'Error de autenticación Postmark SMTP. Verifica ENV_POSTMARK_API_KEY';
          } else if (postmarkError.code === 'ECONNECTION') {
            errorMessage =
              'No se pudo conectar al servidor SMTP de Postmark. Verifica la conexión';
          } else if (postmarkError.message) {
            errorMessage = postmarkError.message;
          }

          return res.status(500).json({
            error: 'Error al enviar email via Postmark SMTP',
            message: errorMessage,
            details:
              process.env['NODE_ENV'] === 'development'
                ? {
                    code: postmarkError.code,
                    message: postmarkError.message,
                    stack: postmarkError.stack,
                  }
                : undefined,
          });
        }
      }

      // Fallback a SMTP genérico (Gmail, etc.) si no hay Resend ni Postmark configurado
      console.log(
        '[DEBUG Server] 🔄 Resend no configurado, intentando SMTP...'
      );

      const smtpHost = process.env['ENV_SMTP_HOST'] || 'smtp.gmail.com';
      const smtpPort = parseInt(process.env['ENV_SMTP_PORT'] || '587');
      const smtpUser = process.env['ENV_SMTP_USER'];
      const smtpPassword = process.env['ENV_SMTP_PASSWORD'];

      console.log('[DEBUG Server] ⚙️ Configuración SMTP:');
      console.log('[DEBUG Server] ⚙️ Host:', smtpHost);
      console.log('[DEBUG Server] ⚙️ Port:', smtpPort);
      console.log('[DEBUG Server] ⚙️ User presente:', !!smtpUser);
      console.log('[DEBUG Server] ⚙️ Password presente:', !!smtpPassword);

      // Correo noreply para feria de empleo (opcional)
      const noreplyEmail = process.env['ENV_SMTP_NOREPLY_EMAIL'] || smtpUser;
      const noreplyName = process.env['ENV_SMTP_NOREPLY_NAME'] || 'Black Dog';

      if (!smtpUser || !smtpPassword) {
        console.error('[DEBUG Server] ❌ ERROR: Configuración SMTP faltante');
        console.error(
          '[DEBUG Server] ❌ smtpUser:',
          !!smtpUser,
          'smtpPassword:',
          !!smtpPassword
        );
        safeLogger.error('❌ Configuración SMTP faltante');
        return res.status(500).json({
          error: 'Email service not configured',
          message:
            'ENV_RESEND_API_KEY, ENV_POSTMARK_API_KEY o (ENV_SMTP_USER y ENV_SMTP_PASSWORD) no están configuradas. Por favor configura alguna de estas opciones en tu archivo .env',
        });
      }

      console.log('[DEBUG Server] ✅ Usando SMTP para envío de email');
      console.log(
        '[DEBUG Server] 📧 From:',
        `${noreplyName} <${noreplyEmail}>`
      );

      // Determinar el correo remitente
      // Si se especifica fromEmail en el request, usarlo; sino usar noreplyEmail o smtpUser
      const senderEmail = fromEmail || noreplyEmail || smtpUser;
      const senderName = fromName || noreplyName;

      // Crear transporter de nodemailer con SMTP genérico
      // Nota: El auth siempre usa smtpUser/smtpPassword (credenciales de autenticación)
      // pero el remitente (from) puede ser diferente
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465, // true para 465, false para otros puertos
        auth: {
          user: smtpUser,
          pass: smtpPassword,
        },
      });

      // Enviar email
      const info = await transporter.sendMail({
        from: `${senderName} <${senderEmail}>`,
        to: recipients.join(', '),
        subject: subject,
        html: html,
        text: text || html.replace(/<[^>]*>/g, ''), // Convertir HTML a texto si no se proporciona
      });

      safeLogger.safeLog('✅ Email enviado exitosamente via SMTP', {
        to: recipients.join(', '),
        messageId: info.messageId,
      });
      return res.json({ success: true, data: { messageId: info.messageId } });
    } catch (error: any) {
      console.error('[DEBUG Server] ❌ ERROR GENERAL en envío de email');
      console.error('[DEBUG Server] 🔍 Detalles del error:', error);
      console.error('[DEBUG Server] 📊 Error code:', error.code);
      console.error('[DEBUG Server] 💬 Error message:', error.message);
      console.error('[DEBUG Server] 🏷️ Error name:', error.name);

      safeLogger.error('❌ Error sending email', error);

      // Mensaje de error más descriptivo
      let errorMessage = 'Error desconocido al enviar el email';
      if (error.code === 'EAUTH') {
        errorMessage =
          'Error de autenticación SMTP. Verifica ENV_SMTP_USER y ENV_SMTP_PASSWORD';
      } else if (error.code === 'ECONNECTION') {
        errorMessage =
          'No se pudo conectar al servidor SMTP. Verifica ENV_SMTP_HOST y ENV_SMTP_PORT';
      } else if (error.message) {
        errorMessage = error.message;
      }

      return res.status(500).json({
        error: 'Error interno del servidor',
        message: errorMessage,
        code: error.code,
        details:
          process.env['NODE_ENV'] === 'development'
            ? {
                code: error.code,
                command: error.command,
                responseCode: error.responseCode,
                responseMessage: error.responseMessage,
              }
            : undefined,
      });
    }
  });

  // Endpoint para obtener configuración de email (sin datos sensibles)
  server.get('/api/email/config', (req, res) => {
    try {
      const resendApiKey = process.env['ENV_RESEND_API_KEY'];
      const postmarkApiKey = process.env['ENV_POSTMARK_API_KEY'];
      const smtpHost = process.env['ENV_SMTP_HOST'] || 'smtp.gmail.com';
      const smtpPort = process.env['ENV_SMTP_PORT'] || '587';
      const smtpUser = process.env['ENV_SMTP_USER'];

      // Determinar el proveedor prioritario
      let provider = 'smtp';
      let host = smtpHost;
      let port = parseInt(smtpPort);
      let user = smtpUser || 'No configurado';

      if (resendApiKey) {
        provider = 'resend';
        host = 'smtp.resend.com';
        port = 465;
        user = '(Resend API)';
      } else if (postmarkApiKey) {
        provider = 'postmark';
        host = 'smtp.postmarkapp.com';
        port = 587;
        user = '(Postmark Server API Token)';
      }

      // Email remitente según el proveedor
      const resendFromEmail = process.env['ENV_RESEND_FROM_EMAIL'];
      const postmarkFromEmail = process.env['ENV_POSTMARK_FROM_EMAIL'];
      const smtpFromEmail = process.env['ENV_SMTP_NOREPLY_EMAIL'] || smtpUser;

      const senderEmail = resendApiKey
        ? resendFromEmail
        : postmarkApiKey
        ? postmarkFromEmail
        : smtpFromEmail || 'No configurado';

      const resendFromName = process.env['ENV_RESEND_FROM_NAME'];
      const postmarkFromName = process.env['ENV_POSTMARK_FROM_NAME'];
      const smtpFromName = process.env['ENV_SMTP_NOREPLY_NAME'] || 'People';

      const senderName = resendApiKey
        ? resendFromName
        : postmarkApiKey
        ? postmarkFromName
        : smtpFromName;

      return res.json({
        provider,
        host,
        port,
        user,
        senderEmail: senderEmail || 'No configurado',
        senderName,
        configured: !!(resendApiKey || postmarkApiKey || smtpUser),
        priorities: {
          resend: !!resendApiKey,
          postmark: !!postmarkApiKey,
          smtp: !!(smtpUser && process.env['ENV_SMTP_PASSWORD']),
        },
      });
    } catch (error: any) {
      console.error('[Email Config] Error:', error);
      return res.status(500).json({
        error: 'Error al obtener configuración de email',
        message: error?.message || 'Error desconocido',
      });
    }
  });

  // Endpoint para probar envío de email
  server.post('/api/email/test', async (req, res) => {
    try {
      const { to } = req.body;

      if (!to) {
        return res.status(400).json({
          error: 'Se requiere un destinatario (to)',
        });
      }

      // Intentar usar Resend primero (prioridad más alta)
      const resendApiKey = process.env['ENV_RESEND_API_KEY'];
      if (resendApiKey) {
        console.log('[Email Test] ✅ Usando Resend para prueba de email');
        try {
          const noreplyEmail =
            process.env['ENV_RESEND_FROM_EMAIL'] || 'onboarding@resend.dev';
          const noreplyName = process.env['ENV_RESEND_FROM_NAME'] || 'People';
          const envPortRaw = process.env['ENV_RESEND_SMTP_PORT'];
          const envPort = envPortRaw ? parseInt(envPortRaw) : undefined;
          const portsToTry = envPort ? [envPort] : [465, 587];

          let info: any;
          let lastError: any;
          for (const port of portsToTry) {
            try {
              const transporter = nodemailer.createTransport({
                host: 'smtp.resend.com',
                port,
                secure: port === 465,
                requireTLS: port === 587,
                auth: {
                  user: 'resend',
                  pass: resendApiKey,
                },
              });

              const testHtml = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #333;">✅ Prueba de Correo Exitosa - Resend</h2>
                  <p>Este es un correo de prueba enviado desde el sistema <strong>People</strong> usando <strong>Resend</strong>.</p>
                  <p>Si recibiste este mensaje, la configuración de Resend está funcionando correctamente.</p>
                  <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                  <p style="color: #888; font-size: 12px;">
                    Proveedor: Resend<br>
                    Enviado desde: ${noreplyEmail}<br>
                    Fecha: ${new Date().toLocaleString('es-PA', {
                      timeZone: 'America/Panama',
                    })}
                  </p>
                </div>
              `;

              info = await transporter.sendMail({
                from: `${noreplyName} <${noreplyEmail}>`,
                to: to,
                subject: '✅ Prueba de Correo - People (Resend)',
                html: testHtml,
              });

              safeLogger.safeLog('✅ Email de prueba enviado via Resend', {
                to,
                port,
                messageId: info.messageId,
              });
              break;
            } catch (err: any) {
              lastError = err;
              safeLogger.error(`❌ Error con Resend SMTP (port ${port})`, err);
            }
          }

          if (!info) {
            throw lastError || new Error('No se pudo enviar por Resend SMTP');
          }

          return res.json({
            success: true,
            message: 'Correo de prueba enviado correctamente via Resend',
            provider: 'resend',
            data: { messageId: info.messageId, to },
          });
        } catch (resendError: any) {
          safeLogger.error('❌ Error con Resend en prueba', resendError);
          // Si Resend falla, continuar con Postmark
        }
      }

      // Intentar usar Postmark si Resend no está configurado o falló
      const postmarkApiKey = process.env['ENV_POSTMARK_API_KEY'];
      if (postmarkApiKey) {
        console.log('[Email Test] ✅ Usando Postmark para prueba de email');
        try {
          const noreplyEmail =
            process.env['ENV_POSTMARK_FROM_EMAIL'] || 'noreply@tu-dominio.com';
          const noreplyName = process.env['ENV_POSTMARK_FROM_NAME'] || 'People';
          const envPortRaw = process.env['ENV_POSTMARK_SMTP_PORT'];
          const envPort = envPortRaw ? parseInt(envPortRaw) : undefined;
          const portsToTry = envPort ? [envPort] : [587, 2525];

          let info: any;
          let lastError: any;
          for (const port of portsToTry) {
            try {
              const transporter = nodemailer.createTransport({
                host: 'smtp.postmarkapp.com',
                port,
                secure: false,
                requireTLS: true,
                auth: {
                  user: postmarkApiKey,
                  pass: postmarkApiKey,
                },
              });

              const testHtml = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #333;">✅ Prueba de Correo Exitosa - Postmark</h2>
                  <p>Este es un correo de prueba enviado desde el sistema <strong>People</strong> usando <strong>Postmark</strong>.</p>
                  <p>Si recibiste este mensaje, la configuración de Postmark está funcionando correctamente.</p>
                  <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                  <p style="color: #888; font-size: 12px;">
                    Proveedor: Postmark<br>
                    Enviado desde: ${noreplyEmail}<br>
                    Fecha: ${new Date().toLocaleString('es-PA', {
                      timeZone: 'America/Panama',
                    })}
                  </p>
                </div>
              `;

              info = await transporter.sendMail({
                from: `${noreplyName} <${noreplyEmail}>`,
                to: to,
                subject: '✅ Prueba de Correo - People (Postmark)',
                html: testHtml,
              });

              safeLogger.safeLog('✅ Email de prueba enviado via Postmark', {
                to,
                port,
                messageId: info.messageId,
              });
              break;
            } catch (err: any) {
              lastError = err;
              safeLogger.error(
                `❌ Error con Postmark SMTP (port ${port})`,
                err
              );
            }
          }

          if (!info) {
            throw lastError || new Error('No se pudo enviar por Postmark SMTP');
          }

          return res.json({
            success: true,
            message: 'Correo de prueba enviado correctamente via Postmark',
            provider: 'postmark',
            data: { messageId: info.messageId, to },
          });
        } catch (postmarkError: any) {
          safeLogger.error('❌ Error con Postmark en prueba', postmarkError);
          // Si Postmark falla, continuar con SMTP genérico
        }
      }

      // Fallback a SMTP genérico
      console.log('[Email Test] 🔄 Usando SMTP genérico para prueba de email');
      const smtpHost = process.env['ENV_SMTP_HOST'] || 'smtp.gmail.com';
      const smtpPort = parseInt(process.env['ENV_SMTP_PORT'] || '587');
      const smtpUser = process.env['ENV_SMTP_USER'];
      const smtpPassword = process.env['ENV_SMTP_PASSWORD'];
      const noreplyEmail = process.env['ENV_SMTP_NOREPLY_EMAIL'] || smtpUser;
      const noreplyName = process.env['ENV_SMTP_NOREPLY_NAME'] || 'People';

      if (!smtpUser || !smtpPassword) {
        return res.status(500).json({
          error: 'Ningún proveedor de email configurado',
          message:
            'ENV_RESEND_API_KEY, ENV_POSTMARK_API_KEY o (ENV_SMTP_USER y ENV_SMTP_PASSWORD) no están configuradas',
        });
      }

      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPassword,
        },
      });

      const testHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">✅ Prueba de Correo Exitosa - SMTP</h2>
          <p>Este es un correo de prueba enviado desde el sistema <strong>People</strong> usando <strong>SMTP genérico</strong>.</p>
          <p>Si recibiste este mensaje, la configuración SMTP está funcionando correctamente.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #888; font-size: 12px;">
            Proveedor: SMTP (${smtpHost}:${smtpPort})<br>
            Enviado desde: ${noreplyEmail}<br>
            Fecha: ${new Date().toLocaleString('es-PA', {
              timeZone: 'America/Panama',
            })}
          </p>
        </div>
      `;

      const info = await transporter.sendMail({
        from: `${noreplyName} <${noreplyEmail}>`,
        to: to,
        subject: '✅ Prueba de Correo - People (SMTP)',
        html: testHtml,
      });

      safeLogger.safeLog('✅ Email de prueba enviado via SMTP', {
        to,
        messageId: info.messageId,
      });

      return res.json({
        success: true,
        message: 'Correo de prueba enviado correctamente via SMTP',
        provider: 'smtp',
        data: { messageId: info.messageId, to },
      });
    } catch (error: any) {
      safeLogger.error('❌ Error en email de prueba', error);

      let errorMessage = 'Error desconocido';
      if (error.code === 'EAUTH') {
        errorMessage =
          'Error de autenticación. Verifica las credenciales del proveedor configurado.';
      } else if (error.code === 'ECONNECTION') {
        errorMessage = 'No se pudo conectar al servidor de email.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      return res.status(500).json({
        error: 'Error al enviar correo de prueba',
        message: errorMessage,
        code: error.code,
      });
    }
  });

  // Root endpoint - información básica del servidor (solo para peticiones API)
  // Para peticiones del navegador, servir index.html directamente
  server.get('/', (req, res) => {
    // Solo servir JSON si es una petición API explícita
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      res.json({
        status: 'ok',
        message: 'People API Server is running',
        version: '1.0.0',
        endpoints: {
          health: '/health',
          clientIp: '/api/client-ip',
          serverTime: '/api/server-time',
          wassenger: '/api/wassenger/send-message',
          email: '/api/email/send',
        },
      });
    } else {
      // Para peticiones del navegador, servir index.html directamente
      res.sendFile(path.join(distFolder, 'index.html'), (err) => {
        if (err) {
          safeLogger.error('Error sirviendo index.html en /', err);
          res.status(500).send('Error loading application');
        }
      });
    }
  });

  // Health check endpoint
  server.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'Server is running' });
  });

  /**
   * Endpoint para obtener la hora "oficial" del sistema sin depender del reloj del dispositivo.
   * Lee la hora desde el header HTTP `Date` de Supabase (server-side, sin restricciones CORS)
   * y la devuelve en el body.
   */
  server.get('/api/server-time', async (req, res) => {
    const supabaseUrl = process.env['ENV_SUPABASE_URL'];
    const supabaseKey =
      process.env['ENV_SUPABASE_ANON_KEY'] ??
      process.env['ENV_SUPABASE_API_KEY'] ??
      '';

    // Fallback: si no hay config, devolver hora del servidor Node
    if (!supabaseUrl || !supabaseKey) {
      res.json({
        server_time: new Date().toISOString(),
        source: 'node',
      });
      return;
    }

    try {
      // Petición liviana: solo para capturar el header Date del servidor Supabase
      const resp = await fetch(
        `${supabaseUrl}/rest/v1/companies?select=id&limit=1`,
        {
          method: 'GET',
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
            Accept: 'application/json',
          },
        }
      );

      const dateHeader = resp.headers.get('date') || resp.headers.get('Date');
      if (dateHeader) {
        const ms = new Date(dateHeader).getTime();
        res.json({
          server_time: Number.isNaN(ms)
            ? new Date().toISOString()
            : new Date(ms).toISOString(),
          source: 'supabase-date-header',
        });
        return;
      }

      // Si por alguna razón no viene Date, fallback a hora del servidor Node
      res.json({
        server_time: new Date().toISOString(),
        source: 'node-fallback-no-date',
      });
      return;
    } catch (error: any) {
      safeLogger.error('Error en /api/server-time', error);
      res.json({
        server_time: new Date().toISOString(),
        source: 'node-fallback-error',
      });
      return;
    }
  });

  // Endpoint para obtener la IP real del cliente
  // Funciona tanto en localhost como en producción/VPS
  server.get('/api/client-ip', (req, res): void => {
    try {
      // Intentar obtener la IP real del cliente desde varios headers
      // X-Forwarded-For: usado por proxies y load balancers
      // X-Real-IP: usado por algunos proxies
      // req.ip: IP directa de la conexión
      // req.connection.remoteAddress: IP de la conexión (legacy)

      let clientIP: string | undefined;

      // 0. IP real del cliente enviada por el primer proxy (Nginx host) para modo kiosko detrás de Traefik/Docker
      const clientRealIP = req.headers['x-client-real-ip'];
      if (clientRealIP) {
        const ip = Array.isArray(clientRealIP) ? clientRealIP[0] : clientRealIP;
        if (ip && ip.trim()) clientIP = ip.trim();
      }

      // 1. Intentar desde X-Forwarded-For (puede tener múltiples IPs, tomar la primera)
      const forwardedFor = req.headers['x-forwarded-for'];
      if (!clientIP && forwardedFor) {
        const ips = Array.isArray(forwardedFor)
          ? forwardedFor[0]
          : forwardedFor;
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

      // Si no se pudo obtener la IP, devolver 200 con ip: null (no es un error crítico)
      // El cliente usará WebRTC como fallback
      if (!clientIP) {
        res.status(200).json({
          ip: null,
          message: 'No se pudo determinar la IP del cliente, usar fallback',
        });
        return;
      }

      res.json({ ip: clientIP });
      return;
    } catch (error: any) {
      // Manejar cualquier error inesperado
      safeLogger.error('Error en /api/client-ip', error);
      res.status(200).json({
        ip: null,
        error: 'Error al obtener IP del cliente',
        message: error?.message || 'Error desconocido',
      });
      return;
    }
  });

  // Servir archivos estáticos del frontend Angular
  const distFolder = path.join(process.cwd(), 'dist/people/browser');

  // Servir archivos estáticos con el prefijo /people-test
  server.use(
    '/people-test',
    express.static(distFolder, {
      setHeaders: (res, filePath) => {
        // Asegurar que los archivos JS se sirvan con el MIME type correcto
        if (filePath.endsWith('.js')) {
          res.setHeader(
            'Content-Type',
            'application/javascript; charset=UTF-8'
          );
        } else if (filePath.endsWith('.css')) {
          res.setHeader('Content-Type', 'text/css; charset=UTF-8');
        }
      },
      fallthrough: true, // Permitir que el catch-all maneje si no encuentra el archivo
    })
  );

  // También servir desde la raíz (por si Traefik quita el prefijo)
  // Usar fallthrough: true para que si no encuentra el archivo, continúe al catch-all
  server.use(
    express.static(distFolder, {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.js')) {
          res.setHeader(
            'Content-Type',
            'application/javascript; charset=UTF-8'
          );
        } else if (filePath.endsWith('.css')) {
          res.setHeader('Content-Type', 'text/css; charset=UTF-8');
        }
      },
      fallthrough: true, // Permitir que el catch-all maneje si no encuentra el archivo
    })
  );

  // Catch-all route: enviar el index.html para cualquier ruta no API
  // Esto permite que Angular Router maneje las rutas del frontend
  // IMPORTANTE: Esta ruta debe ir DESPUÉS de express.static para que funcione correctamente
  server.get('*', (req, res) => {
    // Ignorar rutas de API
    if (req.path.startsWith('/api/')) {
      res.status(404).json({ error: 'API endpoint not found' });
      return;
    }

    // Servir index.html para todas las demás rutas (SPA routing)
    res.sendFile(path.join(distFolder, 'index.html'), (err) => {
      if (err) {
        safeLogger.error('Error sirviendo index.html', err);
        res.status(500).send('Error loading application');
      }
    });
  });

  return server;
}

function run(): void {
  // Railway asigna PORT automáticamente, usar 3000 como fallback para desarrollo local
  const port = process.env['PORT'] || 3000;

  // Verificar configuración SMTP al iniciar
  const smtpHost = process.env['ENV_SMTP_HOST'] || 'smtp.gmail.com';
  const smtpPort = process.env['ENV_SMTP_PORT'] || '587';
  const smtpUser = process.env['ENV_SMTP_USER'];
  const smtpPassword = process.env['ENV_SMTP_PASSWORD'];

  safeLogger.safeLog('📧 Configuración SMTP', {
    host: smtpHost,
    port: smtpPort,
    user: smtpUser || 'NO CONFIGURADO',
    hasPassword: !!smtpPassword,
  });

  if (!smtpUser || !smtpPassword) {
    safeLogger.warn(
      '⚠️  ADVERTENCIA: Variables SMTP no configuradas. El servicio de email no funcionará.'
    );
  }

  // Start up the Node server
  const server = app();
  server.listen(port, () => {
    safeLogger.log(`Node Express server listening on http://localhost:${port}`);
  });
}

run();

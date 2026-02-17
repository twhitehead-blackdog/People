import compression from 'compression';
import dotenv from 'dotenv';
import express from 'express';
import rateLimit from 'express-rate-limit';
import { readFileSync } from 'fs';
import helmet from 'helmet';
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

// Leer versión una vez al iniciar el proceso (no en cada request)
const appVersion = (() => {
  try {
    const pkg = JSON.parse(readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
    return pkg.version || '0.0.0';
  } catch { return '0.0.0'; }
})();

// The Express app is exported so that it can be used by serverless Functions.
export function app(): express.Express {
  const server = express();

  // Configurar Express para confiar en proxies (necesario para obtener IP real en producción/VPS)
  // Esto permite que req.ip funcione correctamente cuando hay un proxy reverso (nginx, etc.)
  server.set('trust proxy', true);

  // Helmet — headers de seguridad (CSP, HSTS, X-Frame-Options, etc.)
  server.use(helmet({
    contentSecurityPolicy: false, // Angular maneja su propio CSP
    crossOriginEmbedderPolicy: false, // Permitir carga de recursos externos
  }));

  // Rate limiting — prevenir abuso y DDoS (solo endpoints sensibles)
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 1000, // máximo 1000 requests por IP cada 15 min
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later' },
    validate: { trustProxy: false },
    skip: (req) => {
      const p = req.path;
      return p === '/api/version' || p === '/api/client-ip' || p === '/api/server-time';
    },
  });
  server.use('/api/', apiLimiter);

  // Compresión gzip/brotli — reduce ~70% del tamaño de transferencia
  server.use(compression());

  // Middleware para parsear JSON
  server.use(express.json());

  // CORS middleware - restringido a dominios autorizados
  const allowedOrigins = [
    'https://people.blackdogpanama.com',
    'https://prueba.people.blackdogpanama.com',
    process.env['ENV_APP_URL']?.replace(/\/$/, ''),
  ].filter(Boolean) as string[];

  server.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Credentials', 'true');
    }
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

  // Versión de la app (para detección de actualizaciones en el frontend)
  server.get('/api/version', (_req, res) => {
    res.json({ version: appVersion });
  });

  // Middleware de autenticación para endpoints protegidos
  // Verifica que el request tenga un JWT válido (Supabase o Auth0)
  const requireAuth: express.RequestHandler = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Authorization header required' });
      return;
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      res.status(401).json({ error: 'Bearer token required' });
      return;
    }

    // Decodificar JWT para verificar expiración (sin verificación de firma completa)
    try {
      const payload = JSON.parse(
        Buffer.from(token.split('.')[1], 'base64').toString()
      );
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        res.status(401).json({ error: 'Token expired' });
        return;
      }
    } catch {
      res.status(401).json({ error: 'Invalid token format' });
      return;
    }

    next();
  };

  // Aplicar auth a endpoints sensibles
  server.use('/api/odoo', requireAuth);
  server.use('/api/wassenger', requireAuth);
  server.use('/api/email', requireAuth);

  /**
   * Integración Odoo 18 (Odoo.sh) - JSON-RPC
   * Lee sale.order del módulo de peluquería.
   * Requiere: ENV_ODOO_URL, ENV_ODOO_DB, ENV_ODOO_USERNAME, ENV_ODOO_PASSWORD (o ENV_ODOO_API_KEY)
   */
  async function odooJsonRpc(
    baseUrl: string,
    service: string,
    method: string,
    args: unknown[]
  ): Promise<unknown> {
    const url = baseUrl.replace(/\/$/, '') + '/jsonrpc';
    const body = {
      jsonrpc: '2.0',
      method: 'call',
      params: { service, method, args },
      id: Math.floor(Math.random() * 1e9),
    };
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
    const data = (await res.json()) as {
      result?: unknown;
      error?: { data?: { message?: string }; message?: string };
    };
    if (!res.ok) {
      throw new Error(data?.error?.data?.message || data?.error?.message || `Odoo HTTP ${res.status}`);
    }
    if (data.error) {
      throw new Error(data.error.data?.message || data.error.message || 'Odoo RPC error');
    }
    return data.result;
  }

  server.get('/api/odoo/sale-orders', async (req, res) => {
    try {
      const url = process.env['ENV_ODOO_URL'];
      const db = process.env['ENV_ODOO_DB'];
      const username = process.env['ENV_ODOO_USERNAME'];
      const password = process.env['ENV_ODOO_PASSWORD'] || process.env['ENV_ODOO_API_KEY'];

      if (!url || !db || !username || !password) {
        return res.status(503).json({
          error: 'Odoo no configurado',
          message:
            'Configura ENV_ODOO_URL, ENV_ODOO_DB, ENV_ODOO_USERNAME y ENV_ODOO_PASSWORD (o ENV_ODOO_API_KEY) en el servidor.',
        });
      }

      // Cache del uid de Odoo (se re-autentica cada 5 min)
      const now = Date.now();
      let uid: number;
      if (configCache.odooUid && (now - configCache.odooUid.ts) < CACHE_TTL) {
        uid = configCache.odooUid.value;
      } else {
        const authResult = (await odooJsonRpc(url, 'common', 'authenticate', [
          db,
          username,
          password,
          {},
        ])) as number | false;
        if (!authResult) {
          return res.status(401).json({
            error: 'Odoo: autenticación fallida',
            message: 'Usuario o contraseña incorrectos, o API key inválida.',
          });
        }
        uid = authResult;
        configCache.odooUid = { value: uid, ts: now };
      }

      // Filtro: solo órdenes con peluquería (solo_peluqueria o ambos)
      const domain: unknown[] = [
        ['tipo_servicio', 'in', ['solo_peluqueria', 'ambos']],
      ];
      const dateFrom = req.query['date_from'] as string | undefined;
      const dateTo = req.query['date_to'] as string | undefined;
      if (dateFrom) {
        domain.push(['date_order', '>=', dateFrom]);
      }
      if (dateTo) {
        domain.push(['date_order', '<=', dateTo]);
      }

      const fields = [
        'id',
        'name',
        'partner_id',
        'date_order',
        'state',
        'amount_total',
        'amount_untaxed',
        'user_id',
        'warehouse_id',
        // Campos del módulo sale_order_comanda_mascotas
        'nombres_mascotas',
        'count_peluqueria',
        'count_veterinaria',
        'count_total_mascotas',
        'count_cortes',
        'count_solo_bano',
        'count_bano_y_corte',
        'tiene_peluqueria',
        'tiene_veterinaria',
        'tipo_servicio',
        'mascota_line_ids',
      ];
      const limit = Math.min(Number(req.query['limit']) || 100, 500);

      const domainList = domain.length ? domain : [[]];
      const orders = (await odooJsonRpc(url, 'object', 'execute_kw', [
        db,
        uid,
        password,
        'sale.order',
        'search_read',
        [domainList],
        { fields, limit, order: 'date_order desc' },
      ])) as unknown[];

      return res.json({ success: true, data: orders });
    } catch (error: any) {
      safeLogger.error('Error en /api/odoo/sale-orders', error);
      return res.status(500).json({
        error: 'Error al obtener órdenes de Odoo',
        message: error?.message || 'Error desconocido',
      });
    }
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
          signal: AbortSignal.timeout(15000),
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

  // Cache para configuraciones que rara vez cambian
  const configCache: {
    emailEnabled: { value: boolean; ts: number } | null;
    smtpConfig: { value: SmtpConfig; ts: number } | null;
    odooUid: { value: number; ts: number } | null;
  } = { emailEnabled: null, smtpConfig: null, odooUid: null };
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

  // Helper para verificar si el envío de emails está habilitado (con cache)
  async function isEmailEnabled(): Promise<boolean> {
    const now = Date.now();
    if (configCache.emailEnabled && (now - configCache.emailEnabled.ts) < CACHE_TTL) {
      return configCache.emailEnabled.value;
    }

    try {
      const supabaseUrl = process.env['ENV_SUPABASE_URL'];
      const supabaseKey =
        process.env['ENV_SUPABASE_SERVICE_KEY'] ||
        process.env['ENV_SUPABASE_ANON_KEY'];

      if (!supabaseUrl || !supabaseKey) {
        return true;
      }

      const response = await fetch(
        `${supabaseUrl}/rest/v1/settings?key=eq.email_enabled&select=value`,
        {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
          signal: AbortSignal.timeout(10000),
        }
      );

      if (!response.ok) {
        return true;
      }

      const data = await response.json();
      let enabled = true;
      if (data && data.length > 0) {
        enabled = data[0].value === 'true';
      }

      configCache.emailEnabled = { value: enabled, ts: now };
      return enabled;
    } catch {
      return true;
    }
  }

  // Helper para obtener configuración SMTP: BD primero, env vars como fallback
  interface SmtpConfig {
    host: string;
    port: number;
    user: string;
    password: string;
    noreplyEmail: string;
    noreplyName: string;
  }

  async function getSmtpConfig(): Promise<SmtpConfig> {
    const now = Date.now();
    if (configCache.smtpConfig && (now - configCache.smtpConfig.ts) < CACHE_TTL) {
      return configCache.smtpConfig.value;
    }

    let dbHost: string | null = null;
    let dbPort: string | null = null;
    let dbUser: string | null = null;
    let dbNoreplyEmail: string | null = null;
    let dbNoreplyName: string | null = null;

    try {
      const supabaseUrl = process.env['ENV_SUPABASE_URL'];
      const supabaseKey =
        process.env['ENV_SUPABASE_SERVICE_KEY'] ||
        process.env['ENV_SUPABASE_ANON_KEY'];

      if (supabaseUrl && supabaseKey) {
        const response = await fetch(
          `${supabaseUrl}/rest/v1/settings?key=in.(smtp_host,smtp_port,smtp_user,smtp_noreply_email,smtp_noreply_name)&select=key,value`,
          {
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
            },
            signal: AbortSignal.timeout(10000),
          }
        );

        if (response.ok) {
          const data: Array<{ key: string; value: string }> =
            await response.json();
          for (const row of data) {
            if (row.key === 'smtp_host' && row.value) dbHost = row.value;
            if (row.key === 'smtp_port' && row.value) dbPort = row.value;
            if (row.key === 'smtp_user' && row.value) dbUser = row.value;
            if (row.key === 'smtp_noreply_email' && row.value)
              dbNoreplyEmail = row.value;
            if (row.key === 'smtp_noreply_name' && row.value)
              dbNoreplyName = row.value;
          }
        }
      }
    } catch {
      // Use env vars as fallback
    }

    const config: SmtpConfig = {
      host: dbHost || process.env['ENV_SMTP_HOST'] || 'smtp-mail.outlook.com',
      port: parseInt(dbPort || process.env['ENV_SMTP_PORT'] || '587'),
      user: dbUser || process.env['ENV_SMTP_USER'] || '',
      password: process.env['ENV_SMTP_PASSWORD'] || '',
      noreplyEmail: dbNoreplyEmail || process.env['ENV_SMTP_NOREPLY_EMAIL'] || dbUser || process.env['ENV_SMTP_USER'] || '',
      noreplyName: dbNoreplyName || process.env['ENV_SMTP_NOREPLY_NAME'] || 'People - RRHH',
    };

    configCache.smtpConfig = { value: config, ts: now };
    return config;
  }

  function createSmtpTransporter(config: SmtpConfig) {
    const isSecure = config.port === 465;

    return nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: isSecure, // true para 465, false para otros puertos
      requireTLS: !isSecure, // Forzar STARTTLS en puerto 587 (requerido por Outlook)
      auth: {
        user: config.user,
        pass: config.password,
      },
      connectionTimeout: 15000, // 15s para conectar al servidor SMTP
      greetingTimeout: 15000, // 15s para recibir el greeting del servidor
      socketTimeout: 30000, // 30s de inactividad máxima en el socket
      tls: {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: isProduction,
      },
      logger: !isProduction, // Logs detallados solo en desarrollo
      debug: !isProduction, // Debug SMTP solo en desarrollo
    });
  }

  // Endpoint para enviar emails
  server.post('/api/email/send', async (req, res) => {
    safeLogger.log('[Email Send] Nueva petición de email');

    try {
      // Verificar si el envío de emails está habilitado (master switch)
      const emailEnabled = await isEmailEnabled();
      if (!emailEnabled) {
        safeLogger.log('Email bloqueado: envío deshabilitado por configuración');
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

      if (!to || !subject || !html) {
        return res.status(400).json({
          error: 'Missing required fields: to, subject, html',
        });
      }

      // Preparar destinatarios (puede ser string o array)
      const recipients = Array.isArray(to) ? to : [to];

      // Intentar usar Resend primero (más confiable y fácil de configurar)
      const resendApiKey = process.env['ENV_RESEND_API_KEY'];

      if (resendApiKey) {
        console.error('[Email Send] ✅ Usando Resend para envío de email');
        const noreplyEmail =
          process.env['ENV_RESEND_FROM_EMAIL'] || 'onboarding@resend.dev';
        const noreplyName = process.env['ENV_RESEND_FROM_NAME'] || 'People';
        const senderEmail = fromEmail || noreplyEmail;
        const senderName = fromName || noreplyName;

        // Intentar via HTTP API primero (funciona en cualquier PaaS)
        try {
          const resendResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: `${senderName} <${senderEmail}>`,
              to: recipients,
              subject: subject,
              html: html,
              text: text || html.replace(/<[^>]*>/g, ''),
            }),
            signal: AbortSignal.timeout(15000),
          });

          const resendData = await resendResponse.json();

          if (resendResponse.ok && resendData.id) {
            console.error('[Email Send] ✅ Enviado via Resend HTTP API:', resendData.id);
            return res.json({
              success: true,
              data: { messageId: resendData.id },
            });
          }

          console.error('[Email Send] ❌ Resend HTTP API error:', JSON.stringify(resendData));
          return res.status(resendResponse.status >= 400 ? resendResponse.status : 500).json({
            error: 'Error al enviar email via Resend',
            message: resendData.message || resendData.error || JSON.stringify(resendData),
          });
        } catch (resendHttpError: any) {
          console.error('[Email Send] ❌ Resend HTTP falló, intentando SMTP:', resendHttpError.message);
        }

        // Fallback: Resend via SMTP
        try {
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
                auth: { user: 'resend', pass: resendApiKey },
                connectionTimeout: 10000,
                greetingTimeout: 10000,
                socketTimeout: 15000,
              });

              info = await transporter.sendMail({
                from: `${senderName} <${senderEmail}>`,
                to: recipients.join(', '),
                subject: subject,
                html: html,
                text: text || html.replace(/<[^>]*>/g, ''),
              });
              console.error(`[Email Send] ✅ Resend SMTP puerto ${port} OK`);
              break;
            } catch (err: any) {
              lastError = err;
              console.error(`[Email Send] ❌ Resend SMTP puerto ${port} falló:`, err.code, err.message);
            }
          }

          if (info) {
            return res.json({
              success: true,
              data: { messageId: info.messageId },
            });
          }

          // Si todo Resend falló, devolver error (no continuar a Postmark/SMTP)
          const errMsg = lastError?.message || 'Error desconocido';
          return res.status(500).json({
            error: 'Error al enviar email via Resend',
            message: errMsg,
          });
        } catch (resendSmtpError: any) {
          console.error('[Email Send] ❌ Resend SMTP error:', resendSmtpError.message);
          return res.status(500).json({
            error: 'Error al enviar email via Resend',
            message: resendSmtpError.message,
          });
        }
      }

      // Intentar usar Postmark si Resend no está configurado
      const postmarkApiKey = process.env['ENV_POSTMARK_API_KEY'];

      if (postmarkApiKey) {
        console.error('[Email Send] Usando Postmark para envío de email');
        try {
          const noreplyEmail =
            process.env['ENV_POSTMARK_FROM_EMAIL'] || 'noreply@tu-dominio.com';
          const noreplyName = process.env['ENV_POSTMARK_FROM_NAME'] || 'People';
          const senderEmail = fromEmail || noreplyEmail;
          const senderName = fromName || noreplyName;

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
                connectionTimeout: 10000,
                greetingTimeout: 10000,
                socketTimeout: 15000,
              });

              info = await transporter.sendMail({
                from: `${senderName} <${senderEmail}>`,
                to: recipients.join(', '),
                subject: subject,
                html: html,
                text: text || html.replace(/<[^>]*>/g, ''),
              });
              console.error(`[Email Send] ✅ Postmark SMTP puerto ${port} OK`);
              break;
            } catch (err: any) {
              lastError = err;
              console.error(`[Email Send] ❌ Postmark SMTP puerto ${port}:`, err.code, err.message);
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
          console.error('[Email Send] ❌ Postmark falló:', postmarkError.message);
          return res.status(500).json({
            error: 'Error al enviar email via Postmark SMTP',
            message: postmarkError.message || 'Error desconocido de Postmark',
          });
        }
      }

      // Fallback a SMTP genérico si no hay Resend ni Postmark configurado
      const smtpConfig = await getSmtpConfig();

      if (!smtpConfig.user || !smtpConfig.password) {
        safeLogger.error('Configuración SMTP faltante');
        return res.status(500).json({
          error: 'Email service not configured',
          message:
            'ENV_RESEND_API_KEY, ENV_POSTMARK_API_KEY o (SMTP user y ENV_SMTP_PASSWORD) no están configuradas. Por favor configura alguna de estas opciones.',
        });
      }

      // Determinar el correo remitente
      const senderEmail =
        fromEmail || smtpConfig.noreplyEmail || smtpConfig.user;
      const senderName = fromName || smtpConfig.noreplyName;

      const transporter = createSmtpTransporter(smtpConfig);

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
      safeLogger.error('Error sending email', error);

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
  server.get('/api/email/config', async (req, res) => {
    try {
      const resendApiKey = process.env['ENV_RESEND_API_KEY'];
      const postmarkApiKey = process.env['ENV_POSTMARK_API_KEY'];

      // Determinar el proveedor prioritario
      let provider = 'smtp';
      let host: string;
      let port: number;
      let user: string;
      let senderEmail: string;
      let senderName: string;

      if (resendApiKey) {
        provider = 'resend';
        host = 'smtp.resend.com';
        port = 465;
        user = '(Resend API)';
        senderEmail =
          process.env['ENV_RESEND_FROM_EMAIL'] || 'No configurado';
        senderName = process.env['ENV_RESEND_FROM_NAME'] || 'People';
      } else if (postmarkApiKey) {
        provider = 'postmark';
        host = 'smtp.postmarkapp.com';
        port = 587;
        user = '(Postmark Server API Token)';
        senderEmail =
          process.env['ENV_POSTMARK_FROM_EMAIL'] || 'No configurado';
        senderName = process.env['ENV_POSTMARK_FROM_NAME'] || 'People';
      } else {
        // SMTP genérico: leer de BD con fallback a env vars
        const smtpConfig = await getSmtpConfig();
        host = smtpConfig.host;
        port = smtpConfig.port;
        user = smtpConfig.user || 'No configurado';
        senderEmail = smtpConfig.noreplyEmail || 'No configurado';
        senderName = smtpConfig.noreplyName;
      }

      return res.json({
        provider,
        host,
        port,
        user,
        senderEmail,
        senderName,
        configured: !!(
          resendApiKey ||
          postmarkApiKey ||
          (user && user !== 'No configurado')
        ),
        priorities: {
          resend: !!resendApiKey,
          postmark: !!postmarkApiKey,
          smtp: !!(
            (user && user !== 'No configurado') &&
            process.env['ENV_SMTP_PASSWORD']
          ),
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
    // IMPORTANTE: Usar console.error para que aparezca en Railway (NODE_ENV=production suprime console.log)
    console.error('[Email Test] === NUEVA PETICIÓN DE PRUEBA ===');
    console.error('[Email Test] Body:', JSON.stringify(req.body));
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
        console.error('[Email Test] ✅ Resend API key detectada, usando Resend');
        const noreplyEmail =
          process.env['ENV_RESEND_FROM_EMAIL'] || 'onboarding@resend.dev';
        const noreplyName = process.env['ENV_RESEND_FROM_NAME'] || 'People';

        const testHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">✅ Prueba de Correo Exitosa - Resend</h2>
            <p>Este es un correo de prueba enviado desde el sistema <strong>People</strong> usando <strong>Resend</strong>.</p>
            <p>Si recibiste este mensaje, la configuración de Resend está funcionando correctamente.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #888; font-size: 12px;">
              Proveedor: Resend (HTTP API)<br>
              Enviado desde: ${noreplyEmail}<br>
              Fecha: ${new Date().toLocaleString('es-PA', {
                timeZone: 'America/Panama',
              })}
            </p>
          </div>
        `;

        // Intentar via HTTP API primero (funciona en cualquier PaaS, no necesita puertos SMTP)
        try {
          console.error('[Email Test] 📤 Intentando Resend HTTP API...');
          const resendResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: `${noreplyName} <${noreplyEmail}>`,
              to: [to],
              subject: '✅ Prueba de Correo - People (Resend)',
              html: testHtml,
            }),
            signal: AbortSignal.timeout(15000), // 15s timeout
          });

          const resendData = await resendResponse.json();
          console.error('[Email Test] Resend HTTP response:', resendResponse.status, JSON.stringify(resendData));

          if (resendResponse.ok && resendData.id) {
            console.error('[Email Test] ✅ Email enviado via Resend HTTP API:', resendData.id);
            return res.json({
              success: true,
              message: 'Correo de prueba enviado correctamente via Resend',
              provider: 'resend',
              data: { messageId: resendData.id, to },
            });
          }

          // Si la API devuelve error, mostrarlo
          console.error('[Email Test] ❌ Resend HTTP API error:', JSON.stringify(resendData));
          return res.status(resendResponse.status >= 400 ? resendResponse.status : 500).json({
            error: 'Error al enviar via Resend',
            message: resendData.message || resendData.error || JSON.stringify(resendData),
            code: 'RESEND_API_ERROR',
          });
        } catch (resendHttpError: any) {
          console.error('[Email Test] ❌ Resend HTTP API falló:', resendHttpError.message);
          // Si falla HTTP API, intentar SMTP como fallback
        }

        // Fallback: Resend via SMTP (puede no funcionar si Railway bloquea puertos)
        try {
          console.error('[Email Test] 🔄 Intentando Resend via SMTP (fallback)...');
          const envPortRaw = process.env['ENV_RESEND_SMTP_PORT'];
          const envPort = envPortRaw ? parseInt(envPortRaw) : undefined;
          const portsToTry = envPort ? [envPort] : [465, 587];

          let info: any;
          let lastError: any;
          for (const port of portsToTry) {
            try {
              console.error(`[Email Test] Probando Resend SMTP puerto ${port}...`);
              const transporter = nodemailer.createTransport({
                host: 'smtp.resend.com',
                port,
                secure: port === 465,
                requireTLS: port === 587,
                auth: { user: 'resend', pass: resendApiKey },
                connectionTimeout: 10000,
                greetingTimeout: 10000,
                socketTimeout: 15000,
              });

              info = await transporter.sendMail({
                from: `${noreplyName} <${noreplyEmail}>`,
                to: to,
                subject: '✅ Prueba de Correo - People (Resend SMTP)',
                html: testHtml,
              });
              console.error(`[Email Test] ✅ Resend SMTP puerto ${port} OK:`, info.messageId);
              break;
            } catch (err: any) {
              lastError = err;
              console.error(`[Email Test] ❌ Resend SMTP puerto ${port} falló:`, err.code, err.message);
            }
          }

          if (info) {
            return res.json({
              success: true,
              message: 'Correo de prueba enviado correctamente via Resend SMTP',
              provider: 'resend',
              data: { messageId: info.messageId, to },
            });
          }

          console.error('[Email Test] ❌ Todos los intentos de Resend fallaron');
          // Continuar con Postmark/SMTP genérico
        } catch (resendSmtpError: any) {
          console.error('[Email Test] ❌ Resend SMTP falló completamente:', resendSmtpError.message);
        }
      }

      // Intentar usar Postmark si Resend no está configurado o falló
      const postmarkApiKey = process.env['ENV_POSTMARK_API_KEY'];
      if (postmarkApiKey) {
        console.error('[Email Test] Intentando Postmark...');
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
              console.error(`[Email Test] Probando Postmark SMTP puerto ${port}...`);
              const transporter = nodemailer.createTransport({
                host: 'smtp.postmarkapp.com',
                port,
                secure: false,
                requireTLS: true,
                auth: {
                  user: postmarkApiKey,
                  pass: postmarkApiKey,
                },
                connectionTimeout: 10000,
                greetingTimeout: 10000,
                socketTimeout: 15000,
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

              console.error(`[Email Test] ✅ Postmark SMTP puerto ${port} OK:`, info.messageId);
              break;
            } catch (err: any) {
              lastError = err;
              console.error(`[Email Test] ❌ Postmark SMTP puerto ${port} falló:`, err.code, err.message);
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
          console.error('[Email Test] ❌ Postmark falló:', postmarkError.message);
          // Si Postmark falla, continuar con SMTP genérico
        }
      }

      // Fallback a SMTP genérico (BD + env vars)
      console.error('[Email Test] 🔄 Usando SMTP genérico para prueba de email');
      console.error('[Email Test] 📋 Env vars presentes:', {
        ENV_RESEND_API_KEY: !!process.env['ENV_RESEND_API_KEY'],
        ENV_POSTMARK_API_KEY: !!process.env['ENV_POSTMARK_API_KEY'],
        ENV_SMTP_HOST: !!process.env['ENV_SMTP_HOST'],
        ENV_SMTP_USER: !!process.env['ENV_SMTP_USER'],
        ENV_SMTP_PASSWORD: !!process.env['ENV_SMTP_PASSWORD'],
        ENV_SUPABASE_URL: !!process.env['ENV_SUPABASE_URL'],
      });

      const smtpConfig = await getSmtpConfig();
      console.log('[Email Test] ⚙️ Config obtenida:', {
        host: smtpConfig.host,
        port: smtpConfig.port,
        user: smtpConfig.user,
        hasPassword: !!smtpConfig.password,
        noreplyEmail: smtpConfig.noreplyEmail,
      });

      if (!smtpConfig.user || !smtpConfig.password) {
        console.error('[Email Test] ❌ SMTP user o password faltante');
        return res.status(500).json({
          error: 'Ningún proveedor de email configurado',
          message:
            'ENV_RESEND_API_KEY, ENV_POSTMARK_API_KEY o (SMTP user y ENV_SMTP_PASSWORD) no están configuradas',
        });
      }

      console.error('[Email Test] 🔌 Creando transporter SMTP genérico...');
      const transporter = createSmtpTransporter(smtpConfig);

      const testHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">✅ Prueba de Correo Exitosa - SMTP</h2>
          <p>Este es un correo de prueba enviado desde el sistema <strong>People</strong> usando <strong>SMTP</strong>.</p>
          <p>Si recibiste este mensaje, la configuración SMTP está funcionando correctamente.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #888; font-size: 12px;">
            Proveedor: SMTP (${smtpConfig.host}:${smtpConfig.port})<br>
            Enviado desde: ${smtpConfig.noreplyEmail}<br>
            Fecha: ${new Date().toLocaleString('es-PA', {
              timeZone: 'America/Panama',
            })}
          </p>
        </div>
      `;

      console.error('[Email Test] 📤 Intentando sendMail a:', to);
      const info = await transporter.sendMail({
        from: `${smtpConfig.noreplyName} <${smtpConfig.noreplyEmail}>`,
        to: to,
        subject: '✅ Prueba de Correo - People (SMTP)',
        html: testHtml,
      });
      console.error('[Email Test] ✅ sendMail completado:', info.messageId);

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
      console.error('[Email Test] ❌ ERROR CAPTURADO:', {
        code: error.code,
        message: error.message,
        name: error.name,
        command: error.command,
      });
      safeLogger.error('❌ Error en email de prueba', error);

      let errorMessage = 'Error desconocido';
      if (error.code === 'EAUTH') {
        errorMessage =
          'Error de autenticación SMTP. Verifica usuario y contraseña (ENV_SMTP_PASSWORD). Si usas Outlook con 2FA, necesitas un App Password.';
      } else if (error.code === 'ECONNECTION') {
        errorMessage =
          'No se pudo conectar al servidor SMTP. El puerto puede estar bloqueado por Railway o el host es incorrecto.';
      } else if (
        error.code === 'ETIMEDOUT' ||
        error.code === 'ESOCKET'
      ) {
        errorMessage =
          'Timeout al conectar con el servidor SMTP. Railway puede estar bloqueando el puerto 587 saliente. Considera usar un servicio como Resend o Postmark.';
      } else if (error.code === 'EENVELOPE') {
        errorMessage =
          'Error en el sobre del email. El remitente puede no estar autorizado.';
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
          version: '/api/version',
          clientIp: '/api/client-ip',
          serverTime: '/api/server-time',
          wassenger: '/api/wassenger/send-message',
          email: '/api/email/send',
          odooSaleOrders: '/api/odoo/sale-orders',
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

  // Helper: cache headers + MIME types para archivos estáticos
  const staticHeaders = (res: express.Response, filePath: string) => {
    // MIME types
    if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript; charset=UTF-8');
    } else if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css; charset=UTF-8');
    }
    // Service Worker y manifest: nunca cachear (deben actualizarse siempre)
    if (/sw\.js$|manifest\.webmanifest$/i.test(filePath)) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
    // Cache: archivos con hash en el nombre → inmutables (1 año)
    // Resto → cache corto (1 hora) para revalidar
    else if (/\-[A-Z0-9]{8}\.(js|css|woff2?)$/i.test(filePath)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else if (/\.(js|css|woff2?|ttf|svg|png|jpg|jpeg|webp|ico|json)$/i.test(filePath)) {
      res.setHeader('Cache-Control', 'public, max-age=3600');
    }
  };

  // Servir archivos estáticos con el prefijo /people-test
  server.use(
    '/people-test',
    express.static(distFolder, {
      setHeaders: staticHeaders,
      fallthrough: true,
    })
  );

  // También servir desde la raíz (por si Traefik quita el prefijo)
  server.use(
    express.static(distFolder, {
      setHeaders: staticHeaders,
      fallthrough: true,
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

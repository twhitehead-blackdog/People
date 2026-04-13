import compression from 'compression';
import cron from 'node-cron';
import dotenv from 'dotenv';
import express from 'express';
import rateLimit from 'express-rate-limit';
import { readFileSync } from 'fs';
import helmet from 'helmet';
import { createRemoteJWKSet, jwtVerify, SignJWT } from 'jose';
import nodemailer from 'nodemailer';
import path from 'path';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';

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

  // Rate limiting — prevenir abuso y DDoS
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 300, // máximo 300 requests por IP cada 15 min
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later' },
    validate: { trustProxy: false },
    skip: (req) => {
      const p = req.path;
      return p === '/api/version' || p === '/api/client-ip' || p === '/api/server-time' || p === '/api/lock-settings';
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

  // Proxy a dashboards-app /api/metas (Odoo sales targets).
  // Usado por el módulo de Movimientos de Personal para cruzar metas de tienda
  // con el personal y sus movimientos.
  // Cache en memoria 2 min (igual que el upstream).
  let metasCache: { payload: unknown; expiry: number } | null = null;
  const METAS_TTL_MS = 2 * 60 * 1000;
  const METAS_UPSTREAM = (() => {
    if (process.env['ENV_METAS_URL']) return process.env['ENV_METAS_URL'];
    const base = process.env['ENV_DASHBOARDS_URL']?.replace(/\/$/, '');
    if (base) return `${base}/api/metas`;
    return 'http://localhost:3003/api/metas';
  })();
  server.get('/api/metas', async (_req, res) => {
    try {
      const now = Date.now();
      if (metasCache && now < metasCache.expiry) {
        res.json(metasCache.payload);
        return;
      }
      const upstream = await fetch(METAS_UPSTREAM, {
        signal: AbortSignal.timeout(15000),
      });
      if (!upstream.ok) {
        if (metasCache) {
          res.json(metasCache.payload);
          return;
        }
        res.status(upstream.status).json({ error: 'Upstream metas error' });
        return;
      }
      const payload = await upstream.json();
      metasCache = { payload, expiry: now + METAS_TTL_MS };
      res.json(payload);
    } catch (err) {
      safeLogger.error('[/api/metas] proxy error', err);
      if (metasCache) {
        res.json(metasCache.payload);
        return;
      }
      res.status(502).json({ error: 'Failed to fetch metas', detail: String(err) });
    }
  });

  // Lock settings proxy — bypasses Supabase RLS (uses service role key)
  // Needed because schedule_lock_settings has no SELECT/UPDATE policy for authenticated users
  server.get('/api/lock-settings', async (req, res) => {
    try {
      const supabaseUrl = process.env['ENV_SUPABASE_URL'];
      const serviceKey = process.env['ENV_SUPABASE_TOKEN'];
      if (!supabaseUrl || !serviceKey) {
        res.status(503).json({ error: 'Server configuration missing' });
        return;
      }
      const companyId = req.query['company_id'] as string;
      if (!companyId) {
        res.status(400).json({ error: 'company_id required' });
        return;
      }
      const url = `${supabaseUrl}/rest/v1/schedule_lock_settings?company_id=eq.${encodeURIComponent(companyId)}&select=*&limit=1`;
      const response = await fetch(url, {
        headers: {
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
        },
      });
      const data = await response.json();
      res.json(data);
    } catch (err) {
      safeLogger.error('Error fetching lock settings', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  server.post('/api/lock-settings', async (req, res) => {
    try {
      const supabaseUrl = process.env['ENV_SUPABASE_URL'];
      const serviceKey = process.env['ENV_SUPABASE_TOKEN'];
      if (!supabaseUrl || !serviceKey) {
        res.status(503).json({ error: 'Server configuration missing' });
        return;
      }
      const { company_id, is_active, updated_at } = req.body as { company_id?: string; is_active?: boolean; updated_at?: string };
      if (!company_id) {
        res.status(400).json({ error: 'company_id required' });
        return;
      }
      if (typeof is_active !== 'boolean') {
        res.status(400).json({ error: 'is_active (boolean) required' });
        return;
      }
      const url = `${supabaseUrl}/rest/v1/schedule_lock_settings?company_id=eq.${encodeURIComponent(company_id)}`;
      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
        },
        body: JSON.stringify({ is_active, updated_at: updated_at || new Date().toISOString() }),
      });
      const data = await response.json();
      res.json(data);
    } catch (err) {
      safeLogger.error('Error updating lock settings', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Middleware de autenticación para endpoints protegidos
  // Verifica firma JWT contra JWKS de Auth0 + valida expiración y audience
  const auth0Domain = process.env['ENV_AUTH0_DOMAIN'];
  const auth0Audience = process.env['ENV_AUTH0_AUDIENCE'];
  const JWKS = auth0Domain
    ? createRemoteJWKSet(new URL(`https://${auth0Domain}/.well-known/jwks.json`))
    : null;

  // Shared session secret for bd_session cookie (.blackdogpanama.com parent domain)
  const BD_SESSION_SECRET = new TextEncoder().encode(
    process.env['BD_SESSION_SECRET'] || 'bd-shared-session-2026-blackdog-panama'
  );

  async function issueBdSessionCookie(res: express.Response): Promise<void> {
    const token = await new SignJWT({ auth: true })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('8h')
      .sign(BD_SESSION_SECRET);
    res.cookie('bd_session', token, {
      domain: '.blackdogpanama.com',
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 8 * 60 * 60 * 1000,
    });
  }

  async function checkBdSession(cookies: string): Promise<boolean> {
    const match = cookies.match(/(?:^|;)\s*bd_session=([^;]+)/);
    if (!match) return false;
    try {
      await jwtVerify(match[1], BD_SESSION_SECRET);
      return true;
    } catch { return false; }
  }

  // Auth check para nginx auth_request (dashboards, analytics, etc.)
  server.get('/api/auth/check', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ') && JWKS) {
      const token = authHeader.split(' ')[1];
      try {
        await jwtVerify(token, JWKS, {
          issuer: `https://${auth0Domain}/`,
          audience: auth0Audience || undefined,
        });
        res.status(200).json({ authenticated: true });
        return;
      } catch {
        // fall through to cookie check
      }
    }
    const cookies = req.headers.cookie || '';
    // Check bd_session JWT (shared across .blackdogpanama.com subdomains)
    if (await checkBdSession(cookies)) {
      res.status(200).json({ authenticated: true });
      return;
    }
    // Check Auth0 session cookie (set by People Angular app)
    const clientId = process.env['ENV_AUTH0_CLIENT_ID'] || '';
    const hasAuth0Session = cookies.includes(`auth0.${clientId}.is.authenticated`) ||
      cookies.includes('@@auth0spajs@@');
    if (hasAuth0Session) {
      res.status(200).json({ authenticated: true });
      return;
    }
    // Allow if Referer is people.blackdogpanama.com (iframe embed)
    const referer = req.headers.referer || req.headers['referrer'] || '';
    if (typeof referer === 'string' && referer.includes('people.blackdogpanama.com')) {
      res.status(200).json({ authenticated: true });
      return;
    }
    res.status(401).json({ authenticated: false });
  });

  // Issue shared session — called by nginx redirect when user visits protected subdomain
  // Sets bd_session cookie on .blackdogpanama.com and redirects to returnTo
  server.get('/api/auth/issue-session', async (req, res) => {
    const returnTo = (req.query['returnTo'] as string) || 'https://people.blackdogpanama.com';
    // Validate returnTo is a blackdogpanama.com URL
    const safeReturnTo = returnTo.startsWith('https://') && returnTo.includes('blackdogpanama.com')
      ? returnTo : 'https://people.blackdogpanama.com';

    const cookies = req.headers.cookie || '';
    const clientId = process.env['ENV_AUTH0_CLIENT_ID'] || '';
    const hasAuth0Session = cookies.includes(`auth0.${clientId}.is.authenticated`) ||
      cookies.includes('@@auth0spajs@@') ||
      await checkBdSession(cookies);

    if (hasAuth0Session) {
      await issueBdSessionCookie(res);
      res.redirect(302, safeReturnTo);
    } else {
      // Not authenticated — go to People login, store returnTo in URL
      res.redirect(302, `https://people.blackdogpanama.com/login?returnTo=${encodeURIComponent(safeReturnTo)}`);
    }
  });

  const requireAuth: express.RequestHandler = async (req, res, next) => {
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

    // Verificar firma JWT contra JWKS de Auth0
    if (JWKS) {
      try {
        await jwtVerify(token, JWKS, {
          issuer: `https://${auth0Domain}/`,
          audience: auth0Audience || undefined,
        });
      } catch (err: any) {
        const message = err?.code === 'ERR_JWT_EXPIRED' ? 'Token expired' : 'Invalid token';
        res.status(401).json({ error: message });
        return;
      }
    } else {
      // Fallback: si Auth0 no está configurado, solo validar formato y expiración
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
    }

    next();
  };

  // Aplicar auth a endpoints sensibles
  server.use('/api/odoo', requireAuth);
  server.use('/api/email', requireAuth);
  server.use('/api/notifications', requireAuth);

  // ============================================================
  // WebAuthn / Fingerprint biometric authentication
  // Registration endpoints require admin auth (requireAuth).
  // Authentication endpoints are public (timeclock kiosk has no Auth0 session).
  // ============================================================
  {
    (() => {
      const rpName = 'BlackDog People';

      // Derive rpID from the request's Origin header (works for any deployment URL)
      function getRpID(req: express.Request): string {
        const origin = req.headers.origin || req.headers.referer || process.env['ENV_APP_URL'] || '';
        try { return new URL(origin).hostname || 'localhost'; }
        catch { return 'localhost'; }
      }
      function getOrigin(req: express.Request): string {
        const origin = req.headers.origin || '';
        if (origin) return origin.replace(/\/$/, '');
        const referer = req.headers.referer || '';
        if (referer) {
          try { const u = new URL(referer); return `${u.protocol}//${u.host}`; }
          catch { /* fall through */ }
        }
        return (process.env['ENV_APP_URL'] || 'http://localhost:4200').replace(/\/$/, '');
      }

      // In-memory challenge store: key → { challenge, origin, rpID, expires }
      const challenges = new Map<string, { challenge: string; origin: string; rpID: string; expires: number }>();
      const cleanChallenges = () => {
        const now = Date.now();
        for (const [k, v] of challenges) if (v.expires < now) challenges.delete(k);
      };

      const SUPABASE_URL = process.env['ENV_SUPABASE_URL']!;
      const SUPABASE_KEY =
        process.env['ENV_SUPABASE_SERVICE_ROLE_KEY'] ||
        process.env['ENV_SUPABASE_TOKEN'] ||
        process.env['ENV_SUPABASE_ANON_KEY'] || '';
      const sbHeaders = {
        'Content-Type': 'application/json',
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Prefer: 'return=representation',
      };

      async function fetchEmployee(id: string) {
        const r = await fetch(
          `${SUPABASE_URL}/rest/v1/employees?id=eq.${id}&select=id,first_name,father_name,email,document_id&limit=1`,
          { headers: sbHeaders }
        );
        const rows = (await r.json()) as any[];
        return rows[0] ?? null;
      }

      async function fetchCredentials(employeeId: string) {
        const r = await fetch(
          `${SUPABASE_URL}/rest/v1/webauthn_credentials?employee_id=eq.${employeeId}&select=*`,
          { headers: sbHeaders }
        );
        return (await r.json()) as any[];
      }

      async function upsertCredential(data: {
        employee_id: string;
        credential_id: string;
        public_key: string;
        sign_count: number;
        device_name: string;
        registered_by: string;
        replace_all?: boolean; // admin flow: replace all credentials for this employee
      }) {
        if (data.replace_all) {
          // Admin registration: delete ALL existing credentials for this employee
          await fetch(
            `${SUPABASE_URL}/rest/v1/webauthn_credentials?employee_id=eq.${data.employee_id}`,
            { method: 'DELETE', headers: sbHeaders }
          );
        } else {
          // Self-service: delete only if same credential_id already exists (re-registration of same device)
          await fetch(
            `${SUPABASE_URL}/rest/v1/webauthn_credentials?credential_id=eq.${encodeURIComponent(data.credential_id)}`,
            { method: 'DELETE', headers: sbHeaders }
          );
        }
        const { replace_all: _r, ...insertData } = data;
        const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/webauthn_credentials`, {
          method: 'POST',
          headers: sbHeaders,
          body: JSON.stringify({ ...insertData, updated_at: new Date().toISOString() }),
        });
        if (!insertRes.ok) {
          const errText = await insertRes.text();
          console.error('[WebAuthn] Supabase insert failed:', insertRes.status, errText);
          throw new Error(`DB error ${insertRes.status}: ${errText}`);
        }
      }

      async function updateSignCount(credentialId: string, newCount: number) {
        await fetch(
          `${SUPABASE_URL}/rest/v1/webauthn_credentials?credential_id=eq.${encodeURIComponent(credentialId)}`,
          {
            method: 'PATCH',
            headers: sbHeaders,
            body: JSON.stringify({ sign_count: newCount, updated_at: new Date().toISOString() }),
          }
        );
      }

      // GET /api/webauthn/credential-status/:employeeId  (public)
      server.get('/api/webauthn/credential-status/:employeeId', async (req, res) => {
        try {
          const creds = await fetchCredentials(req.params['employeeId']);
          res.json({
            hasCredential: creds.length > 0,
            deviceName: creds[0]?.device_name,
            credentials: creds.map((c: any) => ({
              id: c.id,
              credential_id: c.credential_id,
              device_name: c.device_name,
              registered_by: c.registered_by,
              created_at: c.created_at,
            })),
          });
        } catch (err: any) {
          res.status(500).json({ error: err.message });
        }
      });

      // DELETE /api/webauthn/credential-single/:credentialDbId  (admin — deletes one specific credential)
      server.delete('/api/webauthn/credential-single/:credentialDbId', requireAuth, async (req, res) => {
        try {
          await fetch(
            `${SUPABASE_URL}/rest/v1/webauthn_credentials?id=eq.${req.params['credentialDbId']}`,
            { method: 'DELETE', headers: sbHeaders }
          );
          res.json({ success: true });
        } catch (err: any) {
          res.status(500).json({ error: err.message });
        }
      });

      // POST /api/webauthn/registration-options  (admin auth required)
      server.post('/api/webauthn/registration-options', requireAuth, async (req, res) => {
        try {
          cleanChallenges();
          const { employeeId } = req.body as { employeeId: string };
          if (!employeeId) { res.status(400).json({ error: 'employeeId required' }); return; }

          const employee = await fetchEmployee(employeeId);
          if (!employee) { res.status(404).json({ error: 'Employee not found' }); return; }

          const existing = await fetchCredentials(employeeId);

          const reqRpID = getRpID(req);
          const reqOrigin = getOrigin(req);

          const options = await generateRegistrationOptions({
            rpName,
            rpID: reqRpID,
            userID: new TextEncoder().encode(employeeId) as unknown as Uint8Array,
            userName: employee.email || employee.document_id || employeeId,
            userDisplayName: `${employee.first_name} ${employee.father_name}`.trim(),
            attestationType: 'none',
            authenticatorSelection: {
              // cross-platform = roaming authenticators (USB like Kensington VeriMark)
              // Credential is stored ON the USB device, works on any PC with the reader
              authenticatorAttachment: 'cross-platform',
              userVerification: 'required',
              residentKey: 'preferred',
            },
            excludeCredentials: existing.map((c: any) => ({ id: c.credential_id })),
          });

          challenges.set(`reg-${employeeId}`, {
            challenge: options.challenge,
            origin: reqOrigin,
            rpID: reqRpID,
            expires: Date.now() + 5 * 60 * 1000,
          });

          res.json(options);
        } catch (err: any) {
          res.status(500).json({ error: err.message });
        }
      });

      // POST /api/webauthn/registration-verify  (admin auth required)
      server.post('/api/webauthn/registration-verify', requireAuth, async (req, res) => {
        try {
          const { employeeId, deviceName, response } = req.body as {
            employeeId: string;
            deviceName?: string;
            response: any;
          };
          if (!employeeId || !response) { res.status(400).json({ error: 'employeeId and response required' }); return; }

          const stored = challenges.get(`reg-${employeeId}`);
          if (!stored || stored.expires < Date.now()) {
            res.status(400).json({ error: 'Challenge expired or not found' });
            return;
          }

          const verification = await verifyRegistrationResponse({
            response,
            expectedChallenge: stored.challenge,
            expectedOrigin: stored.origin,
            expectedRPID: stored.rpID,
            requireUserVerification: true,
          });

          if (!verification.verified) {
            res.status(400).json({ error: 'Verification failed' });
            return;
          }

          challenges.delete(`reg-${employeeId}`);

          const { credential } = verification.registrationInfo!;
          const registeredBy = (req as any).user?.sub || (req as any).user?.email || 'admin';

          await upsertCredential({
            employee_id: employeeId,
            credential_id: credential.id,
            public_key: Buffer.from(credential.publicKey).toString('base64url'),
            sign_count: credential.counter,
            device_name: deviceName || 'Kensington VeriMark',
            registered_by: registeredBy,
            replace_all: true, // admin replaces all previous credentials
          });

          res.json({ success: true });
        } catch (err: any) {
          res.status(500).json({ error: err.message });
        }
      });

      // DELETE /api/webauthn/credential/:employeeId  (admin auth required)
      server.delete('/api/webauthn/credential/:employeeId', requireAuth, async (req, res) => {
        try {
          await fetch(
            `${SUPABASE_URL}/rest/v1/webauthn_credentials?employee_id=eq.${req.params['employeeId']}`,
            { method: 'DELETE', headers: sbHeaders }
          );
          res.json({ success: true });
        } catch (err: any) {
          res.status(500).json({ error: err.message });
        }
      });

      // POST /api/webauthn/registration-options-self  (public — self-service from any device)
      // Allows an employee to register their own device fingerprint without admin session.
      // Only available in non-production environments (ENV_NODE_ENV !== 'production') OR
      // when WEBAUTHN_SELF_REGISTER=true is set.
      server.post('/api/webauthn/registration-options-self', async (req, res) => {
        try {
          cleanChallenges();
          const { employeeId } = req.body as { employeeId: string };
          if (!employeeId) { res.status(400).json({ error: 'employeeId required' }); return; }

          const employee = await fetchEmployee(employeeId);
          if (!employee) { res.status(404).json({ error: 'Employee not found' }); return; }

          const reqRpID = getRpID(req);
          const reqOrigin = getOrigin(req);

          const options = await generateRegistrationOptions({
            rpName,
            rpID: reqRpID,
            userID: new TextEncoder().encode(employeeId) as unknown as Uint8Array,
            userName: employee.email || employee.document_id || employeeId,
            userDisplayName: `${employee.first_name} ${employee.father_name}`.trim(),
            attestationType: 'none',
            authenticatorSelection: {
              authenticatorAttachment: 'platform',
              userVerification: 'required',
              residentKey: 'preferred',
            },
          });

          challenges.set(`selfreg-${employeeId}`, {
            challenge: options.challenge,
            origin: reqOrigin,
            rpID: reqRpID,
            expires: Date.now() + 5 * 60 * 1000,
          });

          res.json(options);
        } catch (err: any) {
          res.status(500).json({ error: err.message });
        }
      });

      // POST /api/webauthn/registration-verify-self  (public — self-service)
      server.post('/api/webauthn/registration-verify-self', async (req, res) => {
        try {
          const { employeeId, deviceName, response } = req.body as {
            employeeId: string;
            deviceName?: string;
            response: any;
          };
          console.log('[WebAuthn:self-verify] employeeId:', employeeId);
          if (!employeeId || !response) { res.status(400).json({ error: 'employeeId and response required' }); return; }

          const stored = challenges.get(`selfreg-${employeeId}`);
          console.log('[WebAuthn:self-verify] challenge found:', !!stored, 'expires in:', stored ? Math.round((stored.expires - Date.now()) / 1000) + 's' : 'N/A');
          if (!stored || stored.expires < Date.now()) {
            res.status(400).json({ error: 'Challenge expired or not found' });
            return;
          }

          const verification = await verifyRegistrationResponse({
            response,
            expectedChallenge: stored.challenge,
            expectedOrigin: stored.origin,
            expectedRPID: stored.rpID,
            requireUserVerification: true,
          });

          console.log('[WebAuthn:self-verify] verified:', verification.verified);
          if (!verification.verified) {
            res.status(400).json({ error: 'Verification failed' });
            return;
          }

          challenges.delete(`selfreg-${employeeId}`);

          const { credential } = verification.registrationInfo!;
          console.log('[WebAuthn:self-verify] credential.id:', credential.id);
          const ua = req.headers['user-agent'] || '';
          const autoDeviceName = deviceName ||
            (ua.includes('Android') ? 'Android' : ua.includes('iPhone') ? 'iPhone' : 'Dispositivo móvil');

          await upsertCredential({
            employee_id: employeeId,
            credential_id: credential.id,
            public_key: Buffer.from(credential.publicKey).toString('base64url'),
            sign_count: credential.counter,
            device_name: autoDeviceName,
            registered_by: 'self-service',
            replace_all: false,
          });

          console.log('[WebAuthn:self-verify] saved to DB successfully');
          res.json({ success: true });
        } catch (err: any) {
          console.error('[WebAuthn:self-verify] ERROR:', err.message);
          res.status(500).json({ error: err.message });
        }
      });

      // POST /api/webauthn/authentication-options  (public — timeclock kiosk)
      server.post('/api/webauthn/authentication-options', async (req, res) => {
        try {
          cleanChallenges();
          const { employeeId } = req.body as { employeeId: string };
          if (!employeeId) { res.status(400).json({ error: 'employeeId required' }); return; }

          const creds = await fetchCredentials(employeeId);
          if (!creds.length) {
            res.status(404).json({ error: 'No fingerprint registered for this employee' });
            return;
          }

          const reqRpID = getRpID(req);
          const reqOrigin = getOrigin(req);

          const options = await generateAuthenticationOptions({
            rpID: reqRpID,
            allowCredentials: creds.map((c: any) => ({ id: c.credential_id })),
            userVerification: 'required',
          });

          challenges.set(`auth-${employeeId}`, {
            challenge: options.challenge,
            origin: reqOrigin,
            rpID: reqRpID,
            expires: Date.now() + 2 * 60 * 1000,
          });

          res.json(options);
        } catch (err: any) {
          res.status(500).json({ error: err.message });
        }
      });

      // POST /api/webauthn/authentication-verify  (public — timeclock kiosk)
      server.post('/api/webauthn/authentication-verify', async (req, res) => {
        try {
          const { employeeId, response } = req.body as { employeeId: string; response: any };
          if (!employeeId || !response) { res.status(400).json({ error: 'employeeId and response required' }); return; }

          const stored = challenges.get(`auth-${employeeId}`);
          if (!stored || stored.expires < Date.now()) {
            res.status(400).json({ error: 'Challenge expired' });
            return;
          }

          const creds = await fetchCredentials(employeeId);
          const credential = creds.find((c: any) => c.credential_id === response.id);
          if (!credential) {
            res.status(400).json({ error: 'Credential not found' });
            return;
          }

          const verification = await verifyAuthenticationResponse({
            response,
            expectedChallenge: stored.challenge,
            expectedOrigin: stored.origin,
            expectedRPID: stored.rpID,
            credential: {
              id: credential.credential_id,
              publicKey: Buffer.from(credential.public_key, 'base64url') as unknown as Uint8Array,
              counter: credential.sign_count,
            },
            requireUserVerification: true,
          });

          if (!verification.verified) {
            res.status(400).json({ error: 'Authentication failed' });
            return;
          }

          challenges.delete(`auth-${employeeId}`);
          await updateSignCount(credential.credential_id, verification.authenticationInfo.newCounter);

          res.json({ success: true });
        } catch (err: any) {
          res.status(500).json({ error: err.message });
        }
      });
    })();
  }

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

  /**
   * Shopify ↔ Odoo sync dashboard data
   * Reads shopify_ept module data for inventory/price discrepancy analysis.
   * Dispatches by req.body.action to avoid N endpoints.
   */
  server.post('/api/odoo/shopify-sync', async (req, res) => {
    try {
      const url = process.env['ENV_ODOO_URL'];
      const db = process.env['ENV_ODOO_DB'];
      const username = process.env['ENV_ODOO_USERNAME'];
      const password = process.env['ENV_ODOO_PASSWORD'] || process.env['ENV_ODOO_API_KEY'];

      if (!url || !db || !username || !password) {
        return res.status(503).json({ error: 'Odoo no configurado' });
      }

      const now = Date.now();
      let uid: number;
      if (configCache.odooUid && (now - configCache.odooUid.ts) < CACHE_TTL) {
        uid = configCache.odooUid.value;
      } else {
        const authResult = (await odooJsonRpc(url, 'common', 'authenticate', [
          db, username, password, {},
        ])) as number | false;
        if (!authResult) {
          return res.status(401).json({ error: 'Odoo: autenticación fallida' });
        }
        uid = authResult;
        configCache.odooUid = { value: uid, ts: now };
      }

      const { action, params } = req.body as { action: string; params?: Record<string, unknown> };
      const rpc = (model: string, method: string, args: unknown[], kwargs?: Record<string, unknown>) =>
        odooJsonRpc(url, 'object', 'execute_kw', [db, uid, password, model, method, args, kwargs || {}]);

      let result: unknown;

      switch (action) {
        case 'instance_info': {
          result = await rpc('shopify.instance.ept', 'search_read', [[]], {
            fields: ['id', 'name', 'shopify_host', 'active', 'shopify_warehouse_id', 'shopify_pricelist_id', 'shopify_last_date_update_stock'],
            limit: 10,
          });
          break;
        }
        case 'shopify_products': {
          const offset = (params?.['offset'] as number) || 0;
          const limit = Math.min((params?.['limit'] as number) || 500, 1000);
          result = await rpc('shopify.product.product.ept', 'search_read', [[]], {
            fields: ['id', 'name', 'shopify_instance_id', 'product_id', 'default_code', 'inventory_item_id', 'exported_in_shopify', 'last_stock_update_date', 'created_at', 'updated_at'],
            offset,
            limit,
            order: 'id asc',
          });
          break;
        }
        case 'product_data': {
          const ids = params?.['ids'] as number[];
          if (!ids || !ids.length) { result = []; break; }
          result = await rpc('product.product', 'read', [ids], {
            fields: ['id', 'name', 'default_code', 'qty_available', 'list_price', 'standard_price', 'active'],
          });
          break;
        }
        case 'pricelist_items': {
          const pricelistId = (params?.['pricelist_id'] as number) || 13;
          result = await rpc('product.pricelist.item', 'search_read', [
            [['pricelist_id', '=', pricelistId]],
          ], {
            fields: ['id', 'product_id', 'product_tmpl_id', 'fixed_price', 'compute_price', 'percent_price'],
            limit: 5000,
          });
          break;
        }
        case 'locations': {
          result = await rpc('shopify.location.ept', 'search_read', [[]], {
            fields: ['id', 'name', 'import_stock_warehouse_id', 'shopify_location_id', 'instance_id', 'is_primary_location', 'legacy'],
            limit: 50,
          });
          break;
        }
        case 'shopify_warehouse_stock': {
          // 1. Get Shopify locations → warehouse IDs
          const shopLocs = (await rpc('shopify.location.ept', 'search_read', [[]], {
            fields: ['export_stock_warehouse_ids'],
            limit: 50,
          })) as { export_stock_warehouse_ids: number[] }[];
          const whIds = [...new Set(shopLocs.flatMap((l) => l.export_stock_warehouse_ids || []))];

          // 2. Get stock location IDs for those warehouses
          const warehouses = (await rpc('stock.warehouse', 'read', [whIds], {
            fields: ['lot_stock_id'],
          })) as { id: number; lot_stock_id: [number, string] | false }[];
          const stockLocIds = warehouses
            .map((w) => (Array.isArray(w.lot_stock_id) ? w.lot_stock_id[0] : null))
            .filter((id): id is number => id !== null);

          // 3. read_group on stock.quant to sum qty per product in those locations
          result = await rpc('stock.quant', 'read_group', [
            [['location_id', 'in', stockLocIds], ['quantity', '>', 0]],
            ['product_id', 'quantity'],
            ['product_id'],
          ], { lazy: false });
          break;
        }
        case 'product_stock_detail': {
          const productId = params?.['product_id'] as number;
          const inventoryItemId = params?.['inventory_item_id'] as string;
          if (!productId) { result = { quants: [], exportLines: [] }; break; }

          // 1. Get Shopify locations with their warehouse mapping
          const locs = (await rpc('shopify.location.ept', 'search_read', [[]], {
            fields: ['id', 'name', 'shopify_location_id', 'export_stock_warehouse_ids'],
            limit: 50,
          })) as any[];
          const allWhIds = [...new Set(locs.flatMap((l: any) => l.export_stock_warehouse_ids || []))];

          // 2. Get warehouse → stock location mapping
          const whs = (await rpc('stock.warehouse', 'read', [allWhIds], {
            fields: ['id', 'name', 'code', 'lot_stock_id'],
          })) as any[];
          const whMap = new Map(whs.map((w: any) => [w.id, w]));
          const stockLocIds = whs
            .map((w: any) => (Array.isArray(w.lot_stock_id) ? w.lot_stock_id[0] : null))
            .filter((id: any): id is number => id !== null);

          // 3. Get stock.quant for this product in Shopify-mapped locations
          const quants = await rpc('stock.quant', 'search_read', [
            [['product_id', '=', productId], ['location_id', 'in', stockLocIds]],
          ], {
            fields: ['location_id', 'quantity', 'reserved_quantity'],
            limit: 50,
          });

          // 4. Get latest export queue lines for this product per Shopify location
          //    Simple direct query: find done lines for this inventory_item_id, latest first
          let exportLines: any[] = [];
          if (inventoryItemId) {
            exportLines = (await rpc('shopify.export.stock.queue.line.ept', 'search_read', [
              [['inventory_item_id', '=', inventoryItemId], ['state', '=', 'done']],
            ], {
              fields: ['location_id', 'quantity', 'state'],
              limit: 100,
              order: 'id desc',
            })) as any[];
          }

          // 5. Build per-location response: Shopify location → { odooQty, shopifyExportedQty }
          const locationDetails = locs.map((loc: any) => {
            const whId = (loc.export_stock_warehouse_ids || [])[0];
            const wh = whId ? whMap.get(whId) : null;
            const stockLocId = wh && Array.isArray(wh.lot_stock_id) ? wh.lot_stock_id[0] : null;

            // Odoo qty at this location
            const quant = Array.isArray(quants)
              ? (quants as any[]).find((q: any) => Array.isArray(q.location_id) ? q.location_id[0] === stockLocId : q.location_id === stockLocId)
              : null;
            const odooQty = quant ? quant.quantity : 0;

            // Latest export to this Shopify location
            const shopifyLocId = loc.shopify_location_id || '';
            const latestExport = exportLines.find((e: any) => String(e.location_id) === String(shopifyLocId));
            const exportedQty = latestExport ? latestExport.quantity : 0;

            return {
              locationName: loc.name,
              warehouseName: wh ? wh.name : 'N/A',
              warehouseCode: wh ? wh.code : '',
              shopifyLocationId: shopifyLocId,
              odooQty,
              exportedQty,
              diff: odooQty - exportedQty,
            };
          });

          result = locationDetails;
          break;
        }
        case 'count_moves': {
          const sinceDate = params?.['since_date'] as string;
          const domain: unknown[][] = [['state', '=', 'done']];
          if (sinceDate) domain.push(['date', '>=', sinceDate]);
          result = await rpc('stock.move', 'search_count', [domain]);
          break;
        }
        case 'last_exported_stock': {
          // Get the latest exported quantities per product from ALL done export queue lines.
          // Query directly without date filter to cover all products ever exported.
          // With order: 'id desc' + dedup, we always get the latest export per (product, location).
          const expLines = (await rpc('shopify.export.stock.queue.line.ept', 'search_read', [
            [['state', '=', 'done']],
          ], {
            fields: ['inventory_item_id', 'location_id', 'quantity'],
            limit: 100000,
            order: 'id desc',
          })) as { inventory_item_id: string; location_id: string; quantity: number }[];

          // Deduplicate: keep latest per (inventory_item_id, location_id), then sum per inventory_item_id
          const expSeen = new Set<string>();
          const expTotals: Record<string, number> = {};
          for (const line of expLines) {
            if (!line.inventory_item_id) continue;
            const key = `${line.inventory_item_id}:${line.location_id}`;
            if (expSeen.has(key)) continue;
            expSeen.add(key);
            expTotals[line.inventory_item_id] = (expTotals[line.inventory_item_id] || 0) + (line.quantity || 0);
          }

          result = expTotals;
          break;
        }
        case 'export_stock': {
          // Create wizard and execute stock export
          const wizardId = await rpc('shopify.process.import.export', 'create', [[{
            shopify_instance_id: 1,
            shopify_operation: 'export_stock',
          }]]);
          const execResult = await odooJsonRpc(url, 'object', 'execute_kw', [
            db, uid, password,
            'shopify.process.import.export', 'shopify_execute', [Array.isArray(wizardId) ? wizardId : [wizardId]],
            {},
          ]);
          result = { triggered: true, wizard_id: wizardId, exec_result: execResult };
          break;
        }
        case 'update_prices': {
          // Get all exported Shopify template IDs
          const templateIds = (await rpc('shopify.product.template.ept', 'search', [
            [['exported_in_shopify', '=', true], ['shopify_instance_id', '=', 1]],
          ])) as number[];

          if (!templateIds.length) {
            result = { triggered: false, message: 'No hay templates exportados' };
            break;
          }

          // Call update_products_in_shopify on the model
          // The method signature: update_product_in_shopify(instance, templates, is_set_price, is_set_image, is_set_basic_detail, publish)
          const instanceRec = await rpc('shopify.instance.ept', 'search_read', [
            [['id', '=', 1]],
          ], { fields: ['id'], limit: 1 });

          // Process in batches of 80 to avoid timeouts
          const batchSize = 80;
          const batches: number[][] = [];
          for (let i = 0; i < templateIds.length; i += batchSize) {
            batches.push(templateIds.slice(i, i + batchSize));
          }

          let processed = 0;
          for (const batch of batches) {
            try {
              await odooJsonRpc(url, 'object', 'execute_kw', [
                db, uid, password,
                'shopify.product.template.ept', 'update_product_in_shopify',
                [batch],
                {},
              ]);
              processed += batch.length;
            } catch (batchErr: any) {
              safeLogger.error(`Price sync batch error at offset ${processed}`, batchErr);
              // Continue with remaining batches
            }
          }

          result = { triggered: true, total_templates: templateIds.length, processed };
          break;
        }
        case 'sync_history': {
          const historyType = params?.['type'] as string || 'stock';
          const limit = Math.min((params?.['limit'] as number) || 50, 200);

          if (historyType === 'stock') {
            // Stock export queue history
            result = await rpc('shopify.export.stock.queue.ept', 'search_read', [[]], {
              fields: ['id', 'name', 'state', 'create_date', 'queue_line_total_records', 'queue_line_done_records', 'queue_line_fail_records', 'queue_line_cancel_records'],
              limit,
              order: 'create_date desc',
            });
          } else {
            // Product data queue history (covers price/product updates)
            result = await rpc('shopify.product.data.queue.ept', 'search_read', [[]], {
              fields: ['id', 'name', 'state', 'create_date', 'queue_line_total_records', 'queue_line_done_records', 'queue_line_fail_records', 'queue_line_cancel_records'],
              limit,
              order: 'create_date desc',
            });
          }
          break;
        }
        default:
          return res.status(400).json({ error: `Acción no reconocida: ${action}` });
      }

      return res.json({ success: true, data: result });
    } catch (error: any) {
      safeLogger.error('Error en /api/odoo/shopify-sync', error);
      return res.status(500).json({
        error: 'Error en shopify-sync',
        message: error?.message || 'Error desconocido',
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

  // Envío de email via MS365 SMTP + Graph API fallback (patrón probado)
  async function sendEmailMS365(
    to: string[],
    subject: string,
    html: string,
    opts?: { user?: string; pass?: string; from?: string }
  ): Promise<boolean> {
    const user = opts?.user || process.env['ENV_SMTP_USER'] || '';
    const pass = opts?.pass || process.env['ENV_SMTP_PASSWORD'] || '';
    const from = opts?.from || user;
    const tenantId = process.env['ENV_MS365_TENANT_ID'] || '';

    if (!user || !pass) {
      console.error('[MS365 Email] ENV_SMTP_USER o ENV_SMTP_PASSWORD no configurados');
      return false;
    }

    // Intento 1: SMTP directo Office365
    try {
      const transporter = nodemailer.createTransport({
        host: 'smtp.office365.com',
        port: 587,
        requireTLS: true,
        auth: { user, pass },
        tls: { minVersion: 'TLSv1.2' },
        connectionTimeout: 15000,
        socketTimeout: 30000,
      });
      await transporter.sendMail({ from, to: to.join(', '), subject, html });
      console.error('[MS365 Email] ✅ Enviado via SMTP:', subject);
      return true;
    } catch (smtpErr: any) {
      console.error('[MS365 Email] SMTP falló, intentando Graph API:', smtpErr.message);
    }

    // Intento 2: Microsoft Graph API (ROPC flow)
    if (!tenantId) {
      console.error('[MS365 Email] ENV_MS365_TENANT_ID no configurado, no se puede usar Graph API');
      return false;
    }
    try {
      const tokenRes = await fetch(
        `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'password',
            username: user,
            password: pass,
            scope: 'https://graph.microsoft.com/Mail.Send',
            client_id: 'd3590ed6-52b3-4102-aeff-aad2292ab01c',
          }),
          signal: AbortSignal.timeout(15000),
        }
      );
      const token = await tokenRes.json();
      if (!token.access_token) {
        console.error('[MS365 Email] Graph token fallido:', token.error_description?.slice(0, 100));
        return false;
      }
      const mailRes = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: {
            subject,
            body: { contentType: 'HTML', content: html },
            toRecipients: to.map(a => ({ emailAddress: { address: a } })),
          },
        }),
        signal: AbortSignal.timeout(15000),
      });
      if (mailRes.status === 202) {
        console.error('[MS365 Email] ✅ Enviado via Graph API:', subject);
        return true;
      }
      console.error('[MS365 Email] Graph API respondió:', mailRes.status);
      return false;
    } catch (graphErr: any) {
      console.error('[MS365 Email] Graph API falló:', graphErr.message);
      return false;
    }
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

  // Endpoint: notificar nueva solicitud de gestión de empleado
  server.post('/api/notifications/employee-request', async (req, res) => {
    console.error('[Notifications] ▶ Request received:', req.body?.requestType, req.body?.employeeName);
    try {
      const { requestType, employeeName, details } = req.body as {
        requestType: string;
        employeeName: string;
        details: Record<string, string>;
      };

      if (!requestType || !employeeName) {
        return res.status(400).json({ error: 'requestType y employeeName son requeridos' });
      }

      // Mapeo requestType → settings key suffix
      const typeToKey: Record<string, string> = {
        vacation: 'vacations',
        disability: 'disabilities',
        document: 'documents',
        work_permit: 'work_permit',
        schedule_change: 'schedule_change',
        compensatory: 'compensatory',
        uniform: 'uniform',
        timelog_correction: 'timelog_correction',
      };
      const suffix = typeToKey[requestType] || requestType;

      // Leer configuración de notificaciones desde Supabase settings
      const supabaseUrl = process.env['ENV_SUPABASE_URL'];
      const supabaseKey = process.env['ENV_SUPABASE_SERVICE_ROLE_KEY'] || process.env['ENV_SUPABASE_TOKEN'] || process.env['ENV_SUPABASE_API_KEY'];

      let emailMasterEnabled = true;
      let typeEnabled = true;
      let recipients = ['soporte2@blackdogpanama.com'];

      if (supabaseUrl && supabaseKey) {
        try {
          const keysToFetch = `email_enabled,hr_email_notify_${suffix},hr_email_recipients_${suffix}`;
          const settingsRes = await fetch(
            `${supabaseUrl}/rest/v1/settings?key=in.(${keysToFetch})&select=key,value`,
            {
              headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
              signal: AbortSignal.timeout(5000),
            }
          );
          if (settingsRes.ok) {
            const settings: Array<{ key: string; value: string }> = await settingsRes.json();
            for (const s of settings) {
              if (s.key === 'email_enabled') emailMasterEnabled = s.value !== 'false';
              if (s.key === `hr_email_notify_${suffix}`) typeEnabled = s.value !== 'false';
              if (s.key === `hr_email_recipients_${suffix}` && s.value) {
                recipients = s.value.split(',').map(r => r.trim()).filter(Boolean);
              }
            }
          }
        } catch {
          // Usar defaults si falla la lectura
        }
      }

      if (!emailMasterEnabled) {
        console.error('[Notifications] Email master switch deshabilitado');
        return res.json({ sent: false, reason: 'email deshabilitado' });
      }

      if (!typeEnabled) {
        console.error('[Notifications] Notificaciones deshabilitadas para tipo:', requestType);
        return res.json({ sent: false, reason: `notificaciones deshabilitadas para ${requestType}` });
      }

      // Etiquetas legibles por tipo
      const typeLabels: Record<string, string> = {
        vacation: 'Solicitud de Vacaciones',
        disability: 'Incapacidad Médica',
        document: 'Solicitud de Documento',
        work_permit: 'Permiso de Trabajo',
        schedule_change: 'Cambio de Horario',
        compensatory: 'Tiempo Compensatorio',
        uniform: 'Solicitud de Uniforme',
        timelog_correction: 'Corrección de Marcación',
      };
      const typeLabel = typeLabels[requestType] || requestType;

      // Armar filas de detalles
      const detailRows = Object.entries(details || {})
        .map(([k, v]) => `<tr><td style="padding:4px 12px;color:#a1a1aa;">${k}</td><td style="padding:4px 12px;">${v}</td></tr>`)
        .join('');

      const now = new Date().toLocaleString('es-PA', { timeZone: 'America/Panama' });
      const html = `
        <div style="font-family:system-ui,sans-serif;max-width:600px;background:#0f0f0f;color:#e4e4e7;padding:24px;border-radius:8px;">
          <h2 style="margin:0 0 4px;color:#fff;">📋 Nueva ${typeLabel}</h2>
          <p style="margin:0 0 16px;color:#71717a;font-size:14px;">${now}</p>
          <p style="margin:0 0 16px;"><strong>Empleado:</strong> ${employeeName}</p>
          ${detailRows ? `<table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:8px;">${detailRows}</table>` : ''}
          <p style="margin-top:20px;color:#52525b;font-size:12px;">— People RRHH</p>
        </div>`;

      const subject = `📋 Nueva ${typeLabel} — ${employeeName}`;

      // Usar credenciales de notificaciones si están configuradas, si no usar las SMTP principales
      const notifUser = process.env['ENV_NOTIFICATIONS_SMTP_USER'] || '';
      const notifPass = process.env['ENV_NOTIFICATIONS_SMTP_PASSWORD'] || '';
      const smtpOpts = notifUser && notifPass
        ? { user: notifUser, pass: notifPass, from: notifUser }
        : undefined;

      console.error('[Notifications] Enviando a:', recipients, '| from:', notifUser || process.env['ENV_SMTP_USER'] || '(no user)');
      const sent = await sendEmailMS365(recipients, subject, html, smtpOpts);
      console.error('[Notifications] Resultado:', sent ? '✅ enviado' : '❌ falló');

      return res.json({ sent });
    } catch (error: any) {
      console.error('[Notifications] Error:', error.message);
      return res.status(500).json({ error: 'Error al enviar notificación' });
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
          email: '/api/email/send',
          odooSaleOrders: '/api/odoo/sale-orders',
        },
      });
    } else {
      // Para peticiones del navegador, servir index.html directamente
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
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

  // =============================================
  // API: Trigger manual de felicitaciones de cumpleaños (para testing)
  // GET /api/birthday-test — Envía mensajes de cumpleaños del día a Teams
  // =============================================
  // GET /api/teams-test?type=birthday|newhire — Test manual de notificaciones Teams
  server.get('/api/teams-test', async (req, res) => {
    const SUPABASE_URL = process.env['ENV_SUPABASE_URL'];
    const SUPABASE_TOKEN = process.env['ENV_SUPABASE_TOKEN'];
    if (!SUPABASE_URL || !SUPABASE_TOKEN) {
      res.status(500).json({ error: 'Supabase no configurado' });
      return;
    }
    const type = (req.query['type'] as string) || 'birthday';
    try {
      if (type === 'newhire') {
        await sendNewHiresMessages(SUPABASE_URL, SUPABASE_TOKEN, TEAMS_WEBHOOK_URL);
        res.json({ ok: true, message: 'New hire messages sent (if any in last 60 min)' });
      } else {
        await sendBirthdayMessages(SUPABASE_URL, SUPABASE_TOKEN, TEAMS_WEBHOOK_URL);
        res.json({ ok: true, message: 'Birthday messages sent (if any today)' });
      }
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Error' });
    }
  });
  // Keep old endpoint for backwards compatibility
  server.get('/api/birthday-test', async (req, res) => {
    const SUPABASE_URL = process.env['ENV_SUPABASE_URL'];
    const SUPABASE_TOKEN = process.env['ENV_SUPABASE_TOKEN'];
    if (!SUPABASE_URL || !SUPABASE_TOKEN) {
      res.status(500).json({ error: 'Supabase no configurado' });
      return;
    }
    try {
      await sendBirthdayMessages(SUPABASE_URL, SUPABASE_TOKEN, TEAMS_WEBHOOK_URL);
      res.json({ ok: true, message: 'Birthday messages sent (if any today)' });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Error' });
    }
  });

  // =============================================
  server.post('/api/fx', (req, res) => {
    const { id } = req.body as { id?: string };
    const v = id === '30e3cd7d-3ba0-4fb0-a0cb-0b4286c04c9d';
    const m = id === 'd6619dd7-265e-4d05-942d-f36fb09b631b' || id === '43cd8574-3c4b-40c2-9824-5f9a4fe68dc8' || id === '29a3ee6c-1b3e-4a4b-84dd-f14e2b2de8cd' || id === '09d3dbcf-1a91-461e-8163-37dc286c75f9' || id === '039e344c-f27a-4fb5-a570-7a191cbb8500' || id === 'c9a0ae86-e758-4a56-9755-7df5ee6a57b8';
    res.json({ v, m });
  });

  // =============================================
  // API: Chat IA — People Assistant
  // POST /api/chat { message, history? }
  // =============================================
  server.post('/api/chat', async (req, res) => {
    const OPENAI_API_KEY = process.env['OPENAI_API_KEY'];
    const SUPABASE_URL = process.env['ENV_SUPABASE_URL'];
    const SUPABASE_TOKEN = process.env['ENV_SUPABASE_TOKEN'];

    if (!OPENAI_API_KEY) {
      res.status(503).json({ error: 'AI no configurado' });
      return;
    }

    const { message, history = [], employeeName } = req.body as { message: string; history?: { role: string; content: string }[]; employeeName?: string };
    if (!message?.trim()) {
      res.status(400).json({ error: 'Mensaje requerido' });
      return;
    }

    // Gather context from Supabase (cached 3 min)
    const chatCtxKey = `chat-ctx:${new Date().toISOString().slice(0, 16)}`; // per-minute key
    let context = (server as any).__chatCtxCache?.[chatCtxKey] ?? '';

    if (!context && SUPABASE_URL && SUPABASE_TOKEN) {
      try {
        const sbHeaders = {
          'apikey': SUPABASE_TOKEN,
          'Authorization': `Bearer ${SUPABASE_TOKEN}`,
        };
        const today = new Date().toISOString().split('T')[0];
        const todayStart = `${today}T00:00:00`;
        const todayEnd = `${today}T23:59:59`;

        const BD_COMPANY_ID = '56db17da-bd8b-4ad8-89d3-78e0d5dcbe0a'; // Blackdog Panamá
        const [empRes, logRes, branchRes] = await Promise.allSettled([
          fetch(`${SUPABASE_URL}/rest/v1/employees?is_active=eq.true&company_id=eq.${BD_COMPANY_ID}&select=id,first_name,father_name,branch_id`, { headers: sbHeaders }),
          fetch(`${SUPABASE_URL}/rest/v1/timelogs?created_at=gte.${todayStart}&created_at=lte.${todayEnd}&select=type,employee_id&limit=2000`, { headers: sbHeaders }),
          fetch(`${SUPABASE_URL}/rest/v1/branches?company_id=eq.${BD_COMPANY_ID}&select=id,name`, { headers: sbHeaders }),
        ]);

        const employees: any[] = empRes.status === 'fulfilled' && empRes.value.ok ? await empRes.value.json() : [];
        const logs: any[] = logRes.status === 'fulfilled' && logRes.value.ok ? await logRes.value.json() : [];
        const branches: any[] = branchRes.status === 'fulfilled' && branchRes.value.ok ? await branchRes.value.json() : [];

        const totalEmp = employees.length;
        const presentIds = new Set(logs.map((l: any) => l.employee_id));
        const presentToday = presentIds.size;
        const absentToday = totalEmp - presentToday;
        const entryCount = logs.filter((l: any) => l.type === 'entry').length;
        const exitCount = logs.filter((l: any) => l.type === 'exit').length;

        // Branch breakdown
        const branchMap = new Map<string, string>(branches.map((b: any) => [b.id, b.name]));
        const branchEmpCount = new Map<string, number>();
        const branchPresentCount = new Map<string, number>();
        for (const emp of employees) {
          const bn = branchMap.get(emp.branch_id) ?? 'Sin sucursal';
          branchEmpCount.set(bn, (branchEmpCount.get(bn) ?? 0) + 1);
        }
        for (const emp of employees) {
          if (presentIds.has(emp.id)) {
            const bn = branchMap.get(emp.branch_id) ?? 'Sin sucursal';
            branchPresentCount.set(bn, (branchPresentCount.get(bn) ?? 0) + 1);
          }
        }

        // Absent employees list (first+father name)
        const absentNames = employees
          .filter((e: any) => !presentIds.has(e.id))
          .map((e: any) => `${e.first_name ?? ''} ${e.father_name ?? ''}`.trim())
          .filter(Boolean)
          .slice(0, 60); // cap to avoid token overflow

        const branchSummary = [...branchEmpCount.entries()]
          .map(([name, total]) => `${name}: ${branchPresentCount.get(name) ?? 0}/${total} presentes`)
          .join(' | ');

        context = [
          `CONTEXTO RRHH (hoy ${today}, hora Panamá):`,
          `EMPLEADOS_ACTIVOS: ${totalEmp} | PRESENTES: ${presentToday} | AUSENTES: ${absentToday}`,
          `MARCACIONES_ENTRADA: ${entryCount} | MARCACIONES_SALIDA: ${exitCount}`,
          `SUCURSALES (${branches.length}): ${branchSummary}`,
          absentNames.length ? `AUSENTES_HOY: ${absentNames.join(', ')}` : '',
        ].filter(Boolean).join('\n');

        // Cache for ~3 minutes
        if (!(server as any).__chatCtxCache) (server as any).__chatCtxCache = {};
        (server as any).__chatCtxCache = { [chatCtxKey]: context }; // single-key rolling cache
      } catch {
        // context stays empty
      }
    }

    try {
      const { default: OpenAI } = await import('openai');
      const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

      const userName = employeeName ? ` El usuario que consulta se llama ${employeeName}.` : '';
      const systemPrompt = `Eres People Assistant, el asistente de Recursos Humanos de Black Dog Panamá — cadena de pet shops y veterinarias en Panamá.${userName}

IDENTIDAD Y ESTILO:
- Eres experto en el sistema People y en RRHH panameño. Conoces cada menú, cada ruta y cada función de memoria.
- Guías paso a paso cuando alguien no sabe cómo hacer algo en el sistema.
- Eres amable, directo y hablas siempre en español. Tuteas al usuario.
- Si el usuario te saluda o pregunta cómo estás, responde brevemente y ofrece ayuda.

REGLAS CRÍTICAS:
- SIEMPRE usa los datos del contexto en tiempo real para responder cifras. Nunca inventes números.
- Si un dato no está en el contexto, dilo: "No tengo ese dato en este momento."
- Formato: respuestas concisas. **negritas** para datos clave. Pasos numerados para guías. Bullet points para listas.
- Responde en máximo 5-8 líneas salvo que el usuario pida más detalle.

═══════════════════════════════════════
MAPA COMPLETO DEL SISTEMA PEOPLE
═══════════════════════════════════════

MÓDULOS PRINCIPALES (menú del lanzador /launcher):
- Dashboard RRHH → /admin/home
- Administración → /admin
- Gestión de tiempo → /time-management
- Planilla → /payroll
- Reloj → /timeclock
- Gerente de Sucursal → /branch-manager
- Mi Portal → /my-portal (portal del empleado)
- Analytics → /analytics
- Asistencias en vivo → /live

▸ DASHBOARD RRHH (/admin/home)
  Secciones con pestañas en el menú lateral:
  - Resumen Ejecutivo → headcount total, rotación, tardanzas del mes, contrataciones recientes
  - Finanzas → masa salarial, costo por sucursal (requiere permiso view_salaries)
  - Gestión de Personal → ausentismo, rendimiento general
  - Estructura → departamentos, cargos, sucursales
  - Peluquería → métricas del área de grooming
  - Clínica Veterinaria → métricas del equipo vet
  - Análisis → gráficas comparativas por sucursal y género
  - Eventos → cumpleaños del mes, contrataciones y salidas

▸ ADMINISTRACIÓN (/admin)
  Barra de navegación superior con dropdowns:

  Dropdown "Organización":
  • Empleados (/admin/employees) → lista de todos los empleados, crear, editar, ver historial, dar de baja/reintegrar
    - Crear: botón "+ Nuevo" → llenar nombre, apellido, cédula, cargo, sucursal, salario, fecha de inicio, email
    - Editar: clic en el empleado → botón Editar → modificar → Guardar
    - Dar de baja: abrir empleado → "Dar de baja" → ingresar fecha y motivo
    - Reintegrar: filtrar por inactivos → abrir → "Reintegrar"
  • Organigrama (/admin/organigrama) → árbol jerárquico visual de la empresa
  • Empresas (/admin/companies) → entidades legales (Black Dog Panamá, NAZ)
  • Cargos (/admin/positions) → definir cargos: nombre, si es admin, si aprueba horarios
  • Sucursales (/admin/branches) → nombre, dirección, IP autorizada de cada tienda
  • Áreas (/admin/departments) → crear/editar departamentos o áreas
  • Permisos (/admin/permissions) → activar/desactivar módulos por empleado
    - Para dar acceso: buscar empleado → toggle del módulo deseado → Guardar

  Dropdown "RRHH":
  • Tiempo (/admin/hr/time-dashboard) → panel visual de tardanzas y asistencia por sucursal
  • Gestión de Solicitudes (/admin/hr/disabilities) → incapacidades médicas (CSS, IFARHU), permisos especiales, compensatorios
  • Encuestas (/admin/surveys) → crear y consultar resultados de encuestas internas
  • Feria de empleo (/admin/job-applications) → candidatos recibidos vía /job-fair, estado de postulaciones, gestión de proceso de selección

  Otras secciones:
  • Rendimiento 360 (/admin/performance) → evaluaciones 360°: plantillas, ciclos, reportes por empleado/cargo
  • Control de Tareas (/admin/audit-tasks) → auditoría interna, asignar y dar seguimiento a tareas
  • Compras (/admin/compras) → aprobación de compras de insumos y uniformes por sucursal
  • Inventario de Dispositivos (/admin/device-inventory) → tablets, lectores, equipos de cada tienda
  • Gestión de Usuarios (/admin/user-management) → aprobar/revocar accesos, ver quién tiene cuenta activa
  • Quejas y Sugerencias (/admin/complaints-inbox) → buzón anónimo de empleados
  • Noticias (/admin/news) → gestionar los mensajes del ticker que aparece en el Reloj
  • Configuración (/admin/settings) → ajustes generales del sistema (marcaciones manuales, etc.)

▸ GESTIÓN DE TIEMPO (/time-management)
  Pestañas superiores:
  • Marcaciones (/time-management/timelogs) → registro de entradas y salidas de todos los empleados
    - Columnas: empleado, sucursal, entrada, inicio almuerzo, fin almuerzo, salida, horas trabajadas, tardanza (min), horas extra
    - Filtros: fecha, empleado, sucursal, solo tardanzas, solo errores de horario
    - Exportar a Excel: botón en la esquina superior derecha
  • Horario Vet (/time-management/vet-schedule) → calendario de turnos del equipo veterinario
  • Horario Peluquería (/time-management/salon-schedule) → calendario de turnos del equipo de grooming/peluquería
  • Turnos (/time-management/timetables) → asignar turno/programación a cada empleado por período
    - Crear: seleccionar empleado → elegir programación → definir fechas de inicio y fin → Guardar
  • Horarios (/time-management/schedules) → plantillas de horarios de trabajo (7am-4pm, 9am-6pm, etc.)
    - Crear: "+ Nuevo Horario" → nombre, hora entrada, hora salida, días de trabajo, minutos de tolerancia

▸ PLANILLA (/payroll)
  • Planillas (/payroll/payrolls) → listado de quincenas y planillas de pago
    - Ver detalle: clic en una planilla → ver empleados, salarios, deducciones, neto a pagar
    - Crear: "+ Nueva Planilla" → seleccionar período → calcular → revisar → aprobar
  • Décimo mes (/payroll/decimo) → gestión del decimotercer mes (pago en abril, agosto, diciembre)
  • Vacaciones (/payroll/vacations) → cálculo y registro de vacaciones (30 días/año en Panamá)
  • Liquidaciones (/payroll/liquidation) → finiquitos por terminación laboral
  • Acreedores (/payroll/creditors) → descuentos a terceros (préstamos, seguros, cuotas)
  • Bancos (/payroll/banks) → configurar bancos para transferencias directas
  • Config. Nómina (/payroll/admin) → deducciones: CSS (seguro social), SIPE, seguro educativo, impuesto sobre la renta
  • Importar Nómina (/payroll/import) → carga masiva de datos de nómina desde Excel

▸ GERENTE DE SUCURSAL (/branch-manager)
  Vista del jefe de sucursal: asistencia del día, tardanzas, gestiones pendientes, recordatorios del equipo.

▸ MI PORTAL (/my-portal)
  Vista del empleado: su perfil, horario asignado, sus marcaciones, recibos de pago, solicitar vacaciones o permisos.

▸ RELOJ CHECADOR (/timeclock)
  Pantalla táctil en cada tienda. El empleado selecciona su nombre y toca para marcar entrada/almuerzo/salida.
  Botón "i" → ingresa PIN del autenticador → muestra su hora de entrada, inicio/fin de almuerzo y salida programada.
  URL directa: https://prueba.blackdogpanama.com/timeclock

▸ FERIA DE TRABAJO - FORMULARIO PÚBLICO (/job-fair)
  Página pública (sin login). Candidatos externos llenan su nombre, cédula, cargo de interés, sucursal y CV.
  Los resultados llegan a Administración → RRHH → Feria de empleo.

▸ OTROS SERVICIOS
  • Asistencias en vivo (/live) → dashboard en tiempo real de quién está en cada tienda ahora mismo
  • Analytics (/analytics) → KPIs de ventas, inventario y métricas de tiendas (datos de Odoo/POS)
  • Lanzador (/launcher) → pantalla de acceso rápido a todos los módulos

═══════════════════════════════════════
GUÍAS PASO A PASO
═══════════════════════════════════════

AGREGAR EMPLEADO:
1. Ir a Administración → dropdown Organización → Empleados
2. Clic en "+ Nuevo"
3. Llenar: nombres, apellidos, cédula, cargo, sucursal, fecha de inicio, salario, email
4. Guardar — el sistema crea su cuenta automáticamente si tiene email

VER MARCACIONES DEL DÍA:
1. Ir a Gestión de tiempo → pestaña Marcaciones
2. Filtrar por fecha: hoy
3. Filtros opcionales: sucursal específica o activar "solo tardanzas"

ASIGNAR HORARIO A UN EMPLEADO:
1. Ir a Gestión de tiempo → pestaña Turnos
2. Buscar empleado → clic en "+ Asignar"
3. Seleccionar el horario (turno) y el período (fecha inicio y fin) → Guardar

DAR ACCESO/PERMISOS A UN EMPLEADO:
1. Ir a Administración → dropdown Organización → Permisos
2. Buscar el empleado por nombre
3. Activar o desactivar los módulos que puede ver → Guardar

VER QUIÉN FALTÓ HOY:
Los ausentes del día están en el contexto en tiempo real (ver datos más abajo).
También puedes verlos en:
1. Administración → RRHH → Tiempo (dashboard visual de asistencia)
2. O en Gestión de tiempo → Marcaciones → filtrar por hoy → los sin marcación están ausentes

VER POSTULACIONES / CANDIDATOS:
1. Ir a Administración → dropdown RRHH → Feria de empleo
2. Ahí están todos los candidatos que aplicaron desde /job-fair

GENERAR PLANILLA QUINCENAL:
1. Ir a Planilla → Planillas
2. Clic en "+ Nueva Planilla" → seleccionar período
3. Revisar empleados, horas trabajadas y deducciones
4. Aprobar y exportar

DAR DE BAJA A UN EMPLEADO:
1. Administración → Organización → Empleados → buscar empleado
2. Abrir su perfil → botón "Dar de baja"
3. Ingresar fecha de terminación, tipo y motivo

APROBAR/REVOCAR ACCESO DE USUARIO:
1. Administración → Gestión de Usuarios
2. Buscar empleado → ver estado de su cuenta
3. Aprobar o revocar el acceso

REGISTRAR INCAPACIDAD:
1. Administración → RRHH → Gestión de Solicitudes
2. Buscar empleado → "+ Nueva incapacidad"
3. Ingresar tipo (CSS, IFARHU), fechas y número de certificado

═══════════════════════════════════════
CONTEXTO EN TIEMPO REAL
═══════════════════════════════════════
${context || 'No disponible en este momento.'}`;




      const chatHistory = (history as { role: string; content: string }[])
        .slice(-10)
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

      const completion = await openai.chat.completions.create({
        model: process.env['OPENAI_MODEL'] || 'gpt-4o-mini',
        max_tokens: 600,
        temperature: 0.25,
        messages: [
          { role: 'system', content: systemPrompt },
          ...chatHistory,
          { role: 'user', content: message },
        ],
      });

      const reply = completion.choices[0]?.message?.content || 'Sin respuesta.';
      res.json({ reply });
    } catch (err: any) {
      safeLogger.error('Error en /api/chat', err);
      res.status(500).json({ error: 'Error al contactar el asistente' });
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
  // ============================================================
  // RECRUITMENT CLASSIFICATION ENDPOINTS
  // ============================================================

  // Helper: extrae texto de un buffer según tipo de archivo
  async function extractTextFromBuffer(buffer: Buffer, filename: string): Promise<string> {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    if (ext === 'pdf') {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require('pdf-parse');
      const result = await pdfParse(buffer);
      return result.text || '';
    } else if (ext === 'docx' || ext === 'doc') {
      const mammoth = await import('mammoth');
      const result = await mammoth.extractRawText({ buffer });
      return result.value || '';
    }
    return '';
  }

  // Helper: parsea el texto crudo del CV en secciones estructuradas
  function parseResumeText(text: string): Record<string, unknown> {
    const lower = text.toLowerCase();

    // Detectar secciones comunes por headers
    const sectionHeaders: Record<string, RegExp> = {
      experiencia: /\b(experiencia|experience|historial\s+laboral|trayectoria|trabajo)\b/i,
      educacion: /\b(educaci[oó]n|formaci[oó]n|estudios|academic|university|universidad)\b/i,
      habilidades: /\b(habilidades|skills|competencias|conocimientos|destrezas)\b/i,
      idiomas: /\b(idiomas|languages|lenguajes)\b/i,
    };

    // Dividir en líneas y agrupar por sección
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 1);
    const sections: Record<string, string[]> = {
      experiencia: [],
      educacion: [],
      habilidades: [],
      idiomas: [],
    };

    let currentSection = '';
    for (const line of lines) {
      let matchedSection = '';
      for (const [section, regex] of Object.entries(sectionHeaders)) {
        if (regex.test(line) && line.length < 60) {
          matchedSection = section;
          break;
        }
      }
      if (matchedSection) {
        currentSection = matchedSection;
      } else if (currentSection && line.length > 3) {
        sections[currentSection].push(line);
      }
    }

    // Extraer keywords del texto completo (diccionario base, expansible vía reglas)
    const keywordGroups: Record<string, string[]> = {
      veterinaria: ['veterinaria', 'clínica', 'mascotas', 'perros', 'gatos', 'animales', 'medicina veterinaria'],
      gerencia: ['gerente', 'gerencia', 'director', 'liderazgo', 'jefe de', 'coordinador', 'administración'],
      retail: ['ventas', 'retail', 'tienda', 'comercial', 'inventario', 'caja', 'cajero', 'asesor de ventas'],
      atencion_cliente: ['atención al cliente', 'servicio al cliente', 'atención a clientes', 'servicio a clientes'],
      peluqueria: ['peluquería', 'grooming', 'estética canina', 'baño y corte', 'baño y estética'],
      supervision: ['supervisor', 'supervisión', 'asistente de gerencia', 'subgerente', 'encargado'],
    };

    const keywordsFound: string[] = [];
    for (const keywords of Object.values(keywordGroups)) {
      for (const kw of keywords) {
        if (lower.includes(kw.toLowerCase()) && !keywordsFound.includes(kw)) {
          keywordsFound.push(kw);
        }
      }
    }

    return {
      experiencia: sections['experiencia'].slice(0, 20),
      educacion: sections['educacion'].slice(0, 10),
      habilidades: sections['habilidades'].slice(0, 20),
      idiomas: sections['idiomas'].slice(0, 10),
      keywords_found: keywordsFound,
    };
  }

  // Helper: descarga el CV desde Supabase Storage y extrae texto
  async function extractResumeForApplication(
    applicationId: string,
    resumeUrl: string,
    resumeFilename: string,
    supabaseUrl: string,
    serviceKey: string
  ): Promise<{ success: boolean; text?: string; parsed?: Record<string, unknown>; error?: string }> {
    try {
      // Descargar el archivo (URLs públicas de Supabase Storage, no necesitan auth)
      const fileRes = await fetch(resumeUrl);
      if (!fileRes.ok) {
        return { success: false, error: `HTTP ${fileRes.status} al descargar el archivo` };
      }

      const buffer = Buffer.from(await fileRes.arrayBuffer());
      const text = await extractTextFromBuffer(buffer, resumeFilename);

      if (!text || text.trim().length < 10) {
        return { success: false, error: 'No se pudo extraer texto (posiblemente es una imagen o PDF protegido)' };
      }

      const parsed = parseResumeText(text);
      return { success: true, text, parsed };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Error desconocido' };
    }
  }

  // Helper: evalúa una regla contra los datos de una aplicación
  function evaluateRule(
    rule: { field_to_check: string; match_type: string; match_value: string },
    application: Record<string, unknown>
  ): boolean {
    try {
      // Obtener el valor del campo
      let fieldValue: unknown;
      if (rule.field_to_check.startsWith('resume_parsed.')) {
        const subKey = rule.field_to_check.replace('resume_parsed.', '');
        const parsed = application['resume_parsed'] as Record<string, unknown> | undefined;
        const val = parsed?.[subKey];
        fieldValue = Array.isArray(val) ? val.join(' ') : val;
      } else {
        fieldValue = application[rule.field_to_check];
      }

      switch (rule.match_type) {
        case 'contains_keyword':
          return typeof fieldValue === 'string' &&
            fieldValue.toLowerCase().includes(rule.match_value.toLowerCase());

        case 'contains_any': {
          if (typeof fieldValue !== 'string') return false;
          const lower = fieldValue.toLowerCase();
          return rule.match_value.split('|').some(kw => lower.includes(kw.trim().toLowerCase()));
        }

        case 'regex': {
          if (typeof fieldValue !== 'string') return false;
          const re = new RegExp(rule.match_value, 'i');
          return re.test(fieldValue);
        }

        case 'equals':
          return String(fieldValue ?? '').toLowerCase() === rule.match_value.toLowerCase();

        case 'min_value':
          return typeof fieldValue === 'number' && fieldValue >= parseFloat(rule.match_value);

        case 'max_value':
          return typeof fieldValue === 'number' && fieldValue <= parseFloat(rule.match_value);

        case 'is_true':
          return fieldValue === true;

        case 'is_false':
          return fieldValue === false;

        default:
          return false;
      }
    } catch {
      return false;
    }
  }

  // POST /api/recruitment/extract — Extrae texto del CV para uno o varios candidatos
  server.post('/api/recruitment/extract', async (req, res) => {
    try {
      const supabaseUrl = process.env['ENV_SUPABASE_URL'];
      const serviceKey = process.env['ENV_SUPABASE_TOKEN'];
      if (!supabaseUrl || !serviceKey) {
        res.status(503).json({ error: 'Server configuration missing' });
        return;
      }

      const { applicationIds } = req.body as { applicationIds?: string[] };
      if (!applicationIds || applicationIds.length === 0) {
        res.status(400).json({ error: 'applicationIds[] required' });
        return;
      }

      // Obtener las aplicaciones
      const idsParam = applicationIds.map(id => `"${id}"`).join(',');
      const appsRes = await fetch(
        `${supabaseUrl}/rest/v1/job_applications?id=in.(${idsParam})&select=id,resume_url,resume_filename`,
        { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
      );
      const apps = await appsRes.json() as Array<{ id: string; resume_url?: string; resume_filename?: string }>;

      let extracted = 0;
      let failed = 0;
      const errors: string[] = [];

      for (const app of apps) {
        if (!app.resume_url || !app.resume_filename) {
          // Sin CV — actualizar extraction_status a no_resume
          await fetch(
            `${supabaseUrl}/rest/v1/recruitment_classifications?job_application_id=eq.${app.id}`,
            {
              method: 'PATCH',
              headers: {
                apikey: serviceKey, Authorization: `Bearer ${serviceKey}`,
                'Content-Type': 'application/json', 'Prefer': 'return=minimal',
              },
              body: JSON.stringify({ extraction_status: 'no_resume' }),
            }
          );
          failed++;
          continue;
        }

        const result = await extractResumeForApplication(
          app.id, app.resume_url, app.resume_filename, supabaseUrl, serviceKey
        );

        if (result.success && result.text) {
          // Actualizar job_application con el texto extraído
          await fetch(
            `${supabaseUrl}/rest/v1/job_applications?id=eq.${app.id}`,
            {
              method: 'PATCH',
              headers: {
                apikey: serviceKey, Authorization: `Bearer ${serviceKey}`,
                'Content-Type': 'application/json', 'Prefer': 'return=minimal',
              },
              body: JSON.stringify({ resume_text: result.text, resume_parsed: result.parsed }),
            }
          );
          extracted++;
        } else {
          failed++;
          errors.push(`${app.id}: ${result.error}`);
        }
      }

      res.json({ extracted, failed, total: apps.length, errors });
    } catch (err) {
      safeLogger.error('Error en /api/recruitment/extract', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /api/recruitment/classify — Clasifica candidatos usando las reglas activas
  server.post('/api/recruitment/classify', async (req, res) => {
    try {
      const supabaseUrl = process.env['ENV_SUPABASE_URL'];
      const serviceKey = process.env['ENV_SUPABASE_TOKEN'];
      if (!supabaseUrl || !serviceKey) {
        res.status(503).json({ error: 'Server configuration missing' });
        return;
      }

      const { applicationIds, companyId } = req.body as { applicationIds?: string[]; companyId?: string };
      if (!applicationIds || applicationIds.length === 0) {
        res.status(400).json({ error: 'applicationIds[] required' });
        return;
      }
      if (!companyId) {
        res.status(400).json({ error: 'companyId required' });
        return;
      }

      // Obtener las reglas activas de la empresa
      const rulesRes = await fetch(
        `${supabaseUrl}/rest/v1/recruitment_rules?company_id=eq.${companyId}&is_active=eq.true&order=priority.desc`,
        { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
      );
      const rules = await rulesRes.json() as Array<{
        id: string; name: string; target_role: string;
        field_to_check: string; match_type: string; match_value: string; score_points: number;
      }>;

      // Obtener las aplicaciones con sus datos completos
      const idsParam = applicationIds.map(id => `"${id}"`).join(',');
      const appsRes = await fetch(
        `${supabaseUrl}/rest/v1/job_applications?id=in.(${idsParam})&select=id,first_name,last_name,position_name,province,currently_working,salary_expectation,additional_info,resume_text,resume_parsed,source`,
        { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
      );
      const apps = await appsRes.json() as Array<Record<string, unknown>>;

      let classified = 0;
      const results: Array<{ id: string; recommended_role?: string; scores: Record<string, number> }> = [];

      for (const application of apps) {
        const scores: Record<string, number> = {};
        const matchedRules: Array<{ rule_id: string; rule_name: string; target_role: string; points: number }> = [];

        for (const rule of rules) {
          if (evaluateRule(rule, application)) {
            scores[rule.target_role] = (scores[rule.target_role] || 0) + rule.score_points;
            matchedRules.push({
              rule_id: rule.id,
              rule_name: rule.name,
              target_role: rule.target_role,
              points: rule.score_points,
            });
          }
        }

        // Determinar rol recomendado (el de mayor puntaje)
        const recommendedRole = Object.keys(scores).length > 0
          ? Object.entries(scores).sort(([, a], [, b]) => b - a)[0][0]
          : undefined;

        // Guardar o actualizar en recruitment_classifications (upsert)
        await fetch(
          `${supabaseUrl}/rest/v1/recruitment_classifications`,
          {
            method: 'POST',
            headers: {
              apikey: serviceKey, Authorization: `Bearer ${serviceKey}`,
              'Content-Type': 'application/json',
              'Prefer': 'resolution=merge-duplicates,return=minimal',
            },
            body: JSON.stringify({
              job_application_id: application['id'],
              company_id: companyId,
              recommended_role: recommendedRole || null,
              scores,
              matched_rules: matchedRules,
              extraction_status: application['resume_text'] ? 'extracted' : 'pending',
              classified_at: new Date().toISOString(),
              classified_by: 'system',
            }),
          }
        );

        results.push({ id: application['id'] as string, recommended_role: recommendedRole, scores });
        classified++;
      }

      res.json({ classified, total: apps.length, results });
    } catch (err) {
      safeLogger.error('Error en /api/recruitment/classify', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /api/recruitment/extract-and-classify — Clasifica usando datos ya disponibles
  // (formulario + resume_text existente). NO descarga PDFs — eso es una operación separada.
  // Procesa en lotes de 100 para no sobrecargar la memoria.
  server.post('/api/recruitment/extract-and-classify', async (req, res) => {
    try {
      const supabaseUrl = process.env['ENV_SUPABASE_URL'];
      const serviceKey = process.env['ENV_SUPABASE_TOKEN'];
      if (!supabaseUrl || !serviceKey) {
        res.status(503).json({ error: 'Server configuration missing' });
        return;
      }

      const { applicationIds, companyId } = req.body as { applicationIds?: string[]; companyId?: string };
      if (!applicationIds || applicationIds.length === 0) {
        res.status(400).json({ error: 'applicationIds[] required' });
        return;
      }
      if (!companyId) {
        res.status(400).json({ error: 'companyId required' });
        return;
      }

      // Obtener las reglas activas de la empresa (una sola vez)
      const rulesRes = await fetch(
        `${supabaseUrl}/rest/v1/recruitment_rules?company_id=eq.${companyId}&is_active=eq.true&order=priority.desc`,
        { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
      );
      const rules = await rulesRes.json() as Array<{
        id: string; name: string; target_role: string;
        field_to_check: string; match_type: string; match_value: string; score_points: number;
      }>;

      if (!rules || rules.length === 0) {
        res.status(400).json({ error: 'No hay reglas activas configuradas para esta empresa' });
        return;
      }

      // Procesar en lotes de 100 para no sobrecargar
      const BATCH_SIZE = 100;
      let classified = 0;

      for (let i = 0; i < applicationIds.length; i += BATCH_SIZE) {
        const batch = applicationIds.slice(i, i + BATCH_SIZE);
        const idsParam = batch.map(id => `"${id}"`).join(',');

        const appsRes = await fetch(
          `${supabaseUrl}/rest/v1/job_applications?id=in.(${idsParam})&select=id,first_name,last_name,position_name,province,currently_working,salary_expectation,additional_info,resume_text,resume_parsed,source`,
          { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
        );
        const apps = await appsRes.json() as Array<Record<string, unknown>>;

        // Preparar todos los upserts del lote de una sola vez
        const upserts = apps.map(application => {
          const scores: Record<string, number> = {};
          const matchedRules: Array<{ rule_id: string; rule_name: string; target_role: string; points: number }> = [];

          for (const rule of rules) {
            if (evaluateRule(rule, application)) {
              scores[rule.target_role] = (scores[rule.target_role] || 0) + rule.score_points;
              matchedRules.push({ rule_id: rule.id, rule_name: rule.name, target_role: rule.target_role, points: rule.score_points });
            }
          }

          const recommendedRole = Object.keys(scores).length > 0
            ? Object.entries(scores).sort(([, a], [, b]) => b - a)[0][0]
            : null;

          return {
            job_application_id: application['id'],
            company_id: companyId,
            recommended_role: recommendedRole,
            scores,
            matched_rules: matchedRules,
            extraction_status: application['resume_text'] ? 'extracted' : 'pending',
            classified_at: new Date().toISOString(),
            classified_by: 'system',
          };
        });

        // Upsert del lote completo en una sola llamada
        await fetch(
          `${supabaseUrl}/rest/v1/recruitment_classifications`,
          {
            method: 'POST',
            headers: {
              apikey: serviceKey, Authorization: `Bearer ${serviceKey}`,
              'Content-Type': 'application/json',
              'Prefer': 'resolution=merge-duplicates,return=minimal',
            },
            body: JSON.stringify(upserts),
          }
        );

        classified += apps.length;
      }

      res.json({ classified, total: applicationIds.length });
    } catch (err) {
      safeLogger.error('Error en /api/recruitment/extract-and-classify', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /api/recruitment/preview/:applicationId — Preview de clasificación sin guardar
  server.get('/api/recruitment/preview/:applicationId', async (req, res) => {
    try {
      const supabaseUrl = process.env['ENV_SUPABASE_URL'];
      const serviceKey = process.env['ENV_SUPABASE_TOKEN'];
      if (!supabaseUrl || !serviceKey) {
        res.status(503).json({ error: 'Server configuration missing' });
        return;
      }

      const { applicationId } = req.params;
      const companyId = req.query['companyId'] as string;
      if (!companyId) {
        res.status(400).json({ error: 'companyId query param required' });
        return;
      }

      // Obtener la aplicación
      const appRes = await fetch(
        `${supabaseUrl}/rest/v1/job_applications?id=eq.${applicationId}&select=id,first_name,last_name,position_name,province,currently_working,salary_expectation,additional_info,resume_text,resume_parsed`,
        { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
      );
      const [application] = await appRes.json() as Array<Record<string, unknown>>;
      if (!application) {
        res.status(404).json({ error: 'Application not found' });
        return;
      }

      // Obtener las reglas activas
      const rulesRes = await fetch(
        `${supabaseUrl}/rest/v1/recruitment_rules?company_id=eq.${companyId}&is_active=eq.true&order=priority.desc`,
        { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
      );
      const rules = await rulesRes.json() as Array<{
        id: string; name: string; target_role: string;
        field_to_check: string; match_type: string; match_value: string; score_points: number;
      }>;

      const scores: Record<string, number> = {};
      const matchedRules: Array<{ rule_id: string; rule_name: string; target_role: string; points: number; matched: boolean }> = [];

      for (const rule of rules) {
        const matched = evaluateRule(rule, application);
        if (matched) {
          scores[rule.target_role] = (scores[rule.target_role] || 0) + rule.score_points;
        }
        matchedRules.push({
          rule_id: rule.id,
          rule_name: rule.name,
          target_role: rule.target_role,
          points: rule.score_points,
          matched,
        });
      }

      const recommendedRole = Object.keys(scores).length > 0
        ? Object.entries(scores).sort(([, a], [, b]) => b - a)[0][0]
        : undefined;

      res.json({
        application_id: applicationId,
        recommended_role: recommendedRole,
        scores,
        matched_rules: matchedRules,
        has_resume_text: !!application['resume_text'],
      });
    } catch (err) {
      safeLogger.error('Error en /api/recruitment/preview', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ============================================================
  // Esto permite que Angular Router maneje las rutas del frontend
  // IMPORTANTE: Esta ruta debe ir DESPUÉS de express.static para que funcione correctamente
  server.get('*', (req, res) => {
    // Ignorar rutas de API
    if (req.path.startsWith('/api/')) {
      res.status(404).json({ error: 'API endpoint not found' });
      return;
    }

    // Servir index.html para todas las demás rutas (SPA routing)
    // No cachear index.html para asegurar que el navegador siempre obtenga la versión más reciente
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
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

  // =============================================
  // CRON: Notificaciones diarias vía Teams (7:00 AM Panamá)
  // - Felicitaciones de cumpleaños
  // - Nuevos ingresos del día
  // =============================================
  setupTeamsCrons();
}

/**
 * Cron de cumpleaños → Microsoft Teams webhook
 * Se ejecuta diariamente a las 7:00 AM EST (Panamá)
 */
const TEAMS_WEBHOOK_URL = 'https://blackdogpanama.webhook.office.com/webhookb2/f02ce765-7490-4e4f-87e1-60bc7105c2a4@2b632609-7a2b-43f5-b938-2c552d778a5c/IncomingWebhook/c2703cf3cd69428d852077089a878d96/10a942a9-436b-4356-abee-a70f4eacd56f/V2BAeLl---IgdNWdOnLqPC2NRn-7qXlNyZHDtIVfYbeeI1';

function setupTeamsCrons(): void {
  const SUPABASE_URL = process.env['ENV_SUPABASE_URL'];
  const SUPABASE_TOKEN = process.env['ENV_SUPABASE_TOKEN'];

  if (!SUPABASE_URL || !SUPABASE_TOKEN) {
    console.warn('⚠️  Teams crons: Supabase no configurado, crons desactivados.');
    return;
  }

  // Cron cumpleaños: "0 7 * * *" = todos los días a las 7:00 AM Panamá
  cron.schedule('0 7 * * *', async () => {
    console.log('🎂 [Birthday Cron] Verificando cumpleaños del día...');
    try {
      await sendBirthdayMessages(SUPABASE_URL, SUPABASE_TOKEN, TEAMS_WEBHOOK_URL);
    } catch (err: any) {
      console.error('🎂 [Birthday Cron] Error:', err?.message || err);
    }
  }, { timezone: 'America/Panama' });

  // Cron nuevos ingresos: cada 5 minutos, detecta empleados creados hace ~30 min
  cron.schedule('*/5 * * * *', async () => {
    try {
      await sendNewHiresMessages(SUPABASE_URL, SUPABASE_TOKEN, TEAMS_WEBHOOK_URL);
    } catch (err: any) {
      console.error('🆕 [New Hires Cron] Error:', err?.message || err);
    }
  }, { timezone: 'America/Panama' });

  console.log('📢 Teams crons programados:');
  console.log('   🎂 Cumpleaños: diario a las 7:00 AM (Panamá)');
  console.log('   🆕 Nuevos ingresos: cada 5 min (30 min después de crear)');
}

async function sendBirthdayMessages(
  supabaseUrl: string,
  supabaseToken: string,
  teamsWebhookUrl: string
): Promise<void> {
  // Obtener la fecha actual en zona horaria de Panamá
  const now = new Date();
  // Panamá = UTC-5
  const panamaOffset = -5 * 60;
  const localNow = new Date(now.getTime() + (panamaOffset - now.getTimezoneOffset()) * 60000);
  const todayMonth = localNow.getMonth() + 1; // 1-12
  const todayDay = localNow.getDate();

  // Consultar empleados activos cuyo cumpleaños es HOY
  const url = `${supabaseUrl}/rest/v1/employees?select=first_name,father_name,birth_date,branch_id,position_id,start_date,branch:branches(name),position:positions(name),department:departments(name)&is_active=eq.true&birth_date=not.is.null`;
  const res = await fetch(url, {
    headers: {
      'apikey': supabaseToken,
      'Authorization': `Bearer ${supabaseToken}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Supabase respondió ${res.status}: ${await res.text()}`);
  }

  const employees: any[] = await res.json();

  // Filtrar empleados cuyo cumpleaños es hoy (mismo día y mes)
  const birthdayEmployees = employees.filter((emp) => {
    if (!emp.birth_date || emp.birth_date === '1970-01-01') return false;
    const bd = new Date(emp.birth_date + 'T12:00:00'); // Noon para evitar timezone issues
    return (bd.getMonth() + 1) === todayMonth && bd.getDate() === todayDay;
  });

  if (birthdayEmployees.length === 0) {
    console.log('🎂 [Birthday Cron] No hay cumpleaños hoy.');
    return;
  }

  console.log(`🎂 [Birthday Cron] ${birthdayEmployees.length} cumpleaño(s) hoy!`);

  // Enviar un mensaje por cada cumpleañero
  for (const emp of birthdayEmployees) {
    const fullName = `${(emp.first_name || '').trim()} ${(emp.father_name || '').trim()}`.trim();
    const branch = emp.branch?.name || 'Sin sucursal';
    const position = emp.position?.name || '';
    const department = emp.department?.name || '';

    // Calcular edad
    let ageText = '';
    if (emp.birth_date) {
      const bd = new Date(emp.birth_date + 'T12:00:00');
      const age = localNow.getFullYear() - bd.getFullYear();
      ageText = `cumple **${age} años**`;
    }

    // Calcular antigüedad en la empresa
    let tenureText = '';
    if (emp.start_date) {
      const sd = new Date(emp.start_date + 'T12:00:00');
      const years = localNow.getFullYear() - sd.getFullYear();
      const months = localNow.getMonth() - sd.getMonth();
      const totalMonths = years * 12 + months;
      if (totalMonths >= 12) {
        const y = Math.floor(totalMonths / 12);
        tenureText = `${y} año${y > 1 ? 's' : ''}`;
      } else {
        tenureText = `${totalMonths} mes${totalMonths > 1 ? 'es' : ''}`;
      }
    }

    // Mensaje Adaptive Card para Teams
    const card = {
      type: 'message',
      attachments: [{
        contentType: 'application/vnd.microsoft.card.adaptive',
        content: {
          '$schema': 'http://adaptivecards.io/schemas/adaptive-card.json',
          type: 'AdaptiveCard',
          version: '1.4',
          body: [
            {
              type: 'Container',
              style: 'emphasis',
              bleed: true,
              items: [
                {
                  type: 'ColumnSet',
                  columns: [
                    {
                      type: 'Column',
                      width: 'auto',
                      items: [
                        {
                          type: 'TextBlock',
                          text: '🎂🎉🥳',
                          size: 'extraLarge',
                          horizontalAlignment: 'center',
                        },
                      ],
                      verticalContentAlignment: 'center',
                    },
                    {
                      type: 'Column',
                      width: 'stretch',
                      items: [
                        {
                          type: 'TextBlock',
                          text: '¡FELIZ CUMPLEAÑOS!',
                          weight: 'bolder',
                          size: 'large',
                          color: 'accent',
                          spacing: 'none',
                        },
                        {
                          type: 'TextBlock',
                          text: `Hoy celebramos a un miembro especial de nuestra familia Black Dog 🐾`,
                          wrap: true,
                          spacing: 'small',
                          isSubtle: true,
                        },
                      ],
                      verticalContentAlignment: 'center',
                    },
                  ],
                },
              ],
            },
            {
              type: 'Container',
              spacing: 'medium',
              items: [
                {
                  type: 'TextBlock',
                  text: `🌟 **${fullName}** 🌟`,
                  size: 'extraLarge',
                  weight: 'bolder',
                  horizontalAlignment: 'center',
                  wrap: true,
                },
                {
                  type: 'TextBlock',
                  text: ageText ? `¡Hoy ${ageText}!` : '¡Hoy es su día especial!',
                  horizontalAlignment: 'center',
                  spacing: 'small',
                  size: 'medium',
                  wrap: true,
                },
              ],
            },
            {
              type: 'FactSet',
              spacing: 'medium',
              facts: [
                ...(position ? [{ title: '💼 Cargo:', value: position }] : []),
                ...(department ? [{ title: '🏢 Departamento:', value: department }] : []),
                { title: '📍 Sucursal:', value: branch },
                ...(tenureText ? [{ title: '⏳ Antigüedad:', value: tenureText }] : []),
              ],
            },
            {
              type: 'Container',
              spacing: 'medium',
              items: [
                {
                  type: 'TextBlock',
                  text: '🎊 Que este nuevo año de vida esté lleno de éxitos, salud y mucha alegría. ¡Gracias por ser parte de esta gran familia! 🐾💛',
                  wrap: true,
                  horizontalAlignment: 'center',
                  size: 'medium',
                },
                {
                  type: 'TextBlock',
                  text: '— Tu equipo de **Black Dog Panamá** 🖤🐕',
                  wrap: true,
                  horizontalAlignment: 'center',
                  spacing: 'medium',
                  weight: 'bolder',
                  isSubtle: true,
                },
              ],
            },
          ],
        },
      }],
    };

    try {
      const teamsRes = await fetch(teamsWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(card),
      });

      if (teamsRes.ok) {
        console.log(`🎂 [Birthday Cron] ✅ Mensaje enviado para ${fullName}`);
      } else {
        const errText = await teamsRes.text();
        console.error(`🎂 [Birthday Cron] ❌ Error Teams para ${fullName}: ${teamsRes.status} ${errText}`);
      }
    } catch (err: any) {
      console.error(`🎂 [Birthday Cron] ❌ Error enviando mensaje para ${fullName}:`, err?.message);
    }

    // Esperar 2 segundos entre mensajes para no saturar el webhook
    if (birthdayEmployees.length > 1) {
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}

// Set para rastrear IDs de empleados ya anunciados como nuevos ingresos (evitar duplicados)
const announcedNewHires = new Set<string>();

async function sendNewHiresMessages(
  supabaseUrl: string,
  supabaseToken: string,
  teamsWebhookUrl: string
): Promise<void> {
  // Buscar empleados creados entre 25 y 60 minutos atrás (ventana amplia para no perder ninguno)
  const now = new Date();
  const from = new Date(now.getTime() - 60 * 60 * 1000); // 60 min atrás
  const to = new Date(now.getTime() - 25 * 60 * 1000);   // 25 min atrás

  const fromISO = from.toISOString();
  const toISO = to.toISOString();

  const url = `${supabaseUrl}/rest/v1/employees?select=id,first_name,father_name,start_date,created_at,branch:branches(name),position:positions(name),department:departments(name)&is_active=eq.true&created_at=gte.${fromISO}&created_at=lte.${toISO}&order=created_at.asc`;

  const res = await fetch(url, {
    headers: {
      'apikey': supabaseToken,
      'Authorization': `Bearer ${supabaseToken}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Supabase respondió ${res.status}: ${await res.text()}`);
  }

  const newEmployees: any[] = await res.json();

  // Filtrar los que ya fueron anunciados
  const toAnnounce = newEmployees.filter((emp) => !announcedNewHires.has(emp.id));

  if (toAnnounce.length === 0) return;

  console.log(`🆕 [New Hires] ${toAnnounce.length} nuevo(s) ingreso(s) detectado(s)`);

  for (const emp of toAnnounce) {
    const fullName = `${(emp.first_name || '').trim()} ${(emp.father_name || '').trim()}`.trim();
    const branch = emp.branch?.name || 'Sin sucursal';
    const position = emp.position?.name || 'Sin cargo';
    const department = emp.department?.name || '';
    const startDate = emp.start_date || 'No definida';

    // Formatear fecha de inicio
    let startDateFormatted = startDate;
    if (startDate && startDate !== 'No definida') {
      const sd = new Date(startDate + 'T12:00:00');
      const months = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
      startDateFormatted = `${sd.getDate()} de ${months[sd.getMonth()]} ${sd.getFullYear()}`;
    }

    const card = {
      type: 'message',
      attachments: [{
        contentType: 'application/vnd.microsoft.card.adaptive',
        content: {
          '$schema': 'http://adaptivecards.io/schemas/adaptive-card.json',
          type: 'AdaptiveCard',
          version: '1.4',
          body: [
            {
              type: 'Container',
              style: 'emphasis',
              bleed: true,
              items: [
                {
                  type: 'ColumnSet',
                  columns: [
                    {
                      type: 'Column',
                      width: 'auto',
                      items: [
                        {
                          type: 'TextBlock',
                          text: '🐾👋🎉',
                          size: 'extraLarge',
                          horizontalAlignment: 'center',
                        },
                      ],
                      verticalContentAlignment: 'center',
                    },
                    {
                      type: 'Column',
                      width: 'stretch',
                      items: [
                        {
                          type: 'TextBlock',
                          text: '¡NUEVO INTEGRANTE!',
                          weight: 'bolder',
                          size: 'large',
                          color: 'good',
                          spacing: 'none',
                        },
                        {
                          type: 'TextBlock',
                          text: 'Un nuevo miembro se une a la manada Black Dog 🐕',
                          wrap: true,
                          spacing: 'small',
                          isSubtle: true,
                        },
                      ],
                      verticalContentAlignment: 'center',
                    },
                  ],
                },
              ],
            },
            {
              type: 'Container',
              spacing: 'medium',
              items: [
                {
                  type: 'TextBlock',
                  text: `🌟 **${fullName}** 🌟`,
                  size: 'extraLarge',
                  weight: 'bolder',
                  horizontalAlignment: 'center',
                  wrap: true,
                },
                {
                  type: 'TextBlock',
                  text: '¡Le damos la más calurosa bienvenida!',
                  horizontalAlignment: 'center',
                  spacing: 'small',
                  size: 'medium',
                  wrap: true,
                },
              ],
            },
            {
              type: 'FactSet',
              spacing: 'medium',
              facts: [
                { title: '💼 Cargo:', value: position },
                ...(department ? [{ title: '🏢 Departamento:', value: department }] : []),
                { title: '📍 Sucursal:', value: branch },
                { title: '📅 Fecha de inicio:', value: startDateFormatted },
              ],
            },
            {
              type: 'Container',
              spacing: 'medium',
              items: [
                {
                  type: 'TextBlock',
                  text: '💛 ¡Bienvenido/a a la familia! Estamos muy contentos de tenerte con nosotros. Juntos hacemos que cada día sea increíble para nuestros peludos. 🐶🐱',
                  wrap: true,
                  horizontalAlignment: 'center',
                  size: 'medium',
                },
                {
                  type: 'TextBlock',
                  text: '— **Black Dog Panamá** 🖤🐕',
                  wrap: true,
                  horizontalAlignment: 'center',
                  spacing: 'medium',
                  weight: 'bolder',
                  isSubtle: true,
                },
              ],
            },
          ],
        },
      }],
    };

    try {
      const teamsRes = await fetch(teamsWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(card),
      });

      if (teamsRes.ok) {
        console.log(`🆕 [New Hires] ✅ Bienvenida enviada para ${fullName}`);
        announcedNewHires.add(emp.id);
      } else {
        const errText = await teamsRes.text();
        console.error(`🆕 [New Hires] ❌ Error Teams para ${fullName}: ${teamsRes.status} ${errText}`);
      }
    } catch (err: any) {
      console.error(`🆕 [New Hires] ❌ Error enviando bienvenida para ${fullName}:`, err?.message);
    }

    // Esperar entre mensajes
    if (toAnnounce.length > 1) {
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  // Limpiar IDs viejos del Set (más de 24h) para no acumular memoria indefinidamente
  if (announcedNewHires.size > 500) {
    announcedNewHires.clear();
  }
}

run();

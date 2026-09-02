import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { signToken, verifyToken, adminAuth } from '@/middleware/adminAuth';
import { getBiAnalytics } from '@/controllers/analyticsController';

const adminRouter = Router();

type LoginBody = {
  username?: string;
  password?: string;
};

const ADMIN_USER = process.env.ADMIN_USER || '';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';

// Rate limiter en memoria para /admin/login (máx 5 intentos por IP cada 60s)
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const record = loginAttempts.get(ip);
  if (!record || record.resetAt <= now) {
    loginAttempts.set(ip, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  if (record.count >= 5) {
    return true;
  }
  record.count++;
  return false;
}

function resetRateLimit(ip: string) {
  loginAttempts.delete(ip);
}

// Comparación segura en tiempo constante contra Timing Attacks
function safeCompare(a: string, b: string): boolean {
  if (!a || !b) return false;
  const hashA = crypto.createHash('sha256').update(a).digest();
  const hashB = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

adminRouter.post('/login', (req: Request<{}, {}, LoginBody>, res: Response) => {
  const clientIp = (
    (typeof req.headers['x-forwarded-for'] === 'string' ? req.headers['x-forwarded-for'].split(',')[0].trim() : '') ||
    (typeof req.headers['x-real-ip'] === 'string' ? req.headers['x-real-ip'] : '') ||
    req.socket.remoteAddress ||
    'unknown'
  );

  if (isRateLimited(clientIp)) {
    return res.status(429).json({ error: 'Demasiados intentos de inicio de sesión. Por favor, reintenta en 1 minuto.' });
  }

  const { username, password } = req.body ?? {};

  if (!username || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
  }

  if (!ADMIN_USER || !ADMIN_PASSWORD) {
    console.error('[SECURITY CRITICAL] ADMIN_USER o ADMIN_PASSWORD no están configurados en el archivo .env');
    return res.status(500).json({ error: 'Error de configuración del servidor' });
  }

  const isUserValid = safeCompare(username, ADMIN_USER);
  const isPassValid = safeCompare(password, ADMIN_PASSWORD);

  if (!isUserValid || !isPassValid) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  // Login exitoso: limpiar intentos fallidos
  resetRateLimit(clientIp);

  const payload = {
    sub: 'admin',
    username,
    iat: Date.now(),
    exp: Date.now() + 12 * 60 * 60 * 1000,
  };
  const token = signToken(payload);
  return res.json({ token });
});

adminRouter.get('/verify', (req: Request, res: Response) => {
  const auth = req.headers.authorization || '';
  let token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) {
    const cookieHeader = req.headers.cookie || '';
    if (cookieHeader) {
      const cookies = Object.fromEntries(
        cookieHeader.split(';').map((c) => {
          const [k, ...rest] = c.trim().split('=');
          return [decodeURIComponent(k), decodeURIComponent(rest.join('='))];
        })
      );
      if (typeof cookies['admin_token'] === 'string') {
        token = cookies['admin_token'];
      }
    }
  }
  if (!token) return res.status(401).json({ ok: false, error: 'Sin token' });
  const { valid, payload } = verifyToken(token);
  if (!valid) return res.status(401).json({ ok: false, error: 'Token inválido' });
  return res.json({ ok: true, user: { username: payload?.username } });
});

adminRouter.get('/analytics-bi', adminAuth, getBiAnalytics);

export default adminRouter;

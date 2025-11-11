import { Router, Request, Response } from 'express';
import crypto from 'crypto';

const adminRouter = Router();

type LoginBody = {
  username?: string;
  password?: string;
};

const ADMIN_USER = process.env.ADMIN_USER || '';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const SECRET = process.env.ADMIN_JWT_SECRET || ADMIN_PASSWORD || 'default-secret';

function sign(payload: object): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const data = `${header}.${body}`;
  const signature = crypto.createHmac('sha256', SECRET).update(data).digest('base64url');
  return `${data}.${signature}`;
}

function verify(token: string): { valid: boolean; payload?: any } {
  const parts = token.split('.');
  if (parts.length !== 3) return { valid: false };
  const [header, body, signature] = parts;
  const data = `${header}.${body}`;
  const expected = crypto.createHmac('sha256', SECRET).update(data).digest('base64url');
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return { valid: false };
  }
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (typeof payload.exp === 'number' && Date.now() > payload.exp) {
      return { valid: false };
    }
    return { valid: true, payload };
  } catch {
    return { valid: false };
  }
}

adminRouter.post('/login', (req: Request<{}, {}, LoginBody>, res: Response) => {
  const { username, password } = req.body ?? {};

  if (!username || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
  }

  if (username !== ADMIN_USER || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  const payload = {
    sub: 'admin',
    username,
    iat: Date.now(),
    // expira en 12 horas
    exp: Date.now() + 12 * 60 * 60 * 1000,
  };
  const token = sign(payload);
  return res.json({ token });
});

adminRouter.get('/verify', (req: Request, res: Response) => {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return res.status(401).json({ ok: false, error: 'Sin token' });
  const { valid, payload } = verify(token);
  if (!valid) return res.status(401).json({ ok: false, error: 'Token inválido' });
  return res.json({ ok: true, user: { username: payload?.username } });
});

export default adminRouter;

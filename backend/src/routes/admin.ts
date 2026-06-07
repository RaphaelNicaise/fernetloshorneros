import { Router, Request, Response } from 'express';
import { signToken, verifyToken, adminAuth } from '@/middleware/adminAuth';
import { getBiAnalytics } from '@/controllers/analyticsController';

const adminRouter = Router();

type LoginBody = {
  username?: string;
  password?: string;
};

const ADMIN_USER = process.env.ADMIN_USER || '';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';

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

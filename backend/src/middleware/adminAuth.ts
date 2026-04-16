import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

const SECRET = process.env.ADMIN_JWT_SECRET || process.env.ADMIN_PASSWORD || 'default-secret';

export function verifyToken(token: string): { valid: boolean; payload?: any } {
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

export function signToken(payload: object): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const data = `${header}.${body}`;
  const signature = crypto.createHmac('sha256', SECRET).update(data).digest('base64url');
  return `${data}.${signature}`;
}

function extractToken(req: Request): string {
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
  
  return token;
}

export function adminAuth(req: Request, res: Response, next: NextFunction) {
  const token = extractToken(req);
  
  if (!token) {
    return res.status(401).json({ error: 'Token requerido' });
  }
  
  const { valid, payload } = verifyToken(token);
  if (!valid) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
  
  (req as any).adminUser = payload;
  return next();
}

export default adminAuth;

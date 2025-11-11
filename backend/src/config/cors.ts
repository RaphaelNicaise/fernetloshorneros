import { Request, Response, NextFunction } from 'express';

const allowedOrigins = new Set([
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://fernetloshorneros.com',
  'https://www.fernetloshorneros.com',
  'https://frontend:3000',
]);

export default function cors(req: Request, res: Response, next: NextFunction) {
  const origin = req.headers.origin as string | undefined;

  if (origin && allowedOrigins.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  // Variar por origen para caches intermedios
  res.setHeader('Vary', 'Origin');

  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
}
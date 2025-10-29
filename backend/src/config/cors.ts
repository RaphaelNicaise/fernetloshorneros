import { Request, Response, NextFunction } from 'express';

// Middleware CORS mínimo sin dependencias externas
const allowedOrigins = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://fernetloshorneros.com',
  'https://www.fernetloshorneros.com',
]);

export default function cors(req: Request, res: Response, next: NextFunction) {
  const origin = req.headers.origin as string | undefined;
  // Si el origen está permitido, refléjalo; si no, usa '*'
  if (origin && allowedOrigins.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
}
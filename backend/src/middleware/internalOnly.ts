import { Request, Response, NextFunction } from 'express';

// Middleware para endpoints internos: requiere cabecera X-Internal-Key
export function internalOnly(req: Request, res: Response, next: NextFunction) {
  const configuredKey = process.env.INTERNAL_API_KEY || '';
  if (!configuredKey) {
    // Si no hay clave configurada, bloquear por seguridad en producción
    if (process.env.NODE_ENV === 'production') {
      return res.status(503).json({ error: 'Servicio no disponible' });
    }
    // En desarrollo, permitir para no bloquear
    return next();
  }
  const header = req.header('x-internal-key') || req.header('X-Internal-Key') || '';
  if (!header || header !== configuredKey) {
    return res.status(403).json({ error: 'Acceso interno requerido' });
  }
  return next();
}

export default internalOnly;
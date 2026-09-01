import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '@/utils/logger';

export interface AppError extends Error {
  status?: number;
  statusCode?: number;
  details?: any;
}

/**
 * Middleware global para capturar errores de forma centralizada
 */
export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  // Manejo de errores de validación de Zod
  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));

    logger.warn(`[Validation Error] ${req.method} ${req.originalUrl}:`, formattedErrors);

    return res.status(400).json({
      success: false,
      error: 'Error de validación en los datos enviados',
      details: formattedErrors,
    });
  }

  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || 'Error interno del servidor';

  if (statusCode >= 500) {
    logger.error(`[Server Error ${statusCode}] ${req.method} ${req.originalUrl}:`, err.stack || err);
  } else {
    logger.warn(`[Client Error ${statusCode}] ${req.method} ${req.originalUrl}: ${message}`);
  }

  return res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV !== 'production' && err.details ? { details: err.details } : {}),
  });
}

/**
 * Helper para envolver funciones asíncronas y pasar excepciones a errorHandler
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

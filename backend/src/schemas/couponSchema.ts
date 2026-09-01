import { z } from 'zod';

export const validateCouponSchema = z.object({
  code: z.string().min(1, 'El código de cupón es requerido'),
  total: z.number().nonnegative('El total debe ser positivo'),
});

export const createCouponSchema = z.object({
  codigo: z.string().min(1, 'El código es requerido'),
  tipo_descuento: z.enum(['porcentaje', 'monto_fijo', 'envio_gratis']),
  valor_descuento: z.number().nonnegative(),
  fecha_expiracion: z.string().nullable().optional(),
  usos_maximos: z.number().int().nonnegative().nullable().optional(),
  activo: z.boolean().optional().default(true),
  monto_minimo: z.number().nonnegative().optional().default(0),
});

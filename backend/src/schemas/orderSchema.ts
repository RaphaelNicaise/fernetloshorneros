import { z } from 'zod';

export const createOrderSchema = z.object({
  items: z.array(
    z.object({
      id_producto: z.string().min(1, 'ID de producto requerido'),
      title: z.string().min(1, 'Título de producto requerido'),
      cantidad: z.number().int().positive('La cantidad debe ser mayor a 0'),
      precio_unitario: z.number().nonnegative('El precio debe ser positivo'),
    })
  ).min(1, 'El pedido debe tener al menos un item'),
  total: z.number().nonnegative('El total debe ser positivo'),
  external_reference: z.string().optional(),
  shipping_info: z.object({
    cost: z.number().nonnegative().optional().default(0),
    rate_id: z.string().optional(),
    service_type: z.string().optional(),
    logistic_type: z.string().nullable().optional(),
    carrier_id: z.number().nullable().optional(),
    point_id: z.string().nullable().optional(),
    address: z.object({
      provincia: z.string().optional(),
      ciudad: z.string().optional(),
      codigoPostal: z.string().optional(),
      direccion: z.string().optional(),
      numero: z.string().optional(),
      extra: z.string().optional(),
    }).nullable().optional(),
    contact: z.object({
      nombre: z.string().min(1, 'Nombre de contacto requerido'),
      email: z.string().email('Email de contacto inválido'),
      dni: z.string().min(1, 'DNI requerido'),
      telefono: z.string().min(1, 'Teléfono requerido'),
    }),
  }).optional(),
  cupon_codigo: z.string().nullable().optional(),
  cupon_descuento: z.number().nonnegative().optional().default(0),
  lote_id: z.number().nullable().optional(),
});

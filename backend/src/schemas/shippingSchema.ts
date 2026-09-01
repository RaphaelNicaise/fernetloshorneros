import { z } from 'zod';

export const quoteShippingSchema = z.object({
  destination: z.object({
    city: z.string().min(1, 'La ciudad es requerida'),
    state: z.string().min(1, 'La provincia/estado es requerida'),
    zipcode: z.string().min(1, 'El código postal es requerido'),
  }),
  items: z.array(
    z.object({
      id: z.string().min(1, 'ID de producto requerido'),
      quantity: z.number().int().positive().optional().default(1),
    })
  ).min(1, 'Debe incluir al menos un item para cotizar'),
});

export const quoteOptionsShippingSchema = z.object({
  destination: z.object({
    city: z.string().optional(),
    state: z.string().min(1, 'La provincia/estado es requerida'),
    zipcode: z.string().min(1, 'El código postal es requerido'),
  }),
  items: z.array(
    z.object({
      id: z.string().min(1, 'ID de producto requerido'),
      quantity: z.number().int().positive().optional().default(1),
    })
  ).min(1, 'Debe incluir al menos un item para cotizar'),
});

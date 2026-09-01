import { z } from 'zod';

export const waitlistSchema = z.object({
  email: z.string().email('Email inválido'),
  nombre: z.string().optional(),
  telefono: z.string().optional(),
  provincia: z.string().optional(),
  ciudad: z.string().optional(),
});

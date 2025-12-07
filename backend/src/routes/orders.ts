import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { getAllOrders, getOrderItems } from '@/services/ordersService';

const ordersRouter = Router();

const SECRET = process.env.ADMIN_JWT_SECRET || process.env.ADMIN_PASSWORD || 'default-secret';

function verify(token: string): { valid: boolean; payload?: any } {
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

ordersRouter.get('/', async (req: Request, res: Response) => {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return res.status(401).json({ error: 'Sin autorización' });
  
  const { valid } = verify(token);
  if (!valid) return res.status(401).json({ error: 'Token inválido' });

  try {
    const orders = await getAllOrders();
    return res.json(orders);
  } catch (error: any) {
    console.error('Error obteniendo pedidos:', error);
    return res.status(500).json({ error: error?.message || 'Error interno' });
  }
});

ordersRouter.get('/:id/items', async (req: Request, res: Response) => {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return res.status(401).json({ error: 'Sin autorización' });
  
  const { valid } = verify(token);
  if (!valid) return res.status(401).json({ error: 'Token inválido' });

  try {
    const orderId = Number(req.params.id);
    if (isNaN(orderId)) return res.status(400).json({ error: 'ID inválido' });
    
    const items = await getOrderItems(orderId);
    return res.json(items);
  } catch (error: any) {
    console.error('Error obteniendo items:', error);
    return res.status(500).json({ error: error?.message || 'Error interno' });
  }
});

export default ordersRouter;

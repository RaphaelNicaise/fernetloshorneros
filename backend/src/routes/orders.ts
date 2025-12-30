import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { getAllOrders, getOrderItems, getEnvioByOrderId, updateEnvioStatus, getPaymentByOrderId, updateOrderStatus } from '@/services/ordersService';
import { cancelShipment } from '@/services/enviosService';

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

// Cancelar envío de una orden (admin)
ordersRouter.post('/:id/cancel-shipment', async (req: Request, res: Response) => {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return res.status(401).json({ error: 'Sin autorización' });

  const { valid } = verify(token);
  if (!valid) return res.status(401).json({ error: 'Token inválido' });

  try {
    const orderId = Number(req.params.id);
    if (isNaN(orderId)) return res.status(400).json({ error: 'ID inválido' });

    const envio = await getEnvioByOrderId(orderId);
    if (!envio) return res.status(404).json({ error: 'Envío no encontrado para la orden' });
    if (!envio.zipnova_shipment_id) return res.status(400).json({ error: 'El envío aún no tiene shipment_id en Zipnova' });

    const result = await cancelShipment(envio.zipnova_shipment_id);
    if (!result.success) {
      return res.status(502).json({ success: false, error: result.error || 'Error cancelando envío' });
    }

    await updateEnvioStatus(envio.id, 'cancelled', envio.zipnova_shipment_id);

    // Hacer refund en MercadoPago
    let refundResult = null;
    try {
      const payment = await getPaymentByOrderId(orderId);
      if (payment && payment.mp_payment_id) {
        const mpAccessToken = process.env.MP_ACCESS_TOKEN;
        if (mpAccessToken) {
          const refundRes = await fetch(
            `https://api.mercadopago.com/v1/payments/${payment.mp_payment_id}/refunds`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${mpAccessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({}),
            }
          );
          refundResult = await refundRes.json().catch(() => null);
          console.log('Refund MercadoPago result:', refundResult);
          
          // Actualizar estado del pedido a cancelled
          await updateOrderStatus(orderId, 'cancelled');
        } else {
          console.warn('MP_ACCESS_TOKEN no configurado, no se pudo hacer refund');
        }
      }
    } catch (refundError: any) {
      console.error('Error haciendo refund en MercadoPago:', refundError);
      // No fallamos el request, el envío ya se canceló
    }

    return res.json({ success: true, result: result.result || 'canceled', refund: refundResult });
  } catch (error: any) {
    console.error('Error cancelando envío:', error);
    return res.status(500).json({ error: error?.message || 'Error interno' });
  }
});

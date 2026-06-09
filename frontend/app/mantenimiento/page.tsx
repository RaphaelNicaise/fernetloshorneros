import { Request, Response } from "express";
import { getAllOrders, getOrderItems, getEnvioByOrderId, updateEnvioStatus, updateEnvioTracking, getPaymentByOrderId, updateOrderStatus } from "@/services/ordersService";
import { enviarMailComprador } from "@/services/mailService";

/**
 * GET /orders
 */
export async function listOrders(req: Request, res: Response) {
    try {
        const orders = await getAllOrders();
        return res.json(orders);
    } catch (error: any) {
        console.error('Error obteniendo pedidos:', error);
        return res.status(500).json({ error: error?.message || 'Error interno' });
    }
}

/**
 * GET /orders/:id/items
 */
export async function listOrderItems(req: Request, res: Response) {
    try {
        const orderId = Number(req.params.id);
        if (isNaN(orderId)) return res.status(400).json({ error: 'ID inválido' });

        const items = await getOrderItems(orderId);
        return res.json(items);
    } catch (error: any) {
        console.error('Error obteniendo items:', error);
        return res.status(500).json({ error: error?.message || 'Error interno' });
    }
}

/**
 * POST /orders/:id/cancel-shipment
 */
export async function cancelOrderShipment(req: Request, res: Response) {
    try {
        const orderId = Number(req.params.id);
        if (isNaN(orderId)) return res.status(400).json({ error: 'ID inválido' });

        const envio = await getEnvioByOrderId(orderId);
        if (!envio) return res.status(404).json({ error: 'Envío no encontrado para la orden' });

        await updateEnvioStatus(envio.id, 'cancelled');

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

                    await updateOrderStatus(orderId, 'cancelled');
                } else {
                    console.warn('MP_ACCESS_TOKEN no configurado, no se pudo hacer refund');
                }
            }
        } catch (refundError: any) {
            console.error('Error haciendo refund en MercadoPago:', refundError);
        }

        return res.json({ success: true, result: 'canceled', refund: refundResult });
    } catch (error: any) {
        console.error('Error cancelando envío:', error);
        return res.status(500).json({ error: error?.message || 'Error interno' });
    }
}

/**
 * POST /orders/:id/set-tracking
 */
export async function setOrderTracking(req: Request, res: Response) {
    try {
        const orderId = Number(req.params.id);
        if (isNaN(orderId)) return res.status(400).json({ error: 'ID inválido' });

        const { trackingCode } = req.body;
        if (!trackingCode) return res.status(400).json({ error: 'trackingCode es requerido' });

        const envio = await getEnvioByOrderId(orderId);
        if (!envio) return res.status(404).json({ error: 'Envío no encontrado para la orden' });

        await updateEnvioTracking(envio.id, trackingCode);

        // Enviar email al comprador
        const trackingUrl = `https://www.correoargentino.com.ar/formularios/e-commerce?tracking=${trackingCode}`;
        try {
            await enviarMailComprador(
                envio.email_cliente,
                envio.nombre_cliente,
                trackingUrl,
                String(orderId)
            );
            console.log(`Email de seguimiento enviado a ${envio.email_cliente}`);
        } catch (mailError) {
            console.error("Error enviando email de seguimiento:", mailError);
        }

        return res.json({ success: true, message: 'Tracking code actualizado correctamente' });
    } catch (error: any) {
        console.error('Error actualizando tracking code:', error);
        return res.status(500).json({ error: error?.message || 'Error interno' });
    }
}

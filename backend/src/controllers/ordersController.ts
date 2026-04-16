import { Request, Response } from "express";
import { getAllOrders, getOrderItems, getEnvioByOrderId, updateEnvioStatus, getPaymentByOrderId, updateOrderStatus } from "@/services/ordersService";
import { cancelShipment } from "@/services/enviosService";

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

                    await updateOrderStatus(orderId, 'cancelled');
                } else {
                    console.warn('MP_ACCESS_TOKEN no configurado, no se pudo hacer refund');
                }
            }
        } catch (refundError: any) {
            console.error('Error haciendo refund en MercadoPago:', refundError);
        }

        return res.json({ success: true, result: result.result || 'canceled', refund: refundResult });
    } catch (error: any) {
        console.error('Error cancelando envío:', error);
        return res.status(500).json({ error: error?.message || 'Error interno' });
    }
}

import { Request, Response } from "express";
import { getAllOrders, getOrderItems, getEnvioByOrderId, updateEnvioStatus, getPaymentByOrderId, updateOrderStatus, updateEnvioTracking, manualUpdateOrderStatus, updateOrderDetails, getAllOrderItems } from "@/services/ordersService";
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
        const { restoreStock } = req.body;
        if (isNaN(orderId)) return res.status(400).json({ error: 'ID inválido' });

        const envio = await getEnvioByOrderId(orderId);
        if (!envio) return res.status(404).json({ error: 'Envío no encontrado para la orden' });

        // Actualizar estados en la base de datos de forma consistente y restaurar stock si se solicita
        await manualUpdateOrderStatus(orderId, 'cancelado', null, restoreStock === true || restoreStock === undefined);

        // Hacer refund en MercadoPago si aplica
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
                } else {
                    console.warn('MP_ACCESS_TOKEN no configurado, no se pudo hacer refund');
                }
            }
        } catch (refundError: any) {
            console.error('Error haciendo refund en MercadoPago:', refundError);
        }

        return res.json({ success: true, refund: refundResult });
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
        const { trackingCode } = req.body;
        if (isNaN(orderId) || !trackingCode) return res.status(400).json({ error: 'ID o tracking code inválido' });

        const envio = await getEnvioByOrderId(orderId);
        if (!envio) return res.status(404).json({ error: 'Envío no encontrado' });

        await updateEnvioTracking(envio.id, trackingCode);

        // Enviar mail
        const trackingUrl = `https://www.correoargentino.com.ar/formularios/e-commerce?tracking=${trackingCode}`;
        await enviarMailComprador(envio.email_cliente, envio.nombre_cliente, trackingUrl, String(orderId), trackingCode);

        return res.json({ success: true });
    } catch (error: any) {
        console.error('Error cargando tracking:', error);
        return res.status(500).json({ error: error?.message || 'Error interno' });
    }
}

/**
 * POST /orders/:id/update-status
 */
export async function updateOrderStatusHandler(req: Request, res: Response) {
    try {
        const orderId = Number(req.params.id);
        const { status, trackingCode, sendEmail, restoreStock } = req.body;

        if (isNaN(orderId)) return res.status(400).json({ error: 'ID de pedido inválido' });

        const validStatuses = ["pendiente", "para_despachar", "enviado", "cancelado"];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Estado inválido' });
        }

        await manualUpdateOrderStatus(orderId, status, trackingCode, restoreStock);

        // Enviar mail si se despacha, se provee trackingCode y sendEmail es true
        if (status === "enviado" && sendEmail && trackingCode) {
            try {
                const envio = await getEnvioByOrderId(orderId);
                if (envio) {
                    const trackingUrl = `https://www.correoargentino.com.ar/formularios/e-commerce?tracking=${trackingCode}`;
                    await enviarMailComprador(envio.email_cliente, envio.nombre_cliente, trackingUrl, String(orderId), trackingCode);
                }
            } catch (mailError) {
                console.error("Error al enviar email de tracking:", mailError);
            }
        }

        return res.json({ success: true });
    } catch (error: any) {
        console.error('Error actualizando estado de pedido:', error);
        return res.status(500).json({ error: error?.message || 'Error interno' });
    }
}

/**
 * POST /orders/bulk-update-status
 */
export async function bulkUpdateOrderStatusHandler(req: Request, res: Response) {
    try {
        const { ids, status, trackingCode, sendEmail, restoreStock } = req.body;

        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: 'IDs inválidos' });
        }

        const validStatuses = ["pendiente", "para_despachar", "enviado", "cancelado"];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Estado inválido' });
        }

        for (const id of ids) {
            const orderId = Number(id);
            if (isNaN(orderId)) continue;

            await manualUpdateOrderStatus(orderId, status, trackingCode, restoreStock);

            if (status === "enviado" && sendEmail && trackingCode) {
                try {
                    const envio = await getEnvioByOrderId(orderId);
                    if (envio) {
                        const trackingUrl = `https://www.correoargentino.com.ar/formularios/e-commerce?tracking=${trackingCode}`;
                        await enviarMailComprador(envio.email_cliente, envio.nombre_cliente, trackingUrl, String(orderId), trackingCode);
                    }
                } catch (mailError) {
                    console.error(`Error al enviar email de tracking para orden ${orderId}:`, mailError);
                }
            }
        }

        return res.json({ success: true, count: ids.length });
    } catch (error: any) {
        console.error('Error en actualización masiva de pedidos:', error);
        return res.status(500).json({ error: error?.message || 'Error interno' });
    }
}

/**
 * PUT /orders/:id/details
 */
export async function updateOrderDetailsHandler(req: Request, res: Response) {
    try {
        const orderId = Number(req.params.id);
        if (isNaN(orderId)) return res.status(400).json({ error: 'ID de pedido inválido' });

        const {
            nombre_cliente,
            email_cliente,
            dni_cliente,
            telefono_cliente,
            provincia,
            ciudad,
            codigo_postal,
            direccion,
            numero,
            extra
        } = req.body;

        // Validaciones básicas de campos obligatorios
        if (!nombre_cliente || !email_cliente || !dni_cliente || !telefono_cliente || !provincia || !ciudad || !codigo_postal || !direccion || !numero) {
            return res.status(400).json({ error: 'Todos los campos obligatorios deben estar completos' });
        }

        const envio = await getEnvioByOrderId(orderId);
        if (!envio) return res.status(404).json({ error: 'Envío no encontrado para esta orden' });

        await updateOrderDetails(orderId, {
            nombre_cliente,
            email_cliente,
            dni_cliente,
            telefono_cliente,
            provincia,
            ciudad,
            codigo_postal,
            direccion,
            numero,
            extra: extra || null
        });

        return res.json({ success: true });
    } catch (error: any) {
        console.error('Error actualizando detalles del pedido:', error);
        return res.status(500).json({ error: error?.message || 'Error interno' });
    }
}

/**
 * GET /orders/all-items
 */
export async function listAllOrderItems(req: Request, res: Response) {
    try {
        const items = await getAllOrderItems();
        return res.json(items);
    } catch (error: any) {
        console.error('Error obteniendo todos los items:', error);
        return res.status(500).json({ error: error?.message || 'Error interno' });
    }
}


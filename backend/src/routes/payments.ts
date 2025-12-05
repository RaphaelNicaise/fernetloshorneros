import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { preferenceClient } from "@/config/mercadopago";
import {
    createOrder,
    getOrderByReference,
    updateOrderStatus,
    createPayment,
    getPaymentByMpId,
} from "@/services/ordersService";
import { getProductById } from "@/services/productService";

const router = Router();

/**
 * POST /payments/create-preference
 * Crea una orden y genera una preferencia de pago en MercadoPago
 */
router.post("/create-preference", async (req, res) => {
    try {
        const { items } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: "Items requeridos" });
        }

        // Validar cada item y obtener info del producto
        const validatedItems = [];
        let total = 0;

        for (const item of items) {
            const product = await getProductById(item.id);
            
            if (!product) {
                return res.status(400).json({ error: `Producto ${item.id} no encontrado` });
            }

            if (product.status !== "disponible") {
                return res.status(400).json({ error: `Producto ${product.name} no está disponible` });
            }

            const quantity = Number(item.quantity) || 1;
            
            // Verificar límite si existe
            if (product.limite > 0 && quantity > product.limite) {
                return res.status(400).json({ 
                    error: `Cantidad excede el límite para ${product.name} (máximo: ${product.limite})` 
                });
            }

            const itemTotal = Number(product.price) * quantity;
            total += itemTotal;

            validatedItems.push({
                id_producto: product.id,
                title: product.name,
                cantidad: quantity,
                precio_unitario: Number(product.price),
                unit_price: Number(product.price),
                quantity: quantity,
            });
        }

        // Crear referencia única
        const external_reference = uuidv4();

        // Crear orden en la base de datos
        const order = await createOrder({
            items: validatedItems.map(item => ({
                id_producto: item.id_producto,
                title: item.title,
                cantidad: item.cantidad,
                precio_unitario: item.precio_unitario,
            })),
            total,
            external_reference,
        });

        // Crear preferencia de MercadoPago
        const preference = await preferenceClient.create({
            body: {
                items: validatedItems.map(item => ({
                    id: item.id_producto,
                    title: item.title,
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                    currency_id: "ARS",
                })),
                back_urls: {
                    success: process.env.NODE_ENV === 'development'
                        ? "https://zpxtnmn7-3000.brs.devtunnels.ms/payment/success"
                        : `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/payment/success`,
                    failure: process.env.NODE_ENV === 'development'
                        ? "https://zpxtnmn7-3000.brs.devtunnels.ms/payment/failure"
                        : `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/payment/failure`,
                    pending: process.env.NODE_ENV === 'development'
                        ? "https://zpxtnmn7-3000.brs.devtunnels.ms/payment/pending"
                        : `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/payment/pending`,
                },
                auto_return: "approved",
                external_reference: external_reference,
                notification_url: process.env.NODE_ENV === 'development' 
                    ? 'https://zpxtnmn7-3001.brs.devtunnels.ms/payments/webhook'
                    : `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/payments/webhook`,
            },
        });

        res.json({
            id: preference.id,
            init_point: preference.init_point,
            external_reference,
            order_id: order.id,
        });
    } catch (error: any) {
        console.error("Error creando preferencia:", error);
        res.status(500).json({ error: error?.message || "Error interno del servidor" });
    }
});

/**
 * POST /payments/webhook
 * Webhook para recibir notificaciones de MercadoPago
 */
router.post("/webhook", async (req, res) => {
    try {
        const { type, data } = req.body;

        // MercadoPago envía diferentes tipos de notificaciones
        if (type === "payment") {
            const paymentId = data?.id;

            if (!paymentId) {
                return res.status(400).json({ error: "Payment ID no recibido" });
            }

            // Verificar si ya procesamos este pago
            const existingPayment = await getPaymentByMpId(String(paymentId));
            if (existingPayment) {
                console.log(`Pago ${paymentId} ya fue procesado`);
                return res.status(200).json({ message: "Ya procesado" });
            }

            // Importar Payment solo cuando se necesita
            const { Payment } = await import("mercadopago");
            const { MercadoPagoConfig } = await import("mercadopago");
            
            const client = new MercadoPagoConfig({
                accessToken: process.env.MP_ACCESS_TOKEN!,
            });
            const paymentClient = new Payment(client);

            // Obtener información del pago desde MercadoPago
            const payment = await paymentClient.get({ id: String(paymentId) });

            const external_reference = payment.external_reference;
            if (!external_reference) {
                console.error("Payment sin external_reference:", paymentId);
                return res.status(200).json({ message: "Sin referencia" });
            }

            // Buscar la orden
            const order = await getOrderByReference(external_reference);
            if (!order) {
                console.error("Orden no encontrada:", external_reference);
                return res.status(404).json({ error: "Orden no encontrada" });
            }

            // Registrar el pago
            await createPayment({
                id_pedido: order.id,
                mp_payment_id: String(paymentId),
                status: payment.status || "unknown",
                payment_method: payment.payment_method_id || null,
                total: payment.transaction_amount || 0,
            });

            // Actualizar estado de la orden según el estado del pago
            if (payment.status === "approved") {
                await updateOrderStatus(order.id, "paid");
                console.log(`Orden ${order.id} marcada como pagada`);
            } else if (payment.status === "rejected" || payment.status === "cancelled") {
                await updateOrderStatus(order.id, "failed");
                console.log(`Orden ${order.id} marcada como fallida`);
            }
            // Si es "pending" o "in_process", dejamos la orden como "pending"

            return res.status(200).json({ message: "Webhook procesado" });
        }

        // Otros tipos de notificación
        res.status(200).json({ message: "Notificación recibida" });
    } catch (error: any) {
        console.error("Error procesando webhook:", error);
        res.status(500).json({ error: error?.message || "Error interno" });
    }
});

/**
 * GET /payments/order/:reference
 * Obtiene el estado de una orden por su referencia externa
 */
router.get("/order/:reference", async (req, res) => {
    try {
        const { reference } = req.params;

        const order = await getOrderByReference(reference);
        if (!order) {
            return res.status(404).json({ error: "Orden no encontrada" });
        }

        res.json(order);
    } catch (error: any) {
        console.error("Error obteniendo orden:", error);
        res.status(500).json({ error: error?.message || "Error interno" });
    }
});

export default router;

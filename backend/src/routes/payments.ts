import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { preferenceClient } from "@/config/mercadopago";
import {
    createOrder,
    getOrderByReference,
    updateOrderStatus,
    createPayment,
    getPaymentByMpId,
    getEnvioByOrderId,
    updateEnvioStatus,
    getOrderItems,
} from "@/services/ordersService";
import { getProductById } from "@/services/productService";
import { createShipment } from "@/services/enviosService";

const router = Router();

/**
 * POST /payments/create-preference
 * Crea una orden y genera una preferencia de pago en MercadoPago
 */
router.post("/create-preference", async (req, res) => {
    try {
        const { items, shipping } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: "Items requeridos" });
        }

        if (!shipping || !shipping.cost || shipping.cost <= 0) {
            return res.status(400).json({ error: "Datos de envío requeridos" });
        }

        // validar cada item y obtener info del producto
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
            
            // verificar límite si existe
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

        const shippingCost = Number(shipping.cost);
        const totalWithShipping = total + shippingCost;

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
            total: totalWithShipping,
            external_reference,
            // Guardamos info de envío para crear el envío después
            shipping_info: {
                cost: shippingCost,
                rate_id: shipping.rate_id,
                service_type: shipping.service_type,
                point_id: shipping.point_id || null,
                address: shipping.address || null,
                contact: shipping.contact,
            },
        });

        // Crear preferencia de MercadoPago (incluye productos + envío)
        const mpItems = [
            ...validatedItems.map(item => ({
                id: item.id_producto,
                title: item.title,
                quantity: item.quantity,
                unit_price: item.unit_price,
                currency_id: "ARS",
            })),
            {
                id: "shipping",
                title: `Envío (${shipping.service_type === 'pickup_point' ? 'Punto de retiro' : 'A domicilio'})`,
                quantity: 1,
                unit_price: shippingCost,
                currency_id: "ARS",
            },
        ];

        const preference = await preferenceClient.create({
            body: {
                items: mpItems,
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

        // mercadoPago envía diferentes tipos de notificaciones
        if (type === "payment") {
            const paymentId = data?.id;

            if (!paymentId) {
                return res.status(400).json({ error: "Payment ID no recibido" });
            }

            // verificar si ya procesamos este pago
            const existingPayment = await getPaymentByMpId(String(paymentId));
            if (existingPayment) {
                console.log(`Pago ${paymentId} ya fue procesado`);
                return res.status(200).json({ message: "Ya procesado" });
            }

            // importar Payment solo cuando se necesita
            const { Payment } = await import("mercadopago");
            const { MercadoPagoConfig } = await import("mercadopago");
            
            const client = new MercadoPagoConfig({
                accessToken: process.env.MP_ACCESS_TOKEN!,
            });
            const paymentClient = new Payment(client);

            // obtener información del pago desde MercadoPago
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

            if (payment.status === "approved") {
                await updateOrderStatus(order.id, "paid");
                console.log(`Orden ${order.id} marcada como pagada`);

                // crear envío en Zipnova
                const envio = await getEnvioByOrderId(order.id);
                if (envio && envio.status === 'pending') {
                    try {
                        const orderItems = await getOrderItems(order.id);
                        const zipnovaItems = orderItems.map(item => ({ sku: item.id_producto }));

                        const shipmentResult = await createShipment({
                            external_id: envio.id, 
                            declared_value: Number(order.total),
                            service_type: envio.service_type as 'standard_delivery' | 'pickup_point',
                            destination: {
                                name: envio.nombre_cliente,
                                email: envio.email_cliente,
                                phone: envio.telefono_cliente,
                                document: envio.dni_cliente,
                                city: envio.ciudad || '',
                                state: envio.provincia || '',
                                zipcode: envio.codigo_postal || '',
                                street: envio.direccion || undefined,
                                street_number: envio.numero || undefined,
                                street_extras: envio.extra || undefined,
                            },
                            items: zipnovaItems,
                            point_id: envio.point_id || undefined,
                        });

                        if (shipmentResult.success) {
                            await updateEnvioStatus(envio.id, 'created', shipmentResult.shipment_id);
                            console.log(`Envío ${envio.id} creado en Zipnova: ${shipmentResult.shipment_id}`);
                        } else {
                            console.error(`Error creando envío en Zipnova: ${shipmentResult.error}`);
                        }
                    } catch (shipError: any) {
                        console.error("Error creando envío:", shipError);
                    }
                }
            } else if (payment.status === "rejected" || payment.status === "cancelled") {
                await updateOrderStatus(order.id, "failed");
                console.log(`Orden ${order.id} marcada como fallida`);
            }
            // si es pending o in_process, dejamos la orden como pending

            return res.status(200).json({ message: "Webhook procesado" });
        }

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

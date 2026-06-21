import { Request, Response } from "express";
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
    markOrderStockReserved,
    markOrderStockReleased,
    getExpiredReservations,
    isOrderStockReserved,
} from "@/services/ordersService";
import { getProductById, decreaseStock, increaseStock } from "@/services/productService";
import { enviarMailConfirmacionCompra } from "@/services/mailService";
import { couponService } from "@/services/couponService";
import { lotesService } from "@/services/lotesService";
// import { createShipment } from "@/services/enviosService"; // Legacy

export async function cleanupExpiredOrders() {
    try {
        const expiredOrders = await getExpiredReservations(5);
        for (const expiredOrder of expiredOrders) {
            const expiredItems = await getOrderItems(expiredOrder.id);
            for (const item of expiredItems) {
                await increaseStock(item.id_producto, item.cantidad);
                console.log(`Stock liberado para producto ${item.id_producto} (orden expirada ${expiredOrder.id})`);
            }
            await updateOrderStatus(expiredOrder.id, "cancelled");
            await markOrderStockReleased(expiredOrder.id);
        }
    } catch (cleanupError) {
        console.error("Error limpiando reservas expiradas:", cleanupError);
    }
}

/**
 * POST /payments/create-preference
 */
export async function createPreference(req: Request, res: Response) {
    try {
        const { items, shipping, couponCode } = req.body;

        // Limpiar reservas expiradas (órdenes pendientes > 5 min)
        await cleanupExpiredOrders();

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: "Items requeridos" });
        }

        if (!shipping || shipping.cost === undefined || shipping.cost === null || Number(shipping.cost) < 0) {
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

            if (product.limite > 0 && quantity > product.limite) {
                return res.status(400).json({
                    error: `Cantidad excede el límite para ${product.name} (máximo: ${product.limite})`
                });
            }

            if (product.stock < quantity) {
                if (product.stock === 0) {
                    return res.status(400).json({ error: `${product.name} está agotado` });
                }
                return res.status(400).json({
                    error: `Stock insuficiente para ${product.name} (disponible: ${product.stock})`
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

        let discountAmount = 0;
        let validCoupon = null;

        if (couponCode) {
            validCoupon = await couponService.getCouponByCode(couponCode);
            if (validCoupon) {
                const validation = couponService.validateCoupon(validCoupon);
                if (validation.valid) {
                    if (validCoupon.tipo_descuento === 'porcentaje') {
                        discountAmount = (total * validCoupon.valor) / 100;
                    } else if (validCoupon.tipo_descuento === 'fijo') {
                        discountAmount = validCoupon.valor;
                    }
                    if (discountAmount > total && validCoupon.tipo_descuento !== 'envio_gratis') {
                        discountAmount = total;
                    }
                } else {
                    validCoupon = null;
                }
            }
        }

        let shippingCost = Number(shipping.cost);
        let appliedShippingDiscount = 0;

        if (validCoupon?.tipo_descuento === 'envio_gratis') {
            appliedShippingDiscount = shippingCost;
            discountAmount = shippingCost;
            shippingCost = 0; // Para el cobro en MP
        }

        const totalWithShipping = total + shippingCost - (validCoupon?.tipo_descuento === 'envio_gratis' ? 0 : discountAmount);

        const external_reference = uuidv4();

        const loteActual = await lotesService.getLoteActual();

        const order = await createOrder({
            items: validatedItems.map(item => ({
                id_producto: item.id_producto,
                title: item.title,
                cantidad: item.cantidad,
                precio_unitario: item.precio_unitario,
            })),
            total: totalWithShipping,
            external_reference,
            cupon_codigo: validCoupon ? validCoupon.codigo : null,
            cupon_descuento: discountAmount,
            lote_id: loteActual?.id || null,
            shipping_info: {
                cost: Number(shipping.cost), // Guardamos el costo real en la base de datos
                rate_id: shipping.rate_id,
                service_type: shipping.service_type,
                logistic_type: shipping.logistic_type || null,
                carrier_id: shipping.carrier_id || null,
                point_id: shipping.point_id || null,
                address: shipping.address || null,
                contact: shipping.contact,
            },
        });

        // RESERVAR STOCK
        try {
            for (const item of validatedItems) {
                await decreaseStock(item.id_producto, item.cantidad);
                console.log(`Stock reservado: ${item.cantidad} x ${item.id_producto} para orden ${order.id}`);
            }
            await markOrderStockReserved(order.id);
        } catch (stockError: any) {
            console.error("Error reservando stock:", stockError);
            await updateOrderStatus(order.id, "cancelled");
            return res.status(400).json({ error: stockError.message || "Error reservando stock" });
        }

        // Crear preferencia de MercadoPago
        // Distribuimos el descuento proporcionalmente si aplica al subtotal
        let totalDiscountedItems = 0;
        const mpItems = validatedItems.map((item, index) => {
            let discountedUnitPrice = item.unit_price;
            if (discountAmount > 0 && validCoupon?.tipo_descuento !== 'envio_gratis') {
                const discountRatio = (total - discountAmount) / total;
                discountedUnitPrice = Math.round(item.unit_price * discountRatio * 100) / 100;
            }
            totalDiscountedItems += discountedUnitPrice * item.quantity;
            return {
                id: item.id_producto,
                title: item.title,
                quantity: item.quantity,
                unit_price: discountedUnitPrice,
                currency_id: "ARS",
            };
        });

        // Corregir posible error de redondeo en el primer item
        if (discountAmount > 0 && validCoupon?.tipo_descuento !== 'envio_gratis' && mpItems.length > 0) {
            const expectedTotalItems = total - discountAmount;
            const diff = expectedTotalItems - totalDiscountedItems;
            if (diff !== 0) {
                mpItems[0].unit_price += (diff / mpItems[0].quantity);
            }
        }

        // Agregar envío
        mpItems.push({
            id: "shipping",
            title: `Envío (${shipping.service_type === 'pickup_point' ? 'Punto de retiro' : 'A domicilio'})${validCoupon?.tipo_descuento === 'envio_gratis' ? ' - GRATIS' : ''}`,
            quantity: 1,
            unit_price: shippingCost,
            currency_id: "ARS",
        });

        const preference = await preferenceClient.create({
            body: {
                items: mpItems,
                back_urls: {
                    success: process.env.NODE_ENV === 'development'
                        ? "https://zpxtnmn7-3000.brs.devtunnels.ms/payment/success"
                        : `${process.env.PUBLIC_BASE_URL}/payment/success`,
                    failure: process.env.NODE_ENV === 'development'
                        ? "https://zpxtnmn7-3000.brs.devtunnels.ms/payment/failure"
                        : `${process.env.PUBLIC_BASE_URL}/payment/failure`,
                    pending: process.env.NODE_ENV === 'development'
                        ? "https://zpxtnmn7-3000.brs.devtunnels.ms/payment/pending"
                        : `${process.env.PUBLIC_BASE_URL}/payment/pending`,
                },
                auto_return: "approved",
                external_reference: external_reference,
                notification_url: process.env.NODE_ENV === 'development'
                    ? 'https://zpxtnmn7-3001.brs.devtunnels.ms/payments/webhook'
                    : `${process.env.PUBLIC_BASE_URL}/api/payments/webhook`,
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
}

/**
 * POST /payments/webhook
 */
export async function handleWebhook(req: Request, res: Response) {
    try {
        const { type, data } = req.body;

        if (type === "payment") {
            const paymentId = data?.id;

            if (!paymentId) {
                return res.status(400).json({ error: "Payment ID no recibido" });
            }

            const existingPayment = await getPaymentByMpId(String(paymentId));
            if (existingPayment) {
                console.log(`Pago ${paymentId} ya fue procesado`);
                return res.status(200).json({ message: "Ya procesado" });
            }

            const { Payment } = await import("mercadopago");
            const { MercadoPagoConfig } = await import("mercadopago");

            const client = new MercadoPagoConfig({
                accessToken: process.env.MP_ACCESS_TOKEN!,
            });
            const paymentClient = new Payment(client);

            const payment = await paymentClient.get({ id: String(paymentId) });

            const external_reference = payment.external_reference;
            if (!external_reference) {
                console.error("Payment sin external_reference:", paymentId);
                return res.status(200).json({ message: "Sin referencia" });
            }

            const order = await getOrderByReference(external_reference);
            if (!order) {
                console.error("Orden no encontrada:", external_reference);
                return res.status(404).json({ error: "Orden no encontrada" });
            }

            await createPayment({
                id_pedido: order.id,
                mp_payment_id: String(paymentId),
                status: payment.status || "unknown",
                payment_method: payment.payment_method_id || null,
                total: payment.transaction_amount || 0,
            });

            if (payment.status === "approved") {
                // Si la orden había sido cancelada (por expiración u explícita), su stock ya se había devuelto.
                // Como ahora el pago entró y se aprobó (pagos tardíos), volvemos a descontar el stock para que cuadre el inventario.
                if (order.status === "cancelled") {
                    console.log(`Orden ${order.id} aprobada tras haber sido cancelada. Redescontando stock...`);
                    try {
                        const orderItems = await getOrderItems(order.id);
                        for (const item of orderItems) {
                            await decreaseStock(item.id_producto, item.cantidad);
                            console.log(`Stock redescontado: ${item.cantidad} x ${item.id_producto} para orden tardía`);
                        }
                    } catch (err) {
                        console.error("Error redescontando stock de orden cancelada pagada tarde:", err);
                    }
                }

                await updateOrderStatus(order.id, "paid");
                await markOrderStockReleased(order.id);
                console.log(`Orden ${order.id} marcada como pagada, stock confirmado`);

                if (order.cupon_codigo) {
                    try {
                        await couponService.incrementUsage(order.cupon_codigo);
                        console.log(`Uso de cupón ${order.cupon_codigo} incrementado`);
                    } catch (err) {
                        console.error(`Error incrementando uso de cupón ${order.cupon_codigo}:`, err);
                    }
                }

                // Marcar envío para ser despachado
                const envio = await getEnvioByOrderId(order.id);
                if (envio) {
                    if (envio.status === 'pending') {
                        try {
                            await updateEnvioStatus(envio.id, 'to_ship');
                            console.log(`Envío ${envio.id} marcado para despachar (to_ship)`);
                        } catch (shipError: any) {
                            console.error("Error actualizando estado del envío:", shipError);
                        }
                    }

                    // Enviar mail de confirmación de compra
                    try {
                        const items = await getOrderItems(order.id);
                        await enviarMailConfirmacionCompra(
                            envio.email_cliente,
                            envio.nombre_cliente,
                            String(order.id),
                            items,
                            Number(order.total),
                            Number(envio.costo)
                        );
                        console.log(`Mail de confirmación de compra enviado para orden ${order.id}`);
                    } catch (mailError) {
                        console.error("Error al enviar mail de confirmación de compra:", mailError);
                    }
                }
            } else if (payment.status === "rejected" || payment.status === "cancelled") {
                await updateOrderStatus(order.id, "failed");
                console.log(`Orden ${order.id} marcada como fallida`);

                try {
                    if (await isOrderStockReserved(order.id)) {
                        const orderItems = await getOrderItems(order.id);
                        for (const item of orderItems) {
                            await increaseStock(item.id_producto, item.cantidad);
                            console.log(`Stock restaurado: ${item.cantidad} x ${item.id_producto}`);
                        }
                        await markOrderStockReleased(order.id);
                    } else {
                        console.log(`Stock de la orden ${order.id} ya habia sido liberado previamente.`);
                    }
                } catch (stockError: any) {
                    console.error("Error restaurando stock:", stockError);
                }
            }

            return res.status(200).json({ message: "Webhook procesado" });
        }

        res.status(200).json({ message: "Notificación recibida" });
    } catch (error: any) {
        console.error("Error procesando webhook:", error);
        res.status(500).json({ error: error?.message || "Error interno" });
    }
}

/**
 * GET /payments/order/:reference
 */
export async function getOrderByRef(req: Request, res: Response) {
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
}

/**
 * POST /payments/cancel/:reference
 * Permite al frontend cancelar explícitamente una orden pendiente (ej: cuando el usuario presiona "Volver a la tienda").
 */
export async function cancelOrderManually(req: Request, res: Response) {
    try {
        const { reference } = req.params;

        const order = await getOrderByReference(reference);
        if (!order) {
            return res.status(404).json({ error: "Orden no encontrada" });
        }

        // Solo podemos cancelar manualmente órdenes que están "pending"
        if (order.status !== "pending") {
            return res.status(400).json({ error: `La orden no se puede cancelar porque su estado es: ${order.status}` });
        }

        console.log(`Cancelando manualmente la orden ${order.id} (${reference})`);
        
        const isReserved = await isOrderStockReserved(order.id);
        if (isReserved) {
            const orderItems = await getOrderItems(order.id);
            for (const item of orderItems) {
                await increaseStock(item.id_producto, item.cantidad);
                console.log(`Stock liberado manualmente: ${item.cantidad} x ${item.id_producto} (orden ${order.id})`);
            }
            await markOrderStockReleased(order.id);
        }

        await updateOrderStatus(order.id, "cancelled");

        res.json({ message: "Orden cancelada exitosamente" });
    } catch (error: any) {
        console.error("Error cancelando orden manualmente:", error);
        res.status(500).json({ error: error?.message || "Error interno cancelando orden" });
    }
}

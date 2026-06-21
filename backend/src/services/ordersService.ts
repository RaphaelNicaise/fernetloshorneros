import sequelize from "@/config/database";
import { QueryTypes } from "sequelize";
import { v4 as uuidv4 } from "uuid";

function generateShortId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 10);
    return `${timestamp}${random}`.toUpperCase();
}

export type OrderStatus = "pending" | "paid" | "failed" | "cancelled";

export type Order = {
    id: number;
    total: number;
    status: OrderStatus;
    fecha: string;
    external_reference: string;
    zipnova_shipment_id?: string | null;
    tracking_code?: string | null;
    envio_status?: string | null;
    nombre_cliente?: string | null;
    email_cliente?: string | null;
    dni_cliente?: string | null;
    telefono_cliente?: string | null;
    provincia?: string | null;
    ciudad?: string | null;
    codigo_postal?: string | null;
    direccion?: string | null;
    numero?: string | null;
    extra?: string | null;
    costo_envio?: number | null;
    cupon_codigo?: string | null;
    cupon_descuento?: number | null;
    id_lote?: number | null;
};

export type OrderItem = {
    id: number;
    id_pedido: number;
    id_producto: string;
    title: string;
    cantidad: number;
    precio_unitario: number;
};

export type CreateOrderInput = {
    items: Array<{
        id_producto: string;
        title: string;
        cantidad: number;
        precio_unitario: number;
    }>;
    total: number;
    external_reference: string;
    shipping_info?: {
        cost: number;
        rate_id: string;
        service_type: string;
        logistic_type?: string | null;
        carrier_id?: number | null;
        point_id?: string | null;
        address?: {
            provincia?: string;
            ciudad?: string;
            codigoPostal?: string;
            direccion?: string;
            numero?: string;
            extra?: string;
        } | null;
        contact: {
            nombre: string;
            email: string;
            dni: string;
            telefono: string;
        };
    };
    cupon_codigo?: string | null;
    cupon_descuento?: number;
    id_lote?: number | null;
};

export type Payment = {
    id: number;
    id_pedido: number;
    mp_payment_id: string;
    status: string;
    payment_method: string | null;
    total: number;
    fecha: string;
};

/**
 * Crea una nueva orden con sus items
 */
export async function createOrder(input: CreateOrderInput): Promise<Order> {
    const transaction = await sequelize.transaction();

    try {
        // Insertar orden
        const [orderResult]: any = await sequelize.query(
            `INSERT INTO pedidos (total, status, external_reference, cupon_codigo, cupon_descuento, id_lote) 
             VALUES (:total, :status, :external_reference, :cupon_codigo, :cupon_descuento, :id_lote)`,
            {
                replacements: {
                    total: input.total,
                    status: "pending",
                    external_reference: input.external_reference,
                    cupon_codigo: input.cupon_codigo || null,
                    cupon_descuento: input.cupon_descuento || 0,
                    id_lote: input.id_lote || null
                },
                type: QueryTypes.INSERT,
                transaction,
            }
        );

        // Insertar items
        for (const item of input.items) {
            await sequelize.query(
                `INSERT INTO pedido_items (id_pedido, id_producto, title, cantidad, precio_unitario) 
                 VALUES (:id_pedido, :id_producto, :title, :cantidad, :precio_unitario)`,
                {
                    replacements: {
                        id_pedido: orderResult,
                        id_producto: item.id_producto,
                        title: item.title,
                        cantidad: item.cantidad,
                        precio_unitario: item.precio_unitario,
                    },
                    type: QueryTypes.INSERT,
                    transaction,
                }
            );
        }

        if (input.shipping_info) {
            const ship = input.shipping_info;
            const envioId = generateShortId();
            await sequelize.query(
                `INSERT INTO envios (
                    id, id_pedido, rate_id, service_type, logistic_type, carrier_id, point_id, costo,
                    provincia, ciudad, codigo_postal, direccion, numero, extra,
                    nombre_cliente, email_cliente, dni_cliente, telefono_cliente
                ) VALUES (
                    :id, :id_pedido, :rate_id, :service_type, :logistic_type, :carrier_id, :point_id, :costo,
                    :provincia, :ciudad, :codigo_postal, :direccion, :numero, :extra,
                    :nombre_cliente, :email_cliente, :dni_cliente, :telefono_cliente
                )`,
                {
                    replacements: {
                        id: envioId,
                        id_pedido: orderResult,
                        rate_id: ship.rate_id,
                        service_type: ship.service_type,
                        logistic_type: ship.logistic_type || null,
                        carrier_id: ship.carrier_id || null,
                        point_id: ship.point_id || null,
                        costo: ship.cost,
                        provincia: ship.address?.provincia || null,
                        ciudad: ship.address?.ciudad || null,
                        codigo_postal: ship.address?.codigoPostal || null,
                        direccion: ship.address?.direccion || null,
                        numero: ship.address?.numero || null,
                        extra: ship.address?.extra || null,
                        nombre_cliente: ship.contact.nombre,
                        email_cliente: ship.contact.email,
                        dni_cliente: ship.contact.dni,
                        telefono_cliente: ship.contact.telefono,
                    },
                    type: QueryTypes.INSERT,
                    transaction,
                }
            );
        }

        await transaction.commit();

        // Obtener la orden creada
        const orders = await sequelize.query<Order>(
            `SELECT id, total, status, fecha, external_reference FROM pedidos WHERE id = :id`,
            {
                replacements: { id: orderResult },
                type: QueryTypes.SELECT,
            }
        );

        return orders[0];
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
}

/**
 * Obtiene una orden por su external_reference
 */
export async function getOrderByReference(external_reference: string): Promise<Order | null> {
    const orders = await sequelize.query<Order>(
        `SELECT id, total, status, fecha, external_reference FROM pedidos WHERE external_reference = :external_reference`,
        {
            replacements: { external_reference },
            type: QueryTypes.SELECT,
        }
    );

    return orders.length > 0 ? orders[0] : null;
}

/**
 * Obtiene una orden por ID
 */
export async function getOrderById(id: number): Promise<Order | null> {
    const orders = await sequelize.query<Order>(
        `SELECT id, total, status, fecha, external_reference FROM pedidos WHERE id = :id`,
        {
            replacements: { id },
            type: QueryTypes.SELECT,
        }
    );

    return orders.length > 0 ? orders[0] : null;
}

/**
 * Obtiene los items de una orden
 */
export async function getOrderItems(orderId: number): Promise<OrderItem[]> {
    const items = await sequelize.query<OrderItem>(
        `SELECT id, id_pedido, id_producto, title, cantidad, precio_unitario 
         FROM pedido_items 
         WHERE id_pedido = :orderId`,
        {
            replacements: { orderId },
            type: QueryTypes.SELECT,
        }
    );

    return items;
}

/**
 * Obtiene todos los items de todos los pedidos
 */
export async function getAllOrderItems(): Promise<OrderItem[]> {
    const items = await sequelize.query<OrderItem>(
        `SELECT id, id_pedido, id_producto, title, cantidad, precio_unitario 
         FROM pedido_items`,
        {
            type: QueryTypes.SELECT,
        }
    );

    return items;
}


/**
 * Actualiza el estado de una orden
 */
export async function updateOrderStatus(orderId: number, status: OrderStatus): Promise<void> {
    await sequelize.query(
        `UPDATE pedidos SET status = :status WHERE id = :id`,
        {
            replacements: { id: orderId, status },
            type: QueryTypes.UPDATE,
        }
    );
}

/**
 * Registra un pago de MercadoPago
 */
export async function createPayment(payment: {
    id_pedido: number;
    mp_payment_id: string;
    status: string;
    payment_method: string | null;
    total: number;
}): Promise<void> {
    await sequelize.query(
        `INSERT INTO pagos (id_pedido, mp_payment_id, status, payment_method, total) 
         VALUES (:id_pedido, :mp_payment_id, :status, :payment_method, :total)`,
        {
            replacements: payment,
            type: QueryTypes.INSERT,
        }
    );
}

/**
 * Obtiene el pago de MercadoPago por su ID
 */
export async function getPaymentByMpId(mp_payment_id: string): Promise<Payment | null> {
    const payments = await sequelize.query<Payment>(
        `SELECT id, id_pedido, mp_payment_id, status, payment_method, total, fecha 
         FROM pagos 
         WHERE mp_payment_id = :mp_payment_id`,
        {
            replacements: { mp_payment_id },
            type: QueryTypes.SELECT,
        }
    );

    return payments.length > 0 ? payments[0] : null;
}

/**
 * Obtiene el pago de una orden por su ID de pedido
 */
export async function getPaymentByOrderId(orderId: number): Promise<Payment | null> {
    const payments = await sequelize.query<Payment>(
        `SELECT id, id_pedido, mp_payment_id, status, payment_method, total, fecha 
         FROM pagos 
         WHERE id_pedido = :orderId
         ORDER BY fecha DESC
         LIMIT 1`,
        {
            replacements: { orderId },
            type: QueryTypes.SELECT,
        }
    );

    return payments.length > 0 ? payments[0] : null;
}

/**
 * Obtiene todas las órdenes
 */
export async function getAllOrders(id_lote?: number | null): Promise<Order[]> {
    let query = `SELECT 
            p.id, p.total, p.status, p.fecha, p.external_reference, p.cupon_codigo, p.cupon_descuento,
            p.id_lote,
            e.zipnova_shipment_id, e.tracking_code, e.status as envio_status,
            e.nombre_cliente, e.email_cliente, e.dni_cliente, e.telefono_cliente,
            e.provincia, e.ciudad, e.codigo_postal, e.direccion, e.numero, e.extra, e.costo AS costo_envio
         FROM pedidos p 
         LEFT JOIN envios e ON e.id = (
             SELECT id FROM envios e2 WHERE e2.id_pedido = p.id ORDER BY e2.fecha DESC LIMIT 1
         )`;

    if (id_lote) {
        query += ` WHERE p.id_lote = :id_lote`;
    }

    query += ` ORDER BY p.fecha DESC`;

    const orders = await sequelize.query<Order>(query, {
        replacements: id_lote ? { id_lote } : {},
        type: QueryTypes.SELECT,
    });

    return orders;
}


export type Envio = {
    id: string;
    id_pedido: number;
    rate_id: string;
    service_type: string;
    logistic_type: string | null;
    carrier_id: string | null;
    point_id: string | null;
    costo: number;
    provincia: string | null;
    ciudad: string | null;
    codigo_postal: string | null;
    direccion: string | null;
    numero: string | null;
    extra: string | null;
    nombre_cliente: string;
    email_cliente: string;
    dni_cliente: string;
    telefono_cliente: string;
    status: string;
    tracking_code: string | null;
    zipnova_shipment_id: string | null;
    fecha: string;
};

/**
 * Obtiene el envío de una orden
 */
export async function getEnvioByOrderId(orderId: number): Promise<Envio | null> {
    const envios = await sequelize.query<Envio>(
        `SELECT * FROM envios WHERE id_pedido = :orderId`,
        {
            replacements: { orderId },
            type: QueryTypes.SELECT,
        }
    );

    return envios.length > 0 ? envios[0] : null;
}

/**
 * Actualiza el estado del envío y guarda el ID de Zipnova
 */
export async function updateEnvioStatus(
    envioId: string,
    status: string,
    zipnovaShipmentId?: string
): Promise<void> {
    await sequelize.query(
        `UPDATE envios 
         SET status = :status, zipnova_shipment_id = :zipnova_shipment_id 
         WHERE id = :id`,
        {
            replacements: {
                id: envioId,
                status,
                zipnova_shipment_id: zipnovaShipmentId || null,
            },
            type: QueryTypes.UPDATE,
        }
    );
}

/**
 * Actualiza el tracking code del envío y lo marca como shipped
 */
export async function updateEnvioTracking(
    envioId: string,
    trackingCode: string
): Promise<void> {
    await sequelize.query(
        `UPDATE envios 
         SET status = 'shipped', tracking_code = :tracking_code 
         WHERE id = :id`,
        {
            replacements: {
                id: envioId,
                tracking_code: trackingCode,
            },
            type: QueryTypes.UPDATE,
        }
    );
}
/**
 * Devuelve la cantidad de stock reservado por producto (pendientes de pago con stock reservado)
 */
export async function getReservedStockByProduct(): Promise<Record<string, number>> {
    const rows = await sequelize.query<{ id_producto: string; reserved: string }>(
        `SELECT pi.id_producto, SUM(pi.cantidad) as reserved
         FROM pedido_items pi
         JOIN pedidos p ON p.id = pi.id_pedido
         WHERE p.status = 'pending' AND p.stock_reserved = 1
         GROUP BY pi.id_producto`,
        { type: QueryTypes.SELECT }
    );
    const map: Record<string, number> = {};
    for (const row of rows) {
        map[row.id_producto] = Number(row.reserved) || 0;
    }
    return map;
}

/**
 * Marca una orden como que tiene stock reservado
 */
export async function markOrderStockReserved(orderId: number): Promise<void> {
    await sequelize.query(
        `UPDATE pedidos SET stock_reserved = 1, stock_reserved_at = NOW() WHERE id = :id`,
        {
            replacements: { id: orderId },
            type: QueryTypes.UPDATE,
        }
    );
}

export async function markOrderStockReleased(orderId: number): Promise<void> {
    await sequelize.query(
        `UPDATE pedidos SET stock_reserved = 0 WHERE id = :id`,
        {
            replacements: { id: orderId },
            type: QueryTypes.UPDATE,
        }
    );
}

/**
 * Verifica si el stock de una orden está marcado como reservado
 */
export async function isOrderStockReserved(orderId: number): Promise<boolean> {
    const pedidoRows = await sequelize.query<any>(
        `SELECT stock_reserved FROM pedidos WHERE id = :id`,
        {
            replacements: { id: orderId },
            type: QueryTypes.SELECT,
        }
    );
    return pedidoRows && pedidoRows.length > 0 && pedidoRows[0].stock_reserved === 1;
}

/**
 * Obtiene órdenes pendientes con stock reservado que expiraron (más de X minutos)
 */
export async function getExpiredReservations(minutesThreshold: number = 5): Promise<Array<{ id: number }>> {
    const orders = await sequelize.query<{ id: number }>(
        `SELECT id FROM pedidos 
         WHERE status = 'pending' 
           AND stock_reserved = 1 
           AND stock_reserved_at < DATE_SUB(NOW(), INTERVAL :minutes MINUTE)`,
        {
            replacements: { minutes: minutesThreshold },
            type: QueryTypes.SELECT,
        }
    );
    return orders;
}

/**
 * Actualiza manualmente el estado de un pedido (soporta transición de estados efectiva)
 */
export async function manualUpdateOrderStatus(
    orderId: number,
    newEffectiveStatus: "pendiente" | "para_despachar" | "enviado" | "cancelado" | "venta_local",
    trackingCode?: string | null,
    restoreStock: boolean = false
): Promise<void> {
    const transaction = await sequelize.transaction();
    try {
        // 1. Obtener estado actual del pedido y envío
        const orders = await sequelize.query<any>(
            `SELECT p.status as order_status, e.status as envio_status 
             FROM pedidos p 
             LEFT JOIN envios e ON e.id_pedido = p.id 
             WHERE p.id = :id`,
            {
                replacements: { id: orderId },
                type: QueryTypes.SELECT,
                transaction,
            }
        );

        if (orders.length === 0) {
            throw new Error(`Pedido ${orderId} no encontrado`);
        }

        const currentOrder = orders[0];
        const oldEffectiveStatus = (() => {
            if (currentOrder.envio_status === 'cancelled' || currentOrder.order_status === 'cancelled' || currentOrder.order_status === 'failed') return "cancelado";
            if (currentOrder.order_status === 'paid') {
                if (currentOrder.envio_status === 'local') return "venta_local";
                if (currentOrder.envio_status === 'shipped') return "enviado";
                return "para_despachar";
            }
            return "pendiente";
        })();

        // Mapear estado efectivo a estados en DB
        let pedidoStatus: OrderStatus = "pending";
        let envioStatus = "pending";

        if (newEffectiveStatus === "pendiente") {
            pedidoStatus = "pending";
            envioStatus = "pending";
        } else if (newEffectiveStatus === "para_despachar") {
            pedidoStatus = "paid";
            envioStatus = "pending";
        } else if (newEffectiveStatus === "enviado") {
            pedidoStatus = "paid";
            envioStatus = "shipped";
        } else if (newEffectiveStatus === "cancelado") {
            pedidoStatus = "cancelled";
            envioStatus = "cancelled";
        } else if (newEffectiveStatus === "venta_local") {
            pedidoStatus = "paid";
            envioStatus = "local";
        }

        // 2. Actualizar estado del pedido (pedidos)
        await sequelize.query(
            `UPDATE pedidos SET status = :status WHERE id = :id`,
            {
                replacements: { id: orderId, status: pedidoStatus },
                type: QueryTypes.UPDATE,
                transaction,
            }
        );

        // 3. Actualizar estado del envío (envios)
        const envios = await sequelize.query<any>(
            `SELECT id FROM envios WHERE id_pedido = :orderId`,
            {
                replacements: { orderId },
                type: QueryTypes.SELECT,
                transaction,
            }
        );

        if (envios.length > 0) {
            const envioId = envios[0].id;
            if (newEffectiveStatus === "enviado") {
                await sequelize.query(
                    `UPDATE envios SET status = :status, tracking_code = :tracking_code WHERE id = :id`,
                    {
                        replacements: {
                            id: envioId,
                            status: envioStatus,
                            tracking_code: trackingCode || null
                        },
                        type: QueryTypes.UPDATE,
                        transaction,
                    }
                );
            } else {
                // Si cambiamos de enviado a otro estado, limpiamos el código de seguimiento
                await sequelize.query(
                    `UPDATE envios SET status = :status, tracking_code = NULL WHERE id = :id`,
                    {
                        replacements: {
                            id: envioId,
                            status: envioStatus
                        },
                        type: QueryTypes.UPDATE,
                        transaction,
                    }
                );
            }
        }

        // 4. Restauración de stock si se cancela y se solicita restaurar stock
        if (newEffectiveStatus === "cancelado" && oldEffectiveStatus !== "cancelado" && restoreStock) {
            const items = await sequelize.query<any>(
                `SELECT id_producto, cantidad FROM pedido_items WHERE id_pedido = :orderId`,
                {
                    replacements: { orderId },
                    type: QueryTypes.SELECT,
                    transaction,
                }
            );

            for (const item of items) {
                const products = await sequelize.query<any>(
                    `SELECT stock, status FROM productos WHERE id = :id`,
                    {
                        replacements: { id: item.id_producto },
                        type: QueryTypes.SELECT,
                        transaction,
                    }
                );
                if (products.length > 0) {
                    const p = products[0];
                    const newStock = Number(p.stock) + Number(item.cantidad);
                    const newStatus = p.status === 'agotado' && newStock > 0 ? 'disponible' : p.status;
                    await sequelize.query(
                        `UPDATE productos SET stock = :newStock, status = :newStatus WHERE id = :id`,
                        {
                            replacements: { id: item.id_producto, newStock, newStatus },
                            type: QueryTypes.UPDATE,
                            transaction,
                        }
                    );
                }
            }

            // También nos aseguramos de liberar la bandera de reserva si seguía activa
            await sequelize.query(
                `UPDATE pedidos SET stock_reserved = 0 WHERE id = :id`,
                {
                    replacements: { id: orderId },
                    type: QueryTypes.UPDATE,
                    transaction,
                }
            );
        }

        await transaction.commit();
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
}

/**
 * Actualiza los datos de envío/cliente de un pedido en la tabla envios
 */
export async function updateOrderDetails(
    orderId: number,
    data: {
        nombre_cliente: string;
        email_cliente: string;
        dni_cliente: string;
        telefono_cliente: string;
        provincia: string;
        ciudad: string;
        codigo_postal: string;
        direccion: string;
        numero: string;
        extra: string | null;
        items?: {
            id_producto: string;
            cantidad: number;
        }[];
    }
): Promise<void> {
    const transaction = await sequelize.transaction();
    try {
        await sequelize.query(
            `UPDATE envios 
             SET 
                nombre_cliente = :nombre_cliente,
                email_cliente = :email_cliente,
                dni_cliente = :dni_cliente,
                telefono_cliente = :telefono_cliente,
                provincia = :provincia,
                ciudad = :ciudad,
                codigo_postal = :codigo_postal,
                direccion = :direccion,
                numero = :numero,
                extra = :extra
             WHERE id_pedido = :orderId`,
            {
                replacements: {
                    orderId,
                    nombre_cliente: data.nombre_cliente,
                    email_cliente: data.email_cliente,
                    dni_cliente: data.dni_cliente,
                    telefono_cliente: data.telefono_cliente,
                    provincia: data.provincia,
                    ciudad: data.ciudad,
                    codigo_postal: data.codigo_postal,
                    direccion: data.direccion,
                    numero: data.numero,
                    extra: data.extra || null
                },
                type: QueryTypes.UPDATE,
                transaction
            }
        );

        if (data.items) {
            // Revisar si el pedido ya tiene stock reservado/descontado
            const pedidoRows: any = await sequelize.query(
                `SELECT stock_reserved FROM pedidos WHERE id = :id`,
                { replacements: { id: orderId }, type: QueryTypes.SELECT, transaction }
            );
            const stockReserved = pedidoRows && pedidoRows.length > 0 && pedidoRows[0].stock_reserved === 1;

            const currentItems: any[] = await sequelize.query(
                `SELECT id_producto, cantidad, precio_unitario, title FROM pedido_items WHERE id_pedido = :orderId`,
                { replacements: { orderId }, type: QueryTypes.SELECT, transaction }
            );

            const currentItemMap = new Map(currentItems.map(i => [i.id_producto, i]));
            const newItemMap = new Map(data.items.map(i => [i.id_producto, i]));

            let newTotalItemsCost = 0;

            // Procesar items actuales
            for (const current of currentItems) {
                const updated = newItemMap.get(current.id_producto);
                if (!updated) {
                    // El item fue eliminado del pedido
                    if (stockReserved) {
                        const products = await sequelize.query<any>(
                            `SELECT stock, status FROM productos WHERE id = :id`,
                            { replacements: { id: current.id_producto }, type: QueryTypes.SELECT, transaction }
                        );
                        if (products.length > 0) {
                            const newStock = Number(products[0].stock) + Number(current.cantidad);
                            const newStatus = products[0].status === 'agotado' && newStock > 0 ? 'disponible' : products[0].status;
                            await sequelize.query(
                                `UPDATE productos SET stock = :newStock, status = :newStatus WHERE id = :id`,
                                { replacements: { id: current.id_producto, newStock, newStatus }, type: QueryTypes.UPDATE, transaction }
                            );
                        }
                    }
                    await sequelize.query(
                        `DELETE FROM pedido_items WHERE id_pedido = :orderId AND id_producto = :id_producto`,
                        { replacements: { orderId, id_producto: current.id_producto }, type: QueryTypes.DELETE, transaction }
                    );
                } else {
                    // El item se mantiene, pero la cantidad puede haber cambiado
                    if (updated.cantidad !== current.cantidad) {
                        const diff = updated.cantidad - current.cantidad;
                        if (stockReserved) {
                            const products = await sequelize.query<any>(
                                `SELECT stock, status FROM productos WHERE id = :id`,
                                { replacements: { id: current.id_producto }, type: QueryTypes.SELECT, transaction }
                            );
                            if (products.length > 0) {
                                // diff > 0 significa que se agregaron unidades, hay que restar del stock.
                                // diff < 0 significa que se quitaron unidades, hay que sumar al stock.
                                const newStock = Math.max(0, Number(products[0].stock) - diff);
                                let newStatus = products[0].status;
                                if (newStock === 0) newStatus = 'agotado';
                                else if (newStock > 0 && products[0].status === 'agotado') newStatus = 'disponible';
                                
                                await sequelize.query(
                                    `UPDATE productos SET stock = :newStock, status = :newStatus WHERE id = :id`,
                                    { replacements: { id: current.id_producto, newStock, newStatus }, type: QueryTypes.UPDATE, transaction }
                                );
                            }
                        }
                        await sequelize.query(
                            `UPDATE pedido_items SET cantidad = :cantidad WHERE id_pedido = :orderId AND id_producto = :id_producto`,
                            { replacements: { orderId, id_producto: current.id_producto, cantidad: updated.cantidad }, type: QueryTypes.UPDATE, transaction }
                        );
                    }
                    newTotalItemsCost += Number(current.precio_unitario) * updated.cantidad;
                }
            }

            // Procesar items nuevos
            for (const updated of data.items) {
                if (!currentItemMap.has(updated.id_producto)) {
                    // Obtener datos actuales del producto para asignar precio e insertarlo
                    const prodInfo = await sequelize.query<any>(
                        `SELECT name, price, stock, status FROM productos WHERE id = :id`,
                        { replacements: { id: updated.id_producto }, type: QueryTypes.SELECT, transaction }
                    );
                    if (prodInfo.length === 0) throw new Error(`Producto ${updated.id_producto} no encontrado`);
                    
                    const p = prodInfo[0];
                    
                    if (stockReserved) {
                        const newStock = Math.max(0, Number(p.stock) - updated.cantidad);
                        const newStatus = newStock === 0 ? 'agotado' : p.status;
                        await sequelize.query(
                            `UPDATE productos SET stock = :newStock, status = :newStatus WHERE id = :id`,
                            { replacements: { id: updated.id_producto, newStock, newStatus }, type: QueryTypes.UPDATE, transaction }
                        );
                    }

                    await sequelize.query(
                        `INSERT INTO pedido_items (id_pedido, id_producto, title, cantidad, precio_unitario) VALUES (:orderId, :id_producto, :title, :cantidad, :precio_unitario)`,
                        {
                            replacements: {
                                orderId,
                                id_producto: updated.id_producto,
                                title: p.name,
                                cantidad: updated.cantidad,
                                precio_unitario: p.price
                            },
                            type: QueryTypes.INSERT,
                            transaction
                        }
                    );

                    newTotalItemsCost += Number(p.price) * updated.cantidad;
                }
            }

            // Recalcular el total del pedido incluyendo el envío original
            const envios = await sequelize.query<any>(`SELECT costo FROM envios WHERE id_pedido = :id`, { replacements: { id: orderId }, type: QueryTypes.SELECT, transaction });
            const shippingCost = envios.length > 0 ? Number(envios[0].costo || 0) : 0;
            const finalTotal = newTotalItemsCost + shippingCost;

            await sequelize.query(
                `UPDATE pedidos SET total = :finalTotal WHERE id = :orderId`,
                { replacements: { orderId, finalTotal }, type: QueryTypes.UPDATE, transaction }
            );
        }

        await transaction.commit();
    } catch (e) {
        await transaction.rollback();
        throw e;
    }
}

/**
 * Elimina físicamente un pedido y todos sus registros relacionados (pagos, envíos, items)
 * Opcionalmente restaura el stock reservado antes de borrar los items.
 */
export async function deleteOrder(orderId: number, restoreStock: boolean): Promise<void> {
    const transaction = await sequelize.transaction();
    try {
        if (restoreStock) {
            const pedidoRows: any = await sequelize.query(
                `SELECT stock_reserved FROM pedidos WHERE id = :id`,
                { replacements: { id: orderId }, type: QueryTypes.SELECT, transaction }
            );

            if (pedidoRows && pedidoRows.length > 0 && pedidoRows[0].stock_reserved === 1) {
                const items: any[] = await sequelize.query(
                    `SELECT id_producto, cantidad FROM pedido_items WHERE id_pedido = :orderId`,
                    { replacements: { orderId }, type: QueryTypes.SELECT, transaction }
                );

                for (const item of items) {
                    const products = await sequelize.query<any>(
                        `SELECT stock, status FROM productos WHERE id = :id`,
                        { replacements: { id: item.id_producto }, type: QueryTypes.SELECT, transaction }
                    );
                    if (products.length > 0) {
                        const p = products[0];
                        const newStock = Number(p.stock) + Number(item.cantidad);
                        const newStatus = p.status === 'agotado' && newStock > 0 ? 'disponible' : p.status;
                        await sequelize.query(
                            `UPDATE productos SET stock = :newStock, status = :newStatus WHERE id = :id`,
                            { replacements: { id: item.id_producto, newStock, newStatus }, type: QueryTypes.UPDATE, transaction }
                        );
                    }
                }
            }
        }

        await sequelize.query(`DELETE FROM pagos WHERE id_pedido = :id`, { replacements: { id: orderId }, type: QueryTypes.DELETE, transaction });
        await sequelize.query(`DELETE FROM envios WHERE id_pedido = :id`, { replacements: { id: orderId }, type: QueryTypes.DELETE, transaction });
        await sequelize.query(`DELETE FROM pedido_items WHERE id_pedido = :id`, { replacements: { id: orderId }, type: QueryTypes.DELETE, transaction });
        await sequelize.query(`DELETE FROM pedidos WHERE id = :id`, { replacements: { id: orderId }, type: QueryTypes.DELETE, transaction });

        await transaction.commit();
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
}

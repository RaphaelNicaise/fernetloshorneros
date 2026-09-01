import sequelize from "@/config/database";
import { QueryTypes } from "sequelize";
import { CreateOrderInput, Order, OrderStatus } from "./types";

function generateShortId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 10);
    return `${timestamp}${random}`.toUpperCase();
}

/**
 * Crea una nueva orden con sus items
 */
export async function createOrder(input: CreateOrderInput): Promise<Order> {
    const transaction = await sequelize.transaction();

    try {
        // Insertar orden
        const [orderId] = await sequelize.query(
            `INSERT INTO pedidos (total, status, external_reference, cupon_codigo, cupon_descuento, lote_id) 
             VALUES (:total, :status, :external_reference, :cupon_codigo, :cupon_descuento, :lote_id)`,
            {
                replacements: {
                    total: input.total,
                    status: "pending",
                    external_reference: input.external_reference,
                    cupon_codigo: input.cupon_codigo || null,
                    cupon_descuento: input.cupon_descuento || 0,
                    lote_id: input.lote_id || null
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
                        id_pedido: orderId,
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
                        id_pedido: orderId,
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
                replacements: { id: orderId },
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

            for (const current of currentItems) {
                const updated = newItemMap.get(current.id_producto);
                if (!updated) {
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
                    if (updated.cantidad !== current.cantidad) {
                        const diff = updated.cantidad - current.cantidad;
                        if (stockReserved) {
                            const products = await sequelize.query<any>(
                                `SELECT stock, status FROM productos WHERE id = :id`,
                                { replacements: { id: current.id_producto }, type: QueryTypes.SELECT, transaction }
                            );
                            if (products.length > 0) {
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

            for (const updated of data.items) {
                if (!currentItemMap.has(updated.id_producto)) {
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

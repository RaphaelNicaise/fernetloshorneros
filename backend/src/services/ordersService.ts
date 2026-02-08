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
    envio_status?: string | null;
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
        const [orderId] = await sequelize.query(
            `INSERT INTO pedidos (total, status, external_reference) VALUES (:total, 'pending', :external_reference)`,
            {
                replacements: {
                    total: input.total,
                    external_reference: input.external_reference,
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
                    id, id_pedido, rate_id, service_type, point_id, costo,
                    provincia, ciudad, codigo_postal, direccion, numero, extra,
                    nombre_cliente, email_cliente, dni_cliente, telefono_cliente
                ) VALUES (
                    :id, :id_pedido, :rate_id, :service_type, :point_id, :costo,
                    :provincia, :ciudad, :codigo_postal, :direccion, :numero, :extra,
                    :nombre_cliente, :email_cliente, :dni_cliente, :telefono_cliente
                )`,
                {
                    replacements: {
                        id: envioId,
                        id_pedido: orderId,
                        rate_id: ship.rate_id,
                        service_type: ship.service_type,
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
export async function getAllOrders(): Promise<Order[]> {
    const orders = await sequelize.query<Order>(
        `SELECT 
            p.id, 
            p.total, 
            p.status, 
            p.fecha, 
            p.external_reference,
            (
              SELECT e.zipnova_shipment_id 
              FROM envios e 
              WHERE e.id_pedido = p.id 
              ORDER BY e.fecha DESC 
              LIMIT 1
                        ) AS zipnova_shipment_id,
                        (
                            SELECT e.status
                            FROM envios e
                            WHERE e.id_pedido = p.id
                            ORDER BY e.fecha DESC
                            LIMIT 1
                        ) AS envio_status
         FROM pedidos p 
         ORDER BY p.fecha DESC`,
        {
            type: QueryTypes.SELECT,
        }
    );

    return orders;
}


export type Envio = {
    id: string;
    id_pedido: number;
    rate_id: string;
    service_type: string;
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

/**
 * Marca una orden como que ya no tiene stock reservado (fue usado o liberado)
 */
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


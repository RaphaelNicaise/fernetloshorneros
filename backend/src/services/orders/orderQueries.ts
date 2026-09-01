import sequelize from "@/config/database";
import { QueryTypes } from "sequelize";
import { Order, OrderItem, OrderStatus, Payment } from "./types";

/**
 * Obtiene una orden por su external_reference
 */
export async function getOrderByReference(external_reference: string): Promise<Order | null> {
    const orders = await sequelize.query<Order>(
        `SELECT * FROM pedidos WHERE external_reference = :external_reference`,
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
        `SELECT * FROM pedidos WHERE id = :id`,
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
 * Obtiene todas las órdenes
 */
export async function getAllOrders(lote_id?: number | null): Promise<Order[]> {
    let query = `SELECT 
            p.id, 
            p.total, 
            p.status, 
            p.fecha, 
            p.external_reference,
            p.cupon_codigo,
            p.cupon_descuento,
            p.lote_id,
            e.zipnova_shipment_id,
            e.tracking_code,
            e.status AS envio_status,
            e.nombre_cliente,
            e.email_cliente,
            e.dni_cliente,
            e.telefono_cliente,
            e.provincia,
            e.ciudad,
            e.codigo_postal,
            e.direccion,
            e.numero,
            e.extra,
            e.costo AS costo_envio
         FROM pedidos p 
         LEFT JOIN envios e ON e.id = (
             SELECT id FROM envios e2 WHERE e2.id_pedido = p.id ORDER BY e2.fecha DESC LIMIT 1
         )`;

    if (lote_id) {
        query += ` WHERE p.lote_id = :lote_id`;
    }

    query += ` ORDER BY p.fecha DESC`;

    const orders = await sequelize.query<Order>(query, {
        replacements: lote_id ? { lote_id } : {},
        type: QueryTypes.SELECT,
    });

    return orders;
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

import sequelize from "@/config/database";
import { QueryTypes } from "sequelize";

export type OrderStatus = "pending" | "paid" | "failed" | "cancelled";

export type Order = {
    id: number;
    total: number;
    status: OrderStatus;
    fecha: string;
    external_reference: string;
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
 * Obtiene todas las órdenes
 */
export async function getAllOrders(): Promise<Order[]> {
    const orders = await sequelize.query<Order>(
        `SELECT id, total, status, fecha, external_reference FROM pedidos ORDER BY fecha DESC`,
        {
            type: QueryTypes.SELECT,
        }
    );

    return orders;
}

import sequelize from "@/config/database";
import { QueryTypes } from "sequelize";

let reservedStockCache: { data: Record<string, number>; timestamp: number } | null = null;
const RESERVED_STOCK_TTL_MS = 15_000;

export function clearReservedStockCache() {
    reservedStockCache = null;
}

/**
 * Devuelve la cantidad de stock reservado por producto (pendientes de pago con stock reservado)
 */
export async function getReservedStockByProduct(): Promise<Record<string, number>> {
    const isTest = process.env.NODE_ENV === 'test';
    if (!isTest && reservedStockCache && Date.now() - reservedStockCache.timestamp < RESERVED_STOCK_TTL_MS) {
        return reservedStockCache.data;
    }

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

    if (!isTest) {
        reservedStockCache = { data: map, timestamp: Date.now() };
    }
    return map;
}

/**
 * Marca una orden como que tiene stock reservado
 */
export async function markOrderStockReserved(orderId: number): Promise<void> {
    clearReservedStockCache();
    await sequelize.query(
        `UPDATE pedidos SET stock_reserved = 1, stock_reserved_at = NOW() WHERE id = :id`,
        {
            replacements: { id: orderId },
            type: QueryTypes.UPDATE,
        }
    );
}

/**
 * Marca una orden liberando su reserva de stock
 */
export async function markOrderStockReleased(orderId: number): Promise<void> {
    clearReservedStockCache();
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
export async function getExpiredReservations(minutesThreshold: number = 10): Promise<Array<{ id: number }>> {
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

import sequelize from "@/config/database";
import { QueryTypes } from "sequelize";
import { Envio } from "./types";

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

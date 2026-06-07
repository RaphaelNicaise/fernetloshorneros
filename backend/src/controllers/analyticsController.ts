import { Request, Response } from "express";
import sequelize from "@/config/database";
import { QueryTypes } from "sequelize";

export async function getBiAnalytics(req: Request, res: Response) {
    try {
        const { startDate, endDate, groupBy } = req.query;

        // Default: últimos 30 días
        const start = startDate ? new Date(startDate as string) : new Date(new Date().setDate(new Date().getDate() - 30));
        const end = endDate ? new Date(endDate as string) : new Date();

        // Asegurar que las fechas incluyan todo el día
        end.setHours(23, 59, 59, 999);
        start.setHours(0, 0, 0, 0);

        // ==========================================
        // 1. Salud del Negocio (Ventas e Ingresos)
        // ==========================================
        const revenueEvolution = await sequelize.query(
            `SELECT 
                DATE(p.fecha) as date,
                SUM(p.total) as revenue,
                COUNT(p.id) as orders
             FROM pedidos p
             WHERE p.status = 'paid' AND p.fecha BETWEEN :start AND :end
             GROUP BY date
             ORDER BY MIN(p.fecha) ASC`,
            { replacements: { start, end }, type: QueryTypes.SELECT }
        );

        const funnel = await sequelize.query(
            `SELECT 
                status, 
                COUNT(*) as count
             FROM pedidos
             WHERE fecha BETWEEN :start AND :end
             GROUP BY status`,
            { replacements: { start, end }, type: QueryTypes.SELECT }
        );

        const [avgTicketResult]: any = await sequelize.query(
            `SELECT AVG(total) as avgTicket 
             FROM pedidos 
             WHERE status = 'paid' AND fecha BETWEEN :start AND :end`,
            { replacements: { start, end }, type: QueryTypes.SELECT }
        );

        // ==========================================
        // 2. Rendimiento de Productos e Inventario
        // ==========================================
        const topProducts = await sequelize.query(
            `SELECT 
                pi.title, 
                MAX(pr.image) as image,
                SUM(pi.cantidad) as total_sold
             FROM pedido_items pi
             JOIN pedidos p ON p.id = pi.id_pedido
             LEFT JOIN productos pr ON pr.id = pi.id_producto
             WHERE p.status = 'paid' AND p.fecha BETWEEN :start AND :end
             GROUP BY pi.title
             ORDER BY total_sold DESC
             LIMIT 10`,
            { replacements: { start, end }, type: QueryTypes.SELECT }
        );

        const stockAlerts = await sequelize.query(
            `SELECT 
                id, name, stock, limite, status
             FROM productos
             WHERE status = 'agotado' OR (limite > 0 AND stock <= limite + 10)
             ORDER BY stock ASC`,
            { type: QueryTypes.SELECT }
        );

        // ==========================================
        // 3. Pasarela (MercadoPago)
        // ==========================================
        const paymentStatus = await sequelize.query(
            `SELECT 
                status, 
                COUNT(*) as count
             FROM pagos
             WHERE fecha BETWEEN :start AND :end
             GROUP BY status`,
            { replacements: { start, end }, type: QueryTypes.SELECT }
        );

        const paymentMethods = await sequelize.query(
            `SELECT 
                payment_method, 
                COUNT(*) as count
             FROM pagos
             WHERE payment_method IS NOT NULL AND fecha BETWEEN :start AND :end
             GROUP BY payment_method`,
            { replacements: { start, end }, type: QueryTypes.SELECT }
        );

        // ==========================================
        // 4. Logística y Envíos
        // ==========================================
        const geoDistribution = await sequelize.query(
            `SELECT 
                provincia, 
                COUNT(*) as count
             FROM envios e
             JOIN pedidos p ON p.id = e.id_pedido
             WHERE p.status = 'paid' AND e.fecha BETWEEN :start AND :end
             GROUP BY provincia
             ORDER BY count DESC`,
            { replacements: { start, end }, type: QueryTypes.SELECT }
        );

        const shippingMethods = await sequelize.query(
            `SELECT 
                service_type, 
                COUNT(*) as count
             FROM envios e
             JOIN pedidos p ON p.id = e.id_pedido
             WHERE p.status = 'paid' AND e.fecha BETWEEN :start AND :end
             GROUP BY service_type`,
            { replacements: { start, end }, type: QueryTypes.SELECT }
        );

        const [avgShippingResult]: any = await sequelize.query(
            `SELECT AVG(e.costo) as avgShippingCost 
             FROM envios e
             JOIN pedidos p ON p.id = e.id_pedido
             WHERE p.status = 'paid' AND e.fecha BETWEEN :start AND :end`,
            { replacements: { start, end }, type: QueryTypes.SELECT }
        );

        const shippingFunnel = await sequelize.query(
            `SELECT 
                e.status, 
                COUNT(*) as count
             FROM envios e
             JOIN pedidos p ON p.id = e.id_pedido
             WHERE p.status = 'paid' AND e.fecha BETWEEN :start AND :end
             GROUP BY e.status`,
            { replacements: { start, end }, type: QueryTypes.SELECT }
        );

        // ==========================================
        // 5. Clientes y Conversión
        // ==========================================
        const topClients = await sequelize.query(
            `SELECT 
                e.nombre_cliente, 
                e.email_cliente, 
                COUNT(DISTINCT p.id) as orders_count,
                SUM(p.total) as total_spent
             FROM envios e
             JOIN pedidos p ON p.id = e.id_pedido
             WHERE p.status = 'paid'
             GROUP BY e.email_cliente, e.nombre_cliente
             ORDER BY orders_count DESC, total_spent DESC
             LIMIT 20`,
            { type: QueryTypes.SELECT }
        );

        const [waitlistConversionResult]: any = await sequelize.query(
            `SELECT 
                (SELECT COUNT(*) FROM usuario_lista_espera) as total_anotados,
                (SELECT COUNT(DISTINCT e.email_cliente) 
                 FROM envios e 
                 JOIN pedidos p ON e.id_pedido = p.id 
                 JOIN usuario_lista_espera w ON e.email_cliente = w.email 
                 WHERE p.status = 'paid') as total_compraron`,
            { type: QueryTypes.SELECT }
        );

        const waitlistGeoDistribution = await sequelize.query(
            `SELECT 
                provincia, 
                COUNT(*) as count
             FROM usuario_lista_espera
             WHERE provincia IS NOT NULL AND provincia != ''
             GROUP BY provincia
             ORDER BY count DESC`,
            { type: QueryTypes.SELECT }
        );

        // Ensamblar respuesta
        return res.json({
            revenue: revenueEvolution,
            funnel,
            avgTicket: Number(avgTicketResult?.avgTicket || 0),
            topProducts,
            stockAlerts,
            payments: {
                status: paymentStatus,
                methods: paymentMethods
            },
            shipping: {
                geoDistribution,
                methods: shippingMethods,
                avgShippingCost: Number(avgShippingResult?.avgShippingCost || 0),
                funnel: shippingFunnel
            },
            clients: {
                top: topClients,
                waitlistConversion: waitlistConversionResult,
                waitlistGeoDistribution
            }
        });

    } catch (error: any) {
        console.error('Error generando BI Analytics:', error);
        return res.status(500).json({ error: error?.message || 'Error interno al generar analytics' });
    }
}

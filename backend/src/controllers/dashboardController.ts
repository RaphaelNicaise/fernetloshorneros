import { Request, Response } from 'express';
import sequelize from '@/config/database';
import { QueryTypes } from 'sequelize';
import { lotesService } from '@/services/lotesService';

export async function getDashboardStats(req: Request, res: Response) {
  try {
    const scopeParam = (req.query.scope as string) || 'lote';
    const scope: 'lote' | 'today' | 'all' =
      scopeParam === 'today' || scopeParam === 'all' ? scopeParam : 'lote';

    const activeLote = await lotesService.getLoteActual();
    const explicitLoteId = req.query.lote_id ? Number(req.query.lote_id) : null;
    const targetLoteId = explicitLoteId || activeLote?.id || null;

    let whereClause = '';
    const replacements: Record<string, any> = {};

    if (scope === 'lote') {
      if (targetLoteId) {
        whereClause = 'WHERE p.lote_id = :loteId';
        replacements.loteId = targetLoteId;
      } else {
        whereClause = 'WHERE 1 = 0';
      }
    } else if (scope === 'today') {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      whereClause = 'WHERE p.fecha >= :todayStart';
      replacements.todayStart = todayStart;
    }

    // 1. Métricas agregadas de pedidos
    const orderMetricsQuery = `
      SELECT 
        COALESCE(SUM(CASE WHEN p.status = 'paid' THEN p.total ELSE 0 END), 0) AS revenue,
        COALESCE(SUM(CASE WHEN p.status = 'paid' THEN 1 ELSE 0 END), 0) AS paidOrders,
        COALESCE(SUM(CASE WHEN p.status = 'pending' THEN 1 ELSE 0 END), 0) AS pendingPaymentOrders,
        COALESCE(SUM(CASE WHEN p.status = 'paid' AND (e.status IS NULL OR e.status NOT IN ('shipped', 'cancelled', 'local')) THEN 1 ELSE 0 END), 0) AS pendingShipmentOrders,
        COALESCE(AVG(CASE WHEN p.status = 'paid' THEN p.total END), 0) AS avgTicket
      FROM pedidos p
      LEFT JOIN envios e ON e.id = (
        SELECT id FROM envios e2 WHERE e2.id_pedido = p.id ORDER BY e2.fecha DESC LIMIT 1
      )
      ${whereClause}
    `;

    // 2. Suma total de botellas de pedidos pagados
    const bottlesQuery = `
      SELECT COALESCE(SUM(pi.cantidad), 0) AS totalBottles
      FROM pedido_items pi
      JOIN pedidos p ON p.id = pi.id_pedido
      ${whereClause ? whereClause + " AND p.status = 'paid'" : "WHERE p.status = 'paid'"}
    `;

    // 3. Distribución geográfica para el mapa
    const geoWhere = whereClause ? `${whereClause} AND ` : 'WHERE ';
    const geoQuery = `
      SELECT 
        e.provincia, 
        COUNT(DISTINCT p.id) AS count,
        COALESCE(SUM(pi.cantidad), 0) AS bottles
      FROM envios e
      JOIN pedidos p ON p.id = e.id_pedido
      LEFT JOIN pedido_items pi ON pi.id_pedido = p.id
      ${geoWhere} e.id = (
        SELECT id FROM envios e2 WHERE e2.id_pedido = p.id ORDER BY e2.fecha DESC LIMIT 1
      )
      AND p.status = 'paid' AND e.provincia IS NOT NULL AND e.provincia != ''
      GROUP BY e.provincia
      ORDER BY count DESC
    `;

    // 4. Conteo de alertas de stock crítico (stock <= 10)
    const stockAlertsQuery = `
      SELECT COUNT(*) AS criticalStockCount
      FROM productos
      WHERE status = 'agotado' OR stock <= 10
    `;

    const [metricsResult, bottlesResult, geoResult, stockAlertsResult]: any = await Promise.all([
      sequelize.query(orderMetricsQuery, { replacements, type: QueryTypes.SELECT }),
      sequelize.query(bottlesQuery, { replacements, type: QueryTypes.SELECT }),
      sequelize.query(geoQuery, { replacements, type: QueryTypes.SELECT }),
      sequelize.query(stockAlertsQuery, { type: QueryTypes.SELECT }),
    ]);

    const metrics = metricsResult?.[0] || {};
    const bottles = bottlesResult?.[0] || {};
    const stockAlerts = stockAlertsResult?.[0] || {};

    return res.json({
      scope,
      activeLote: activeLote
        ? {
            id: activeLote.id,
            nombre: activeLote.nombre,
            activo: activeLote.activo,
          }
        : null,
      kpis: {
        revenue: Number(metrics.revenue || 0),
        paidOrders: Number(metrics.paidOrders || 0),
        pendingPaymentOrders: Number(metrics.pendingPaymentOrders || 0),
        pendingShipmentOrders: Number(metrics.pendingShipmentOrders || 0),
        totalBottlesSold: Number(bottles.totalBottles || 0),
        avgTicket: Number(metrics.avgTicket || 0),
      },
      alerts: {
        criticalStockCount: Number(stockAlerts.criticalStockCount || 0),
      },
      geoDistribution: (geoResult || []).map((row: any) => ({
        provincia: row.provincia,
        count: Number(row.count || 0),
        bottles: Number(row.bottles || 0),
      })),
    });
  } catch (error: any) {
    console.error('Error al obtener estadísticas del dashboard:', error);
    return res.status(500).json({ error: error?.message || 'Error al obtener estadísticas' });
  }
}

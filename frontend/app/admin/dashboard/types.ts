export type ScopeType = 'lote' | 'today' | 'all';

export interface ActiveLoteInfo {
  id: number;
  nombre: string;
  activo: boolean;
}

export interface DashboardKpiData {
  revenue: number;
  paidOrders: number;
  pendingPaymentOrders: number;
  pendingShipmentOrders: number;
  totalBottlesSold: number;
  avgTicket: number;
}

export interface DashboardAlerts {
  criticalStockCount: number;
}

export interface GeoDistributionItem {
  provincia: string;
  count: number;
  bottles: number;
}

export interface DashboardStatsResponse {
  scope: ScopeType;
  activeLote: ActiveLoteInfo | null;
  kpis: DashboardKpiData;
  alerts: DashboardAlerts;
  geoDistribution: GeoDistributionItem[];
}

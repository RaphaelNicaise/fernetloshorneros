'use client';

import { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '@/lib/api';
import { DashboardStatsResponse, ScopeType } from './types';
import { DashboardHeader } from './components/DashboardHeader';
import { DashboardKpis } from './components/DashboardKpis';
import { LiveOrdersCard } from './LiveOrdersCard';
import { StockMonitorCard } from './StockMonitorCard';
import { GeoMapDrawer } from './components/GeoMapDrawer';

const INITIAL_STATS: DashboardStatsResponse = {
  scope: 'lote',
  activeLote: null,
  kpis: {
    revenue: 0,
    paidOrders: 0,
    pendingPaymentOrders: 0,
    pendingShipmentOrders: 0,
    totalBottlesSold: 0,
    avgTicket: 0,
  },
  alerts: {
    criticalStockCount: 0,
  },
  geoDistribution: [],
};

export default function AdminDashboardPage() {
  const [scope, setScope] = useState<ScopeType>('lote');
  const [stats, setStats] = useState<DashboardStatsResponse>(INITIAL_STATS);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [mapOpen, setMapOpen] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
      const res = await fetch(`${API_BASE_URL}/admin/dashboard-stats?scope=${scope}`, {
        cache: 'no-store',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (res.ok) {
        const data: DashboardStatsResponse = await res.json();
        setStats(data);
        setLastUpdated(new Date());
      }
    } catch (err) {
      // Mantener los datos actuales si hay micro-corte
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => {
    fetchStats();

    let interval = setInterval(fetchStats, 10000);

    const handleVisibility = () => {
      if (document.hidden) {
        clearInterval(interval);
      } else {
        fetchStats();
        interval = setInterval(fetchStats, 10000);
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [fetchStats]);

  return (
    <div className="space-y-6">
      {/* 1. Header with Lote badge, scope selector, refresh and map button */}
      <DashboardHeader
        scope={scope}
        onScopeChange={setScope}
        activeLote={stats.activeLote}
        onOpenMap={() => setMapOpen(true)}
        onRefresh={fetchStats}
        loading={loading}
        lastUpdated={lastUpdated}
      />

      {/* 2. Top 4 KPI Cards */}
      <DashboardKpis kpis={stats.kpis} loading={loading} />

      {/* 3. Main Grid: 65% Live Orders (2 cols on lg) & 35% Compact Stock Monitor (1 col on lg) */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <LiveOrdersCard />
        </div>
        <div className="lg:col-span-1">
          <StockMonitorCard />
        </div>
      </div>

      {/* 4. Collapsible Map Dialog */}
      <GeoMapDrawer
        open={mapOpen}
        onOpenChange={setMapOpen}
        geoDistribution={stats.geoDistribution}
      />
    </div>
  );
}

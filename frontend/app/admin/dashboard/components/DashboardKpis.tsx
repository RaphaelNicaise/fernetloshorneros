'use client';

import React from 'react';
import Link from 'next/link';
import { DashboardKpiData } from '../types';
import { DollarSign, ShoppingBag, Wine, Truck, ArrowRight } from 'lucide-react';

interface DashboardKpisProps {
  kpis: DashboardKpiData;
  loading: boolean;
}

export function DashboardKpis({ kpis, loading }: DashboardKpisProps) {
  const formatCurrency = (val: number) => {
    return val.toLocaleString('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0,
    });
  };

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* 1. Facturación */}
      <div className="flex flex-col justify-between rounded-xl border border-white/8 bg-[#14120e] p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-white/50">
            Facturación
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
            <DollarSign className="h-4 w-4" />
          </div>
        </div>
        <div className="my-2">
          <div className="font-mono text-2xl font-bold tracking-tight text-white">
            {loading ? '...' : formatCurrency(kpis.revenue)}
          </div>
          <p className="text-[11px] text-white/40">
            Ticket prom: {loading ? '...' : formatCurrency(kpis.avgTicket)}
          </p>
        </div>
      </div>

      {/* 2. Pedidos Pagados */}
      <div className="flex flex-col justify-between rounded-xl border border-white/8 bg-[#14120e] p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-white/50">
            Pedidos Pagados
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#AA6F3B]/15 text-[#AA6F3B]">
            <ShoppingBag className="h-4 w-4" />
          </div>
        </div>
        <div className="my-2">
          <div className="font-mono text-2xl font-bold tracking-tight text-white">
            {loading ? '...' : kpis.paidOrders}
          </div>
          <p className="text-[11px] text-yellow-500/70">
            {kpis.pendingPaymentOrders} pendientes de pago
          </p>
        </div>
      </div>

      {/* 3. Botellas Vendidas */}
      <div className="flex flex-col justify-between rounded-xl border border-white/8 bg-[#14120e] p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-white/50">
            Botellas Vendidas
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400">
            <Wine className="h-4 w-4" />
          </div>
        </div>
        <div className="my-2">
          <div className="font-mono text-2xl font-bold tracking-tight text-white">
            {loading ? '...' : kpis.totalBottlesSold}
          </div>
          <p className="text-[11px] text-white/40">Unidades colocadas</p>
        </div>
      </div>

      {/* 4. Para Despachar */}
      <div
        className={`flex flex-col justify-between rounded-xl border p-4 shadow-lg transition-colors ${
          kpis.pendingShipmentOrders > 0
            ? 'border-blue-500/30 bg-blue-500/5'
            : 'border-white/8 bg-[#14120e]'
        }`}
      >
        <div className="flex items-center justify-between">
          <span
            className={`text-xs font-medium uppercase tracking-wider ${
              kpis.pendingShipmentOrders > 0 ? 'text-blue-400' : 'text-white/50'
            }`}
          >
            Para Despachar
          </span>
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-lg ${
              kpis.pendingShipmentOrders > 0
                ? 'bg-blue-500/20 text-blue-400'
                : 'bg-white/5 text-white/40'
            }`}
          >
            <Truck className="h-4 w-4" />
          </div>
        </div>
        <div className="my-2">
          <div
            className={`font-mono text-2xl font-bold tracking-tight ${
              kpis.pendingShipmentOrders > 0 ? 'text-blue-400' : 'text-white'
            }`}
          >
            {loading ? '...' : kpis.pendingShipmentOrders}
          </div>
          <Link
            href="/admin/pedidos"
            className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-400/90 hover:text-blue-300"
          >
            Ir a pedidos <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}

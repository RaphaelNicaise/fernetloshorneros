"use client"

import { LiveOrdersCard } from "./LiveOrdersCard"
import { StockMonitorCard } from "./StockMonitorCard"

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="font-serif text-2xl font-bold text-white sm:text-3xl">Dashboard</h1>
        <p className="text-sm text-white/50">Resumen y monitoreo en tiempo real de operaciones</p>
      </div>

      {/* Grid: Pedidos en vivo & Monitor de Stock */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <LiveOrdersCard />
        <StockMonitorCard />
      </div>
    </div>
  )
}

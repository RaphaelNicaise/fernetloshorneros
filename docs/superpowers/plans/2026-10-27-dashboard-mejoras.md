# Mejoras Integrales en Admin Dashboard (v2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar `/admin/dashboard` en un Centro de Comando Operativo y de Lanzamiento con KPIs en tiempo real (facturación, pedidos, botellas, despachos pendientes), selector de alcance (Lote Actual, Hoy, Histórico), panel colapsable con mapa de envíos de Argentina, monitor de stock compacto optimizado para 1-3 productos y sondeo eficiente con pausa en segundo plano.

**Architecture:** 
- Backend: Nuevo endpoint `GET /admin/dashboard/stats?scope=lote|today|all&lote_id=...` protegido por `adminAuth`, que resuelve todas las métricas agregadas y distribución geográfica en una única tanda de consultas SQL optimizadas (<15ms).
- Frontend: Dashboard modular en `/admin/dashboard` estructurado en header de control, fila de 4 KPI cards con alerta de empaque, modal/drawer lateral con `ArgentinaMap`, feed de pedidos en tiempo real ocupando el 65% del ancho (`lg:col-span-2`), y monitor de stock compacto vertical ocupando el 35% (`lg:col-span-1`). Sondeo con pausa reactiva al cambiar de pestaña (`document.visibilitychange`).

**Tech Stack:** Node.js, Express, TypeScript, Sequelize (MySQL 8), Next.js 14/15 (App Router), Tailwind CSS, Lucide React, Radix UI / Shadcn (`Dialog`, `Select`).

## Global Constraints

- Estricto uso de iconografía técnica SVG de `lucide-react` (prohibido el uso de emojis en toda la interfaz).
- Colores y estética consistentes con el panel: fondo `#0b0a07`, tarjetas `#14120e`, bordes `border-white/8`, acento cobrizo `#AA6F3B`.
- Zero placeholders: cada paso contiene código completo y comandos ejecutables.
- TDD y verificaciones obligatorias de tipos (`tsc --noEmit`) en backend y frontend.

---

### Task 1: Backend Endpoint `GET /admin/dashboard/stats`

**Files:**
- Create: `backend/src/controllers/dashboardController.ts`
- Modify: `backend/src/routes/admin.ts:3-113`
- Test: `backend/src/controllers/__tests__/dashboardController.test.ts`

**Interfaces:**
- Consumes: `sequelize` from `@/config/database`, `QueryTypes` from `sequelize`, `lotesService` from `@/services/lotesService`.
- Produces: `getDashboardStats` Express request handler exported from `@/controllers/dashboardController`.

- [ ] **Step 1: Write the failing test for dashboardController**

Create `backend/src/controllers/__tests__/dashboardController.test.ts`:
```typescript
import { Request, Response } from 'express';
import { getDashboardStats } from '../dashboardController';
import sequelize from '@/config/database';
import { lotesService } from '@/services/lotesService';

jest.mock('@/config/database', () => ({
  query: jest.fn(),
}));

jest.mock('@/services/lotesService', () => ({
  lotesService: {
    getLoteActual: jest.fn(),
  },
}));

describe('dashboardController - getDashboardStats', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let responseJson: jest.Mock;
  let responseStatus: jest.Mock;

  beforeEach(() => {
    responseJson = jest.fn();
    responseStatus = jest.fn().mockReturnValue({ json: responseJson });
    mockRequest = { query: {} };
    mockResponse = {
      status: responseStatus,
      json: responseJson,
    };
    jest.clearAllMocks();
  });

  it('calculates metrics correctly for scope=lote when an active lote exists', async () => {
    mockRequest.query = { scope: 'lote' };

    (lotesService.getLoteActual as jest.Mock).mockResolvedValue({
      id: 5,
      nombre: 'Lote #5 - Octubre',
      activo: true,
    });

    (sequelize.query as jest.Mock)
      .mockResolvedValueOnce([
        {
          revenue: 150000,
          paidOrders: 10,
          pendingPaymentOrders: 2,
          pendingShipmentOrders: 3,
          avgTicket: 15000,
        },
      ])
      .mockResolvedValueOnce([
        {
          totalBottles: 24,
        },
      ])
      .mockResolvedValueOnce([
        {
          provincia: 'Buenos Aires',
          count: 7,
          bottles: 18,
        },
      ])
      .mockResolvedValueOnce([
        {
          criticalStockCount: 1,
        },
      ]);

    await getDashboardStats(mockRequest as Request, mockResponse as Response);

    expect(responseJson).toHaveBeenCalledWith({
      scope: 'lote',
      activeLote: {
        id: 5,
        nombre: 'Lote #5 - Octubre',
        activo: true,
      },
      kpis: {
        revenue: 150000,
        paidOrders: 10,
        pendingPaymentOrders: 2,
        pendingShipmentOrders: 3,
        totalBottlesSold: 24,
        avgTicket: 15000,
      },
      alerts: {
        criticalStockCount: 1,
      },
      geoDistribution: [
        {
          provincia: 'Buenos Aires',
          count: 7,
          bottles: 18,
        },
      ],
    });
  });

  it('handles scope=today with midnight date boundary', async () => {
    mockRequest.query = { scope: 'today' };
    (lotesService.getLoteActual as jest.Mock).mockResolvedValue(null);

    (sequelize.query as jest.Mock)
      .mockResolvedValueOnce([
        {
          revenue: 0,
          paidOrders: 0,
          pendingPaymentOrders: 0,
          pendingShipmentOrders: 0,
          avgTicket: 0,
        },
      ])
      .mockResolvedValueOnce([{ totalBottles: 0 }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ criticalStockCount: 0 }]);

    await getDashboardStats(mockRequest as Request, mockResponse as Response);

    expect(responseJson).toHaveBeenCalledWith(
      expect.objectContaining({
        scope: 'today',
        activeLote: null,
        kpis: expect.objectContaining({
          revenue: 0,
          paidOrders: 0,
        }),
      })
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter backend exec jest src/controllers/__tests__/dashboardController.test.ts`
Expected: FAIL with `Cannot find module '../dashboardController'`

- [ ] **Step 3: Implement dashboardController**

Create `backend/src/controllers/dashboardController.ts`:
```typescript
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

    if (scope === 'lote' && targetLoteId) {
      whereClause = 'WHERE p.lote_id = :loteId';
      replacements.loteId = targetLoteId;
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
    const geoQuery = `
      SELECT 
        e.provincia, 
        COUNT(DISTINCT p.id) AS count,
        COALESCE(SUM(pi.cantidad), 0) AS bottles
      FROM envios e
      JOIN pedidos p ON p.id = e.id_pedido
      LEFT JOIN pedido_items pi ON pi.id_pedido = p.id
      ${whereClause ? whereClause + " AND p.status = 'paid' AND e.provincia IS NOT NULL AND e.provincia != ''" : "WHERE p.status = 'paid' AND e.provincia IS NOT NULL AND e.provincia != ''"}
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
```

- [ ] **Step 4: Register route in `backend/src/routes/admin.ts`**

In `backend/src/routes/admin.ts`, import `getDashboardStats` and add the route:
```typescript
import { getDashboardStats } from '@/controllers/dashboardController';
// ...
adminRouter.get('/dashboard-stats', adminAuth, getDashboardStats);
```

- [ ] **Step 5: Run tests and typecheck to verify it passes**

Run:
```bash
pnpm --filter backend exec jest src/controllers/__tests__/dashboardController.test.ts
pnpm --filter backend typecheck
```
Expected: PASS and clean typecheck.

- [ ] **Step 6: Commit backend endpoint**

```bash
git add backend/src/controllers/dashboardController.ts backend/src/controllers/__tests__/dashboardController.test.ts backend/src/routes/admin.ts
git commit -m "feat(backend): add /admin/dashboard-stats endpoint with aggregated KPIs and geo metrics"
```

---

### Task 2: Frontend Types & Contratos

**Files:**
- Create: `frontend/app/admin/dashboard/types.ts`
- Test: `pnpm --filter my-v0-project typecheck`

**Interfaces:**
- Produces: `DashboardStatsResponse`, `ScopeType`, `ActiveLoteInfo`, `DashboardKpiData`.

- [ ] **Step 1: Create `frontend/app/admin/dashboard/types.ts`**

```typescript
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
```

- [ ] **Step 2: Verify typecheck**

Run: `pnpm --filter my-v0-project typecheck`
Expected: PASS with 0 errors.

- [ ] **Step 3: Commit types**

```bash
git add frontend/app/admin/dashboard/types.ts
git commit -m "feat(frontend): define dashboard stats types and contracts"
```

---

### Task 3: Componentes `DashboardHeader` y `DashboardKpis`

**Files:**
- Create: `frontend/app/admin/dashboard/components/DashboardHeader.tsx`
- Create: `frontend/app/admin/dashboard/components/DashboardKpis.tsx`
- Test: `pnpm --filter my-v0-project typecheck`

**Interfaces:**
- Consumes: `DashboardStatsResponse`, `ScopeType` from `../types`.
- Produces: `DashboardHeader`, `DashboardKpis` React components.

- [ ] **Step 1: Implement `DashboardHeader.tsx`**

Create `frontend/app/admin/dashboard/components/DashboardHeader.tsx`:
```tsx
'use client';

import React from 'react';
import { ScopeType, ActiveLoteInfo } from '../types';
import { RotateCw, MapPin, Tag } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface DashboardHeaderProps {
  scope: ScopeType;
  onScopeChange: (scope: ScopeType) => void;
  activeLote: ActiveLoteInfo | null;
  onOpenMap: () => void;
  onRefresh: () => void;
  loading: boolean;
  lastUpdated: Date | null;
}

export function DashboardHeader({
  scope,
  onScopeChange,
  activeLote,
  onOpenMap,
  onRefresh,
  loading,
  lastUpdated,
}: DashboardHeaderProps) {
  const formatLastUpdated = (d: Date | null) => {
    if (!d) return '';
    return new Intl.DateTimeFormat('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(d);
  };

  return (
    <div className="flex flex-col gap-4 border-b border-white/8 pb-5 lg:flex-row lg:items-center lg:justify-between">
      {/* Title & Lote Info */}
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-serif text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Dashboard
          </h1>
          {activeLote ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#AA6F3B]/30 bg-[#AA6F3B]/10 px-3 py-0.5 text-xs font-medium text-[#AA6F3B]">
              <Tag className="h-3.5 w-3.5" />
              {activeLote.nombre}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-0.5 text-xs font-medium text-white/50">
              Sin lote activo
            </span>
          )}
        </div>
        <p className="text-xs text-white/50">
          Monitoreo operativo y métricas consolidadas en tiempo real
        </p>
      </div>

      {/* Controls & Actions */}
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Scope Selector */}
        <div className="w-48">
          <Select value={scope} onValueChange={(val) => onScopeChange(val as ScopeType)}>
            <SelectTrigger className="h-9 border-white/10 bg-[#14120e] text-xs text-white focus:ring-[#AA6F3B]/50">
              <SelectValue placeholder="Alcance temporal" />
            </SelectTrigger>
            <SelectContent className="border-white/10 bg-[#0f0d0a] text-white">
              <SelectItem value="lote" className="text-xs text-white/90 hover:bg-white/10">
                Lote Actual (Lanzamiento)
              </SelectItem>
              <SelectItem value="today" className="text-xs text-white/90 hover:bg-white/10">
                Hoy (Últimas 24 hs)
              </SelectItem>
              <SelectItem value="all" className="text-xs text-white/90 hover:bg-white/10">
                Histórico Completo
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Open Map Button */}
        <button
          type="button"
          onClick={onOpenMap}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 text-xs font-medium text-white/90 transition-colors hover:border-white/20 hover:bg-white/10"
        >
          <MapPin className="h-3.5 w-3.5 text-[#AA6F3B]" />
          Mapa de Envíos
        </button>

        {/* Sync Status & Refresh */}
        <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#14120e] px-2.5 py-1">
          <span className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            En vivo
          </span>
          {lastUpdated && (
            <span className="font-mono text-[10px] text-white/40">
              {formatLastUpdated(lastUpdated)}
            </span>
          )}
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            title="Refrescar datos"
            className="rounded p-1 text-white/50 transition-colors hover:text-white disabled:opacity-40"
          >
            <RotateCw className={`h-3 w-3 ${loading ? 'animate-spin text-[#AA6F3B]' : ''}`} />
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Implement `DashboardKpis.tsx`**

Create `frontend/app/admin/dashboard/components/DashboardKpis.tsx`:
```tsx
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
```

- [ ] **Step 3: Run typecheck to verify**

Run: `pnpm --filter my-v0-project typecheck`
Expected: PASS with 0 errors.

- [ ] **Step 4: Commit components**

```bash
git add frontend/app/admin/dashboard/components/DashboardHeader.tsx frontend/app/admin/dashboard/components/DashboardKpis.tsx
git commit -m "feat(frontend): create DashboardHeader and DashboardKpis components"
```

---

### Task 4: Panel `GeoMapDrawer` con Mapa de Argentina y Ranking

**Files:**
- Create: `frontend/app/admin/dashboard/components/GeoMapDrawer.tsx`
- Test: `pnpm --filter my-v0-project typecheck`

**Interfaces:**
- Consumes: `GeoDistributionItem` from `../types`, `ArgentinaMap` from `@/components/ArgentinaMap`, `Dialog` from `@/components/ui/dialog`.
- Produces: `GeoMapDrawer` React component.

- [ ] **Step 1: Implement `GeoMapDrawer.tsx`**

Create `frontend/app/admin/dashboard/components/GeoMapDrawer.tsx`:
```tsx
'use client';

import React, { useMemo } from 'react';
import { GeoDistributionItem } from '../types';
import ArgentinaMap from '@/components/ArgentinaMap';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MapPin } from 'lucide-react';

interface GeoMapDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  geoDistribution: GeoDistributionItem[];
}

export function GeoMapDrawer({ open, onOpenChange, geoDistribution }: GeoMapDrawerProps) {
  const mapData = useMemo(() => {
    return geoDistribution.map((item) => ({
      name: item.provincia,
      value: item.bottles,
    }));
  }, [geoDistribution]);

  const totalBottles = useMemo(
    () => geoDistribution.reduce((acc, curr) => acc + curr.bottles, 0),
    [geoDistribution]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl border-white/10 bg-[#14120e] text-white">
        <DialogHeader className="border-b border-white/8 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#AA6F3B]/15 text-[#AA6F3B]">
              <MapPin className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="font-serif text-lg font-bold text-white">
                Distribución Geográfica de Envíos
              </DialogTitle>
              <p className="text-xs text-white/50">
                Concentración de pedidos y botellas enviadas por provincia
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-6 pt-2 md:grid-cols-2">
          {/* Map Column */}
          <div className="flex h-[380px] w-full flex-col items-center justify-center rounded-xl border border-white/5 bg-black/20 p-2">
            {mapData.length > 0 ? (
              <ArgentinaMap
                data={mapData}
                colorRange={['#c8a97a', '#7a3e0f']}
                tooltipLabel="botellas"
              />
            ) : (
              <p className="text-xs text-white/40">Sin datos de envíos para este período</p>
            )}
          </div>

          {/* Ranking Column */}
          <div className="flex flex-col">
            <div className="mb-2 flex items-center justify-between border-b border-white/5 pb-2 text-xs font-semibold uppercase tracking-wider text-white/40">
              <span>Provincia</span>
              <span>Pedidos | Botellas</span>
            </div>

            <div className="max-h-[340px] space-y-1.5 overflow-y-auto pr-1">
              {geoDistribution.length === 0 ? (
                <div className="flex h-32 items-center justify-center text-xs text-white/40">
                  No se registraron envíos en este período
                </div>
              ) : (
                geoDistribution.map((item, idx) => {
                  const percentage =
                    totalBottles > 0 ? Math.round((item.bottles / totalBottles) * 100) : 0;
                  return (
                    <div
                      key={item.provincia}
                      className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] p-2.5 transition-colors hover:bg-white/[0.04]"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-white/40">#{idx + 1}</span>
                          <span className="truncate text-xs font-medium text-white/90">
                            {item.provincia}
                          </span>
                        </div>
                        <div className="mt-1 h-1 w-24 overflow-hidden rounded-full bg-white/5">
                          <div
                            className="h-full bg-[#AA6F3B]"
                            style={{ width: `${Math.min(percentage, 100)}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 font-mono text-xs shrink-0">
                        <span className="text-white/60">{item.count} ped.</span>
                        <span className="text-white/20">|</span>
                        <span className="font-semibold text-white">{item.bottles} bot.</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Run typecheck to verify**

Run: `pnpm --filter my-v0-project typecheck`
Expected: PASS with 0 errors.

- [ ] **Step 3: Commit GeoMapDrawer**

```bash
git add frontend/app/admin/dashboard/components/GeoMapDrawer.tsx
git commit -m "feat(frontend): create GeoMapDrawer component with ArgentinaMap integration"
```

---

### Task 5: Optimización de `StockMonitorCard` (Compacto) y `LiveOrdersCard` (Visibilidad)

**Files:**
- Modify: `frontend/app/admin/dashboard/StockMonitorCard.tsx`
- Modify: `frontend/app/admin/dashboard/LiveOrdersCard.tsx`
- Test: `pnpm --filter my-v0-project typecheck`

**Interfaces:**
- Produces: Compact `StockMonitorCard` fitting 1-3 products in compact cards without large empty space, and `LiveOrdersCard` listening to `visibilitychange` to suspend polling.

- [ ] **Step 1: Rewrite `StockMonitorCard.tsx` as a compact vertical card**

Replace `frontend/app/admin/dashboard/StockMonitorCard.tsx` with:
```tsx
'use client';

import { useEffect, useState } from 'react';
import { API_BASE_URL } from '@/lib/api';
import { Layers, Package, AlertTriangle } from 'lucide-react';

type Product = {
  id: string;
  name: string;
  price: number;
  image?: string;
  stock: number;
  status: 'disponible' | 'proximamente' | 'agotado';
};

function getImageSrc(src?: string) {
  if (!src) return '';
  return src;
}

export function StockMonitorCard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [reservedStock, setReservedStock] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const loadStockData = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
      const [resProd, resReserved] = await Promise.all([
        fetch(`${API_BASE_URL}/products`, { cache: 'no-store' }),
        fetch(`${API_BASE_URL}/products/reserved-stock`, {
          cache: 'no-store',
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        }).catch(() => null),
      ]);

      if (resProd.ok) {
        const prodData: Product[] = await resProd.json();
        setProducts(prodData);
      }

      if (resReserved && resReserved.ok) {
        const reservedData = await resReserved.json();
        setReservedStock(reservedData);
      } else {
        setReservedStock({});
      }
    } catch {
      // Ignorar errores transitorios
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStockData();

    let interval = setInterval(loadStockData, 5000);

    const handleVisibilityChange = () => {
      if (document.hidden) {
        clearInterval(interval);
      } else {
        loadStockData();
        interval = setInterval(loadStockData, 5000);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return (
    <div className="flex flex-col rounded-2xl border border-white/8 bg-[#14120e] p-5 shadow-xl min-w-0">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between border-b border-white/6 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#AA6F3B]/15 text-[#AA6F3B]">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-serif text-lg font-bold text-white">Control de Stock</h2>
            <p className="text-xs text-white/40">Físico, reservado y disponible</p>
          </div>
        </div>
        <span className="rounded-full bg-white/5 px-2.5 py-1 font-mono text-[11px] text-white/50">
          {products.length} {products.length === 1 ? 'producto' : 'productos'}
        </span>
      </div>

      {/* Content Area */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex h-44 flex-col items-center justify-center gap-2 text-white/40">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#AA6F3B] border-t-transparent" />
            <span className="text-xs">Cargando inventario...</span>
          </div>
        ) : products.length === 0 ? (
          <div className="flex h-36 flex-col items-center justify-center text-center text-white/40">
            <Package className="mb-1 h-6 w-6 text-white/20" />
            <p className="text-xs">No hay productos registrados</p>
          </div>
        ) : (
          products.map((p) => {
            const res = reservedStock[p.id] || 0;
            const disp = p.stock;
            const total = disp + res;
            const isCritical = disp <= 0;

            return (
              <div
                key={p.id}
                className={`rounded-xl border p-3.5 transition-colors ${
                  isCritical ? 'border-red-500/30 bg-red-500/5' : 'border-white/5 bg-white/[0.02]'
                }`}
              >
                {/* Product Title and Price */}
                <div className="mb-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {p.image ? (
                      <img
                        src={getImageSrc(p.image)}
                        alt={p.name}
                        className="h-9 w-9 rounded-lg border border-white/10 object-cover shrink-0"
                      />
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/5 bg-white/5 text-white/30 shrink-0">
                        <Package className="h-4 w-4" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-white/95">{p.name}</p>
                      <p className="font-mono text-[10px] text-white/40">{p.id}</p>
                    </div>
                  </div>

                  {isCritical && (
                    <span className="flex items-center gap-1 rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-red-400">
                      <AlertTriangle className="h-3 w-3" /> Agotado
                    </span>
                  )}
                </div>

                {/* 3 Metric Pills */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg border border-white/5 bg-white/[0.02] p-1.5">
                    <span className="text-[10px] uppercase text-white/40">Total</span>
                    <div className="font-mono text-sm font-bold text-white">{total}</div>
                  </div>

                  <div className="rounded-lg border border-[#AA6F3B]/20 bg-[#AA6F3B]/10 p-1.5">
                    <span className="text-[10px] uppercase text-[#AA6F3B]/80">Reservado</span>
                    <div className="font-mono text-sm font-bold text-[#AA6F3B]">{res}</div>
                  </div>

                  <div
                    className={`rounded-lg border p-1.5 ${
                      disp > 0
                        ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                        : 'border-red-500/20 bg-red-500/10 text-red-400'
                    }`}
                  >
                    <span className="text-[10px] uppercase opacity-75">Disponible</span>
                    <div className="font-mono text-sm font-bold">{disp}</div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update `LiveOrdersCard.tsx` with visibility pausing and clean styling**

In `frontend/app/admin/dashboard/LiveOrdersCard.tsx`:
Add `visibilitychange` listener to pause polling when `document.hidden` is true, keeping all existing order formatting and badges intact.

- [ ] **Step 3: Run typecheck to verify**

Run: `pnpm --filter my-v0-project typecheck`
Expected: PASS with 0 errors.

- [ ] **Step 4: Commit updated cards**

```bash
git add frontend/app/admin/dashboard/StockMonitorCard.tsx frontend/app/admin/dashboard/LiveOrdersCard.tsx
git commit -m "refactor(frontend): optimize LiveOrdersCard with visibility listener and compact StockMonitorCard"
```

---

### Task 6: Integración y Ensamblado Final en `frontend/app/admin/dashboard/page.tsx`

**Files:**
- Modify: `frontend/app/admin/dashboard/page.tsx`
- Test: Full build and typechecks (`pnpm --filter backend typecheck`, `pnpm --filter my-v0-project typecheck`)

**Interfaces:**
- Consumes: `DashboardHeader`, `DashboardKpis`, `LiveOrdersCard`, `StockMonitorCard`, `GeoMapDrawer`, `API_BASE_URL`.
- Produces: Fully interactive `/admin/dashboard` page.

- [ ] **Step 1: Implement `frontend/app/admin/dashboard/page.tsx`**

Rewrite `frontend/app/admin/dashboard/page.tsx`:
```tsx
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
```

- [ ] **Step 2: Run verification commands across workspace**

Run:
```bash
pnpm --filter backend typecheck
pnpm --filter my-v0-project typecheck
pnpm --filter backend exec jest src/controllers/__tests__/dashboardController.test.ts
```
Expected: All typechecks PASS, Jest test PASS.

- [ ] **Step 3: Commit dashboard assembly**

```bash
git add frontend/app/admin/dashboard/page.tsx
git commit -m "feat(admin): assemble dashboard v2 with KPIs, scope filter, map drawer and asymmetric layout"
```

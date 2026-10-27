# Optimización del Feed de Pedidos y Nombres de Provincias en Mapa Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Optimizar la velocidad de carga de pedidos en el dashboard limitando la consulta a 50 pedidos con resumen de productos, compactar las filas con alta densidad informativa (cliente, ciudad, provincia, productos, cupón, total y estado), y ensanchar el diálogo del mapa para mostrar los nombres de las provincias completos sin truncar.

**Architecture:**
- Backend: Modificar `getAllOrders` en `orderQueries.ts` para aceptar `limit?: number | null` e incluir una subquery `GROUP_CONCAT` para `items_summary`. Actualizar `listOrders` en `ordersController.ts` para recibir `req.query.limit`.
- Frontend: Actualizar `LiveOrdersCard.tsx` para consultar `/orders?limit=50`, rediseñar las filas en dos micro-líneas compactas (`py-2 px-3`) con badges sutiles y toda la información operativa. En `GeoMapDrawer.tsx`, ampliar el diálogo a `max-w-5xl`, balancear a 5/7 columnas y remover `truncate` del nombre provincial.

**Tech Stack:** Express, Sequelize (MySQL 8), Next.js 14/15, Tailwind CSS, Lucide React, Radix UI.

## Global Constraints

- Iconografía exclusiva SVG de `lucide-react` (prohibido el uso de emojis).
- Paleta y diseño consistentes: `#0b0a07`, `#14120e`, `border-white/8`, cobre `#AA6F3B`.
- Zero placeholders: código exacto en cada paso y comandos ejecutables.
- TDD y verificaciones obligatorias de tipos (`tsc --noEmit`).

---

### Task 1: Backend - Soporte de `limit` y `items_summary` en `GET /orders`

**Files:**
- Modify: `backend/src/services/orders/types.ts:20-30`
- Modify: `backend/src/services/orders/orderQueries.ts:70-112`
- Modify: `backend/src/controllers/ordersController.ts:25-34`
- Test: `backend/src/controllers/__tests__/ordersController.test.ts`

**Interfaces:**
- Consumes: `sequelize`, `QueryTypes`.
- Produces: `getAllOrders(lote_id?: number | null, limit?: number | null): Promise<Order[]>`, `Order.items_summary?: string`.

- [ ] **Step 1: Write the failing unit test**

Create `backend/src/controllers/__tests__/ordersController.test.ts`:
```typescript
import { Request, Response } from 'express';
import { listOrders } from '../ordersController';
import * as ordersService from '@/services/ordersService';

jest.mock('@/services/ordersService', () => ({
  getAllOrders: jest.fn(),
}));

describe('ordersController - listOrders', () => {
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

  it('passes limit and lote_id to getAllOrders when provided', async () => {
    mockRequest.query = { limit: '50', lote_id: '3' };
    const mockOrders = [
      {
        id: 1,
        total: 25000,
        status: 'paid',
        items_summary: '2x Fernet 750ml',
        provincia: 'Buenos Aires',
        ciudad: 'Bahía Blanca',
      },
    ];
    (ordersService.getAllOrders as jest.Mock).mockResolvedValue(mockOrders);

    await listOrders(mockRequest as Request, mockResponse as Response);

    expect(ordersService.getAllOrders).toHaveBeenCalledWith(3, 50);
    expect(responseJson).toHaveBeenCalledWith(mockOrders);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter backend exec jest src/controllers/__tests__/ordersController.test.ts`
Expected: FAIL (argument mismatch or missing params).

- [ ] **Step 3: Update `Order` interface in `backend/src/services/orders/types.ts`**

Add `items_summary?: string | null;` to `Order` in `backend/src/services/orders/types.ts`.

- [ ] **Step 4: Update `orderQueries.ts` and `ordersController.ts`**

In `backend/src/services/orders/orderQueries.ts`:
Update `getAllOrders`:
```typescript
export async function getAllOrders(lote_id?: number | null, limit?: number | null): Promise<Order[]> {
    let query = `SELECT 
            p.id, 
            p.total, 
            p.status, 
            p.fecha, 
            p.external_reference,
            p.cupon_codigo,
            p.cupon_descuento,
            p.lote_id,
            (SELECT GROUP_CONCAT(CONCAT(pi.cantidad, 'x ', pi.title) SEPARATOR ', ')
             FROM pedido_items pi
             WHERE pi.id_pedido = p.id) AS items_summary,
            e.zipnova_shipment_id,
            e.tracking_code,
            e.status AS envio_status,
            e.nombre_cliente,
            e.email_cliente,
            e.dni_cliente,
            e.telefono_cliente,
            e.provincia,
            e.ciudad,
            e.codigo_postal,
            e.direccion,
            e.numero,
            e.extra,
            e.costo AS costo_envio
         FROM pedidos p 
         LEFT JOIN envios e ON e.id = (
             SELECT id FROM envios e2 WHERE e2.id_pedido = p.id ORDER BY e2.fecha DESC LIMIT 1
         )`;

    const replacements: Record<string, any> = {};

    if (lote_id) {
        query += ` WHERE p.lote_id = :lote_id`;
        replacements.lote_id = lote_id;
    }

    query += ` ORDER BY p.fecha DESC`;

    if (limit && Number.isInteger(limit) && limit > 0) {
        query += ` LIMIT :limit`;
        replacements.limit = limit;
    }

    const orders = await sequelize.query<Order>(query, {
        replacements,
        type: QueryTypes.SELECT,
    });

    return orders;
}
```

In `backend/src/controllers/ordersController.ts`:
Update `listOrders`:
```typescript
export async function listOrders(req: Request, res: Response) {
  try {
    const lote_id = req.query.lote_id ? Number(req.query.lote_id) : null;
    const limit = req.query.limit ? Number(req.query.limit) : null;
    const orders = await getAllOrders(lote_id, limit);
    return res.json(orders);
  } catch (error: any) {
    console.error('Error obteniendo pedidos:', error);
    return res.status(500).json({ error: error?.message || 'Error interno' });
  }
}
```

- [ ] **Step 5: Run tests and typecheck to verify it passes**

Run:
```bash
pnpm --filter backend exec jest src/controllers/__tests__/ordersController.test.ts
pnpm --filter backend typecheck
```
Expected: PASS and clean typecheck.

- [ ] **Step 6: Commit backend changes**

```bash
git add backend/src/services/orders/types.ts backend/src/services/orders/orderQueries.ts backend/src/controllers/ordersController.ts backend/src/controllers/__tests__/ordersController.test.ts
git commit -m "feat(backend): support limit and items_summary in getAllOrders and GET /orders"
```

---

### Task 2: Frontend - Nombres Completos de Provincias en `GeoMapDrawer.tsx`

**Files:**
- Modify: `frontend/app/admin/dashboard/components/GeoMapDrawer.tsx`
- Test: `pnpm --filter my-v0-project typecheck`

**Interfaces:**
- Consumes: `GeoMapDrawerProps`.
- Produces: Widened dialog (`max-w-5xl`) with full provincial titles.

- [ ] **Step 1: Modify `GeoMapDrawer.tsx`**

1. Change `<DialogContent className="max-w-4xl ...">` to `<DialogContent className="max-w-5xl ...">`.
2. Change `<div className="grid grid-cols-1 gap-6 pt-2 md:grid-cols-2">` to `<div className="grid grid-cols-1 gap-6 pt-2 md:grid-cols-12">`.
3. Map container column: `<div className="flex h-[380px] w-full flex-col ... md:col-span-5">`.
4. Ranking list column: `<div className="flex flex-col md:col-span-7">`.
5. In ranking items, remove the strict `truncate` and replace with:
   `<span className="text-xs font-medium text-white/95 leading-tight">{item.provincia}</span>`
   Ensure the outer container gives sufficient space so province names like `"Ciudad Autónoma de Buenos Aires"` and `"Tierra del Fuego"` display fully without ellipsis.

- [ ] **Step 2: Run typecheck to verify**

Run: `pnpm --filter my-v0-project typecheck`
Expected: PASS with 0 errors.

- [ ] **Step 3: Commit GeoMapDrawer**

```bash
git add frontend/app/admin/dashboard/components/GeoMapDrawer.tsx
git commit -m "fix(frontend): widen GeoMapDrawer and display full province names without truncating"
```

---

### Task 3: Frontend - Rediseño Compacto y Enriquecido de `LiveOrdersCard.tsx`

**Files:**
- Modify: `frontend/app/admin/dashboard/LiveOrdersCard.tsx`
- Test: `pnpm --filter my-v0-project typecheck`

**Interfaces:**
- Consumes: `GET ${API_BASE_URL}/orders?limit=50`.
- Produces: High-density 2-line order row with client, location, products, coupon, amount and status.

- [ ] **Step 1: Update `Order` type and fetch URL in `LiveOrdersCard.tsx`**

In `frontend/app/admin/dashboard/LiveOrdersCard.tsx`:
Expand `Order` type:
```typescript
type Order = {
  id: number;
  total: number;
  status: OrderStatus;
  fecha: string;
  external_reference?: string;
  envio_status?: string | null;
  nombre_cliente?: string | null;
  email_cliente?: string | null;
  ciudad?: string | null;
  provincia?: string | null;
  cupon_codigo?: string | null;
  cupon_descuento?: number | null;
  items_summary?: string | null;
};
```

Update fetch:
`fetch(\`${API_BASE_URL}/orders?limit=50\`, ...)`

- [ ] **Step 2: Redesign row layout**

In `LiveOrdersCard.tsx`, import `MapPin`, `Package`, `Tag` from `lucide-react`.
Replace order item rendering with the compact 2-line layout:
```tsx
orders.map((order) => {
  const effStatus = getEffectiveStatus(order);
  const locationText = [order.ciudad?.trim(), order.provincia?.trim()]
    .filter(Boolean)
    .join(', ');

  return (
    <div
      key={order.id}
      className="flex flex-col gap-1.5 rounded-xl border border-white/5 bg-white/[0.02] px-3.5 py-2.5 transition-colors hover:bg-white/[0.04]"
    >
      {/* Micro-line 1: ID, Date, Client, Location, Total & Status */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <span className="font-mono text-xs font-bold text-white/90 shrink-0">
            #{order.id}
          </span>
          <span className="text-[11px] text-white/35 shrink-0">
            {formatDate(order.fecha)}
          </span>
          <span className="text-white/20 shrink-0">•</span>
          <span className="truncate text-xs font-semibold text-white/90">
            {order.nombre_cliente?.trim() || 'Cliente no registrado'}
          </span>
          {locationText && (
            <span className="inline-flex items-center gap-1 text-[11px] text-white/50 shrink-0">
              <MapPin className="h-3 w-3 text-[#AA6F3B]/80" />
              {locationText}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="font-mono text-xs font-bold text-white">
            {order.total.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })}
          </span>
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_STYLES[effStatus]}`}>
            {STATUS_LABELS[effStatus]}
          </span>
        </div>
      </div>

      {/* Micro-line 2: Products and Coupon */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] border-t border-white/[0.03] pt-1">
        <div className="flex items-center gap-1.5 text-white/70 min-w-0">
          <Package className="h-3.5 w-3.5 text-[#AA6F3B] shrink-0" />
          <span className="truncate text-white/75">
            {order.items_summary?.trim() || 'Sin detalle de productos'}
          </span>
        </div>

        {order.cupon_codigo && (
          <span className="inline-flex items-center gap-1 rounded bg-[#AA6F3B]/15 border border-[#AA6F3B]/30 px-1.5 py-0.5 text-[10px] font-mono font-medium text-[#AA6F3B] shrink-0">
            <Tag className="h-2.5 w-2.5" />
            Cupón: {order.cupon_codigo}
            {order.cupon_descuento ? ` (-$${Number(order.cupon_descuento).toLocaleString('es-AR')})` : ''}
          </span>
        )}
      </div>
    </div>
  );
})
```

- [ ] **Step 3: Run typecheck to verify**

Run: `pnpm --filter my-v0-project typecheck`
Expected: PASS with 0 errors.

- [ ] **Step 4: Commit LiveOrdersCard**

```bash
git add frontend/app/admin/dashboard/LiveOrdersCard.tsx
git commit -m "feat(frontend): optimize LiveOrdersCard with limit=50 and enriched compact row layout"
```

---

### Task 4: Verificación Integral del Workspace

**Files:**
- Test: All suites and typechecks across backend and frontend.

- [ ] **Step 1: Run verification commands**

```bash
pnpm --filter backend exec jest src/controllers/__tests__/ordersController.test.ts
pnpm --filter backend exec jest src/controllers/__tests__/dashboardController.test.ts
pnpm --filter backend typecheck
pnpm --filter my-v0-project typecheck
```
Expected: All tests PASS, typechecks 0 errors.

- [ ] **Step 2: Commit any final integration polish if needed**

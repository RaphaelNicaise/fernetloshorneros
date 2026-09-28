# Admin Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar la sección principal `/admin/dashboard` en el panel de administración con redirección automática desde `/admin`, navegación en barra lateral, feed de pedidos en vivo con scroll y monitor interactivo de los 3 estados del stock (Total, Reservado, Disponible).

**Architecture:** Enfoque modular con React/Next.js client components: `AdminDashboardPage` como contenedor orquestador de dos tarjetas de monitoreo (`LiveOrdersCard` y `StockMonitorCard`). Polling a intervalos de 2 segundos para actualización en tiempo real silenciosa, reutilizando los endpoints existentes de `/orders`, `/products` y `/products/reserved-stock`.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript 5, Tailwind CSS, Lucide React, Radix UI Select.

## Global Constraints

- Estricto modo solo lectura en la lista de pedidos del Dashboard: sin botones de borrado, despacho o edición.
- Paleta de diseño oscuro consistente con el panel (`#0b0a07`, `#0f0d0a`, `border-white/8`, texto `#AA6F3B`).
- Cálculos de stock: Total = `stock + reserved`, Reservado = `reserved`, Disponible = `stock`.
- Verificación en cada tarea con `pnpm --dir frontend typecheck`.

---

### Task 1: Navigation and Admin Root Redirect

**Files:**
- Modify: `frontend/app/admin/layout.tsx:25-36`
- Modify: `frontend/app/admin/page.tsx:1-4`

**Interfaces:**
- Consumes: Next.js `useRouter`, `redirect`, `lucide-react` icons.
- Produces: `Dashboard` navigation entry pointing to `/admin/dashboard` and automatic redirect from `/admin` to `/admin/dashboard`.

- [ ] **Step 1: Update NAV_ITEMS in `frontend/app/admin/layout.tsx`**

Import `LayoutDashboard` from `lucide-react` and place the Dashboard item at the top of `NAV_ITEMS`:

```tsx
import {
  Package,
  ShoppingBag,
  Users,
  Settings,
  BarChart3,
  LogOut,
  Server,
  Database,
  ChevronRight,
  Menu,
  X,
  Mail,
  Ticket,
  Barrel,
  LayoutDashboard,
} from "lucide-react"

const NAV_ITEMS = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/productos", label: "Productos", icon: Package },
  { href: "/admin/pedidos", label: "Pedidos", icon: ShoppingBag },
  { href: "/admin/produccion", label: "Producción", icon: Barrel },
  { href: "/admin/lista-espera", label: "Lista de Espera", icon: Users },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/cupones", label: "Cupones", icon: Ticket },
  { href: "/admin/emails", label: "Emails", icon: Mail },
  { href: "/admin/config", label: "Configuración", icon: Settings },
]
```

- [ ] **Step 2: Update `frontend/app/admin/page.tsx` to redirect to `/admin/dashboard`**

Modify `frontend/app/admin/page.tsx` to redirect immediately using Next.js `redirect`:

```tsx
import { redirect } from "next/navigation"

export default function AdminPanelPage() {
  redirect("/admin/dashboard")
}
```

- [ ] **Step 3: Run typecheck to verify changes**

Run: `pnpm --dir frontend typecheck`
Expected: Exited with code 0

- [ ] **Step 4: Commit navigation and redirect changes**

```bash
git add frontend/app/admin/layout.tsx frontend/app/admin/page.tsx
git commit -m "feat(admin): add dashboard to navigation and redirect /admin to dashboard"
```

---

### Task 2: Live Orders Feed Component (`LiveOrdersCard`)

**Files:**
- Create: `frontend/app/admin/dashboard/LiveOrdersCard.tsx`

**Interfaces:**
- Consumes: `API_BASE_URL` from `@/lib/api`, `GET /orders` endpoint, `admin_token` from `localStorage`.
- Produces: `LiveOrdersCard` React client component displaying scrollable live orders stream with 2s polling and status badges.

- [ ] **Step 1: Create `frontend/app/admin/dashboard/LiveOrdersCard.tsx`**

Write the complete component with types, polling logic, formatters, and dark UI styling:

```tsx
"use client"

import { useEffect, useState, useRef } from "react"
import { API_BASE_URL } from "@/lib/api"
import { ShoppingBag, Radio } from "lucide-react"

type OrderStatus = 'pending' | 'paid' | 'failed' | 'cancelled'

type Order = {
  id: number
  total: number
  status: OrderStatus
  fecha: string
  external_reference?: string
  envio_status?: string | null
  nombre_cliente?: string | null
  email_cliente?: string | null
}

type EffectiveStatus = 'pendiente' | 'para_despachar' | 'enviado' | 'cancelado' | 'venta_local'

function getEffectiveStatus(order: Order): EffectiveStatus {
  if (
    order.envio_status === 'cancelled' ||
    order.status === 'cancelled' ||
    order.status === 'failed'
  ) {
    return 'cancelado'
  }
  if (order.status === 'paid') {
    if (order.envio_status === 'local') return 'venta_local'
    if (order.envio_status === 'shipped') return 'enviado'
    return 'para_despachar'
  }
  return 'pendiente'
}

const STATUS_LABELS: Record<EffectiveStatus, string> = {
  pendiente: 'Pendiente de Pago',
  para_despachar: 'Para Despachar',
  enviado: 'Enviado',
  cancelado: 'Cancelado',
  venta_local: 'Venta en Local',
}

const STATUS_STYLES: Record<EffectiveStatus, string> = {
  pendiente: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
  para_despachar: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  enviado: 'bg-green-500/10 text-green-400 border border-green-500/20',
  cancelado: 'bg-white/5 text-white/50 border border-white/10',
  venta_local: 'bg-green-600/20 text-green-300 border border-green-500/30',
}

function formatDate(isoString: string): string {
  try {
    const date = new Date(isoString)
    return new Intl.DateTimeFormat('es-AR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date)
  } catch {
    return isoString
  }
}

export function LiveOrdersCard() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const isFirstLoad = useRef(true)

  const fetchOrders = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null
      const res = await fetch(`${API_BASE_URL}/orders`, {
        cache: 'no-store',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })
      if (res.ok) {
        const data: Order[] = await res.json()
        setOrders(data)
      }
    } catch {
      // Mantener los datos actuales en caso de error transitorio
    } finally {
      if (isFirstLoad.current) {
        setLoading(false)
        isFirstLoad.current = false
      }
    }
  }

  useEffect(() => {
    fetchOrders()
    const interval = setInterval(fetchOrders, 2000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex flex-col rounded-2xl border border-white/8 bg-[#14120e] p-5 shadow-xl min-w-0">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between border-b border-white/6 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#AA6F3B]/15 text-[#AA6F3B]">
            <ShoppingBag className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-serif text-lg font-bold text-white">Pedidos en Vivo</h2>
            <p className="text-xs text-white/40">Feed de órdenes en tiempo real</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            En vivo
          </span>
          <span className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] font-mono font-medium text-white/50">
            {orders.length}
          </span>
        </div>
      </div>

      {/* Orders List / Scroll */}
      <div className="h-[520px] overflow-y-auto pr-1 space-y-2.5">
        {loading ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-white/40">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#AA6F3B] border-t-transparent" />
            <span className="text-xs">Cargando pedidos...</span>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-white/40">
            <Radio className="mb-2 h-8 w-8 text-white/20" />
            <p className="text-sm">No hay pedidos registrados todavía</p>
          </div>
        ) : (
          orders.map((order) => {
            const effStatus = getEffectiveStatus(order)
            return (
              <div
                key={order.id}
                className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] p-3.5 transition-colors hover:bg-white/[0.04]"
              >
                <div className="min-w-0 pr-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-white/90">
                      #{order.id}
                    </span>
                    <span className="text-[11px] text-white/35">
                      {formatDate(order.fecha)}
                    </span>
                  </div>
                  <p className="truncate text-sm font-medium text-white/80">
                    {order.nombre_cliente?.trim() || 'Cliente no registrado'}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span className="font-mono text-sm font-semibold text-white">
                    {order.total.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}
                  </span>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_STYLES[effStatus]}`}>
                    {STATUS_LABELS[effStatus]}
                  </span>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Run typecheck to verify `LiveOrdersCard`**

Run: `pnpm --dir frontend typecheck`
Expected: Exited with code 0

- [ ] **Step 3: Commit `LiveOrdersCard`**

```bash
git add frontend/app/admin/dashboard/LiveOrdersCard.tsx
git commit -m "feat(admin): create LiveOrdersCard component for real-time order stream"
```

---

### Task 3: Stock Monitor Component (`StockMonitorCard`)

**Files:**
- Create: `frontend/app/admin/dashboard/StockMonitorCard.tsx`

**Interfaces:**
- Consumes: `API_BASE_URL` from `@/lib/api`, `GET /products` and `GET /products/reserved-stock`, UI Select component (`@/components/ui/select`).
- Produces: `StockMonitorCard` React client component with dropdown selector for all products vs single product and 3-state stock metrics.

- [ ] **Step 1: Create `frontend/app/admin/dashboard/StockMonitorCard.tsx`**

Write the complete component with product selection, 3-state stock calculation (Total, Reservado, Disponible), and dark UI styling:

```tsx
"use client"

import { useEffect, useState, useMemo } from "react"
import { API_BASE_URL } from "@/lib/api"
import { Package, Layers, Info } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type Product = {
  id: string
  name: string
  description?: string
  price: number
  image?: string
  stock: number
  status: "disponible" | "proximamente" | "agotado"
}

function getImageSrc(src?: string) {
  if (!src) return ""
  if (src.startsWith("http://") || src.startsWith("https://")) return src
  if (src.startsWith("/uploads/")) return src
  return src
}

export function StockMonitorCard() {
  const [products, setProducts] = useState<Product[]>([])
  const [reservedStock, setReservedStock] = useState<Record<string, number>>({})
  const [selectedProductId, setSelectedProductId] = useState<string>("all")
  const [loading, setLoading] = useState(true)

  const loadStockData = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null
      const [resProd, resReserved] = await Promise.all([
        fetch(`${API_BASE_URL}/products`, { cache: 'no-store' }),
        fetch(`${API_BASE_URL}/products/reserved-stock`, {
          cache: 'no-store',
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        }).catch(() => null),
      ])

      if (resProd.ok) {
        const prodData: Product[] = await resProd.json()
        setProducts(prodData)
      }

      if (resReserved && resReserved.ok) {
        const reservedData = await resReserved.json()
        setReservedStock(reservedData)
      } else {
        setReservedStock({})
      }
    } catch {
      // Ignorar errores transitorios
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStockData()
    const interval = setInterval(loadStockData, 5000)
    return () => clearInterval(interval)
  }, [])

  const selectedProduct = useMemo(() => {
    if (selectedProductId === "all") return null
    return products.find((p) => p.id === selectedProductId) || null
  }, [products, selectedProductId])

  return (
    <div className="flex flex-col rounded-2xl border border-white/8 bg-[#14120e] p-5 shadow-xl min-w-0">
      {/* Header */}
      <div className="mb-4 flex flex-col gap-3 border-b border-white/6 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#AA6F3B]/15 text-[#AA6F3B]">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-serif text-lg font-bold text-white">Control de Stock</h2>
            <p className="text-xs text-white/40">Total físico, reservado y disponible</p>
          </div>
        </div>

        {/* Dropdown Selector */}
        <div className="w-full sm:w-56">
          <Select value={selectedProductId} onValueChange={setSelectedProductId}>
            <SelectTrigger className="w-full border-white/10 bg-white/5 text-xs text-white focus:ring-[#AA6F3B]/50">
              <SelectValue placeholder="Seleccionar producto" />
            </SelectTrigger>
            <SelectContent className="border-white/10 bg-[#0f0d0a] text-white">
              <SelectItem value="all" className="text-xs font-medium text-white hover:bg-white/10">
                📦 Todos los productos
              </SelectItem>
              {products.map((p) => (
                <SelectItem key={p.id} value={p.id} className="text-xs text-white/90 hover:bg-white/10">
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Content Area */}
      <div className="h-[520px] overflow-y-auto pr-1">
        {loading ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-white/40">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#AA6F3B] border-t-transparent" />
            <span className="text-xs">Cargando stock...</span>
          </div>
        ) : selectedProduct ? (
          /* Single Product View */
          <div className="space-y-4">
            {/* Product card info */}
            <div className="flex items-center gap-3.5 rounded-xl border border-white/5 bg-white/[0.02] p-4">
              {selectedProduct.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={getImageSrc(selectedProduct.image)}
                  alt={selectedProduct.name}
                  className="h-14 w-14 rounded-lg object-cover border border-white/10"
                />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-white/5 bg-white/5 text-white/30">
                  <Package className="h-6 w-6" />
                </div>
              )}
              <div className="min-w-0">
                <span className="font-mono text-[11px] text-white/40">{selectedProduct.id}</span>
                <h3 className="truncate text-base font-semibold text-white">{selectedProduct.name}</h3>
                <p className="text-xs text-[#AA6F3B] font-mono">
                  {selectedProduct.price.toLocaleString("es-AR", { style: "currency", currency: "ARS" })}
                </p>
              </div>
            </div>

            {/* 3 Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Total */}
              <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4 text-center">
                <span className="text-xs font-medium uppercase tracking-wider text-white/50">Total</span>
                <div className="my-1.5 font-mono text-3xl font-bold text-white">
                  {selectedProduct.stock + (reservedStock[selectedProduct.id] || 0)}
                </div>
                <span className="text-[11px] text-white/40">Físico en depósito</span>
              </div>

              {/* Reservado */}
              <div className="rounded-xl border border-[#AA6F3B]/30 bg-[#AA6F3B]/10 p-4 text-center">
                <span className="text-xs font-medium uppercase tracking-wider text-[#AA6F3B]">Reservado</span>
                <div className="my-1.5 font-mono text-3xl font-bold text-[#AA6F3B]">
                  {reservedStock[selectedProduct.id] || 0}
                </div>
                <span className="text-[11px] text-white/40">Carritos pendientes</span>
              </div>

              {/* Disponible */}
              <div className={`rounded-xl border p-4 text-center ${
                selectedProduct.stock > 0
                  ? 'border-emerald-500/30 bg-emerald-500/10'
                  : 'border-red-500/30 bg-red-500/10'
              }`}>
                <span className={`text-xs font-medium uppercase tracking-wider ${
                  selectedProduct.stock > 0 ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  Disponible
                </span>
                <div className={`my-1.5 font-mono text-3xl font-bold ${
                  selectedProduct.stock > 0 ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {selectedProduct.stock}
                </div>
                <span className="text-[11px] text-white/40">Listo para vender</span>
              </div>
            </div>
          </div>
        ) : (
          /* All Products List View */
          <div className="space-y-2">
            <div className="flex items-center justify-between px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/40 border-b border-white/5">
              <span>Producto</span>
              <span>Total / Res / Disp</span>
            </div>

            {products.map((p) => {
              const res = reservedStock[p.id] || 0
              const disp = p.stock
              const total = disp + res

              return (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] p-3 transition-colors hover:bg-white/[0.04]"
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    {p.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={getImageSrc(p.image)}
                        alt={p.name}
                        className="h-10 w-10 rounded-lg object-cover border border-white/10 shrink-0"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/5 bg-white/5 text-white/30 shrink-0">
                        <Package className="h-4 w-4" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white/90">{p.name}</p>
                      <p className="font-mono text-[11px] text-white/40">{p.id}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 font-mono text-sm shrink-0">
                    <span className="font-semibold text-white" title="Total">{total}</span>
                    <span className="text-white/20">|</span>
                    <span className="font-semibold text-[#AA6F3B]" title="Reservado">{res}</span>
                    <span className="text-white/20">|</span>
                    <span
                      className={`font-semibold ${disp > 0 ? 'text-emerald-400' : 'text-red-400'}`}
                      title="Disponible"
                    >
                      {disp}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Run typecheck to verify `StockMonitorCard`**

Run: `pnpm --dir frontend typecheck`
Expected: Exited with code 0

- [ ] **Step 3: Commit `StockMonitorCard`**

```bash
git add frontend/app/admin/dashboard/StockMonitorCard.tsx
git commit -m "feat(admin): create StockMonitorCard component with dropdown filter and stock metrics"
```

---

### Task 4: Dashboard Page Assembly (`/admin/dashboard/page.tsx`)

**Files:**
- Create: `frontend/app/admin/dashboard/page.tsx`

**Interfaces:**
- Consumes: `LiveOrdersCard` from `./LiveOrdersCard`, `StockMonitorCard` from `./StockMonitorCard`.
- Produces: Default Next.js App Router Page rendering the dashboard overview.

- [ ] **Step 1: Create `frontend/app/admin/dashboard/page.tsx`**

Compose the page with modern header and 2-column grid:

```tsx
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
```

- [ ] **Step 2: Run typecheck to verify dashboard page**

Run: `pnpm --dir frontend typecheck`
Expected: Exited with code 0

- [ ] **Step 3: Commit dashboard page**

```bash
git add frontend/app/admin/dashboard/page.tsx
git commit -m "feat(admin): assemble dashboard page at /admin/dashboard"
```

---

### Task 5: End-to-End Build and Verification

**Files:**
- None (verification only)

- [ ] **Step 1: Run typecheck on frontend**

Run: `pnpm --dir frontend typecheck`
Expected: Exited with code 0

- [ ] **Step 2: Run build on frontend to ensure bundle compiles cleanly**

Run: `pnpm --dir frontend build`
Expected: Exited with code 0, `/admin/dashboard` route listed in Next.js build output.

- [ ] **Step 3: Final commit and cleanup**

Ensure git working tree is clean.

# Plan de Implementación: Scroll Infinito en Feed en Vivo y Navegación a Detalle de Pedidos

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar scroll infinito automático en el feed de pedidos en vivo (`LiveOrdersCard`) e interactividad en sus filas para navegar a `/admin/pedidos` con filtro automático, acordeón expandido y resaltado de la orden seleccionada.

**Architecture:** 
- En `LiveOrdersCard`, incorporar un `IntersectionObserver` vinculado a un centinela al pie del scroll container que incrementa `limit` de a 50 cuando entra en viewport, manteniendo el polling sincronizado con el límite acumulado y añadiendo un evento `onClick` que redirige a `/admin/pedidos?id={order.id}`.
- En `/admin/pedidos`, leer `useSearchParams` de Next.js envuelto en `<Suspense>`, y al detectar un ID objetivo, limpiar filtros restrictivos (`filterLote='all'`, `filterStatus='all'`), buscar por ese ID, expandir el acordeón (`toggleOrder`/`expandOrder`), scrollear hasta la fila y aplicar un destello cobre (`#AA6F3B`).

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript, Tailwind CSS, Lucide React (`lucide-react`).

## Global Constraints
- Cero emojis en toda la interfaz (estricto uso de SVGs de `lucide-react`).
- Paleta oscura de la marca: fondo `#0b0a07`, tarjeta `#14120e`, bordes `border-white/8`, acento cobre `#AA6F3B`.
- TypeScript estricto: cero errores en `pnpm --filter my-v0-project typecheck`.
- Preservar comentarios y lógica operativa preexistente sin roturas de regresión.

---

### Task 1: Scroll Infinito y Clic de Navegación en `LiveOrdersCard`

**Files:**
- Modify: `frontend/app/admin/dashboard/LiveOrdersCard.tsx`

**Interfaces:**
- Consumes: `GET ${API_BASE_URL}/orders?limit={limit}`
- Produces: `router.push('/admin/pedidos?id=' + order.id)` y carga continua de pedidos mediante scroll infinito con `IntersectionObserver`.

- [ ] **Step 1: Modificar `LiveOrdersCard.tsx` para agregar estados de paginación e `IntersectionObserver`**
  - Importar `useRouter` de `next/navigation`.
  - Agregar estados y refs:
    ```tsx
    const router = useRouter()
    const [limit, setLimit] = useState(50)
    const [hasMore, setHasMore] = useState(true)
    const [isLoadingMore, setIsLoadingMore] = useState(false)
    const limitRef = useRef(50)
    const isLoadingMoreRef = useRef(false)
    const hasMoreRef = useRef(true)
    const sentinelRef = useRef<HTMLDivElement | null>(null)
    ```
  - Actualizar `fetchOrders`:
    ```tsx
    const fetchOrders = async (currentLimit = limitRef.current, isLoadMore = false) => {
      try {
        if (isLoadMore) setIsLoadingMore(true)
        const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null
        const res = await fetch(`${API_BASE_URL}/orders?limit=${currentLimit}`, {
          cache: 'no-store',
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        })
        if (res.ok) {
          const data: Order[] = await res.json()
          setOrders(data)
          if (data.length < currentLimit) {
            setHasMore(false)
          } else {
            setHasMore(true)
          }
        }
      } catch {
        // Mantener los datos actuales en caso de error transitorio
      } finally {
        if (isLoadMore) setIsLoadingMore(false)
        if (isFirstLoad.current) {
          setLoading(false)
          isFirstLoad.current = false
        }
      }
    }
    ```
  - Conectar el `IntersectionObserver`:
    ```tsx
    useEffect(() => {
      const sentinel = sentinelRef.current
      if (!sentinel) return

      const observer = new IntersectionObserver(
        (entries) => {
          const [entry] = entries
          if (entry.isIntersecting && hasMoreRef.current && !isLoadingMoreRef.current && !loading) {
            const nextLimit = limitRef.current + 50
            limitRef.current = nextLimit
            setLimit(nextLimit)
            fetchOrders(nextLimit, true)
          }
        },
        {
          rootMargin: '120px',
          threshold: 0.1,
        }
      )

      observer.observe(sentinel)
      return () => observer.disconnect()
    }, [loading, hasMore])
    ```
  - Mantener polling cada 2s sincronizado:
    ```tsx
    useEffect(() => {
      fetchOrders(limitRef.current)
      let interval = setInterval(() => fetchOrders(limitRef.current), 2000)

      const handleVisibilityChange = () => {
        if (document.hidden) {
          clearInterval(interval)
        } else {
          fetchOrders(limitRef.current)
          interval = setInterval(() => fetchOrders(limitRef.current), 2000)
        }
      }

      document.addEventListener('visibilitychange', handleVisibilityChange)

      return () => {
        clearInterval(interval)
        document.removeEventListener('visibilitychange', handleVisibilityChange)
      }
    }, [])
    ```

- [ ] **Step 2: Agregar interacción clickeable en las filas y centinela/loaders al pie de lista**
  - Modificar el contenedor de cada orden:
    ```tsx
    <div
      key={order.id}
      onClick={() => router.push(`/admin/pedidos?id=${order.id}`)}
      className="flex flex-col gap-1.5 rounded-xl border border-white/5 bg-white/[0.02] px-3.5 py-2.5 transition-all hover:bg-white/[0.05] hover:border-[#AA6F3B]/40 cursor-pointer"
      title={`Ver pedido #${order.id} en panel de pedidos`}
    >
    ```
  - Al final de la lista (después del `.map(...)`):
    ```tsx
    {/* Centinela de scroll infinito */}
    <div ref={sentinelRef} className="h-4 w-full pointer-events-none" />

    {isLoadingMore && (
      <div className="flex items-center justify-center gap-2 py-3 text-white/50 text-xs">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#AA6F3B] border-t-transparent" />
        <span>Cargando más pedidos...</span>
      </div>
    )}

    {!hasMore && orders.length > 0 && (
      <div className="py-2.5 text-center text-[11px] text-white/30 border-t border-white/[0.04]">
        Fin de los pedidos registrados
      </div>
    )}
    ```

- [ ] **Step 3: Verificar tipos de TypeScript**
  - Run: `pnpm --filter my-v0-project typecheck`
  - Expected: Exit code 0 (cero errores)

- [ ] **Step 4: Commit**
  - `git add frontend/app/admin/dashboard/LiveOrdersCard.tsx`
  - `git commit -m "feat(frontend): add infinite scroll and order click navigation to LiveOrdersCard"`

---

### Task 2: Detección de Parámetro, Expansión Automática y Resaltado en `/admin/pedidos`

**Files:**
- Modify: `frontend/app/admin/pedidos/page.tsx`

**Interfaces:**
- Consumes: Query params `?id=` o `?orderId=` mediante `useSearchParams()` de `next/navigation`.
- Produces: Búsqueda prefiltrada con el ID, acordeón expandido con ítems cargados, scroll suave y resaltado visual con borde/anillo cobre `#AA6F3B`.

- [ ] **Step 1: Envolver el componente en `<Suspense>` y leer `searchParams`**
  - Importar `useSearchParams` de `next/navigation` y `Suspense` de `react`.
  - Renombrar `AdminPedidosPage` a `AdminPedidosPageContent` y crear el componente contenedor:
    ```tsx
    export default function AdminPedidosPage() {
      return (
        <Suspense
          fallback={
            <div className="flex min-h-screen items-center justify-center bg-[#0b0a07] text-white/40">
              <div className="flex items-center gap-3">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#AA6F3B] border-t-transparent" />
                <span className="text-sm">Cargando panel de pedidos...</span>
              </div>
            </div>
          }
        >
          <AdminPedidosPageContent />
        </Suspense>
      );
    }
    ```
  - En `AdminPedidosPageContent`:
    ```tsx
    const searchParams = useSearchParams();
    const targetOrderIdParam = searchParams.get('id') || searchParams.get('orderId');
    const [highlightedOrderId, setHighlightedOrderId] = useState<number | null>(null);
    const hasHandledTargetOrder = useRef(false);
    ```

- [ ] **Step 2: Manejar la inicialización y el enfoque automático del pedido objetivo**
  - Cuando se monta o cambia `targetOrderIdParam`:
    ```tsx
    useEffect(() => {
      if (!targetOrderIdParam) return;
      // Asegurar que no esté filtrado por lote restringido ni por estado
      setFilterLote('all');
      setFilterStatus('all');
      setSearchQuery(targetOrderIdParam);
    }, [targetOrderIdParam]);
    ```
  - Una vez que `orders` estén cargados y el target no haya sido procesado aún:
    ```tsx
    useEffect(() => {
      if (!targetOrderIdParam || hasHandledTargetOrder.current || orders.length === 0) return;
      const targetId = Number(targetOrderIdParam);
      if (isNaN(targetId)) return;

      const found = orders.some((o) => o.id === targetId);
      if (found) {
        hasHandledTargetOrder.current = true;
        
        // Expandir el pedido
        setExpandedOrders((prev) => new Set(prev).add(targetId));

        // Cargar sus items si no están cargados
        if (!orderItems.has(targetId)) {
          const token = localStorage.getItem('admin_token');
          fetch(`${API_BASE_URL}/orders/${targetId}/items`, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          })
            .then((res) => (res.ok ? res.json() : []))
            .then((items) => {
              setOrderItems((prev) => new Map(prev).set(targetId, items));
            })
            .catch(() => {});
        }

        // Resaltar y hacer scroll
        setHighlightedOrderId(targetId);
        setTimeout(() => {
          const el = document.getElementById(`order-row-${targetId}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 200);

        setTimeout(() => {
          setHighlightedOrderId(null);
        }, 4000);
      }
    }, [orders, targetOrderIdParam, orderItems]);
    ```

- [ ] **Step 3: Agregar ID y estilos de resaltado a la fila de la tabla**
  - En el mapeo de `visible.map((order) => { ... })`:
    ```tsx
    <TableRow
      id={`order-row-${order.id}`}
      className={`cursor-pointer border-b border-white/5 text-white/90 transition-colors ${
        highlightedOrderId === order.id
          ? 'bg-[#AA6F3B]/15 ring-2 ring-[#AA6F3B] hover:bg-[#AA6F3B]/20'
          : 'hover:bg-white/5'
      }`}
      onClick={() => toggleOrder(order.id)}
    >
    ```

- [ ] **Step 4: Verificar tipos con TypeScript**
  - Run: `pnpm --filter my-v0-project typecheck`
  - Expected: Exit code 0 (cero errores)

- [ ] **Step 5: Commit**
  - `git add frontend/app/admin/pedidos/page.tsx`
  - `git commit -m "feat(frontend): support auto-search, accordion expansion and highlight for target order in admin pedidos"`

---

### Task 3: Verificación Integral del Workspace

**Files:**
- All modified files

- [ ] **Step 1: Ejecutar verificación de tipos global**
  - Run: `pnpm --filter backend typecheck`
  - Run: `pnpm --filter my-v0-project typecheck`
  - Expected: 0 errores en ambos proyectos.

- [ ] **Step 2: Ejecutar tests unitarios existentes de backend**
  - Run: `pnpm --filter backend exec jest src/controllers/__tests__/ordersController.test.ts`
  - Expected: 1 passed, 1 total.

- [ ] **Step 3: Inspección visual de git diff**
  - Run: `git diff main..HEAD`
  - Expected: Cambios limpios, sin logs de depuración, sin emojis, manteniendo todas las directivas de estilo intactas.

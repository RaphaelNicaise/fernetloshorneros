# Especificación de Diseño: Scroll Infinito en Feed en Vivo y Navegación a Detalle de Pedidos

- **Fecha:** 2026-10-27
- **Estado:** Aprobado por el usuario
- **Ámbito:** Frontend (`LiveOrdersCard.tsx`, `/admin/pedidos/page.tsx`)

---

## 1. Contexto y Objetivos

En la iteración anterior, se optimizó el feed de pedidos en vivo (`LiveOrdersCard`) limitando la consulta inicial a los últimos 50 pedidos y enriqueciendo el contenido de cada fila.

El usuario requiere dos nuevas capacidades:
1. **Poder cargar más pedidos** progresivamente en el feed del dashboard.
2. **Navegar al pedido seleccionado**: al hacer clic sobre una fila del pedido en el feed, redirigir a `/admin/pedidos`, filtrar por dicho pedido y expandir automáticamente el acordeón con el detalle de sus ítems.

---

## 2. Requerimientos

### 2.1 Requerimientos Funcionales

#### 1. Scroll Infinito en `LiveOrdersCard` (`frontend/app/admin/dashboard/LiveOrdersCard.tsx`):
- **Estado de paginación:**
  - `limit`: estado numérico que inicia en 50.
  - `hasMore`: valor booleano (inicialmente `true`). Si una consulta retorna menos registros que el `limit` actual, se establece en `false`.
  - `isLoadingMore`: bandera para evitar peticiones concurrentes cuando se está trayendo el lote siguiente.
- **Detección vía `IntersectionObserver`:**
  - Se colocará un elemento centinela (`<div ref={sentinelRef} className="h-4 w-full" />`) al pie del contenedor con scroll (`h-[520px] overflow-y-auto`).
  - Cuando el centinela intersecte con el viewport del contenedor (y `hasMore` sea verdadero y no esté cargando), se incrementará el `limit` en +50 y se solicitarán los pedidos.
- **Sincronización con el Polling:**
  - El polling de cada 2 segundos respetará el `limit` acumulado actual para mantener actualizado todo el conjunto visible sin resetear el scroll del usuario.
- **Feedback visual:**
  - Mientras `isLoadingMore` esté activo, se mostrará un spinner sutil en color cobre (`#AA6F3B`) en la parte inferior.
  - Cuando `!hasMore` y haya pedidos en la lista, se mostrará un mensaje discreto: *"Fin de los pedidos registrados"*.

#### 2. Interacción y Redirección en `LiveOrdersCard`:
- Las filas de pedidos tendrán atributos de interacción:
  - Clase `cursor-pointer`, estilos hover (`hover:border-[#AA6F3B]/40 hover:bg-white/[0.05]`), y transición suave.
  - Al hacer clic en la fila, se ejecutará `router.push('/admin/pedidos?id=' + order.id)`.

#### 3. Apertura y Enfoque en `/admin/pedidos` (`frontend/app/admin/pedidos/page.tsx`):
- **Lectura de Parámetros:**
  - Se utilizará `useSearchParams()` para leer `?id=` o `?orderId=`.
  - Se envolverá el componente consumidor en `<Suspense fallback={...}>` para respetar la arquitectura de Next.js App Router sin deshabilitar SSR/prerender.
- **Filtro y Expansión:**
  - Al detectar `targetId` en los searchParams:
    1. Si `filterStatus !== 'all'`, se restablece a `'all'`.
    2. Se asigna `searchQuery = String(targetId)`.
    3. Una vez cargados los pedidos (`orders.length > 0`), si el pedido existe:
       - Se añade su ID a `expandedOrders`.
       - Se dispara `fetchOrderItems(targetId)`.
       - Se localiza el elemento en el DOM (ej. `document.getElementById('order-row-' + targetId)`) y se ejecuta `scrollIntoView({ behavior: 'smooth', block: 'center' })`.
       - Se aplica una clase temporal con animación de resaltado cobre (`ring-2 ring-[#AA6F3B] bg-[#AA6F3B]/10`) para llamar la atención del administrador sobre la fila seleccionada.

---

### 2.2 Requerimientos No Funcionales y UI

- **Cero Emojis:** Todos los indicadores visuales utilizarán SVGs técnicos de `lucide-react` (ej. `ChevronDown`, `CheckCircle`, `Package`, `Loader2`).
- **Paleta de Colores:** Fondo oscuro `#0b0a07`, tarjetas `#14120e`, bordes `border-white/8`, acento cobre `#AA6F3B`.
- **Rendimiento:** `IntersectionObserver` desconectado al desmontar o cuando `hasMore === false`. Sin fugas de memoria ni llamadas en bucle.
- **Seguridad de Tipos:** `pnpm --filter my-v0-project typecheck` debe compilar sin ningún error.

---

## 3. Plan de Verificación

1. **Test de Typecheck:**
   - Ejecutar `pnpm --filter my-v0-project typecheck` para asegurar cero errores de TypeScript en frontend.
2. **Verificación de Scroll Infinito:**
   - Cargar el dashboard y scrollear al final del contenedor del feed: confirmar que `limit` sube de 50 a 100, se pide `${API_BASE_URL}/orders?limit=100`, y se agregan los pedidos sin saltos abruptos.
3. **Verificación de Clic y Navegación:**
   - Clic en una fila de pedido `#123` en el dashboard: debe redirigir a `/admin/pedidos?id=123`.
   - La página de pedidos debe buscar el pedido 123, expandir el acordeón mostrando sus items (cargando items si no están en caché), y resaltar la fila.

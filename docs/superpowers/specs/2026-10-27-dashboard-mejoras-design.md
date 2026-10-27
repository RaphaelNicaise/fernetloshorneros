# Especificación de Diseño: Mejoras Integrales en Admin Dashboard (v2)

- **Fecha:** 2026-10-27
- **Estado:** Aprobado por el usuario
- **Ruta principal:** `/admin/dashboard`
- **Ámbito:** Backend (Express / Sequelize) y Frontend (Next.js / Tailwind / Shadcn UI)

---

## 1. Contexto y Objetivos

El panel de administración de Fernet Los Horneros contaba con una versión inicial del dashboard en `/admin/dashboard` que exhibía dos tarjetas simétricas: un feed de pedidos en tiempo real y un monitor de stock. 

Tras analizar la operativa real del negocio, se identificaron las siguientes oportunidades de mejora:
1. **Falta de visibilidad de métricas globales (KPIs):** Al ingresar, no se observaba a simple vista el total facturado, los pedidos pagados, las botellas vendidas ni los pedidos que requieren empaque urgente.
2. **Desconexión con el concepto de "Salida" / Lote Activo:** Fernet Los Horneros comercializa por tiradas o drops (lotes). El dashboard requería contextualizar las métricas según el lote activo en curso o períodos temporales (`Lote Actual`, `Hoy / 24 hs`, `Histórico`).
3. **Desproporción en el espacio asignado al stock:** El catálogo cuenta con un número muy reducido de productos (1 a 3 productos activos). Dedicar el 50% del ancho y 520px de altura con scroll para un dropdown de stock resultaba ineficiente y desaprovechaba el espacio de pantalla.
4. **Ausencia de visualización geográfica ligera:** Se requería acceder a la distribución de ventas por provincia sin congestionar el espacio operativo principal de pedidos y stock.
5. **Optimización de recursos:** Pausar el sondeo recurrente en segundo plano cuando el usuario no tiene la pestaña activa (`document.hidden`).

El objetivo es evolucionar el dashboard hacia un **Centro de Comando Operativo y de Lanzamiento**, sobrio, ágil, altamente informativo y sin distracciones visuales innecesarias (estricta iconografía técnica de `lucide-react`, sin emojis).

---

## 2. Requerimientos

### 2.1 Requerimientos Funcionales

1. **Cabecera y Selector de Alcance (`DashboardHeader`):**
   - Mostrar badge del lote activo (ej. `Lote #5 - Activo`). Si no hay lote activo, indicar `Sin lote activo`.
   - Selector desplegable de alcance con 3 opciones:
     - `Lote Actual (Lanzamiento)` (opción por defecto).
     - `Hoy (Últimas 24 hs)`.
     - `Histórico Completo`.
   - Botón de acción secundaria: `Ver Mapa de Envíos` con ícono `MapPin`, que abre el panel lateral/modal con el mapa.
   - Indicador de sincronización en vivo (pulso verde, tiempo transcurrido desde el último refresco y botón manual de refresco `RotateCw`).

2. **Fila de Métricas Principales (`DashboardKpis`):**
   - 4 tarjetas métricas con diseño oscuro (`bg-[#14120e] border border-white/8`):
     - **Facturación:** Total recaudado en ARS de órdenes aprobadas (`paid`), con subtexto indicando ticket promedio.
     - **Pedidos Pagados:** Cantidad de órdenes abonadas, con subtexto de carritos pendientes de pago.
     - **Botellas Vendidas:** Cantidad física total de botellas comercializadas (`SUM(pedido_items.cantidad)`).
     - **Para Despachar:** Pedidos pagados pendientes de entrega/envío (`status = 'paid'` y `envio_status != 'shipped'`). Si el valor es mayor a 0, se resalta con borde de atención y un botón de acceso directo a `/admin/pedidos`.

3. **Feed de Pedidos en Vivo (`LiveOrdersCard`):**
   - Ocupa la posición principal y prioritaria (2/3 de ancho en pantallas grandes: `lg:col-span-2`).
   - Mantiene el listado con scroll vertical fluido, `#ID`, cliente, hora formateada, monto total y badge de estado (`Pendiente de Pago`, `Para Despachar`, `Enviado`, `Venta en Local`, `Cancelado`).
   - Escucha `visibilitychange`: detiene las consultas recurrentes cuando la pestaña pasa a segundo plano y realiza un refresco inmediato al volver al foco.

4. **Monitor de Stock Compacto (`StockMonitorCard`):**
   - Ocupa la columna lateral (1/3 de ancho en pantallas grandes: `lg:col-span-1`).
   - Al tratarse de 1 a 3 productos, se eliminan los selectores ocultos: se exhiben directamente en tarjetas compactas apiladas verticalmente.
   - Cada producto muestra su miniatura/ícono, nombre, ID de producto y tres píldoras métricas en línea:
     - `Total` (Físico en depósito).
     - `Reservado` (Carritos pendientes).
     - `Disponible` (Listo para la venta, con alerta roja solo si stock <= 0).

5. **Panel de Distribución Geográfica (`GeoMapDrawer`):**
   - Diálogo o Drawer lateral colapsable (Shadcn `Dialog` / `Sheet`) que no recarga la página ni interrumpe el feed de pedidos.
   - Renderiza [`ArgentinaMap`](file:///C:/Rapha/Laburo/fernetloshorneros/frontend/components/ArgentinaMap.tsx) con escala coroplética de color cobre (`#c8a97a` a `#7a3e0f`).
   - Incluye tabla o ranking ordenado de las provincias con mayor cantidad de pedidos y botellas enviadas.

---

### 2.2 Requerimientos No Funcionales

- **Consistencia Visual:** Paleta sobria basada en fondo `#0b0a07`, tarjetas `#14120e`, bordes sutiles `border-white/8`, acento cobrizo `#AA6F3B` y tipografía serif en títulos (`font-serif`).
- **Cero Emojis:** Todos los indicadores visuales emplean íconos SVG de `lucide-react` para mantener una imagen técnica y profesional.
- **Rendimiento y Carga de Servidor:**
  - Las métricas agregadas se computan en una sola consulta de backend (<15ms).
  - El sondeo de pedidos en vivo se suspende cuando el usuario minimiza el navegador o cambia de pestaña.
- **Resiliencia ante Fallos de Red:** Si una petición de sondeo falla momentáneamente, los componentes conservan los datos visualizados previamente sin parpadeos ni pantallas en blanco.

---

## 3. Arquitectura y Contratos de Datos

### 3.1 Backend: Endpoint de Estadísticas Agregadas

* **Ruta:** `GET /admin/dashboard/stats` en [`backend/src/routes/admin.ts`](file:///C:/Rapha/Laburo/fernetloshorneros/backend/src/routes/admin.ts).
* **Middleware:** `adminAuth` (requiere JWT de administrador).
* **Parámetros de consulta (Query Params):**
  * `scope`: `'lote'` | `'today'` | `'all'` (default: `'lote'`).
  * `lote_id`: número opcional para filtrar por un lote particular.

#### Esquema de Respuesta (JSON)
```typescript
interface DashboardStatsResponse {
  scope: 'lote' | 'today' | 'all';
  activeLote: {
    id: number;
    nombre: string;
    activo: boolean;
  } | null;
  kpis: {
    revenue: number;              // Suma total de pedidos pagos
    paidOrders: number;           // Cantidad de pedidos con status = 'paid'
    pendingPaymentOrders: number;    // Pedidos pendientes de pago
    totalBottlesSold: number;     // Suma de pi.cantidad para pedidos pagos
    pendingShipmentOrders: number; // Pedidos pagados aún no despachados
    avgTicket: number;            // Ticket promedio de compra
  };
  alerts: {
    criticalStockCount: number;    // Productos con stock <= 10
  };
  geoDistribution: Array<{
    provincia: string;
    count: number;                // Cantidad de pedidos
    bottles: number;              // Cantidad de botellas
  }>;
}
```

#### Lógica SQL
Se ejecutan consultas agrupadas mediante `QueryTypes.SELECT`:
1. **Lote Activo:** `SELECT id, nombre, activo FROM lotes WHERE activo = TRUE LIMIT 1`.
2. **Métricas de Pedidos:**
   ```sql
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
   WHERE [CONDICION_SEGÚN_SCOPE];
   ```
3. **Botellas Vendidas:**
   ```sql
   SELECT COALESCE(SUM(pi.cantidad), 0) AS totalBottles
   FROM pedido_items pi
   JOIN pedidos p ON p.id = pi.id_pedido
   WHERE p.status = 'paid' AND [CONDICION_SEGÚN_SCOPE];
   ```
4. **Distribución Geográfica:**
   ```sql
   SELECT 
     e.provincia, 
     COUNT(DISTINCT p.id) AS count,
     COALESCE(SUM(pi.cantidad), 0) AS bottles
   FROM envios e
   JOIN pedidos p ON p.id = e.id_pedido
   LEFT JOIN pedido_items pi ON pi.id_pedido = p.id
   WHERE p.status = 'paid' AND e.provincia IS NOT NULL AND e.provincia != '' AND [CONDICION_SEGÚN_SCOPE]
   GROUP BY e.provincia
   ORDER BY count DESC;
   ```

---

### 3.2 Frontend: Árbol de Componentes

```
frontend/app/admin/dashboard/
├── page.tsx                           # Contenedor orquestador del Dashboard
├── components/
│   ├── DashboardHeader.tsx            # Badge de lote, selector de scope, botón mapa, sync status
│   ├── DashboardKpis.tsx              # Grid 4 columnas de tarjetas de métricas
│   ├── GeoMapDrawer.tsx               # Modal/Drawer con ArgentinaMap y ranking provincial
│   ├── LiveOrdersCard.tsx             # Feed de pedidos en tiempo real (lg:col-span-2)
│   └── StockMonitorCard.tsx           # Monitor compacto de productos y stock (lg:col-span-1)
```

---

## 4. Casos Borde y Manejo de Errores

1. **Sin Lote Activo:** Si la base de datos no tiene lotes configurados como `activo = TRUE`, el sistema utiliza por defecto el alcance `'today'` o `'all'` y el badge superior muestra `"Sin Lote Activo"`.
2. **Cero Pedidos en el Período:** Los KPIs se muestran limpiamente con ceros (`$ 0`, `0 botellas`, `0 pedidos`) sin generar errores de división por cero en el ticket promedio (`avgTicket = 0`).
3. **Pestaña en Segundo Plano (`document.visibilitychange`):** Se cancelan los intervalos de polling activos para no consumir ancho de banda de red ni batería del cliente. Al retornar el foco a la ventana, se ejecuta una sincronización inmediata.
4. **Micro-cortes de Conexión:** Si una solicitud falla por timeout o pérdida transitoria de señal, se conservan los datos previos en pantalla y el botón de sincronización muestra un estado de reintento.

---

## 5. Estrategia de Verificación y Testing

1. **Backend Unit Tests:**
   - Crear suite de pruebas para el endpoint `GET /admin/dashboard/stats`:
     - Validación con `scope=lote` (corroborar que solo contabilice pedidos asociados a dicho lote).
     - Validación con `scope=today` (corroborar corte de medianoche).
     - Validación con `scope=all`.
     - Verificación de rechazo ante solicitudes no autenticadas (HTTP 401).
2. **Frontend Component & Build Verification:**
   - Ejecución de `pnpm build` o `pnpm lint` en el paquete de frontend para asegurar cero errores tipográficos en TypeScript y estilos Tailwind.
   - Verificación de layout responsive (móvil: 1 columna apilada; desktop: 4 KPIs arriba, 65% / 35% en grid inferior).
   - Comprobación de apertura y cierre del drawer de `ArgentinaMap` sin saltos de scroll.

# Especificación de Diseño: Optimización del Feed de Pedidos en Vivo y Nombres de Provincias en Mapa

- **Fecha:** 2026-10-27
- **Estado:** Aprobado por el usuario
- **Ámbito:** Backend (`ordersController.ts`, `orderQueries.ts`) y Frontend (`LiveOrdersCard.tsx`, `GeoMapDrawer.tsx`)

---

## 1. Contexto y Objetivos

Durante el uso real del nuevo dashboard se detectaron dos necesidades clave:
1. **Rendimiento del feed en vivo y detalle de pedidos:**
   - Actualmente `LiveOrdersCard` consulta `GET /orders` sin límite, descargando la totalidad del historial de pedidos cada 2 segundos.
   - Las filas de pedidos ocupan demasiado espacio vertical y carecen de información operativa fundamental que el administrador necesita ver de inmediato: si el cliente utilizó un cupón de descuento, qué productos y qué cantidad compró, y la localidad y provincia de destino.
2. **Visualización en el modal del mapa (`GeoMapDrawer`):**
   - En la lista de ranking provincial al lado del mapa de Argentina, los nombres de las provincias se truncan con puntos suspensivos (`B...`, `Sant...`, `Ciud...`, `Córd...`), impidiendo su lectura completa.

El objetivo es optimizar la carga del feed trayendo únicamente un bloque fijo de los últimos 50 pedidos, compactar las filas a dos micro-líneas de alta densidad que exhiban todos los datos requeridos, y ensanchar el diálogo del mapa para que los nombres de las provincias se lean en su totalidad.

---

## 2. Requerimientos

### 2.1 Requerimientos Funcionales

1. **Backend - Parámetro de límite en órdenes (`GET /orders?limit=50`):**
   - Modificar `getAllOrders(lote_id?: number | null, limit?: number | null)` en `backend/src/services/orders/orderQueries.ts`.
   - Modificar `listOrders` en `backend/src/controllers/ordersController.ts` para capturar `req.query.limit` (número positivo opcional) y aplicarlo a la consulta SQL.
   - Si se especifica `limit`, la consulta agregará `LIMIT :limit` tras `ORDER BY p.fecha DESC`.

2. **Backend - Resumen de productos por pedido (`items_summary`):**
   - En la consulta SQL de `getAllOrders`, incorporar una subquery con `GROUP_CONCAT` para concatenar los ítems de cada orden en una sola pasada:
     ```sql
     (SELECT GROUP_CONCAT(CONCAT(pi.cantidad, 'x ', pi.title) SEPARATOR ', ')
      FROM pedido_items pi
      WHERE pi.id_pedido = p.id) AS items_summary
     ```
   - Retornar `items_summary` en el tipo `Order` de backend.

3. **Frontend - Rediseño de filas en `LiveOrdersCard.tsx`:**
   - La consulta de pedidos se actualizará a `${API_BASE_URL}/orders?limit=50`.
   - Altura de fila compactada con padding vertical reducido (`py-2 px-3` en lugar de `p-3.5`).
   - Cada fila contendrá:
     - **Micro-línea 1 (Identificación, Ubicación y Estado):**
       - `#ID` (mono bold) y hora formateada (`HH:mm`).
       - Nombre del cliente (`nombre_cliente`).
       - Ciudad y Provincia completas con ícono `MapPin` (ej. `Bahía Blanca, Buenos Aires`).
       - Monto total en ARS (`$ xx.xxx`).
       - Badge de estado efectivo (`Para Despachar`, `Enviado`, `Pendiente de Pago`, etc.).
     - **Micro-línea 2 (Productos y Cupón):**
       - Ícono `Package` con el texto de productos (`items_summary`, ej. `2x Fernet Los Horneros 750ml, 1x Vaso Grabado`).
       - Si la orden utilizó cupón (`cupon_codigo`), mostrar badge compacto cobre con ícono `Tag`: `Cupón: CODIGO (-$X.XXX)`.

4. **Frontend - Corrección en `GeoMapDrawer.tsx`:**
   - Ampliar el modal de `max-w-4xl` a `max-w-5xl` o `max-w-6xl`.
   - Modificar la distribución de columnas a `md:grid-cols-12` (mapa 5 columnas, ranking 7 columnas).
   - Eliminar el `truncate` agresivo en el nombre de la provincia y asegurar que nombres largos como *"Ciudad Autónoma de Buenos Aires"* o *"Tierra del Fuego"* se muestren sin puntos suspensivos.

---

### 2.2 Requerimientos No Funcionales

- **Zero Placeholders:** Código final completo y comandos ejecutables.
- **Rendimiento:** La carga periódica del feed no debe transferir más de ~4 KB por ciclo.
- **Iconografía y Diseño:** Respetar la iconografía técnica de `lucide-react`, estética oscura `#14120e` y cero emojis.

---

## 3. Plan de Verificación

1. **Backend:**
   - Ejecutar pruebas unitarias en `ordersService` / `ordersController` y verificar que `GET /orders?limit=50` aplique el límite y retorne `items_summary`.
   - `pnpm --filter backend typecheck` sin errores.
2. **Frontend:**
   - `pnpm --filter my-v0-project typecheck` sin errores.
   - Verificación de renderizado en `LiveOrdersCard` mostrando cliente, ubicación, productos y cupón.
   - Verificación de nombres completos de provincias en `GeoMapDrawer`.

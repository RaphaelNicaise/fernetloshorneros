# Especificación de Diseño: Admin Dashboard

- **Fecha:** 2026-09-28
- **Estado:** Aprobado por el usuario
- **Ruta principal:** `/admin/dashboard`
- **Redirección:** `/admin` -> `/admin/dashboard`

---

## 1. Contexto y Objetivos

El panel de administración de Los Horneros requería una pantalla principal al ingresar a `/admin` que sintetice el estado del negocio en tiempo real. 

El objetivo de esta funcionalidad es brindar una vista ágil de **solo lectura** compuesta por dos elementos centrales:
1. **Pedidos en vivo:** Un feed en tiempo real con scroll vertical donde se observan los pedidos más recientes y su estado actual sin acciones operativas (evitar clics accidentales o sobrecarga de controles).
2. **Monitor de Stock:** Un control para visualizar los 3 estados del stock (Total físico en depósito, Reservado en carritos pendientes, y Disponible para la compra), ya sea para todos los productos de forma simultánea o seleccionando un producto específico desde un menú desplegable.

---

## 2. Requerimientos

### 2.1 Requerimientos Funcionales
- **Redirección automática:** Al navegar a `/admin`, la aplicación redirigirá inmediatamente a `/admin/dashboard`.
- **Navegación lateral (`layout.tsx`):**
  - Añadir `Dashboard` en el primer lugar de `NAV_ITEMS` con el ícono `LayoutDashboard` (`lucide-react`).
  - Mantener los estilos activos y el breadcrumb congruente (`Admin / Dashboard`).
- **Bloque "Pedidos en vivo":**
  - Actualización periódica silenciosa cada 2 segundos (`GET /orders`).
  - Contenedor con scroll vertical (`max-h-[520px] overflow-y-auto`).
  - Cada tarjeta de pedido exhibe:
    - `#ID` y fecha/hora legible o relativa.
    - Nombre del cliente (o indicador por defecto).
    - Monto total en formato ARS (`$xx.xxx`).
    - Badge con color según el estado efectivo: `Pendiente de Pago` (amarillo), `Para Despachar` (azul), `Enviado` (verde), `Venta en Local` (esmeralda), `Cancelado` (gris).
  - Estrictamente modo solo lectura: sin botones de despacho, edición ni eliminación.
- **Bloque "Monitor de Stock":**
  - Selector desplegable (`Select`) con:
    - `"Todos los productos"` (opción por defecto).
    - Opciones individuales por producto.
  - Cuando se selecciona un producto específico:
    - Cabecera con imagen y nombre.
    - 3 tarjetas métricas destacadas:
      - **Stock Total:** Físico en depósito (`p.stock + reservedStock[p.id]`).
      - **Stock Reservado:** En carritos pendientes (`reservedStock[p.id] || 0`).
      - **Stock Disponible:** Listo para comprar (`p.stock`).
  - Cuando se selecciona `"Todos los productos"`:
    - Lista compacta con scroll vertical (`max-h-[460px]`).
    - Cada fila muestra la imagen/ícono, el nombre del producto y las 3 cifras claras (`Total | Reservado | Disponible`) con sus respectivos colores.
  - Actualización periódica de stock sincronizada con `/products` y `/products/reserved-stock`.

### 2.2 Requerimientos No Funcionales y UI/UX
- Paleta visual consistente con el tema oscuro del panel (`#0b0a07`, `#0f0d0a`, bordes `border-white/8`, acentos cobre `#AA6F3B`).
- Indicador visual animado (pulso verde) que denote la actividad en vivo.
- Rendimiento eficiente: el re-renderizado periódico debe conservar la posición de scroll y no causar parpadeos en pantalla.

---

## 3. Arquitectura y Componentes

### 3.1 Estructura de Archivos
- `frontend/app/admin/page.tsx`: Modificado para redirigir a `/admin/dashboard`.
- `frontend/app/admin/layout.tsx`: Actualizado con el item `Dashboard` en `NAV_ITEMS`.
- `frontend/app/admin/dashboard/page.tsx`: Nueva página que orquesta los componentes del Dashboard.
- `frontend/app/admin/dashboard/LiveOrdersCard.tsx`: Componente modular para el feed de pedidos en vivo.
- `frontend/app/admin/dashboard/StockMonitorCard.tsx`: Componente modular para el monitor de stock y selector desplegable.

### 3.2 Diagrama de Flujo de Datos

```
+---------------------------------------------------------+
|                  /admin/dashboard                       |
+----------------------------+----------------------------+
                             |
             +---------------+---------------+
             |                               |
             v                               v
+-------------------------+     +-------------------------+
|   LiveOrdersCard        |     |   StockMonitorCard      |
+-------------------------+     +-------------------------+
| Poll: GET /orders (2s)  |     | GET /products           |
| Pure read-only display  |     | GET /products/reserved  |
| Scrollable feed         |     | Dropdown: All or Single |
+-------------------------+     +-------------------------+
```

---

## 4. Endpoints y Contratos de Datos

1. **`GET ${API_BASE_URL}/orders`**
   - Retorna array de pedidos con campos: `id`, `total`, `status`, `fecha`, `envio_status`, `nombre_cliente`, etc.
   - Cálculo del estado efectivo idéntico a `frontend/app/admin/pedidos/page.tsx`:
     - Cancelado si `envio_status === 'cancelled' || status === 'cancelled' || status === 'failed'`.
     - Venta local si `status === 'paid' && envio_status === 'local'`.
     - Enviado si `status === 'paid' && envio_status === 'shipped'`.
     - Para despachar si `status === 'paid'`.
     - Pendiente si `status === 'pending'`.
2. **`GET ${API_BASE_URL}/products`**
   - Retorna array de productos: `id`, `name`, `price`, `image`, `stock`, `status`.
3. **`GET ${API_BASE_URL}/products/reserved-stock`**
   - Retorna mapeo `{ [productId: string]: number }` con unidades reservadas temporalmente en carritos.

---

## 5. Manejo de Errores y Tolerancia a Fallos
- Los errores en peticiones de polling background no interrumpirán la UI ni borrarán los datos previamente cargados.
- Se implementará un mecanismo de recuperación silenciosa en el siguiente tick del intervalo.
- Limpieza garantizada de temporizadores (`clearInterval`) en el ciclo de vida del desmontaje de componentes (`useEffect` cleanup).

---

## 6. Plan de Verificación
1. **Redirección:** Acceder a `http://localhost:3000/admin` y verificar que la URL cambie automáticamente a `/admin/dashboard`.
2. **Navegación:** Comprobar la presencia del enlace `Dashboard` en la barra lateral izquierda y que aparezca marcado como activo.
3. **Pedidos en vivo:**
   - Verificar la carga inicial de los pedidos y la visualización de datos correctos (ID, Cliente, Monto, Estado).
   - Constatar que el contenedor tiene scroll vertical funcional.
   - Confirmar que no hay botones de acción ni posibilidad de alterar el pedido.
4. **Stock:**
   - Verificar la opción inicial "Todos los productos" mostrando el listado con Total, Reservado y Disponible.
   - Cambiar a un producto específico y constatar las 3 tarjetas de métricas con sus cálculos correspondientes.
5. **Chequeo de Tipos y Linter:**
   - Ejecutar `tsc --noEmit` o `npm run lint` para garantizar código libre de errores de compilación.

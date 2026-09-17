# Especificación de Diseño: Mejoras en Analíticas, Búsqueda sin Tildes y Corrección de Tarifas

- **Fecha:** 2026-09-16
- **Estado:** Propuesto
- **Autor:** Antigravity

---

## 1. Resumen y Objetivos

Este documento detalla las soluciones técnicas para cuatro requerimientos clave:
1. **Corrección de Error 500 al guardar tarifas por ciudad (`city_shipping_costs`):** Solucionar el límite de longitud de la columna `value` en la tabla `settings`.
2. **Analíticas - Ranking y Mapa por Botellas vs. Envíos:** Alternar de forma dinámica entre cantidad de envíos/órdenes y cantidad total de botellas vendidas (`SUM(pedido_items.cantidad)`).
3. **Búsqueda insensible a tildes y mayúsculas:** Permitir que al escribir `cordoba`, `rio negro`, `puan`, `neuquen`, `lujan`, `tucuman`, etc., se filtren correctamente las provincias y localidades en los comboboxes y buscadores.
4. **Flujo de Ingresos Interactivo con Rango de Fechas y Horas:** Rediseñar el gráfico de ingresos para permitir filtrar por fechas y rango de horas, adaptándose automáticamente a desglose horario al seleccionar un único día.

---

## 2. Diagnóstico y Corrección de Error 500 (`settings.value`)

### 2.1 Causa Raíz
La tabla `settings` fue creada originalmente con `value VARCHAR(255) NOT NULL`. Al serializar en JSON más de 2 ciudades (ej: General Daniel Cerri, Bahía Blanca, Punta Alta), la cadena JSON supera los 255 caracteres, provocando un error en MySQL:
`Data too long for column 'value'` (Error 1406 / HTTP 500).

### 2.2 Solución
1. Actualizar la definición del esquema en `db/sql/01-init.sql` para que `value` sea `TEXT NOT NULL`.
2. En la inicialización del backend (`backend/src/config/database.ts` dentro de `connectDB`), ejecutar automáticamente la migración `ALTER TABLE settings MODIFY COLUMN value TEXT NOT NULL` de forma idempotente.

---

## 3. Analíticas: Métrica de Botellas vs. Envíos

### 3.1 Backend (`backend/src/controllers/analyticsController.ts`)
Modificar la consulta de distribución geográfica `geoDistribution` para agrupar por provincia y computar tanto la cantidad de pedidos distintos como la suma total de botellas vendidas:

```sql
SELECT 
    e.provincia, 
    COUNT(DISTINCT p.id) as count,
    COALESCE(SUM(pi.cantidad), 0) as bottles
FROM envios e
JOIN pedidos p ON p.id = e.id_pedido
LEFT JOIN pedido_items pi ON pi.id_pedido = p.id
WHERE p.status = 'paid' AND e.fecha BETWEEN :start AND :end [loteCond]
GROUP BY e.provincia
ORDER BY count DESC
```

### 3.2 Frontend (`frontend/app/admin/analytics/page.tsx`)
1. Agregar estado `geoMetric` (`'envios' | 'botellas'`).
2. Insertar un selector tipo pestaña/toggle en la sección de Logística:
   `[ 📦 Envíos | 🍾 Botellas ]`.
3. **Comportamiento dinámico:**
   - **Modo Envíos:** Ordena por `count` DESC, muestra etiqueta "envíos" y alimenta el mapa con `value: count`, `tooltipLabel="envíos"`.
   - **Modo Botellas:** Ordena por `bottles` DESC, muestra etiqueta "botellas", destacando en el puesto #1 la provincia que más botellas compró, y alimenta el mapa con `value: bottles`, `tooltipLabel="botellas"`.

---

## 4. Insensibilidad a Tildes (Diacritics-Aware Search)

### 4.1 Normalización en el Componente Base `Command` (`frontend/components/ui/command.tsx`)
1. Implementar función de normalización de cadenas Unicode:
   ```ts
   export function normalizeSearchText(text: string): string {
     return text
       .toLowerCase()
       .normalize('NFD')
       .replace(/[\u0300-\u036f]/g, '')
       .trim();
   }
   ```
2. Crear un filtro personalizado para `cmdk`:
   ```ts
   export function diacriticsAwareFilter(value: string, search: string, keywords?: string[]): number {
     if (!search) return 1;
     const normSearch = normalizeSearchText(search);
     if (!normSearch) return 1;
     const normValue = normalizeSearchText(value);
     if (normValue.includes(normSearch)) {
       return normValue.startsWith(normSearch) ? 0.9 : 0.75;
     }
     if (keywords) {
       for (const kw of keywords) {
         if (normalizeSearchText(kw).includes(normSearch)) return 0.5;
       }
     }
     return 0;
   }
   ```
3. Configurar `diacriticsAwareFilter` como filtro por defecto en el componente `Command`.

### 4.2 Actualización de Componentes Consumidores
- `ShippingLocationStep.tsx`, `step-shipping.tsx`, `config/page.tsx`:
  - Utilizar comparación normalizada en `onSelect` y `find()` para evitar fallos cuando el valor seleccionado contiene tildes.
- `lista-espera/page.tsx`:
  - Utilizar `normalizeSearchText` para que la búsqueda de usuarios y provincias en la tabla no distinga tildes.

---

## 5. Gráfico Interactivo de Flujo de Ingresos (Fechas y Rango de Horas)

### 5.1 Backend (`backend/src/controllers/analyticsController.ts`)
En lugar de agrupar solo por `DATE(p.fecha)`, la consulta de `revenueEvolution` devolverá granularidad horaria:
```sql
SELECT 
    DATE_FORMAT(p.fecha, '%Y-%m-%d %H:00:00') as date_hour,
    DATE(p.fecha) as date,
    HOUR(p.fecha) as hour,
    SUM(p.total) as revenue,
    COUNT(p.id) as orders
FROM pedidos p
WHERE p.status = 'paid' AND p.fecha BETWEEN :start AND :end [loteCond]
GROUP BY date_hour, date, hour
ORDER BY date_hour ASC
```

### 5.2 Frontend (`frontend/app/admin/analytics/page.tsx`)
1. **Controles de Filtrado:**
   - **Rango de Fechas:** `revenueStartDate` y `revenueEndDate` (inputs date).
   - **Rango Horario:** `revenueStartHour` (0..23) y `revenueEndHour` (0..23).
   - **Botón de Reset:** Vuelve a mostrar todo el lote.
2. **Agrupación Inteligente:**
   - Si `revenueStartDate === revenueEndDate` (o solo 1 día en el lote): Se activa automáticamente la vista por **Horas**, formateando el eje X como `00:00`, `01:00`, ..., `23:00` y mostrando las transacciones hora por hora desde el primer pago hasta el último.
   - Si se seleccionan varios días: Permite alternar entre **Horas**, **Días**, **Semanas** y **Meses**.
3. **Visualización:**
   - Gráfico de Área interactivo de Recharts con eje Y izquierdo (Ingresos en $) y eje Y derecho (Cantidad de Pedidos).
   - Tooltips personalizados con fecha/hora, ingresos y pedidos.

---

## 6. Actualización de Hero Section (Lotes Agotados)

### 6.1 Reemplazo del Contador
1. Conservar el componente `CountdownTimer` en el codebase (y comentado en el código si fuera necesario) para futuros lanzamientos.
2. Reemplazar el bloque de cuenta regresiva "Disponible en:" por un componente/bloque estilizado y elegante de hitos de preventa:
   - **Lote 1:** Agotado · 160 botellas en 8 minutos
   - **Lote 2:** Agotado · 2.000 botellas en 4 horas
3. Diseño integrado a la estética visual de la marca:
   - Contenedor con borde sutil `border-white/10`, fondo translúcido con blur `backdrop-blur-md`, detalles en tono cobre/ámbar (`#aa825e`), badges de "AGOTADO" y tipografía limpia y responsiva.

---

## 7. Plan de Verificación

1. **Prueba de Tarifa por Ciudad:**
   - Guardar 3 o más ciudades en el panel de configuración admin y verificar que la respuesta sea 200 OK y persista sin errores.
2. **Prueba de Búsqueda sin Tildes:**
   - En el combobox de provincia/ciudad y en lista de espera, escribir "cordoba", "rio negro", "puan", "neuquen" y verificar que aparecen "Córdoba", "Río Negro", "Puán", "Neuquén".
3. **Prueba de Conmutador de Botellas:**
   - Alternar entre "Envíos" y "Botellas" en la sección de Logística de Analíticas y confirmar que el ranking y el mapa reflejan las botellas totales.
4. **Prueba de Gráfico de Ingresos por Fecha/Hora:**
   - Seleccionar un día puntual y verificar el desglose por horas.
   - Filtrar rango de horas (ej: 12:00 a 18:00) y verificar la actualización en tiempo real.
5. **Prueba Visual de Hero Section:**
   - Verificar la presentación clara de Lote 1 y Lote 2 agotados en mobile y desktop.
6. **Typecheck de Frontend y Backend:**
   - Ejecutar `tsc --noEmit` en ambos proyectos.

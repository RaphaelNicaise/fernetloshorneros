# Especificación de Diseño: Tarifas Especiales de Envío por Ciudad

- **Fecha:** 2026-09-15
- **Estado:** Propuesto
- **Autor:** Antigravity

---

## 1. Resumen y Objetivos

Permitir a los administradores de la tienda configurar costos de envío específicos por **Ciudad** además de las tarifas por **Provincia** y la **Tarifa General fija**. 

### Objetivos Clave:
1. **Jerarquía de costos de envío:** Ciudad > Provincia > General.
2. **Consistencia:** Utilizar el mismo catálogo de Provincias y Localidades de la API oficial de Georef (`apis.datos.gob.ar/georef/api`) utilizado en el checkout.
3. **Optimización de red (Georef):** Implementar caché en memoria / `sessionStorage` para las localidades de cada provincia para evitar peticiones redundantes y prevenir límites de consumo de la API pública.
4. **Cero migraciones:** Reutilizar la tabla existente `settings` (`key_name = 'city_shipping_costs'`), sin cambios en el esquema relacional ni migraciones de base de datos.

---

## 2. Jerarquía y Reglas de Resolución de Costos

Al cotizar un envío (en `/shipping/quote`, `/shipping/quote-options` y en la creación de órdenes de pago):

1. **Casos Locales (Retiro / Envío local):** Si la ciudad es local (Bahía Blanca, Ingeniero White, Punta Alta), se aplican las reglas locales preexistentes.
2. **Prioridad 1 (Tarifa por Ciudad):** Si existe una regla en `city_shipping_costs` cuya provincia y ciudad coincidan con el destino (comparación normalizada sin tildes, en minúsculas y sin espacios extras), se utiliza este costo.
3. **Prioridad 2 (Tarifa por Provincia):** Si no hay coincidencia de ciudad, pero la provincia tiene una regla en `province_shipping_costs`, se utiliza el costo de la provincia.
4. **Prioridad 3 (Tarifa General Fija):** Si no hay coincidencia ni por ciudad ni por provincia, se aplica `fixed_shipping_cost` (por defecto $5000).

---

## 3. Modelo de Datos y Almacenamiento

### Clave en `settings`
- **Key:** `city_shipping_costs`
- **Value:** String JSON con formato de arreglo de objetos:
  ```json
  [
    {
      "id": "ba-mar-del-plata",
      "province": "Buenos Aires",
      "city": "Mar del Plata",
      "cost": 4500
    },
    {
      "id": "cba-villa-carlos-paz",
      "province": "Córdoba",
      "city": "Villa Carlos Paz",
      "cost": 6200
    }
  ]
  ```

---

## 4. Arquitectura de Componentes

### 4.1. Frontend - Optimización y API (`frontend/lib/api.ts`)
- `fetchLocalidades(provincia: string)`:
  - Consulta en memoria / `sessionStorage` antes de hacer el `fetch` a Georef.
  - Si ya fue consultada la provincia, devuelve los datos desde la caché inmediatamente.
  - Añade manejo de errores robusto.

### 4.2. Backend - Resolución de Tarifas (`backend/src/controllers/shippingController.ts` & `routes/settings.ts`)
- Se añade `'city_shipping_costs'` a `PUBLIC_SETTINGS` en `settings.ts` para permitir consultas públicas.
- Se actualiza la función de resolución en `shippingController.ts`:
  ```ts
  function resolveShippingCost(
    cityCostsRaw: string | undefined | null,
    provinceCostsRaw: string | undefined | null,
    state: string,
    city: string | undefined,
    defaultCost: number
  ): number
  ```
- Normalización unificada para comparar strings (`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()`).

### 4.3. Frontend - Panel de Administración (`frontend/app/admin/config/page.tsx`)
- **Sección:** "Tarifas especiales por Ciudad".
- **Selector encadenado:**
  1. Selector de **Provincia** (reutiliza lista estándar de provincias).
  2. Al seleccionar provincia, carga localidades (vía `fetchLocalidades` con caché) y habilita un combobox con buscador de **Ciudad**.
  3. Campo de entrada para el **Costo ($)**.
  4. Botón **"Agregar Tarifa"**.
- **Listado / Grilla:**
  - Muestra tarjetas o filas con: `Provincia` → `Ciudad`, `$ Costo` editable en vivo, y botón para eliminar la regla.
  - Botón **"Guardar Cambios"** para persistir el array JSON en `/settings/city_shipping_costs`.

---

## 5. Manejo de Errores y Casos Límite

- **Ciudades homónimas:** Al requerir seleccionar primero la provincia, se guarda la tupla `(provincia, ciudad)`, evitando colisiones entre ciudades con el mismo nombre en distintas provincias.
- **Fallo en API de Georef:** Si la API pública no responde, la UI permite ingresar el nombre de la ciudad manualmente como alternativa.
- **Valores inválidos:** Validación en cliente y servidor de que los costos sean números mayores o iguales a 0.

---

## 6. Verificación y Testing

1. **Pruebas de Backend:**
   - Verificación de cotizaciones con ciudad configurada (debe retornar precio de ciudad).
   - Verificación de cotizaciones con provincia configurada sin ciudad (debe retornar precio de provincia).
   - Verificación de cotizaciones sin ciudad ni provincia (debe retornar costo general).
2. **Pruebas de Frontend:**
   - Carga y navegación fluida de localidades en el panel de configuración sin peticiones duplicadas a Georef.
   - Guardado, edición y eliminación de tarifas por ciudad.
   - Reflejo instantáneo del costo en el paso de envío del carrito (`StepShipping`).
3. **Typecheck y Linting:**
   - `pnpm -C frontend typecheck`
   - `pnpm -C backend typecheck`

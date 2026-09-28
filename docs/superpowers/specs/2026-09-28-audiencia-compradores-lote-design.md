# Diseño: Filtro por Lote y Estados de Entrega en Audiencia de Mails (Compradores)

## 1. Contexto y Problema
Al enviar un email masivo a la audiencia "Compradores" desde el panel de administración (`SendBlastModal.tsx`), el sistema únicamente consideraba filas de la tabla `envios` con `status = 'shipped'`.
Esto generaba dos problemas críticos:
1. **Exclusión de pedidos para despachar**: Los pedidos pagados (`pedidos.status = 'paid'`) pendientes de despacho tienen `envios.status = 'pending'`, por lo que quedaban completamente excluidos del envío de correos.
2. **Falta de segmentación por lote**: No se podía discriminar por lote de producción. Si quedaba algún pedido pendiente o histórico de un lote anterior, se mezclaba con los compradores del lote actual, enviando avisos erróneos.

## 2. Objetivos
- Permitir que la audiencia "Compradores" incluya tanto pedidos para despachar como pedidos ya enviados y ventas locales.
- Permitir filtrar compradores según el **Lote** del pedido, seleccionando por defecto el **Lote Actual** con posibilidad de elegir cualquier lote específico o "Todos los lotes".
- Permitir al administrador seleccionar qué estados de entrega abarcar dentro de "Compradores" (Para despachar, Enviado, Venta en local).
- Mantener la sincronización estricta entre el cálculo de destinatarios únicos (`/audiences/count`) y el envío real (`/email-templates/:key/send-blast`).

## 3. Arquitectura y Componentes

### 3.1 Backend

#### Servicio Compartido (`backend/src/services/audiencesService.ts`)
Para evitar duplicación entre `audiencesController.ts` y `emailTemplates.ts`, se crea/extrae `audiencesService`:
```typescript
export interface AudienceFilterOptions {
  audiences: string[]; // 'buyers', 'waitlist'
  provinces?: string[];
  manualList?: string;
  buyerLoteId?: number | 'all' | null;
  buyerStatuses?: ('para_despachar' | 'enviado' | 'venta_local')[];
}

export interface AudienceRecipient {
  email: string;
  nombre: string;
}
```

#### Lógica SQL para "Compradores"
1. Conexión entre pedidos y envíos:
   `pedidos p JOIN envios e ON p.id = e.id_pedido`
2. Pago confirmado y pedidos no cancelados:
   `p.status IN ('approved', 'paid')`
   `AND p.status NOT IN ('cancelled', 'rejected', 'failed')`
   `AND (e.status IS NULL OR e.status NOT IN ('cancelado', 'cancelled'))`
3. Filtro por lote:
   Si `buyerLoteId` no es `'all'` y es numérico: `p.lote_id = :buyerLoteId`.
4. Filtro por estados de entrega (`buyerStatuses`):
   Construcción de condiciones OR según lo seleccionado:
   - `'enviado'`: `e.status = 'shipped'`
   - `'venta_local'`: `e.status = 'local'`
   - `'para_despachar'`: `(e.status IS NULL OR e.status = 'pending' OR e.status NOT IN ('shipped', 'local', 'cancelado', 'cancelled'))`
5. Filtro por provincia:
   Si `provinces` no está vacío: `e.provincia IN (:provinces)`
6. Deduplicación de emails y sanitización (sin case sensitive, nombre por defecto si está vacío).

### 3.2 Frontend (`frontend/app/admin/emails/components/SendBlastModal.tsx`)

#### Estados y Carga de Datos
- Carga de lotes usando `/lotes` al abrir el modal.
- `selectedLote`: ID del lote actual por defecto (`lote.activo === true`), o `'all'` si no hay activo.
- `buyerStatuses`: `['para_despachar', 'enviado']` por defecto al marcar "Compradores".
- UI interactiva:
  - Cuando "Compradores" está marcado, se despliega un sub-panel con:
    - Selector de Lote (`<Select>` con opciones de cada lote + "Todos los lotes").
    - Checkboxes para estados de entrega: "Para despachar", "Enviado", "Venta en local".
- Actualización automática del conteo de destinatarios vía `debounced calculateCount()` enviando `buyerLoteId` y `buyerStatuses`.
- Envío masivo enviando los mismos parámetros a `/email-templates/:key/send-blast`.

## 4. Pruebas y Verificación
- Prueba unitaria/de integración backend para `audiencesService` verificando:
  - Conteo de compradores solo en "para despachar".
  - Conteo de compradores solo en "enviado".
  - Filtrado por lote específico vs "all".
  - Exclusión de pedidos cancelados o no pagados.
- Verificación en frontend de la llamada a `/audiences/count` y `/send-blast` con los filtros seleccionados.

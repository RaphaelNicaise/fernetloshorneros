# Audiencia Compradores con Filtro por Lote y Estados - Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir filtrar a los compradores por lote y por estados de entrega (para despachar, enviado, venta local) en el envío masivo de correos, corrigiendo la exclusión de pedidos pendientes de despacho.

**Architecture:** 
- Crear un servicio backend unificado `audiencesService.ts` que centralice la construcción de consultas SQL para cálculo de conteo y obtención de destinatarios de emails masivos (evitando la duplicación entre `audiencesController.ts` y `emailTemplates.ts`).
- Actualizar `SendBlastModal.tsx` en el frontend para cargar los lotes disponibles, pre-seleccionar el lote activo y permitir seleccionar estados de entrega (Para despachar, Enviado, Venta local) con debounce en el recálculo.

**Tech Stack:** TypeScript, Next.js (React), Express, Sequelize (MySQL), Jest.

## Global Constraints
- Debe sincronizarse exactamente el conteo (`/audiences/count`) con el envío real (`/email-templates/:key/send-blast`).
- Por defecto, al seleccionar "Compradores", debe seleccionarse el Lote Actual y los estados "Para despachar" y "Enviado".
- Se deben excluir siempre pedidos o envíos cancelados/fallidos.
- Preservar tipado estricto y ejecutar pruebas/typecheck.

---

### Task 1: Crear `audiencesService` en Backend con Pruebas Unitarias

**Files:**
- Create: `backend/src/services/audiencesService.ts`
- Create: `backend/src/services/__tests__/audiencesService.test.ts`

**Interfaces:**
```typescript
export type BuyerStatus = 'para_despachar' | 'enviado' | 'venta_local';

export interface AudienceFilterOptions {
  audiences: string[]; // 'buyers', 'waitlist'
  provinces?: string[];
  manualList?: string;
  buyerLoteId?: number | 'all' | null;
  buyerStatuses?: BuyerStatus[];
}

export interface AudienceRecipient {
  email: string;
  nombre: string;
}

export const audiencesService = {
  getRecipients(options: AudienceFilterOptions): Promise<AudienceRecipient[]>;
  countRecipients(options: AudienceFilterOptions): Promise<number>;
  parseManualList(text?: string): AudienceRecipient[];
};
```

- [ ] **Step 1: Escribir test unitario con casos de prueba**
  Crear `backend/src/services/__tests__/audiencesService.test.ts` testeando `parseManualList`, y la construcción y deduplicación de destinatarios con mocks de sequelize.

- [ ] **Step 2: Ejecutar test para confirmar que falla antes de implementar**
  Ejecutar `npm test -- audiencesService.test.ts` en `backend`.

- [ ] **Step 3: Implementar `audiencesService.ts`**
  Escribir `backend/src/services/audiencesService.ts` con soporte para:
  - Join `pedidos p` y `envios e` con `p.status IN ('approved', 'paid')`
  - Filtro por lote `p.lote_id = :loteId` cuando `buyerLoteId` está presente y no es `'all'`
  - Filtro dinámico por `buyerStatuses` (`para_despachar`, `enviado`, `venta_local`)
  - Filtro por provincia
  - Deduplicación por email (case-insensitive) y sanitización.

- [ ] **Step 4: Ejecutar tests y verificar que pasen**
  Ejecutar `npm test -- audiencesService.test.ts` en `backend`.

- [ ] **Step 5: Commit de Task 1**
  `git add backend/src/services/audiencesService.ts backend/src/services/__tests__/audiencesService.test.ts && git commit -m "feat(backend): add audiencesService with buyers lote and status filtering"`

---

### Task 2: Conectar `audiencesController` y `emailTemplates` al nuevo servicio

**Files:**
- Modify: `backend/src/controllers/audiencesController.ts`
- Modify: `backend/src/routes/emailTemplates.ts`

**Interfaces:**
- Consumes: `audiencesService.getRecipients`, `audiencesService.countRecipients`
- Produces: Endpoints actualizados `POST /audiences/count` y `POST /email-templates/:key/send-blast` recibiendo `buyerLoteId` y `buyerStatuses`.

- [ ] **Step 1: Refactorizar `audiencesController.ts`**
  Reemplazar la lógica duplicada en `countAudience` delegando a `audiencesService.countRecipients`.

- [ ] **Step 2: Refactorizar `backend/src/routes/emailTemplates.ts`**
  En la ruta `/:key/send-blast`, reemplazar la consulta SQL directa delegando en `audiencesService.getRecipients`.

- [ ] **Step 3: Ejecutar typecheck y tests del backend**
  Ejecutar `npm run typecheck` y `npm test` en `backend`.

- [ ] **Step 4: Commit de Task 2**
  `git add backend/src/controllers/audiencesController.ts backend/src/routes/emailTemplates.ts && git commit -m "refactor(backend): use audiencesService in count and send-blast routes"`

---

### Task 3: Actualizar `SendBlastModal.tsx` en Frontend con Selectores de Lote y Estados

**Files:**
- Modify: `frontend/app/admin/emails/components/SendBlastModal.tsx`

**Interfaces:**
- Consumes: `GET /lotes`, `POST /audiences/count`, `POST /email-templates/:key/send-blast`

- [ ] **Step 1: Añadir estados y llamada para cargar lotes**
  - Cargar lotes desde `${API_BASE_URL}/lotes` al montar el componente.
  - Al cargar los lotes, identificar el lote con `activo === true` y fijar `buyerLoteId = activeLote ? String(activeLote.id) : 'all'`.
  - Inicializar `buyerStatuses = ['para_despachar', 'enviado']`.

- [ ] **Step 2: Renderizar los selectores cuando "Compradores" está seleccionado**
  - Desplegable de Lote con estilo acorde a la UI oscura:
    - Opciones: Cada lote con badge `(Actual)` si está activo, y opción `"Todos los lotes"`.
  - Checkboxes para estados de entrega:
    - ☑ Para despachar
    - ☑ Enviado
    - ☐ Venta en local

- [ ] **Step 3: Pasar `buyerLoteId` y `buyerStatuses` en el recálculo y en el envío**
  - Enviar `buyerLoteId` y `buyerStatuses` a `POST /audiences/count` y a `POST /email-templates/${templateKey}/send-blast`.
  - Recalcular conteo en el `useEffect` cuando cambian `buyerLoteId` o `buyerStatuses`.

- [ ] **Step 4: Ejecutar typecheck en frontend**
  Ejecutar `pnpm typecheck` en `frontend`.

- [ ] **Step 5: Commit de Task 3**
  `git add frontend/app/admin/emails/components/SendBlastModal.tsx && git commit -m "feat(frontend): add lote and order status filters to buyers audience modal"`

---

### Task 4: Verificación Integral del Flujo

- [ ] **Step 1: Ejecutar verificación de build y suite de tests completa**
  - Backend: `npm test` y `npm run typecheck`
  - Frontend: `pnpm typecheck`
- [ ] **Step 2: Documentar y confirmar resultados**

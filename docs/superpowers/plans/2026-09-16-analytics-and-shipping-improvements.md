# Analytics, Accent-Insensitive Search, Shipping Settings & Hero Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the 500 error when saving 3+ city shipping rates, add bottle count ranking and map toggle in analytics, make province and locality search accent-insensitive, upgrade the revenue flow chart with date and hour range pickers, and update the Hero section with sold-out badges for Lote 1 and Lote 2.

**Architecture:**
1. Database & Settings: Upgrade `settings.value` from `VARCHAR(255)` to `TEXT` in schema and automated DB startup.
2. Diacritics Normalization: Integrate `diacriticsAwareFilter` in the base `Command` component and clean matching in checkout and admin lists.
3. Backend Analytics: Upgrade `analyticsController.ts` to compute hourly revenue and bottle counts per province.
4. Frontend Analytics: Add dynamic metric toggle (Envíos vs. Botellas) and interactive date/hour revenue flow chart in `/admin/analytics`.
5. Hero Section: Replace the countdown timer with responsive, styled sold-out badges for Lote 1 and Lote 2.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, Recharts, cmdk, Framer Motion, Express, Sequelize, MySQL.

---

### Task 1: Fix 500 Error on Settings Table (`VARCHAR(255)` -> `TEXT`)

**Files:**
- Modify: `db/sql/01-init.sql:82-88`
- Modify: `backend/src/config/database.ts:35-43`

- [ ] **Step 1: Update `01-init.sql` schema**
Change `value VARCHAR(255) NOT NULL` to `value TEXT NOT NULL` in the `settings` table definition.

- [ ] **Step 2: Add automatic startup migration in `backend/src/config/database.ts`**
In `connectDB()`, after authentication, execute:
```ts
try {
  await sequelize.query('ALTER TABLE settings MODIFY COLUMN value TEXT NOT NULL;');
} catch (e) {
  // Ignored if column is already TEXT or table not yet created
}
```

- [ ] **Step 3: Verify backend builds**
Run `pnpm --filter backend build` or `pnpm -C backend typecheck`.

- [ ] **Step 4: Commit changes**
```bash
git add db/sql/01-init.sql backend/src/config/database.ts
git commit -m "fix: modify settings.value column to TEXT to support large JSON settings"
```

---

### Task 2: Accent/Diacritics Insensitive Search across UI & Comboboxes

**Files:**
- Modify: `frontend/components/ui/command.tsx`
- Modify: `frontend/components/shipping/ShippingLocationStep.tsx`
- Modify: `frontend/components/checkout/step-shipping.tsx`
- Modify: `frontend/app/admin/config/page.tsx`
- Modify: `frontend/app/admin/lista-espera/page.tsx`

- [ ] **Step 1: Implement `diacriticsAwareFilter` in `frontend/components/ui/command.tsx`**
Add `normalizeSearchText` and `diacriticsAwareFilter`, and pass `filter = diacriticsAwareFilter` to `CommandPrimitive`.

- [ ] **Step 2: Update `ShippingLocationStep.tsx` and `step-shipping.tsx`**
Ensure that `onSelect` uses normalized matching to find the selected province or locality in the array.

- [ ] **Step 3: Update `admin/config/page.tsx`**
Ensure city combobox selection and province checks use normalized strings without accent mismatches.

- [ ] **Step 4: Update `admin/lista-espera/page.tsx`**
In `filtered` useMemo, normalize search query and fields with `normalizeSearchText(u.provincia)` / `nombre` / `email`.

- [ ] **Step 5: Verify frontend typecheck**
Run `pnpm -C frontend typecheck`.

- [ ] **Step 6: Commit changes**
```bash
git add frontend/components/ui/command.tsx frontend/components/shipping/ShippingLocationStep.tsx frontend/components/checkout/step-shipping.tsx frontend/app/admin/config/page.tsx frontend/app/admin/lista-espera/page.tsx
git commit -m "feat: make province and locality search diacritics and case insensitive"
```

---

### Task 3: Backend Analytics - Hourly Revenue & Province Bottle Counts

**Files:**
- Modify: `backend/src/controllers/analyticsController.ts`

- [ ] **Step 1: Update `revenueEvolution` query in `backend/src/controllers/analyticsController.ts`**
Change query to group by `date_hour`, `date`, and `hour`:
```sql
SELECT 
    DATE_FORMAT(p.fecha, '%Y-%m-%d %H:00:00') as date_hour,
    DATE(p.fecha) as date,
    HOUR(p.fecha) as hour,
    SUM(p.total) as revenue,
    COUNT(p.id) as orders
FROM pedidos p
WHERE p.status = 'paid' AND p.fecha BETWEEN :start AND :end ${loteCond}
GROUP BY date_hour, date, hour
ORDER BY date_hour ASC
```

- [ ] **Step 2: Update `geoDistribution` query in `backend/src/controllers/analyticsController.ts`**
Calculate both `count` (distinct orders) and `bottles` (`SUM(pi.cantidad)`):
```sql
SELECT 
    e.provincia, 
    COUNT(DISTINCT p.id) as count,
    COALESCE(SUM(pi.cantidad), 0) as bottles
FROM envios e
JOIN pedidos p ON p.id = e.id_pedido
LEFT JOIN pedido_items pi ON pi.id_pedido = p.id
WHERE p.status = 'paid' AND e.fecha BETWEEN :start AND :end ${loteCond}
GROUP BY e.provincia
ORDER BY count DESC
```

- [ ] **Step 3: Verify backend typecheck**
Run `pnpm -C backend typecheck`.

- [ ] **Step 4: Commit changes**
```bash
git add backend/src/controllers/analyticsController.ts
git commit -m "feat: add hourly revenue breakdown and bottle counts per province to analytics BI"
```

---

### Task 4: Frontend Analytics - Interactive Date & Hour Range Revenue Flow Chart

**Files:**
- Modify: `frontend/app/admin/analytics/page.tsx`

- [ ] **Step 1: Update `BIStats` type in `frontend/app/admin/analytics/page.tsx`**
Add types for `date_hour`, `hour`, and `bottles` in `revenue` and `shipping.geoDistribution`.

- [ ] **Step 2: Add Revenue Filter States & Logic**
Add `revenueStartDate`, `revenueEndDate`, `revenueStartHour` (default 0), `revenueEndHour` (default 23).
Implement smart `groupedRevenue` useMemo that:
- Filters records within the date and hour window.
- If single day selected (`revenueStartDate === revenueEndDate`), automatically displays hourly points (`00:00`, `01:00`, ...).
- If multiple days, supports grouping by `hour`, `day`, `week`, `month`.

- [ ] **Step 3: Update Revenue Chart UI**
Add inputs for date range, hour range, quick clear button, and display formatted area chart with tooltip.

- [ ] **Step 4: Verify frontend typecheck**
Run `pnpm -C frontend typecheck`.

- [ ] **Step 5: Commit changes**
```bash
git add frontend/app/admin/analytics/page.tsx
git commit -m "feat: add interactive date and hour range revenue flow chart to analytics"
```

---

### Task 5: Frontend Analytics - Province Bottles vs. Envíos Metric Toggle (Ranking & Map)

**Files:**
- Modify: `frontend/app/admin/analytics/page.tsx`

- [ ] **Step 1: Add `geoMetric` State and Toggle Switch**
Add `const [geoMetric, setGeoMetric] = useState<'envios' | 'botellas'>('envios');`.
Render a toggle button `[ 📦 Envíos | 🍾 Botellas ]` in the Logistics section header.

- [ ] **Step 2: Update Ranking por Provincia**
Sort `stats.shipping.geoDistribution` based on `geoMetric === 'botellas' ? b.bottles - a.bottles : b.count - a.count`.
Display `prov.bottles` with label "botellas" when in bottles mode, and `prov.count` with label "envíos" when in envíos mode.

- [ ] **Step 3: Update ArgentinaMap Data & Tooltips**
Pass `value: geoMetric === 'botellas' ? Number(p.bottles) : Number(p.count)` and `tooltipLabel={geoMetric === 'botellas' ? 'botellas' : 'envíos'}` to `ArgentinaMap`.

- [ ] **Step 4: Verify frontend typecheck**
Run `pnpm -C frontend typecheck`.

- [ ] **Step 5: Commit changes**
```bash
git add frontend/app/admin/analytics/page.tsx
git commit -m "feat: add bottles vs shipments toggle to analytics ranking and map"
```

---

### Task 6: Hero Section - Replace Countdown with Sold Out Badges (Lote 1 & Lote 2)

**Files:**
- Modify: `frontend/components/home/HeroSection.tsx`

- [ ] **Step 1: Update Hero Section layout in mobile and desktop**
- Comment out `<CountdownTimer />` and "Disponible en:".
- Render high-conversion sold-out milestones:
  - **Lote 1:** Agotado · 160 botellas en 8 minutos
  - **Lote 2:** Agotado · 2.000 botellas en 4 horas
- Style with dark luxury aesthetic, golden borders, badges, and responsive typography.

- [ ] **Step 2: Verify frontend build and typecheck**
Run `pnpm -C frontend typecheck`.

- [ ] **Step 3: Commit changes**
```bash
git add frontend/components/home/HeroSection.tsx
git commit -m "feat: update hero section with Lote 1 and Lote 2 sold out badges"
```

---

### Task 7: Full System Verification

- [ ] **Step 1: Run full TypeScript check**
`pnpm -C backend typecheck` and `pnpm -C frontend typecheck`.

- [ ] **Step 2: Run backend tests**
`pnpm -C backend test`.

- [ ] **Step 3: Verify all tasks completed and report results**

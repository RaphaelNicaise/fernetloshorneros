# City Shipping Costs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable shop administrators to configure custom shipping costs per city (in addition to province and general flat rates), with Georef API caching and unified cart checkout calculation without database schema migrations.

**Architecture:** A new key `city_shipping_costs` is stored in the existing `settings` table as JSON. Backend shipping controllers resolve rates with the priority: City -> Province -> General Flat Rate. The frontend caches Georef API responses in memory / sessionStorage to avoid rate limits and offers an admin interface in `/admin/config` matching the checkout selector.

**Tech Stack:** Next.js (React 19, Tailwind CSS, Lucide icons, Shadcn UI Popover & Command), Express (Node.js, TypeScript, Sequelize), Jest.

## Global Constraints

- Storage: Use existing `settings` table (`key_name = 'city_shipping_costs'`). No SQL schema migrations.
- Rate hierarchy: 1. City + Province match -> 2. Province match -> 3. General fixed cost.
- Georef API: Cache locality queries to avoid rate limits and repeated HTTP calls.

---

### Task 1: Backend Settings & Shipping Resolution Logic

**Files:**
- Modify: `backend/src/routes/settings.ts`
- Modify: `backend/src/controllers/shippingController.ts`
- Create: `backend/src/tests/shippingCost.test.ts`

**Interfaces:**
- Consumes: `getSetting('city_shipping_costs')`, `getSetting('province_shipping_costs')`, `getSetting('fixed_shipping_cost')`.
- Produces: `resolveShippingCost(cityCostsRaw, provinceCostsRaw, state, city, defaultCost): number`.

- [ ] **Step 1: Write unit tests for shipping cost resolution**

Create `backend/src/tests/shippingCost.test.ts`:
```typescript
import { resolveShippingCost } from '../controllers/shippingController';

describe('resolveShippingCost', () => {
    const defaultCost = 5000;
    const provinceCostsRaw = JSON.stringify({
        "Buenos Aires": "6000",
        "Córdoba": "7000"
    });
    const cityCostsRaw = JSON.stringify([
        { id: "1", province: "Buenos Aires", city: "Mar del Plata", cost: 4500 },
        { id: "2", province: "Córdoba", city: "Villa Carlos Paz", cost: 5500 }
    ]);

    test('returns city cost when city and province match', () => {
        const cost = resolveShippingCost(cityCostsRaw, provinceCostsRaw, 'Buenos Aires', 'Mar del Plata', defaultCost);
        expect(cost).toBe(4500);
    });

    test('normalizes accents and case for city matching', () => {
        const cost = resolveShippingCost(cityCostsRaw, provinceCostsRaw, 'buenos aires', 'már del plata', defaultCost);
        expect(cost).toBe(4500);
    });

    test('falls back to province cost when city has no custom rule', () => {
        const cost = resolveShippingCost(cityCostsRaw, provinceCostsRaw, 'Buenos Aires', 'Tandil', defaultCost);
        expect(cost).toBe(6000);
    });

    test('falls back to default cost when neither city nor province match', () => {
        const cost = resolveShippingCost(cityCostsRaw, provinceCostsRaw, 'Mendoza', 'San Rafael', defaultCost);
        expect(cost).toBe(5000);
    });

    test('handles null/undefined city and corrupt JSON gracefully', () => {
        const cost = resolveShippingCost("invalid-json", null, 'Buenos Aires', undefined, defaultCost);
        expect(cost).toBe(5000);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm -C backend test src/tests/shippingCost.test.ts`
Expected: FAIL (argument mismatch / function signature not matching).

- [ ] **Step 3: Update `settings.ts` and `shippingController.ts`**

In `backend/src/routes/settings.ts`:
Add `'city_shipping_costs'` to `PUBLIC_SETTINGS`.

In `backend/src/controllers/shippingController.ts`:
Export and update `resolveShippingCost`:
```typescript
export interface CityShippingRule {
    id?: string;
    province: string;
    city: string;
    cost: number | string;
}

export function resolveShippingCost(
    cityCostsRaw: string | undefined | null,
    provinceCostsRaw: string | undefined | null,
    state: string,
    city: string | undefined,
    defaultCost: number
): number {
    const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    const targetState = state ? norm(state) : "";
    const targetCity = city ? norm(city) : "";

    // 1. Prioridad: Tarifa por Ciudad
    if (cityCostsRaw && targetCity) {
        try {
            const parsed = JSON.parse(cityCostsRaw);
            const cityRules: CityShippingRule[] = Array.isArray(parsed) ? parsed : [];
            for (const rule of cityRules) {
                if (!rule || !rule.city || rule.cost === undefined || rule.cost === null || String(rule.cost).trim() === "" || isNaN(Number(rule.cost))) {
                    continue;
                }
                const ruleCity = norm(rule.city);
                const ruleProv = rule.province ? norm(rule.province) : "";

                const cityMatches = ruleCity === targetCity || targetCity.includes(ruleCity) || ruleCity.includes(targetCity);
                const provMatches = !ruleProv || !targetState || ruleProv === targetState || targetState.includes(ruleProv) || ruleProv.includes(targetState);

                if (cityMatches && provMatches) {
                    return Number(rule.cost);
                }
            }
        } catch (e) {
            console.error("Error parsing city_shipping_costs", e);
        }
    }

    // 2. Prioridad: Tarifa por Provincia
    if (provinceCostsRaw && targetState) {
        try {
            const costs = JSON.parse(provinceCostsRaw);
            if (typeof costs === "object" && costs !== null) {
                if (costs[state] !== undefined && costs[state] !== null && String(costs[state]).trim() !== "" && !isNaN(Number(costs[state]))) {
                    return Number(costs[state]);
                }

                for (const [key, val] of Object.entries(costs)) {
                    if (val === undefined || val === null || String(val).trim() === "" || isNaN(Number(val))) continue;
                    const normKey = norm(key);
                    if (normKey === targetState || targetState.includes(normKey) || normKey.includes(targetState)) {
                        return Number(val);
                    }
                }
            }
        } catch (e) {
            console.error("Error parsing province_shipping_costs", e);
        }
    }

    // 3. Prioridad: Costo general fijo
    return defaultCost;
}
```

In `quote` and `quoteOptions` in `shippingController.ts`:
Fetch `getSetting('city_shipping_costs')` alongside `provinceCostsSetting` and invoke `resolveShippingCost(cityCostsSetting?.value, provinceCostsSetting?.value, destination.state, destination.city, defaultCost)`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm -C backend test src/tests/shippingCost.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit backend changes**

```bash
git add backend/src/routes/settings.ts backend/src/controllers/shippingController.ts backend/src/tests/shippingCost.test.ts
git commit -m "feat(backend): add city shipping costs resolution and tests"
```

---

### Task 2: Frontend Georef API Caching

**Files:**
- Modify: `frontend/lib/api.ts`

**Interfaces:**
- Consumes: `https://apis.datos.gob.ar/georef/api/localidades`
- Produces: `fetchLocalidades(provincia: string): Promise<Localidad[]>` (with transparent caching).

- [ ] **Step 1: Implement in-memory & sessionStorage cache for `fetchLocalidades`**

In `frontend/lib/api.ts`:
```typescript
const localidadesCache: Record<string, Localidad[]> = {};

export async function fetchLocalidades(provincia: string): Promise<Localidad[]> {
  const normKey = provincia.trim().toLowerCase();
  
  // 1. Check in-memory cache
  if (localidadesCache[normKey]) {
    return localidadesCache[normKey];
  }

  // 2. Check sessionStorage cache
  if (typeof window !== 'undefined') {
    try {
      const cached = sessionStorage.getItem(`georef_loc_${normKey}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        localidadesCache[normKey] = parsed;
        return parsed;
      }
    } catch {
      // Ignore storage errors
    }
  }

  // 3. Fetch from Georef API
  const res = await fetch(
    `https://apis.datos.gob.ar/georef/api/localidades?provincia=${encodeURIComponent(provincia)}&max=2000`
  );
  if (!res.ok) throw new Error('Error cargando localidades');
  const data = await res.json();
  const sorted = (data.localidades || []).sort((a: Localidad, b: Localidad) =>
    a.nombre.localeCompare(b.nombre)
  );

  // Save to caches
  localidadesCache[normKey] = sorted;
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.setItem(`georef_loc_${normKey}`, JSON.stringify(sorted));
    } catch {
      // Storage full or disabled
    }
  }

  return sorted;
}
```

- [ ] **Step 2: Run frontend typecheck to ensure compatibility**

Run: `pnpm -C frontend typecheck`
Expected: PASS with 0 errors.

- [ ] **Step 3: Commit frontend API caching**

```bash
git add frontend/lib/api.ts
git commit -m "perf(frontend): add caching to georef localidades fetching"
```

---

### Task 3: Frontend Admin Config UI for City Shipping Rates

**Files:**
- Modify: `frontend/app/admin/config/page.tsx`

**Interfaces:**
- Consumes: `fetchSetting('city_shipping_costs')`, `api.put('/settings/city_shipping_costs')`, `fetchLocalidades(provincia)`.
- Produces: Admin UI for adding, editing, and deleting city-specific shipping rates.

- [ ] **Step 1: Add city shipping costs state and handler functions**

In `frontend/app/admin/config/page.tsx`:
Add interfaces and states:
```typescript
interface CityCostRule {
  id: string;
  province: string;
  city: string;
  cost: string;
}

const [cityCosts, setCityCosts] = useState<CityCostRule[]>([]);
const [selectedCityProv, setSelectedCityProv] = useState<string>('');
const [availableCities, setAvailableCities] = useState<Localidad[]>([]);
const [selectedCity, setSelectedCity] = useState<string>('');
const [newCityCost, setNewCityCost] = useState<string>('');
const [isLoadingCities, setIsLoadingCities] = useState(false);
const [isSavingCityCosts, setIsSavingCityCosts] = useState(false);
const [openCityCombobox, setOpenCityCombobox] = useState(false);
```

Add handlers:
- `handleAddCityCost`: validates province, city, and cost -> adds rule to `cityCosts` -> saves via `api.put('/settings/city_shipping_costs', { value: JSON.stringify(updated) })`.
- `handleDeleteCityCost(id)`: removes rule and persists.
- `handleCityCostChange(id, cost)`: updates local state.
- `handleSaveCityCosts`: persists current `cityCosts` array.
- Effect to load localities when `selectedCityProv` changes using `fetchLocalidades(selectedCityProv)`.

- [ ] **Step 2: Add City Rates section in Admin UI**

In `frontend/app/admin/config/page.tsx`:
Add the section below the Province Rates section:
- Province Selector (`<select>`)
- City Combobox with search input (`<Popover>`, `<Command>`, `<CommandInput>`, `<CommandList>`, `<CommandItem>`)
- Cost Input (`<Input type="number" placeholder="Ej: 4500" />`)
- "Agregar Tarifa" button
- List / Grid of active city rules with edit input and delete button (`Trash2`).

- [ ] **Step 3: Run frontend typecheck**

Run: `pnpm -C frontend typecheck`
Expected: PASS with 0 errors.

- [ ] **Step 4: Commit Admin Config changes**

```bash
git add frontend/app/admin/config/page.tsx
git commit -m "feat(frontend): add city shipping rates configuration in admin"
```

---

### Task 4: Verification & End-to-End Validation

**Files:**
- Test all components across frontend and backend.

- [ ] **Step 1: Run full typecheck and test suite**

Run:
```bash
pnpm -C backend test
pnpm -C backend typecheck
pnpm -C frontend typecheck
```
Expected: All tests pass, zero type errors.

- [ ] **Step 2: Commit final implementation**

```bash
git add .
git commit -m "feat: complete city-level shipping rates feature"
```

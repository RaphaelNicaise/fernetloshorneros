import { resolveShippingCost } from '../shippingController';

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

    test('differentiates cities with same name in different provinces', () => {
        const multiCityRaw = JSON.stringify([
            { id: "1", province: "Buenos Aires", city: "San Martín", cost: 3500 },
            { id: "2", province: "Mendoza", city: "San Martín", cost: 8000 }
        ]);
        expect(resolveShippingCost(multiCityRaw, provinceCostsRaw, 'Buenos Aires', 'San Martín', defaultCost)).toBe(3500);
        expect(resolveShippingCost(multiCityRaw, provinceCostsRaw, 'Mendoza', 'San Martín', defaultCost)).toBe(8000);
        expect(resolveShippingCost(multiCityRaw, provinceCostsRaw, 'San Juan', 'San Martín', defaultCost)).toBe(5000);
    });

    test('handles numeric strings and invalid entries safely', () => {
        const dirtyRulesRaw = JSON.stringify([
            null,
            {},
            { province: 'Buenos Aires', city: '', cost: 1000 },
            { province: 'Buenos Aires', city: 'La Plata', cost: ' 4200 ' },
            { province: 'Buenos Aires', city: 'Campana', cost: 'not-a-number' }
        ]);
        expect(resolveShippingCost(dirtyRulesRaw, provinceCostsRaw, 'Buenos Aires', 'La Plata', defaultCost)).toBe(4200);
        expect(resolveShippingCost(dirtyRulesRaw, provinceCostsRaw, 'Buenos Aires', 'Campana', defaultCost)).toBe(6000);
    });
});

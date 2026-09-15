import { Request, Response } from "express";
import { quoteShipment, quoteShipmentFull } from "@/services/enviosService";
import { getProductById } from "@/services/productService";
import { getSetting } from "@/services/settingsService";

/**
 * Construye los items de Zipnova a partir de los items del request,
 * expandiendo por cantidad (1 item por unidad).
 */
async function buildZipnovaItems(items: Array<{ id: string; quantity?: number }>) {
    let declaredValue = 0;
    const zipnovaItems: { sku: string }[] = [];

    for (const item of items) {
        const product = await getProductById(item.id);

        if (!product) {
            throw { status: 400, message: `Producto ${item.id} no encontrado` };
        }

        const quantity = Number(item.quantity) || 1;
        declaredValue += Number(product.price) * quantity;

        for (let i = 0; i < quantity; i++) {
            zipnovaItems.push({ sku: product.id });
        }
    }

    return { declaredValue, zipnovaItems };
}

export interface CityShippingRule {
    id?: string;
    province: string;
    city: string;
    cost: number | string;
}

/**
 * Resuelve el costo de envío según la jerarquía:
 * 1. Tarifa específica por Ciudad (+ Provincia).
 * 2. Tarifa específica por Provincia.
 * 3. Costo general fijo (por defecto).
 */
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

/**
 * POST /shipping/quote
 * Cotiza el envío (retorna la opción más barata)
 */
export async function quote(req: Request, res: Response) {
    try {
        const { destination, items } = req.body;

        if (!destination || !destination.city || !destination.state || !destination.zipcode) {
            return res.status(400).json({ success: false, error: "Destino incompleto. Se requiere city, state y zipcode" });
        }

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ success: false, error: "Items requeridos" });
        }

        const { declaredValue, zipnovaItems } = await buildZipnovaItems(items);

        // Fetch settings
        const fixedCostSetting = await getSetting('fixed_shipping_cost');
        const defaultCost = fixedCostSetting ? Number(fixedCostSetting.value) : 5000;
        
        const provinceCostsSetting = await getSetting('province_shipping_costs');
        const cityCostsSetting = await getSetting('city_shipping_costs');
        const shippingCost = resolveShippingCost(cityCostsSetting?.value, provinceCostsSetting?.value, destination.state, destination.city, defaultCost);

        const normalizedCity = destination.city.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
        const isLocalCity = ["bahia blanca", "ingeniero white", "punta alta"].includes(normalizedCity);

        if (isLocalCity) {
            res.json({
                success: true,
                shipping_cost: 0,
                carrier: "Retiro en Local (Los Horneros)",
                delivery_time: "Inmediato",
                products_total: declaredValue,
                total: declaredValue,
            });
            return;
        }

        res.json({
            success: true,
            shipping_cost: shippingCost,
            carrier: "Correo Argentino",
            delivery_time: "3-7 días",
            products_total: declaredValue,
            total: declaredValue + shippingCost,
        });
    } catch (error: any) {
        if (error.status) {
            return res.status(error.status).json({ success: false, error: error.message });
        }
        console.error("Error cotizando envío:", error);
        res.status(500).json({ success: false, error: error?.message || "Error interno del servidor" });
    }
}

/**
 * POST /shipping/quote-options
 * Cotiza el envío y retorna TODAS las opciones disponibles
 */
export async function quoteOptions(req: Request, res: Response) {
    try {
        const { destination, items } = req.body;

        if (!destination || !destination.state || !destination.zipcode) {
            return res.status(400).json({ success: false, error: "Destino incompleto. Se requiere state y zipcode" });
        }

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ success: false, error: "Items requeridos" });
        }

        const { declaredValue, zipnovaItems } = await buildZipnovaItems(items);

        // Fetch settings
        const fixedCostSetting = await getSetting('fixed_shipping_cost');
        const defaultCost = fixedCostSetting ? Number(fixedCostSetting.value) : 5000;
        
        const provinceCostsSetting = await getSetting('province_shipping_costs');
        const cityCostsSetting = await getSetting('city_shipping_costs');
        const shippingCost = resolveShippingCost(cityCostsSetting?.value, provinceCostsSetting?.value, destination.state, destination.city, defaultCost);

        let all_results: any[] = [];
        const normalizedCity = (destination.city || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
        const isLocalCity = ["bahia blanca", "ingeniero white", "punta alta"].includes(normalizedCity);

        if (isLocalCity) {
            all_results = [
                {
                    rate_id: "local-delivery",
                    carrier_name: "Envío a Domicilio (Transportista Propio)",
                    carrier_id: 2,
                    service_type: "standard_delivery",
                    logistic_type: "manual",
                    amounts: {
                        price: shippingCost,
                        price_incl_tax: shippingCost,
                    },
                    estimated_delivery: {
                        min_days: 1,
                        max_days: 2,
                    },
                    tags: []
                },
                {
                    rate_id: "local-pickup",
                    carrier_name: "Retiro en el local (Los Horneros)",
                    carrier_id: 3,
                    service_type: "pickup_point",
                    logistic_type: "manual",
                    amounts: {
                        price: 0,
                        price_incl_tax: 0,
                    },
                    estimated_delivery: {
                        min_days: 0,
                        max_days: 1,
                    },
                    tags: []
                }
            ];
        } else {
            all_results = [
                {
                    rate_id: "correo-argentino-fijo",
                    carrier_name: "Correo Argentino",
                    carrier_id: 1,
                    service_type: "standard_delivery",
                    logistic_type: "manual",
                    amounts: {
                        price: shippingCost,
                        price_incl_tax: shippingCost,
                    },
                    estimated_delivery: {
                        min_days: 3,
                        max_days: 7,
                    },
                    tags: []
                }
            ];
        }

        res.json({
            success: true,
            all_results,
            products_total: declaredValue,
        });
    } catch (error: any) {
        if (error.status) {
            return res.status(error.status).json({ success: false, error: error.message });
        }
        console.error("Error cotizando opciones de envío:", error);
        res.status(500).json({ success: false, error: error?.message || "Error interno del servidor" });
    }
}

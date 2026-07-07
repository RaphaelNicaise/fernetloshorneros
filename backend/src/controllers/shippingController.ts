import { Request, Response } from "express";
import { quoteShipment, quoteShipmentFull } from "@/services/enviosService";
import { getProductById } from "@/services/productService";
import { getSetting } from "@/services/settingsService";

const LOCAL_CITIES = [
    "bahía blanca", "bahia blanca", "ingeniero white", "punta alta"
];

function isLocalCity(city: string): boolean {
    return LOCAL_CITIES.includes(city.toLowerCase().trim());
}

interface ShippingCostsConfig {
    default: number;
    local: number;
    provinces: Record<string, number>;
}

async function getShippingConfig(): Promise<ShippingCostsConfig> {
    const configSetting = await getSetting('shipping_costs_by_province');
    if (configSetting?.value) {
        try {
            return JSON.parse(configSetting.value);
        } catch (e) {
            console.error('Error parsing shipping_costs_by_province:', e);
        }
    }
    // Fallback to fixed_shipping_cost
    const fixedCostSetting = await getSetting('fixed_shipping_cost');
    const fixedCost = fixedCostSetting ? Number(fixedCostSetting.value) : 5000;
    return { default: fixedCost, local: fixedCost, provinces: {} };
}

function getShippingCost(config: ShippingCostsConfig, city: string, state: string): { cost: number; carrier: string; serviceType: string; isLocal: boolean } {
    if (isLocalCity(city)) {
        return {
            cost: config.local,
            carrier: "Transportista Propio",
            serviceType: "local_delivery",
            isLocal: true,
        };
    }
    const provinceCost = config.provinces[state];
    return {
        cost: provinceCost !== undefined ? provinceCost : config.default,
        carrier: "Correo Argentino",
        serviceType: "standard_delivery",
        isLocal: false,
    };
}

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

/**
 * POST /shipping/quote
 * Cotiza el envío (retorna la opción más barata)
 */
export async function quote(req: Request, res: Response) {
    try {
        const { destination, items } = req.body;

        if (!destination || !destination.state || !destination.zipcode) {
            return res.status(400).json({ success: false, error: "Destino incompleto. Se requiere state y zipcode" });
        }

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ success: false, error: "Items requeridos" });
        }

        const { declaredValue } = await buildZipnovaItems(items);
        const config = await getShippingConfig();
        const shippingInfo = getShippingCost(config, destination.city || '', destination.state);

        res.json({
            success: true,
            shipping_cost: shippingInfo.cost,
            carrier: shippingInfo.carrier,
            service_type: shippingInfo.serviceType,
            is_local: shippingInfo.isLocal,
            delivery_time: shippingInfo.isLocal ? "1-2 días" : "3-7 días",
            products_total: declaredValue,
            total: declaredValue + shippingInfo.cost,
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

        const { declaredValue } = await buildZipnovaItems(items);
        const config = await getShippingConfig();
        const shippingInfo = getShippingCost(config, destination.city || '', destination.state);

        res.json({
            success: true,
            all_results: [{
                rate_id: shippingInfo.isLocal ? "transportista-propio" : "correo-argentino-fijo",
                carrier_name: shippingInfo.carrier,
                carrier_id: shippingInfo.isLocal ? 0 : 1,
                service_type: shippingInfo.serviceType,
                logistic_type: shippingInfo.isLocal ? "local" : "manual",
                amounts: {
                    price: shippingInfo.cost,
                    price_incl_tax: shippingInfo.cost,
                },
                estimated_delivery: {
                    min_days: shippingInfo.isLocal ? 1 : 3,
                    max_days: shippingInfo.isLocal ? 2 : 7,
                },
                tags: shippingInfo.isLocal ? ["local"] : [],
            }],
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

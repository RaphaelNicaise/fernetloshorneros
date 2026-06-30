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
        
        let shippingCost = defaultCost;
        const provinceCostsSetting = await getSetting('province_shipping_costs');
        if (provinceCostsSetting && provinceCostsSetting.value) {
            try {
                const costs = JSON.parse(provinceCostsSetting.value);
                if (costs[destination.state] !== undefined) {
                    shippingCost = Number(costs[destination.state]);
                }
            } catch (e) {
                console.error("Error parsing province_shipping_costs", e);
            }
        }

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
        
        let shippingCost = defaultCost;
        const provinceCostsSetting = await getSetting('province_shipping_costs');
        if (provinceCostsSetting && provinceCostsSetting.value) {
            try {
                const costs = JSON.parse(provinceCostsSetting.value);
                if (costs[destination.state] !== undefined && costs[destination.state] !== "") {
                    shippingCost = Number(costs[destination.state]);
                }
            } catch (e) {
                console.error("Error parsing province_shipping_costs", e);
            }
        }

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

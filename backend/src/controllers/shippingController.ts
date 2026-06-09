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

        const fixedCostSetting = await getSetting('fixed_shipping_cost');
        const shippingCost = fixedCostSetting ? Number(fixedCostSetting.value) : 5000;

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

        const fixedCostSetting = await getSetting('fixed_shipping_cost');
        const shippingCost = fixedCostSetting ? Number(fixedCostSetting.value) : 5000;

        res.json({
            success: true,
            all_results: [{
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

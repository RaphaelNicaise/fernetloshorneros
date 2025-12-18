import { Router } from "express";
import { quoteShipment, quoteShipmentFull } from "@/services/enviosService";
import { getProductById } from "@/services/productService";

const router = Router();

/**
 * POST /shipping/quote
 * Cotiza el envío basado en destino y productos (retorna la opción más barata)
 */
router.post("/quote", async (req, res) => {
  try {
    const { destination, items } = req.body;

    // Validar destino
    if (!destination || !destination.city || !destination.state || !destination.zipcode) {
      return res.status(400).json({ 
        success: false, 
        error: "Destino incompleto. Se requiere city, state y zipcode" 
      });
    }

    // Validar items
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: "Items requeridos" 
      });
    }

    // Calcular valor declarado y construir items para Zipnova
    let declaredValue = 0;
    const zipnovaItems: { sku: string }[] = [];

    for (const item of items) {
      const product = await getProductById(item.id);
      
      if (!product) {
        return res.status(400).json({ 
          success: false, 
          error: `Producto ${item.id} no encontrado` 
        });
      }

      const quantity = Number(item.quantity) || 1;
      declaredValue += Number(product.price) * quantity;

      // Agregar un item por cada unidad (según el requerimiento)
      for (let i = 0; i < quantity; i++) {
        zipnovaItems.push({ sku: product.id });
      }
    }

    // Cotizar con Zipnova
    const quote = await quoteShipment({
      destination: {
        city: destination.city,
        state: destination.state,
        zipcode: destination.zipcode,
      },
      items: zipnovaItems,
      declared_value: declaredValue,
    });

    if (!quote.success) {
      return res.status(400).json(quote);
    }

    res.json({
      success: true,
      shipping_cost: quote.price,
      carrier: quote.carrier,
      delivery_time: quote.delivery_time,
      products_total: declaredValue,
      total: declaredValue + (quote.price || 0),
    });
  } catch (error: any) {
    console.error("Error cotizando envío:", error);
    res.status(500).json({ 
      success: false, 
      error: error?.message || "Error interno del servidor" 
    });
  }
});

/**
 * POST /shipping/quote-options
 * Cotiza el envío y retorna TODAS las opciones disponibles (domicilio y pickup)
 */
router.post("/quote-options", async (req, res) => {
  try {
    const { destination, items } = req.body;

    // Validar destino
    if (!destination || !destination.state || !destination.zipcode) {
      return res.status(400).json({ 
        success: false, 
        error: "Destino incompleto. Se requiere state y zipcode" 
      });
    }

    // Validar items
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: "Items requeridos" 
      });
    }

    // Calcular valor declarado y construir items para Zipnova
    let declaredValue = 0;
    const zipnovaItems: { sku: string }[] = [];

    for (const item of items) {
      const product = await getProductById(item.id);
      
      if (!product) {
        return res.status(400).json({ 
          success: false, 
          error: `Producto ${item.id} no encontrado` 
        });
      }

      const quantity = Number(item.quantity) || 1;
      declaredValue += Number(product.price) * quantity;

      for (let i = 0; i < quantity; i++) {
        zipnovaItems.push({ sku: product.id });
      }
    }

    // Cotizar con Zipnova - obtener todas las opciones
    const quote = await quoteShipmentFull({
      destination: {
        city: destination.city || destination.state, // city puede ser opcional para pickup
        state: destination.state,
        zipcode: destination.zipcode,
      },
      items: zipnovaItems,
      declared_value: declaredValue,
    });

    if (!quote.success) {
      return res.status(400).json(quote);
    }

    res.json({
      success: true,
      all_results: quote.all_results,
      products_total: declaredValue,
    });
  } catch (error: any) {
    console.error("Error cotizando opciones de envío:", error);
    res.status(500).json({ 
      success: false, 
      error: error?.message || "Error interno del servidor" 
    });
  }
});

export default router;

import { Router } from "express";
import { preferenceClient } from "@/config/mercadopago";
import internalOnly from "@/middleware/internalOnly";

const paymentsRouter = Router();

paymentsRouter.post("/create-preference", internalOnly, async (req, res) => {
  try {
    const { title, quantity, unit_price } = req.body;

    const body = {
      items: [
        {
          id: "item_1",
          title,
          quantity: parseInt(quantity),
          unit_price: parseFloat(unit_price),
          currency_id: "ARS",
        },
      ],
      back_urls: (function() {
        const base = process.env.PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 3001}`;
        const api = base.endsWith('/') ? `${base}api` : `${base}/api`;
        return {
          success: `${api}/payments/success`,
          failure: `${api}/payments/failure`,
          pending: `${api}/payments/pending`,
        } as const;
      })()
    };

    const result = await preferenceClient.create({ body });

    res.json({ 
      id: result.id,
      init_point: result.init_point,
      sandbox_init_point: result.sandbox_init_point
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al crear la preferencia" });
  }
});

export default paymentsRouter;
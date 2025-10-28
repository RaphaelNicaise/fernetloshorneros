import { Router } from "express";
import { preferenceClient } from "@/config/mercadopago";

const router = Router();

router.post("/create-preference", async (req, res) => {
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
      back_urls: {
        success: "http://localhost:3001/success",
        failure: "http://localhost:3001/failure",
        pending: "http://localhost:3001/pending",
      },
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

export default router;
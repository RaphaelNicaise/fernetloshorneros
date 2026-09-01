import { Router } from "express";
import { quote, quoteOptions } from "@/controllers/shippingController";
import { validateBody } from "@/middleware/validate";
import { quoteShippingSchema, quoteOptionsShippingSchema } from "@/schemas/shippingSchema";

const router = Router();

router.post("/quote", validateBody(quoteShippingSchema), quote);
router.post("/quote-options", validateBody(quoteOptionsShippingSchema), quoteOptions);

export default router;

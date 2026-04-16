import { Router } from "express";
import { quote, quoteOptions } from "@/controllers/shippingController";

const router = Router();

router.post("/quote", quote);
router.post("/quote-options", quoteOptions);

export default router;

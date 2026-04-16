import { Router } from "express";
import { createPreference, handleWebhook, getOrderByRef } from "@/controllers/paymentsController";

const router = Router();

router.post("/create-preference", createPreference);
router.post("/webhook", handleWebhook);
router.get("/order/:reference", getOrderByRef);

export default router;

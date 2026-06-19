import { Router } from "express";
import { createPreference, handleWebhook, getOrderByRef, cancelOrderManually } from "@/controllers/paymentsController";

const router = Router();

router.post("/create-preference", createPreference);
router.post("/webhook", handleWebhook);
router.get("/order/:reference", getOrderByRef);
router.post("/cancel/:reference", cancelOrderManually);

export default router;

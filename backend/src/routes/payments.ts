import { Router } from "express";
import { createPreference, createBrickPreference, handleWebhook, getOrderByRef, cancelOrderManually, processPayment } from "@/controllers/paymentsController";

const router = Router();

router.post("/create-preference", createPreference);
router.post("/create-brick-preference", createBrickPreference);
router.post("/process", processPayment);
router.post("/webhook", handleWebhook);
router.get("/order/:reference", getOrderByRef);
router.post("/cancel/:reference", cancelOrderManually);

export default router;

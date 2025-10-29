import { Router } from "express";
import { addToWaitlist, getWaitlistUsers, getCountWaitlistUsers } from "@/services/waitlistService";

const waitlistRouter = Router();



waitlistRouter.post("/", async (req, res) => {
    try {
        const { nombre, email, provincia } = req.body;
        
        if (!nombre || !email || !provincia) {
            return res.status(400).json({ error: "Faltan campos requeridos" });
        }
        
        await addToWaitlist({ nombre, email, provincia });
        
        res.status(201).json({ message: "Registrado en lista de espera exitosamente" });
    } catch (error: any) {
        if (error.message === "El email ya está registrado en la lista de espera.") {
            return res.status(409).json({ error: error.message });
        }
        res.status(500).json({ error: error.message || "Error al registrar en la lista de espera" });
    }
});

waitlistRouter.get("/", async (req, res) => {
    try {
        const users = await getWaitlistUsers();
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener usuarios de la lista de espera" });
    }
});

waitlistRouter.get("/count", async (req, res) => {
    try {
        const count = await getCountWaitlistUsers();
        res.json({ count });
    } catch (error) {
        res.status(500).json({ error: "Error al obtener el conteo de usuarios en la lista de espera" });
    }
});

export default waitlistRouter;
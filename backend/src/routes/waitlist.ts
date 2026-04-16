import { Router } from "express";
import { addToWaitlist, getWaitlistUsers, getCountWaitlistUsers, importWaitlist, WaitlistImportRow } from "@/services/waitlistService";
import { adminAuth } from "@/middleware/adminAuth";

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

// Protección: solo el admin puede listar usuarios completos
waitlistRouter.get("/", adminAuth, async (req, res) => {
    try {
        const users = await getWaitlistUsers();
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener usuarios de la lista de espera" });
    }
});

// El contador puede mantenerse público si así se desea; aquí lo dejamos público
waitlistRouter.get("/count", async (req, res) => {
    try {
        const count = await getCountWaitlistUsers();
        res.json({ count });
    } catch (error) {
        res.status(500).json({ error: "Error al obtener el conteo de usuarios en la lista de espera" });
    }
});

// Import masivo CSV -> JSON { rows: [...] }
waitlistRouter.post('/import', adminAuth, async (req, res) => {
    try {
        const { rows } = req.body as { rows?: WaitlistImportRow[] };
        if (!Array.isArray(rows)) return res.status(400).json({ error: 'rows debe ser un array' });
        const result = await importWaitlist(rows);
        res.json(result);
    } catch (err:any) {
        res.status(500).json({ error: err?.message || 'Error al importar' });
    }
});

export default waitlistRouter;
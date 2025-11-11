import { Router, Request, Response, NextFunction } from "express";
import { addToWaitlist, getWaitlistUsers, getCountWaitlistUsers } from "@/services/waitlistService";

// Sencillo middleware para requerir autenticación admin usando el mismo token del router admin
function requireAdmin(req: Request, res: Response, next: NextFunction) {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!token) return res.status(401).json({ error: 'No autorizado' });
    // Reusar lógica ligera: verificar estructura del token (no dependencia circular)
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return res.status(401).json({ error: 'Token inválido' });
        const body = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
        if (body.sub !== 'admin' || (typeof body.exp === 'number' && Date.now() > body.exp)) {
            return res.status(401).json({ error: 'Token expirado o inválido' });
        }
    } catch {
        return res.status(401).json({ error: 'Token inválido' });
    }
    next();
}

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
waitlistRouter.get("/", requireAdmin, async (req, res) => {
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

export default waitlistRouter;
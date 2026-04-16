import { Router } from 'express';
import { getSetting, updateSetting } from '../services/settingsService';
import { adminAuth } from '../middleware/adminAuth';

const router = Router();

// Endpoint público para que el middleware de Next.js verifique el modo mantenimiento
// Devuelve si el modo está activo. La validación de IP la hace el propio middleware frontend.
router.get('/maintenance-check', async (_req, res) => {
    try {
        const setting = await getSetting('maintenance_mode');
        const active = setting?.value === 'true';
        res.json({ maintenance: active });
    } catch {
        // En caso de error en DB, no bloquear el acceso
        res.json({ maintenance: false });
    }
});

// GET público para que el frontend pueda obtener el monto mínimo
router.get('/:key', async (req, res) => {
    try {
        const { key } = req.params;
        const setting = await getSetting(key);
        if (setting) {
            res.json(setting);
        } else {
            res.status(404).json({ message: 'Setting not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error getting setting', error });
    }
});

router.put('/:key', adminAuth, async (req, res) => {
    try {
        const { key } = req.params;
        const { value } = req.body;
        const updatedSetting = await updateSetting(key, value);
        res.json(updatedSetting);
    } catch (error) {
        res.status(500).json({ message: 'Error updating setting', error });
    }
});

export default router;

import { Router } from 'express';
import { getSetting, updateSetting } from '../services/settingsService';
import { adminAuth } from '../middleware/adminAuth';

const router = Router();

// Claves públicas permitidas para consulta anónima desde la tienda
const PUBLIC_SETTINGS = new Set([
    'min_order_amount',
    'fixed_shipping_cost',
    'province_shipping_costs',
    'maintenance_mode',
]);

// Endpoint público para que el middleware de Next.js verifique si el modo mantenimiento está activo
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

// GET: público para configuraciones del frontend / tienda, protegido por adminAuth para claves privadas
router.get('/:key', async (req, res) => {
    const { key } = req.params;
    
    // Si la clave es pública, servirla sin requerir login
    if (PUBLIC_SETTINGS.has(key)) {
        try {
            const setting = await getSetting(key);
            if (setting) {
                return res.json(setting);
            }
            return res.status(404).json({ message: 'Setting not found' });
        } catch (error) {
            return res.status(500).json({ message: 'Error getting setting', error });
        }
    }

    // Si es una clave privada/sensible, exigir adminAuth
    return adminAuth(req, res, async () => {
        try {
            const setting = await getSetting(key);
            if (setting) {
                return res.json(setting);
            }
            return res.status(404).json({ message: 'Setting not found' });
        } catch (error) {
            return res.status(500).json({ message: 'Error getting setting', error });
        }
    });
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

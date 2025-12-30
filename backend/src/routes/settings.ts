import { Router } from 'express';
import { getSetting, updateSetting } from '../services/settingsService';
import { adminAuth } from '../middleware/adminAuth';

const router = Router();

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

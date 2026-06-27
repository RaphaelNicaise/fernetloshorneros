import { Router } from 'express';
import { adminAuth } from '../middleware/adminAuth';
import { createManualBackup, getAutoBackupPath } from '../services/backupService';
import fs from 'fs';

const router = Router();

// Endpoints protegidos para admins
router.use(adminAuth);

router.get('/manual', async (req, res) => {
    try {
        const tempPath = await createManualBackup();
        res.download(tempPath, `backup_manual_${new Date().toISOString().split('T')[0]}.sql`, (err) => {
            if (err) {
                console.error("Error downloading manual backup:", err);
            }
            // Eliminar el archivo temporal después de enviarlo para ahorrar espacio
            try {
                if (fs.existsSync(tempPath)) {
                    fs.unlinkSync(tempPath);
                }
            } catch (unlinkErr) {
                console.error("Error deleting temp backup file:", unlinkErr);
            }
        });
    } catch (error) {
        console.error("Error generating manual backup:", error);
        res.status(500).json({ error: 'Error interno al generar el backup manual' });
    }
});

router.get('/auto', (req, res) => {
    try {
        const autoPath = getAutoBackupPath();
        if (autoPath) {
            res.download(autoPath, 'daily_backup.sql', (err) => {
                if (err) {
                    console.error("Error downloading auto backup:", err);
                }
            });
        } else {
            res.status(404).json({ error: 'No hay backup automático disponible aún' });
        }
    } catch (error) {
        console.error("Error fetching auto backup:", error);
        res.status(500).json({ error: 'Error interno al obtener el backup automático' });
    }
});

export default router;

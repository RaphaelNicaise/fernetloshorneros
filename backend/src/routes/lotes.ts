import { Router, Request, Response } from 'express';
import { adminAuth } from '../middleware/adminAuth';
import { lotesService } from '../services/lotesService';

const router = Router();

router.use(adminAuth);

router.get('/', async (req: Request, res: Response) => {
  try {
    const lotes = await lotesService.getAllLotes();
    res.json(lotes);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { nombre, setAsActive } = req.body;
    if (!nombre) {
      return res.status(400).json({ error: 'Falta el nombre del lote' });
    }
    await lotesService.createLote(nombre, setAsActive);
    res.status(201).json({ message: 'Lote creado' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id/set-active', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    await lotesService.setLoteActual(id);
    res.json({ message: 'Lote actualizado como actual' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    await lotesService.deleteLote(id);
    res.json({ message: 'Lote eliminado' });
  } catch (error: any) {
    // Si falla puede ser porque hay pedidos atados a este lote por foreign key constraint
    if (error.name === 'SequelizeForeignKeyConstraintError' || error.message.includes('foreign key')) {
      return res.status(400).json({ error: 'No se puede eliminar el lote porque ya tiene pedidos asignados' });
    }
    res.status(500).json({ error: error.message });
  }
});

export default router;

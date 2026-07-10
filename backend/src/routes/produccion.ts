import { Router, Request, Response } from 'express';
import { adminAuth } from '../middleware/adminAuth';
import { produccionService } from '../services/produccionService';
import { ingredientesService } from '../services/ingredientesService';

const router = Router();

router.use(adminAuth);

// ─── Ingredientes ─────────────────────────────────────────────────

router.get('/ingredientes', async (req: Request, res: Response) => {
  try {
    const ingredientes = await ingredientesService.getAll();
    res.json(ingredientes);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/ingredientes', async (req: Request, res: Response) => {
  try {
    const { nombre, unidad } = req.body;
    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ error: 'El nombre es requerido' });
    }
    if (unidad !== 'litros' && unidad !== 'gramos') {
      return res.status(400).json({ error: 'Unidad debe ser litros o gramos' });
    }
    const id = await ingredientesService.create(nombre, unidad);
    res.status(201).json({ id, message: 'Ingrediente creado' });
  } catch (error: any) {
    if (error.message?.includes('Duplicate entry') || error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: 'Ya existe un ingrediente con ese nombre' });
    }
    res.status(500).json({ error: error.message });
  }
});

router.put('/ingredientes/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { nombre, unidad } = req.body;
    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ error: 'El nombre es requerido' });
    }
    if (unidad !== 'litros' && unidad !== 'gramos') {
      return res.status(400).json({ error: 'Unidad debe ser litros o gramos' });
    }
    await ingredientesService.update(id, nombre, unidad);
    res.json({ message: 'Ingrediente actualizado' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/ingredientes/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    await ingredientesService.delete(id);
    res.json({ message: 'Ingrediente eliminado' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ─── Categorías ───────────────────────────────────────────────────

router.get('/categorias', async (req: Request, res: Response) => {
  try {
    const categorias = await produccionService.getCategorias();
    res.json(categorias);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/categorias', async (req: Request, res: Response) => {
  try {
    const { nombre } = req.body;
    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ error: 'El nombre es requerido' });
    }
    const id = await produccionService.createCategoria(nombre.trim());
    res.status(201).json({ id, message: 'Categoría creada' });
  } catch (error: any) {
    if (error.message?.includes('Duplicate entry') || error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: 'Ya existe una categoría con ese nombre' });
    }
    res.status(500).json({ error: error.message });
  }
});

router.put('/categorias/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { nombre } = req.body;
    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ error: 'El nombre es requerido' });
    }
    await produccionService.updateCategoria(id, nombre.trim());
    res.json({ message: 'Categoría actualizada' });
  } catch (error: any) {
    if (error.message?.includes('Duplicate entry') || error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: 'Ya existe una categoría con ese nombre' });
    }
    res.status(400).json({ error: error.message });
  }
});

router.delete('/categorias/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    await produccionService.deleteCategoria(id);
    res.json({ message: 'Categoría eliminada' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ─── Barriles ─────────────────────────────────────────────────────

// GET /produccion — List all barriles
router.get('/', async (req: Request, res: Response) => {
  try {
    const barriles = await produccionService.getAllBarriles();
    res.json(barriles);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /produccion/alertas — Get mix alerts
router.get('/alertas', async (req: Request, res: Response) => {
  try {
    const alertas = await produccionService.getAlertasMezcla();
    res.json(alertas);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /produccion/:id — Get barrel detail with registros
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const result = await produccionService.getBarrilById(id);
    if (!result) {
      return res.status(404).json({ error: 'Barril no encontrado' });
    }
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /produccion — Create barrel
router.post('/', async (req: Request, res: Response) => {
  try {
    const { identificador, nombre, capacidad_litros, notas, categoria_id } = req.body;
    if (!identificador || !capacidad_litros) {
      return res.status(400).json({ error: 'Identificador y capacidad son requeridos' });
    }
    const id = await produccionService.createBarril({ identificador, nombre, capacidad_litros, notas, categoria_id });
    res.status(201).json({ id, message: 'Barril creado' });
  } catch (error: any) {
    if (error.message?.includes('Duplicate entry') || error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: 'Ya existe un barril con ese identificador' });
    }
    res.status(500).json({ error: error.message });
  }
});

// PUT /produccion/:id — Update barrel
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    await produccionService.updateBarril(id, req.body);
    res.json({ message: 'Barril actualizado' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /produccion/:id — Delete barrel
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    await produccionService.deleteBarril(id);
    res.json({ message: 'Barril eliminado' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /produccion/:id/registros — Add registro to barrel
router.post('/:id/registros', async (req: Request, res: Response) => {
  try {
    const barrilId = Number(req.params.id);
    const { tipo, descripcion, ingrediente_id, cantidad_litros, cantidad_gramos } = req.body;
    if (!tipo) {
      return res.status(400).json({ error: 'El tipo es requerido' });
    }
    await produccionService.addRegistro(barrilId, {
      tipo,
      descripcion,
      ingrediente_id,
      cantidad_litros,
      cantidad_gramos,
    });
    res.status(201).json({ message: 'Registro agregado' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /produccion/:id/registros/:registroId — Delete registro from barrel
router.delete('/:id/registros/:registroId', async (req: Request, res: Response) => {
  try {
    const barrilId = Number(req.params.id);
    const registroId = Number(req.params.registroId);
    await produccionService.deleteRegistro(barrilId, registroId);
    res.json({ message: 'Registro eliminado y cambios revertidos' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

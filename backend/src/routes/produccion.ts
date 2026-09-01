import { Router } from 'express';
import { adminAuth } from '@/middleware/adminAuth';
import {
  listIngredientes,
  createIngrediente,
  updateIngrediente,
  deleteIngrediente,
  listCategorias,
  createCategoria,
  updateCategoria,
  deleteCategoria,
  listBarriles,
  listAlertas,
  getBarril,
  createBarril,
  updateBarril,
  deleteBarril,
  addRegistroBarril,
  deleteRegistroBarril,
} from '@/controllers/produccionController';

const router = Router();
router.use(adminAuth);

// Ingredientes
router.get('/ingredientes', listIngredientes);
router.post('/ingredientes', createIngrediente);
router.put('/ingredientes/:id', updateIngrediente);
router.delete('/ingredientes/:id', deleteIngrediente);

// Categorías
router.get('/categorias', listCategorias);
router.post('/categorias', createCategoria);
router.put('/categorias/:id', updateCategoria);
router.delete('/categorias/:id', deleteCategoria);

// Barriles
router.get('/', listBarriles);
router.get('/alertas', listAlertas);
router.get('/:id', getBarril);
router.post('/', createBarril);
router.put('/:id', updateBarril);
router.delete('/:id', deleteBarril);
router.post('/:id/registros', addRegistroBarril);
router.delete('/:id/registros/:registroId', deleteRegistroBarril);

export default router;

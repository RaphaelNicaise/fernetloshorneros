import { Request, Response } from 'express';
import { produccionService } from '@/services/produccionService';
import { ingredientesService } from '@/services/ingredientesService';

// ─── Ingredientes ─────────────────────────────────────────────────

export async function listIngredientes(req: Request, res: Response) {
  try {
    const ingredientes = await ingredientesService.getAll();
    res.json(ingredientes);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function createIngrediente(req: Request, res: Response) {
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
}

export async function updateIngrediente(req: Request, res: Response) {
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
}

export async function deleteIngrediente(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    await ingredientesService.delete(id);
    res.json({ message: 'Ingrediente eliminado' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
}

// ─── Categorías ───────────────────────────────────────────────────

export async function listCategorias(req: Request, res: Response) {
  try {
    const categorias = await produccionService.getCategorias();
    res.json(categorias);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function createCategoria(req: Request, res: Response) {
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
}

export async function updateCategoria(req: Request, res: Response) {
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
}

export async function deleteCategoria(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    await produccionService.deleteCategoria(id);
    res.json({ message: 'Categoría eliminada' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
}

// ─── Barriles ─────────────────────────────────────────────────────

export async function listBarriles(req: Request, res: Response) {
  try {
    const barriles = await produccionService.getAllBarriles();
    res.json(barriles);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function listAlertas(req: Request, res: Response) {
  try {
    const alertas = await produccionService.getAlertasMezcla();
    res.json(alertas);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function getBarril(req: Request, res: Response) {
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
}

export async function createBarril(req: Request, res: Response) {
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
}

export async function updateBarril(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    await produccionService.updateBarril(id, req.body);
    res.json({ message: 'Barril actualizado' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function deleteBarril(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    await produccionService.deleteBarril(id);
    res.json({ message: 'Barril eliminado' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function addRegistroBarril(req: Request, res: Response) {
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
}

export async function deleteRegistroBarril(req: Request, res: Response) {
  try {
    const barrilId = Number(req.params.id);
    const registroId = Number(req.params.registroId);
    await produccionService.deleteRegistro(barrilId, registroId);
    res.json({ message: 'Registro eliminado y cambios revertidos' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

import { Router } from 'express';
import { getAllProducts, getProductById, updateProduct, createProduct, deleteProduct} from '@/services/productService';
import { Product } from '@/services/productService';

const productsRouter = Router();

productsRouter.get('/', async (req, res) => {
  try {
    const products = await getAllProducts();
    res.json(products);
    } catch (error) {
    res.status(500).json({ error: 'Error al obtener productos' });
    }
});

productsRouter.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const product: Product | null = await getProductById(id);
    if (!product) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener el producto' });
  }
});

// Utilidades de validación simples (sin libs externas)
function validateProductPayload(payload: any): { ok: true; data: Product } | { ok: false; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  // id
  if (!payload?.id || typeof payload.id !== 'string' || payload.id.trim().length === 0) {
    errors.id = 'id requerido';
  }

  // name
  if (!payload?.name || typeof payload.name !== 'string' || payload.name.trim().length === 0) {
    errors.name = 'name requerido';
  } else if (payload.name.length > 100) {
    errors.name = 'name debe tener hasta 100 caracteres';
  }

  // description
  if (!payload?.description || typeof payload.description !== 'string' || payload.description.trim().length === 0) {
    errors.description = 'description requerida';
  }

  // price
  const priceNumber = typeof payload?.price === 'number' ? payload.price : Number(payload?.price);
  if (!Number.isFinite(priceNumber)) {
    errors.price = 'price debe ser número';
  } else if (priceNumber < 0) {
    errors.price = 'price no puede ser negativo';
  }

  // limite (opcional, default 0)
  const limiteNumber = payload?.limite === undefined || payload?.limite === null ? 0 : (typeof payload?.limite === 'number' ? payload.limite : Number(payload?.limite));
  if (!Number.isFinite(limiteNumber)) {
    errors.limite = 'limite debe ser número';
  } else if (limiteNumber < 0) {
    errors.limite = 'limite no puede ser negativo';
  }

  // image: solo validar que sea string (se aceptan rutas relativas del front)
  if (typeof payload?.image !== 'string'){
    errors.image = 'image debe ser string';
  }

  // status
  const allowedStatus: Product['status'][] = ['disponible', 'proximamente', 'agotado'];
  if (!payload?.status || !allowedStatus.includes(payload.status)) {
    errors.status = "status inválido (permitidos: 'disponible' | 'proximamente' | 'agotado')";
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  const data: Product = {
    id: String(payload.id),
    name: String(payload.name),
    description: String(payload.description),
    price: priceNumber,
    image: String(payload.image),
    limite: Number(limiteNumber) || 0,
    status: payload.status as Product['status'],
  };

  return { ok: true, data };
}

// Para PUT: igual validación pero sin exigir id (se toma de la URL)
type ProductUpdateInput = Omit<Product, 'id'>
function validateProductUpdatePayload(payload: any): { ok: true; data: ProductUpdateInput } | { ok: false; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  // name
  if (!payload?.name || typeof payload.name !== 'string' || payload.name.trim().length === 0) {
    errors.name = 'name requerido';
  } else if (payload.name.length > 100) {
    errors.name = 'name debe tener hasta 100 caracteres';
  }

  // description
  if (!payload?.description || typeof payload.description !== 'string' || payload.description.trim().length === 0) {
    errors.description = 'description requerida';
  }

  // price
  const priceNumber = typeof payload?.price === 'number' ? payload.price : Number(payload?.price);
  if (!Number.isFinite(priceNumber)) {
    errors.price = 'price debe ser número';
  } else if (priceNumber < 0) {
    errors.price = 'price no puede ser negativo';
  }

  // limite (opcional, default 0)
  const limiteNumber = payload?.limite === undefined || payload?.limite === null ? 0 : (typeof payload?.limite === 'number' ? payload.limite : Number(payload?.limite));
  if (!Number.isFinite(limiteNumber)) {
    errors.limite = 'limite debe ser número';
  } else if (limiteNumber < 0) {
    errors.limite = 'limite no puede ser negativo';
  }

  // image: solo validar que sea string
  if (typeof payload?.image !== 'string') {
    errors.image = 'image debe ser string';
  }

  // status
  const allowedStatus: Product['status'][] = ['disponible', 'proximamente', 'agotado'];
  if (!payload?.status || !allowedStatus.includes(payload.status)) {
    errors.status = "status inválido (permitidos: 'disponible' | 'proximamente' | 'agotado')";
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  const data: ProductUpdateInput = {
    name: String(payload.name),
    description: String(payload.description),
    price: priceNumber,
    image: String(payload.image),
    limite: Number(limiteNumber) || 0,
    status: payload.status as Product['status'],
  };

  return { ok: true, data };
}

// PUT /api/products
// Actualiza un producto con validación y id en la URL; si viene id en el body se ignora
productsRouter.put('/:id', async (req, res) => {
  const { id } = req.params;

  const parsed = validateProductUpdatePayload(req.body);
  if (!parsed.ok) {
    return res.status(400).json({ error: 'Datos inválidos', details: parsed.errors });
  }

  const productData: Product = { id, ...parsed.data };

  try {
    await updateProduct(productData);
    res.json({ message: 'Producto actualizado correctamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar el producto' });
  }
});

productsRouter.post('/', async (req, res) => {
  const parsed = validateProductPayload(req.body);
  if (!parsed.ok) {
    return res.status(400).json({ error: 'Datos inválidos', details: parsed.errors });
  }
  const productData = parsed.data;

  try {
    await createProduct(productData);
    res.status(201).json({ message: 'Producto creado correctamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al crear el producto' });
  }
});

productsRouter.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await deleteProduct(id);
    res.json({ message: 'Producto eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar el producto' });
  }
});

export default productsRouter;
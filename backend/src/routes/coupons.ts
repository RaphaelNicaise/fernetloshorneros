import { Router, Request, Response } from 'express';
import { adminAuth } from '../middleware/adminAuth';
import { couponService } from '../services/couponService';

const router = Router();

// Endpoint público para validar cupón desde el checkout
router.post('/validate', async (req: Request, res: Response) => {
  try {
    const { codigo, subtotal } = req.body;
    if (!codigo) {
      return res.status(400).json({ error: 'Código requerido' });
    }

    const coupon = await couponService.getCouponByCode(codigo.toUpperCase());
    if (!coupon) {
      return res.status(404).json({ error: 'Cupón no encontrado' });
    }

    const validation = couponService.validateCoupon(coupon);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    let discountAmount = 0;
    if (coupon.tipo_descuento === 'porcentaje') {
      discountAmount = (subtotal * coupon.valor) / 100;
    } else if (coupon.tipo_descuento === 'fijo') {
      discountAmount = coupon.valor;
    }

    // No permitir que el descuento sea mayor al subtotal
    if (discountAmount > subtotal && coupon.tipo_descuento !== 'envio_gratis') {
      discountAmount = subtotal;
    }

    res.json({
      valid: true,
      coupon,
      discountAmount
    });
  } catch (error: any) {
    console.error('Error validating coupon:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Rutas protegidas para administración de cupones
router.use(adminAuth);

router.get('/', async (req: Request, res: Response) => {
  try {
    const coupons = await couponService.getAllCoupons();
    res.json(coupons);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { codigo, tipo_descuento, valor, fecha_expiracion } = req.body;
    if (!codigo || !tipo_descuento || valor === undefined) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    await couponService.createCoupon(
      codigo.toUpperCase(),
      tipo_descuento,
      valor,
      fecha_expiracion ? new Date(fecha_expiracion) : null
    );
    res.status(201).json({ message: 'Cupón creado con éxito' });
  } catch (error: any) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: 'El código de cupón ya existe' });
    }
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { codigo, tipo_descuento, valor, fecha_expiracion, activo } = req.body;
    
    await couponService.updateCoupon(
      id,
      codigo.toUpperCase(),
      tipo_descuento,
      valor,
      fecha_expiracion ? new Date(fecha_expiracion) : null,
      activo
    );
    res.json({ message: 'Cupón actualizado' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    await couponService.deleteCoupon(id);
    res.json({ message: 'Cupón eliminado' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

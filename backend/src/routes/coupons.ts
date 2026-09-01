import { Router, Request, Response } from 'express';
import { adminAuth } from '../middleware/adminAuth';
import { couponService } from '../services/couponService';

const router = Router();

// Endpoint público para validar cupón desde el checkout
router.post('/validate', async (req: Request, res: Response) => {
  try {
    const { codigo, subtotal } = req.body;
    if (!codigo || typeof codigo !== 'string' || !codigo.trim()) {
      return res.json({ valid: false, error: 'Por favor ingresá un código de cupón.' });
    }

    const cleanCode = codigo.trim().toUpperCase();
    const coupon = await couponService.getCouponByCode(cleanCode);
    if (!coupon) {
      return res.json({ valid: false, error: 'Este código de descuento no existe.' });
    }

    const validation = couponService.validateCoupon(coupon);
    if (!validation.valid) {
      return res.json({ valid: false, error: validation.error || 'El cupón ya expiró o no está activo.' });
    }

    const subtotalNum = Number(subtotal) || 0;
    let discountAmount = 0;
    if (coupon.tipo_descuento === 'porcentaje') {
      discountAmount = (subtotalNum * Number(coupon.valor)) / 100;
    } else if (coupon.tipo_descuento === 'fijo') {
      discountAmount = Number(coupon.valor);
    }

    // No permitir que el descuento sea mayor al subtotal
    if (discountAmount > subtotalNum && coupon.tipo_descuento !== 'envio_gratis') {
      discountAmount = subtotalNum;
    }

    return res.json({
      valid: true,
      coupon,
      discountAmount
    });
  } catch (error: any) {
    console.error('Error validating coupon:', error);
    return res.status(500).json({ valid: false, error: 'Error interno del servidor validando cupón' });
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

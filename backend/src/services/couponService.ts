import sequelize from '../config/database';
import { QueryTypes } from 'sequelize';

export interface Coupon {
  id: number;
  codigo: string;
  tipo_descuento: 'porcentaje' | 'fijo' | 'envio_gratis';
  valor: number;
  usos_actuales: number;
  fecha_expiracion: Date | null;
  activo: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export const couponService = {
  async getAllCoupons(): Promise<Coupon[]> {
    return sequelize.query(`SELECT * FROM cupones ORDER BY created_at DESC`, {
      type: QueryTypes.SELECT,
    });
  },

  async getCouponByCode(codigo: string): Promise<Coupon | null> {
    const rows = await sequelize.query<Coupon>(
      `SELECT * FROM cupones WHERE codigo = ? AND activo = TRUE LIMIT 1`,
      {
        replacements: [codigo],
        type: QueryTypes.SELECT,
      }
    );
    return rows.length > 0 ? rows[0] : null;
  },

  async getCouponById(id: number): Promise<Coupon | null> {
    const rows = await sequelize.query<Coupon>(`SELECT * FROM cupones WHERE id = ? LIMIT 1`, {
      replacements: [id],
      type: QueryTypes.SELECT,
    });
    return rows.length > 0 ? rows[0] : null;
  },

  async createCoupon(
    codigo: string,
    tipo_descuento: 'porcentaje' | 'fijo' | 'envio_gratis',
    valor: number,
    fecha_expiracion: Date | null
  ): Promise<void> {
    await sequelize.query(
      `INSERT INTO cupones (codigo, tipo_descuento, valor, fecha_expiracion) 
       VALUES (?, ?, ?, ?)`,
      {
        replacements: [codigo, tipo_descuento, valor, fecha_expiracion],
        type: QueryTypes.INSERT,
      }
    );
  },

  async updateCoupon(
    id: number,
    codigo: string,
    tipo_descuento: 'porcentaje' | 'fijo' | 'envio_gratis',
    valor: number,
    fecha_expiracion: Date | null,
    activo: boolean
  ): Promise<void> {
    await sequelize.query(
      `UPDATE cupones 
       SET codigo = ?, tipo_descuento = ?, valor = ?, fecha_expiracion = ?, activo = ?
       WHERE id = ?`,
      {
        replacements: [codigo, tipo_descuento, valor, fecha_expiracion, activo, id],
        type: QueryTypes.UPDATE,
      }
    );
  },

  async deleteCoupon(id: number): Promise<void> {
    await sequelize.query(`DELETE FROM cupones WHERE id = ?`, {
      replacements: [id],
      type: QueryTypes.DELETE,
    });
  },

  async incrementUsage(codigo: string): Promise<void> {
    await sequelize.query(
      `UPDATE cupones SET usos_actuales = usos_actuales + 1 WHERE codigo = ?`,
      {
        replacements: [codigo],
        type: QueryTypes.UPDATE,
      }
    );
  },

  validateCoupon(coupon: Coupon): { valid: boolean; error?: string } {
    if (!coupon.activo) {
      return { valid: false, error: 'El cupón no está activo.' };
    }
    if (coupon.fecha_expiracion && new Date() > new Date(coupon.fecha_expiracion)) {
      return { valid: false, error: 'El cupón ha expirado.' };
    }
    return { valid: true };
  },
};

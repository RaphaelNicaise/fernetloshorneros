import sequelize from '../config/database';
import { QueryTypes } from 'sequelize';

export interface Lote {
  id: number;
  nombre: string;
  fecha_creacion: Date;
  activo: boolean;
}

export const lotesService = {
  async getAllLotes(): Promise<Lote[]> {
    return sequelize.query<Lote>(
      `SELECT * FROM lotes ORDER BY id DESC`,
      { type: QueryTypes.SELECT }
    );
  },

  async getLoteActual(): Promise<Lote | null> {
    const rows = await sequelize.query<Lote>(
      `SELECT * FROM lotes WHERE activo = TRUE LIMIT 1`,
      { type: QueryTypes.SELECT }
    );
    return rows.length > 0 ? rows[0] : null;
  },

  async createLote(nombre: string, setAsActive: boolean = false): Promise<number> {
    const transaction = await sequelize.transaction();
    try {
      if (setAsActive) {
        await sequelize.query(`UPDATE lotes SET activo = FALSE`, { type: QueryTypes.UPDATE, transaction });
      }

      const [result]: any = await sequelize.query(
        `INSERT INTO lotes (nombre, activo) VALUES (?, ?)`,
        {
          replacements: [nombre, setAsActive ? 1 : 0],
          type: QueryTypes.INSERT,
          transaction
        }
      );
      
      await transaction.commit();
      return result;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async setLoteActual(id: number): Promise<void> {
    const transaction = await sequelize.transaction();
    try {
      await sequelize.query(`UPDATE lotes SET activo = FALSE`, { type: QueryTypes.UPDATE, transaction });
      await sequelize.query(`UPDATE lotes SET activo = TRUE WHERE id = ?`, {
        replacements: [id],
        type: QueryTypes.UPDATE,
        transaction
      });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async deleteLote(id: number): Promise<void> {
    await sequelize.query(`DELETE FROM lotes WHERE id = ?`, {
      replacements: [id],
      type: QueryTypes.DELETE
    });
  }
};

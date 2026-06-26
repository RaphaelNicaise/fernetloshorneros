import sequelize from '../config/database';
import { QueryTypes } from 'sequelize';

export interface Ingrediente {
  id: number;
  nombre: string;
  unidad: 'litros' | 'gramos';
  es_fijo: boolean;
  created_at: string;
}

export const ingredientesService = {
  async getAll(): Promise<Ingrediente[]> {
    return sequelize.query<Ingrediente>(
      `SELECT * FROM ingredientes ORDER BY nombre ASC`,
      { type: QueryTypes.SELECT }
    );
  },

  async create(nombre: string, unidad: 'litros' | 'gramos'): Promise<number> {
    const [result]: any = await sequelize.query(
      `INSERT INTO ingredientes (nombre, unidad) VALUES (?, ?)`,
      { replacements: [nombre.trim(), unidad], type: QueryTypes.INSERT }
    );
    return result;
  },

  async update(id: number, nombre: string, unidad: 'litros' | 'gramos'): Promise<void> {
    // Check if fijo
    const rows = await sequelize.query<Ingrediente>(
      `SELECT * FROM ingredientes WHERE id = ?`,
      { replacements: [id], type: QueryTypes.SELECT }
    );
    if (rows.length === 0) throw new Error('Ingrediente no encontrado');
    if (rows[0].es_fijo) throw new Error('No se puede modificar un ingrediente fijo');

    await sequelize.query(
      `UPDATE ingredientes SET nombre = ?, unidad = ? WHERE id = ?`,
      { replacements: [nombre.trim(), unidad, id], type: QueryTypes.UPDATE }
    );
  },

  async delete(id: number): Promise<void> {
    const rows = await sequelize.query<Ingrediente>(
      `SELECT * FROM ingredientes WHERE id = ?`,
      { replacements: [id], type: QueryTypes.SELECT }
    );
    if (rows.length === 0) throw new Error('Ingrediente no encontrado');
    if (rows[0].es_fijo) throw new Error('No se puede eliminar un ingrediente fijo');

    await sequelize.query(
      `DELETE FROM ingredientes WHERE id = ?`,
      { replacements: [id], type: QueryTypes.DELETE }
    );
  },
};

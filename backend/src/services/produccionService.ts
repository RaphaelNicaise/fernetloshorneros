import sequelize from '../config/database';
import { QueryTypes } from 'sequelize';

export interface Barril {
  id: number;
  identificador: string;
  nombre: string | null;
  capacidad_litros: number;
  litros_actuales: number;
  estado: 'vacio' | 'en_proceso' | 'listo';
  ultima_mezcla: string | null;
  notas: string | null;
  fecha_creacion: string;
  necesita_mezcla?: boolean;
  ultimo_registro?: string | null;
}

export interface BarrilRegistro {
  id: number;
  barril_id: number;
  tipo: 'ingrediente' | 'mezcla' | 'extraccion' | 'nota';
  descripcion: string | null;
  ingrediente_id: number | null;
  ingrediente_nombre?: string | null;
  cantidad_litros: number | null;
  cantidad_gramos: number | null;
  fecha: string;
}

export const produccionService = {
  async getAllBarriles(): Promise<Barril[]> {
    return sequelize.query<Barril>(
      `SELECT b.*,
        (SELECT MAX(r.fecha) FROM barril_registros r WHERE r.barril_id = b.id) AS ultimo_registro,
        CASE
          WHEN b.estado = 'en_proceso'
            AND (b.ultima_mezcla IS NULL OR b.ultima_mezcla < DATE_SUB(NOW(), INTERVAL 24 HOUR))
          THEN TRUE
          ELSE FALSE
        END AS necesita_mezcla
      FROM barriles b
      ORDER BY b.id DESC`,
      { type: QueryTypes.SELECT }
    );
  },

  async getBarrilById(id: number): Promise<{ barril: Barril; registros: BarrilRegistro[] } | null> {
    const rows = await sequelize.query<Barril>(
      `SELECT b.*,
        CASE
          WHEN b.estado = 'en_proceso'
            AND (b.ultima_mezcla IS NULL OR b.ultima_mezcla < DATE_SUB(NOW(), INTERVAL 24 HOUR))
          THEN TRUE
          ELSE FALSE
        END AS necesita_mezcla
      FROM barriles b WHERE b.id = ?`,
      { replacements: [id], type: QueryTypes.SELECT }
    );
    if (rows.length === 0) return null;

    const registros = await sequelize.query<BarrilRegistro>(
      `SELECT r.*, i.nombre AS ingrediente_nombre
       FROM barril_registros r
       LEFT JOIN ingredientes i ON r.ingrediente_id = i.id
       WHERE r.barril_id = ?
       ORDER BY r.fecha DESC`,
      { replacements: [id], type: QueryTypes.SELECT }
    );

    return { barril: rows[0], registros };
  },

  async createBarril(data: {
    identificador: string;
    nombre?: string;
    capacidad_litros: number;
    notas?: string;
  }): Promise<number> {
    const [result]: any = await sequelize.query(
      `INSERT INTO barriles (identificador, nombre, capacidad_litros, notas) VALUES (?, ?, ?, ?)`,
      {
        replacements: [data.identificador, data.nombre || null, data.capacidad_litros, data.notas || null],
        type: QueryTypes.INSERT,
      }
    );
    return result;
  },

  async updateBarril(
    id: number,
    data: {
      identificador?: string;
      nombre?: string;
      capacidad_litros?: number;
      estado?: string;
      notas?: string;
    }
  ): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];

    if (data.identificador !== undefined) {
      fields.push('identificador = ?');
      values.push(data.identificador);
    }
    if (data.nombre !== undefined) {
      fields.push('nombre = ?');
      values.push(data.nombre || null);
    }
    if (data.capacidad_litros !== undefined) {
      fields.push('capacidad_litros = ?');
      values.push(data.capacidad_litros);
    }
    if (data.estado !== undefined) {
      fields.push('estado = ?');
      values.push(data.estado);
    }
    if (data.notas !== undefined) {
      fields.push('notas = ?');
      values.push(data.notas || null);
    }

    if (fields.length === 0) return;

    values.push(id);
    await sequelize.query(`UPDATE barriles SET ${fields.join(', ')} WHERE id = ?`, {
      replacements: values,
      type: QueryTypes.UPDATE,
    });
  },

  async deleteBarril(id: number): Promise<void> {
    await sequelize.query(`DELETE FROM barriles WHERE id = ?`, {
      replacements: [id],
      type: QueryTypes.DELETE,
    });
  },

  async addRegistro(
    barrilId: number,
    data: {
      tipo: 'ingrediente' | 'mezcla' | 'extraccion' | 'nota';
      descripcion?: string;
      ingrediente_id?: number;
      cantidad_litros?: number;
      cantidad_gramos?: number;
    }
  ): Promise<void> {
    const transaction = await sequelize.transaction();
    try {
      // Fetch current barrel state for validation
      const barrilRows = await sequelize.query<{ litros_actuales: number; capacidad_litros: number }>(
        `SELECT litros_actuales, capacidad_litros FROM barriles WHERE id = ?`,
        { replacements: [barrilId], type: QueryTypes.SELECT, transaction }
      );
      if (barrilRows.length === 0) throw new Error('Barril no encontrado');

      const currentLitros = Number(barrilRows[0].litros_actuales);
      const capacidad = Number(barrilRows[0].capacidad_litros);

      // Validate capacity overflow (adding litros)
      if (data.cantidad_litros && data.cantidad_litros > 0) {
        const newTotal = currentLitros + data.cantidad_litros;
        if (newTotal > capacidad) {
          throw new Error(`No se pueden agregar ${data.cantidad_litros.toFixed(1)}L. El barril tiene ${currentLitros.toFixed(1)}L de ${capacidad.toFixed(0)}L de capacidad. Máximo: ${(capacidad - currentLitros).toFixed(1)}L`);
        }
      }

      // Validate extraction (removing litros)
      if (data.cantidad_litros && data.cantidad_litros < 0) {
        const extractAmount = Math.abs(data.cantidad_litros);
        if (extractAmount > currentLitros) {
          throw new Error(`No se pueden extraer ${extractAmount.toFixed(1)}L. El barril solo tiene ${currentLitros.toFixed(1)}L disponibles`);
        }
      }

      await sequelize.query(
        `INSERT INTO barril_registros (barril_id, tipo, descripcion, ingrediente_id, cantidad_litros, cantidad_gramos)
         VALUES (?, ?, ?, ?, ?, ?)`,
        {
          replacements: [
            barrilId,
            data.tipo,
            data.descripcion || null,
            data.ingrediente_id ?? null,
            data.cantidad_litros ?? null,
            data.cantidad_gramos ?? null,
          ],
          type: QueryTypes.INSERT,
          transaction,
        }
      );

      // Update litros_actuales for Alcohol ingredient or extraction
      if (data.cantidad_litros && data.cantidad_litros !== 0) {
        await sequelize.query(
          `UPDATE barriles SET litros_actuales = GREATEST(0, litros_actuales + ?) WHERE id = ?`,
          { replacements: [data.cantidad_litros, barrilId], type: QueryTypes.UPDATE, transaction }
        );
      }

      // If mezcla, update ultima_mezcla
      if (data.tipo === 'mezcla') {
        await sequelize.query(`UPDATE barriles SET ultima_mezcla = NOW() WHERE id = ?`, {
          replacements: [barrilId],
          type: QueryTypes.UPDATE,
          transaction,
        });
      }

      // Auto-update estado based on litros
      const rows = await sequelize.query<{ litros_actuales: number }>(
        `SELECT litros_actuales FROM barriles WHERE id = ?`,
        { replacements: [barrilId], type: QueryTypes.SELECT, transaction }
      );
      if (rows.length > 0) {
        const litros = Number(rows[0].litros_actuales);
        if (litros <= 0) {
          await sequelize.query(`UPDATE barriles SET estado = 'vacio', litros_actuales = 0 WHERE id = ?`, {
            replacements: [barrilId],
            type: QueryTypes.UPDATE,
            transaction,
          });
        } else {
          await sequelize.query(
            `UPDATE barriles SET estado = 'en_proceso' WHERE id = ? AND estado = 'vacio'`,
            { replacements: [barrilId], type: QueryTypes.UPDATE, transaction }
          );
        }
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async getAlertasMezcla(): Promise<Barril[]> {
    return sequelize.query<Barril>(
      `SELECT b.*
      FROM barriles b
      WHERE b.estado = 'en_proceso'
        AND (b.ultima_mezcla IS NULL OR b.ultima_mezcla < DATE_SUB(NOW(), INTERVAL 24 HOUR))
      ORDER BY b.ultima_mezcla ASC`,
      { type: QueryTypes.SELECT }
    );
  },
};

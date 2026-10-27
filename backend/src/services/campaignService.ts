import sequelize from '@/config/database';
import { QueryTypes } from 'sequelize';
import { Campaign, CampaignRecipient, CampaignStatus, CreateCampaignDTO } from '@/types/campaigns';

export const campaignService = {
  async createCampaignWithRecipients(data: CreateCampaignDTO): Promise<Campaign> {
    const transaction = await sequelize.transaction();
    try {
      const [campaignId]: any = await sequelize.query(
        `INSERT INTO email_campanias (nombre, template_key, asunto, estado, total_destinatarios, creado_por)
         VALUES (:nombre, :template_key, :asunto, 'en_cola', :total, :creado_por)`,
        {
          replacements: {
            nombre: data.nombre,
            template_key: data.template_key,
            asunto: data.asunto,
            total: data.recipients.length,
            creado_por: data.creado_por || 'admin',
          },
          type: QueryTypes.INSERT,
          transaction,
        }
      );

      // Insert recipients in chunks of 500 to prevent query packet overflow
      const chunkSize = 500;
      for (let i = 0; i < data.recipients.length; i += chunkSize) {
        const chunk = data.recipients.slice(i, i + chunkSize);
        const valuePlaceholders: string[] = [];
        const replacements: any[] = [];

        chunk.forEach((r) => {
          valuePlaceholders.push('(?, ?, ?, ?)');
          replacements.push(campaignId, r.email.trim().toLowerCase(), r.nombre ? r.nombre.trim() : null, 'pendiente');
        });

        const insertSql = `INSERT INTO email_campania_destinatarios (campania_id, email, nombre, estado) VALUES ${valuePlaceholders.join(', ')}`;
        await sequelize.query(insertSql, {
          replacements,
          type: QueryTypes.INSERT,
          transaction,
        });
      }

      await transaction.commit();

      const campaign = await this.getCampaignById(Number(campaignId));
      if (!campaign) throw new Error('Error al recuperar campaña creada');
      return campaign;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async getCampaigns(options: { page?: number; limit?: number; estado?: string } = {}): Promise<{ campaigns: Campaign[]; total: number }> {
    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(options.limit) || 20));
    const offset = (page - 1) * limit;

    const whereClauses: string[] = [];
    const replacements: Record<string, any> = { limit, offset };

    if (options.estado) {
      whereClauses.push('estado = :estado');
      replacements.estado = options.estado;
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countResult = await sequelize.query<{ count: number }>(
      `SELECT COUNT(*) as count FROM email_campanias ${whereSql}`,
      { replacements, type: QueryTypes.SELECT }
    );
    const total = countResult[0]?.count || 0;

    const campaigns = await sequelize.query<Campaign>(
      `SELECT * FROM email_campanias ${whereSql} ORDER BY id DESC LIMIT :limit OFFSET :offset`,
      { replacements, type: QueryTypes.SELECT }
    );

    return { campaigns, total };
  },

  async getCampaignById(id: number): Promise<Campaign | null> {
    const rows = await sequelize.query<Campaign>(
      `SELECT * FROM email_campanias WHERE id = :id`,
      { replacements: { id }, type: QueryTypes.SELECT }
    );
    return rows.length > 0 ? rows[0] : null;
  },

  async getCampaignLogs(id: number, options: { page?: number; limit?: number; estado?: string } = {}): Promise<{ logs: CampaignRecipient[]; total: number }> {
    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.max(1, Math.min(200, Number(options.limit) || 50));
    const offset = (page - 1) * limit;

    const whereClauses: string[] = ['campania_id = :id'];
    const replacements: Record<string, any> = { id, limit, offset };

    if (options.estado) {
      whereClauses.push('estado = :estado');
      replacements.estado = options.estado;
    }

    const whereSql = `WHERE ${whereClauses.join(' AND ')}`;

    const countResult = await sequelize.query<{ count: number }>(
      `SELECT COUNT(*) as count FROM email_campania_destinatarios ${whereSql}`,
      { replacements, type: QueryTypes.SELECT }
    );
    const total = countResult[0]?.count || 0;

    const logs = await sequelize.query<CampaignRecipient>(
      `SELECT * FROM email_campania_destinatarios ${whereSql} ORDER BY id DESC LIMIT :limit OFFSET :offset`,
      { replacements, type: QueryTypes.SELECT }
    );

    return { logs, total };
  },

  async updateCampaignStatus(id: number, estado: CampaignStatus): Promise<void> {
    const updates: string[] = ['estado = :estado'];
    const replacements: Record<string, any> = { id, estado };

    if (estado === 'procesando') {
      updates.push('fecha_inicio = COALESCE(fecha_inicio, NOW())');
    } else if (estado === 'completada' || estado === 'cancelada') {
      updates.push('fecha_fin = NOW()');
    }

    await sequelize.query(
      `UPDATE email_campanias SET ${updates.join(', ')} WHERE id = :id`,
      { replacements, type: QueryTypes.UPDATE }
    );
  },

  async retryFailedRecipients(id: number): Promise<number> {
    const [result]: any = await sequelize.query(
      `UPDATE email_campania_destinatarios 
       SET estado = 'pendiente', error_mensaje = NULL, intentos = intentos + 1 
       WHERE campania_id = :id AND estado = 'fallido'`,
      { replacements: { id }, type: QueryTypes.UPDATE }
    );

    // Recalculate failed count in campaign
    await sequelize.query(
      `UPDATE email_campanias 
       SET fallidos_count = 0, estado = 'procesando', fecha_fin = NULL 
       WHERE id = :id`,
      { replacements: { id }, type: QueryTypes.UPDATE }
    );

    return result?.affectedRows || 0;
  },
};

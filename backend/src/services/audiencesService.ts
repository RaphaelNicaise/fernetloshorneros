import sequelize from '@/config/database';
import { QueryTypes } from 'sequelize';

export type BuyerStatus = 'para_despachar' | 'enviado' | 'venta_local';

export interface AudienceFilterOptions {
  audiences?: string[]; // 'buyers', 'waitlist'
  provinces?: string[];
  manualList?: string;
  buyerLoteId?: number | string | null;
  buyerStatuses?: BuyerStatus[];
}

export interface AudienceRecipient {
  email: string;
  nombre: string;
}

export const audiencesService = {
  parseManualList(text?: string): AudienceRecipient[] {
    if (!text) return [];
    const lines = text.split('\n');
    const results: AudienceRecipient[] = [];
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const parts = trimmed.split(',');
      const email = parts[0].trim().toLowerCase();
      const nombre = parts.length > 1 && parts[1].trim() ? parts[1].trim() : 'Amigo/a';
      if (email.includes('@')) {
        results.push({ email, nombre });
      }
    }
    return results;
  },

  async getRecipients(options: AudienceFilterOptions): Promise<AudienceRecipient[]> {
    const { audiences = [], provinces, manualList, buyerLoteId, buyerStatuses } = options;

    const queries: string[] = [];
    const replacements: Record<string, any> = {};

    if (provinces && provinces.length > 0) {
      replacements.provinces = provinces;
    }

    if (audiences.includes('waitlist')) {
      let q = `
        SELECT DISTINCT email, nombre 
        FROM usuario_lista_espera 
        WHERE email IS NOT NULL AND email != ''
      `;
      if (provinces && provinces.length > 0) {
        q += ` AND provincia IN (:provinces)`;
      }
      queries.push(q);
    }

    if (audiences.includes('buyers')) {
      let q = `
        SELECT DISTINCT e.email_cliente as email, e.nombre_cliente as nombre 
        FROM pedidos p
        JOIN envios e ON p.id = e.id_pedido
        WHERE p.status IN ('approved', 'paid')
          AND p.status NOT IN ('cancelled', 'rejected', 'failed')
          AND (e.status IS NULL OR e.status NOT IN ('cancelado', 'cancelled'))
          AND e.email_cliente IS NOT NULL 
          AND e.email_cliente != ''
      `;

      if (buyerLoteId !== undefined && buyerLoteId !== null && buyerLoteId !== 'all') {
        const numLote = Number(buyerLoteId);
        if (!isNaN(numLote)) {
          q += ` AND p.lote_id = :buyerLoteId`;
          replacements.buyerLoteId = numLote;
        }
      }

      // Filtrado por estado de entrega/pedido
      const statuses = buyerStatuses !== undefined ? buyerStatuses : ['para_despachar', 'enviado'];
      if (statuses.length === 0) {
        // Si desmarcó todos los estados, no debe traer compradores
        q += ` AND 1 = 0`;
      } else {
        const statusConditions: string[] = [];
        if (statuses.includes('enviado')) {
          statusConditions.push(`e.status = 'shipped'`);
        }
        if (statuses.includes('venta_local')) {
          statusConditions.push(`e.status = 'local'`);
        }
        if (statuses.includes('para_despachar')) {
          statusConditions.push(
            `(e.status IS NULL OR e.status = 'pending' OR e.status NOT IN ('shipped', 'local', 'cancelado', 'cancelled'))`
          );
        }
        if (statusConditions.length > 0) {
          q += ` AND (${statusConditions.join(' OR ')})`;
        }
      }

      if (provinces && provinces.length > 0) {
        q += ` AND e.provincia IN (:provinces)`;
      }

      queries.push(q);
    }

    let dbRecipients: AudienceRecipient[] = [];
    if (queries.length > 0) {
      const finalQuery = queries.join(' UNION ');
      const queryResult = await sequelize.query<AudienceRecipient>(finalQuery, {
        replacements,
        type: QueryTypes.SELECT,
      });
      dbRecipients = Array.isArray(queryResult) ? queryResult : [];
    }

    const manualRecipients = this.parseManualList(manualList);

    // Deduplicar case-insensitively
    const uniqueMap = new Map<string, AudienceRecipient>();

    for (const r of dbRecipients) {
      const email = r.email.trim().toLowerCase();
      if (!uniqueMap.has(email)) {
        uniqueMap.set(email, {
          email,
          nombre: r.nombre?.trim() || 'Amigo/a',
        });
      }
    }

    for (const m of manualRecipients) {
      const email = m.email.trim().toLowerCase();
      if (!uniqueMap.has(email)) {
        uniqueMap.set(email, {
          email,
          nombre: m.nombre?.trim() || 'Amigo/a',
        });
      }
    }

    return Array.from(uniqueMap.values());
  },

  async countRecipients(options: AudienceFilterOptions): Promise<number> {
    const recipients = await this.getRecipients(options);
    return recipients.length;
  },

  async getProvinces(): Promise<string[]> {
    const query = `
      SELECT DISTINCT provincia FROM (
        SELECT provincia FROM usuario_lista_espera WHERE provincia IS NOT NULL AND provincia != ''
        UNION
        SELECT provincia FROM envios WHERE provincia IS NOT NULL AND provincia != ''
      ) as combined_provinces
      ORDER BY provincia ASC;
    `;
    const results = await sequelize.query<{ provincia: string }>(query, {
      type: QueryTypes.SELECT,
    });
    return results.map((r) => r.provincia);
  },
};

import { Router, Request, Response } from 'express';
import { adminAuth } from '../middleware/adminAuth';
import sequelize from '../config/database';
import { QueryTypes } from 'sequelize';

const router = Router();
router.use(adminAuth);

interface FilterBody {
  audiences: string[]; // 'buyers', 'waitlist'
  provinces: string[];
  manualList?: string;
}

function parseManualList(text?: string): { email: string, nombre: string }[] {
  if (!text) return [];
  const lines = text.split('\n');
  const results: { email: string, nombre: string }[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const parts = trimmed.split(',');
    const email = parts[0].trim().toLowerCase();
    const nombre = parts.length > 1 ? parts[1].trim() : 'Amigo/a';
    if (email.includes('@')) {
      results.push({ email, nombre });
    }
  }
  return results;
}

router.post('/count', async (req: Request, res: Response) => {
  try {
    const { audiences, provinces, manualList } = req.body as FilterBody;

    const queries: string[] = [];
    const replacements: any[] = [];

    if (audiences?.includes('waitlist')) {
      let q = `SELECT email, nombre FROM usuario_lista_espera`;
      if (provinces && provinces.length > 0) {
        q += ` WHERE provincia IN (?)`;
        replacements.push(provinces);
      }
      queries.push(q);
    }

    if (audiences?.includes('buyers')) {
      let q = `
        SELECT DISTINCT e.email_cliente as email, e.nombre_cliente as nombre 
        FROM envios e
        JOIN pedidos p ON e.id_pedido = p.id
        WHERE p.status IN ('paid', 'pending')
      `;
      if (provinces && provinces.length > 0) {
        q += ` AND e.provincia IN (?)`;
        replacements.push(provinces);
      }
      queries.push(q);
    }

    let results: {email: string, nombre: string}[] = [];
    if (queries.length > 0) {
      const finalQuery = queries.join(' UNION ');
      results = await sequelize.query<{email: string, nombre: string}>(finalQuery, {
        replacements,
        type: QueryTypes.SELECT
      });
    }

    const manualParsed = parseManualList(manualList);
    
    // Deduplicar en memoria
    const uniqueEmails = new Set<string>();
    results.forEach(r => uniqueEmails.add(r.email.toLowerCase()));
    
    let addedFromManual = 0;
    manualParsed.forEach(m => {
      if (!uniqueEmails.has(m.email)) {
        uniqueEmails.add(m.email);
        addedFromManual++;
      }
    });

    res.json({ count: results.length + addedFromManual });
  } catch (error: any) {
    console.error('Error counting audience:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint to get all distinct provinces to populate the filter dropdown
router.get('/provinces', async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT DISTINCT provincia FROM (
        SELECT provincia FROM usuario_lista_espera WHERE provincia IS NOT NULL AND provincia != ''
        UNION
        SELECT provincia FROM envios WHERE provincia IS NOT NULL AND provincia != ''
      ) as combined_provinces
      ORDER BY provincia ASC;
    `;
    const results = await sequelize.query<{provincia: string}>(query, { type: QueryTypes.SELECT });
    res.json(results.map(r => r.provincia));
  } catch (error: any) {
    console.error('Error fetching provinces:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

import { Router, Request, Response } from 'express';
import { adminAuth } from '../middleware/adminAuth';
import sequelize from '../config/database';
import { QueryTypes } from 'sequelize';

const router = Router();
router.use(adminAuth);

interface FilterBody {
  audiences: string[]; // 'buyers', 'waitlist'
  provinces: string[];
}

router.post('/count', async (req: Request, res: Response) => {
  try {
    const { audiences, provinces } = req.body as FilterBody;

    if (!audiences || audiences.length === 0) {
      return res.json({ count: 0 });
    }

    const queries: string[] = [];
    const replacements: any[] = [];

    if (audiences.includes('waitlist')) {
      let q = `SELECT email, nombre FROM usuario_lista_espera`;
      if (provinces && provinces.length > 0) {
        q += ` WHERE provincia IN (?)`;
        replacements.push(provinces);
      }
      queries.push(q);
    }

    if (audiences.includes('buyers')) {
      // Tomamos de los envíos que tienen correos válidos y pedidos no fallidos/cancelados
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

    if (queries.length === 0) {
      return res.json({ count: 0 });
    }

    const finalQuery = queries.join(' UNION ');
    const results = await sequelize.query<{email: string, nombre: string}>(finalQuery, {
      replacements,
      type: QueryTypes.SELECT
    });

    res.json({ count: results.length });
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

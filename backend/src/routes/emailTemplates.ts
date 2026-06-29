import { Router, Request, Response } from 'express';
import { adminAuth } from '../middleware/adminAuth';
import { emailTemplateService } from '../services/emailTemplateService';
import { transporter } from '../config/mail';
import { getDefaultTemplate, getEmailWrapper } from '../services/mailService';

const router = Router();

// Todos los endpoints protegidos por auth de admin
router.use(adminAuth);

router.get('/wrapper', (req: Request, res: Response) => {
  const wrapper = getEmailWrapper('Nuevo Email', '<div style="color: #ffffff; text-align: center; padding: 20px;">[Contenido del Email aquí]</div>');
  res.send({ wrapper });
});

const DEFAULT_TEMPLATES = ['compra_confirmacion', 'envio_tracking', 'notif_vendedor', 'lista_espera_confirmacion'];

const DEFAULT_SUBJECTS: Record<string, string> = {
  compra_confirmacion: 'Confirmación de tu compra',
  envio_tracking: 'Tu pedido está en camino',
  notif_vendedor: 'Nuevo pedido recibido',
  lista_espera_confirmacion: '¡Bienvenido a la lista de espera de Fernet Los Horneros!',
};

// Obtener todas las plantillas (incluyendo defaults vacías)
router.get('/', async (req: Request, res: Response) => {
  try {
    const customTemplates = await emailTemplateService.getAllTemplates();
    const customMap = new Map(customTemplates.map(t => [t.template_key, t]));

    const response: any[] = DEFAULT_TEMPLATES.map(key => {
      const custom = customMap.get(key);
      if (custom) {
        return {
          key,
          subject: custom.subject,
          html_content: custom.html_content,
          isCustom: true,
          updated_at: custom.updated_at
        };
      }
      const defaultTpl = getDefaultTemplate(key);
      return {
        key,
        subject: defaultTpl.subject,
        html_content: defaultTpl.html,
        isCustom: false
      };
    });

    // Añadir plantillas customizadas que no sean default
    for (const t of customTemplates) {
      if (!DEFAULT_TEMPLATES.includes(t.template_key)) {
        response.push({
          key: t.template_key,
          subject: t.subject,
          html_content: t.html_content,
          isCustom: true,
          updated_at: t.updated_at
        });
      }
    }

    res.json(response);
  } catch (error: any) {
    console.error('Error fetching email templates:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener plantilla específica
router.get('/:key', async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const template = await emailTemplateService.getTemplate(key);
    
    if (template) {
      res.json({ ...template, isCustom: true });
    } else {
      const defaultTpl = getDefaultTemplate(key);
      res.json({ 
        template_key: key, 
        subject: defaultTpl.subject, 
        html_content: defaultTpl.html, 
        isCustom: false 
      });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Guardar o actualizar plantilla
router.put('/:key', async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const { subject, html_content } = req.body;

    if (!subject || !html_content) {
      return res.status(400).json({ error: 'Faltan subject o html_content' });
    }

    await emailTemplateService.upsertTemplate(key, subject, html_content);
    res.json({ message: 'Template actualizado con éxito' });
  } catch (error: any) {
    console.error('Error updating email template:', error);
    res.status(500).json({ error: error.message });
  }
});

// Restaurar a default (borrar custom)
router.delete('/:key', async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    await emailTemplateService.deleteTemplate(key);
    res.json({ message: 'Template restaurado a default con éxito' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Enviar prueba con html custom provisto o desde db
router.post('/:key/preview', async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    let { subject, html_content } = req.body;
    
    // Si no los envian en el body, los buscamos en la DB
    if (!subject || !html_content) {
      const template = await emailTemplateService.getTemplate(key);
      if (template) {
        subject = template.subject;
        html_content = template.html_content;
      } else {
        return res.status(400).json({ error: 'No se proveyó contenido y no hay template guardado.' });
      }
    }

    // Datos dummy para el preview
    const dummyData: Record<string, string> = {
      nombre: 'Juan Pérez',
      pedidoId: '12345',
      total: '$ 15,000',
      items: '<li>1x Producto de prueba</li>',
      costoEnvio: '$ 2,500',
      trackingCode: 'TN123456789AR',
      trackingUrl: 'https://www.correoargentino.com.ar/formularios/e-commerce?tracking=TN123456789AR',
      detalles: 'Pedido de prueba enviado desde el panel admin.'
    };

    let processedSubject = subject;
    let processedHtml = html_content;

    for (const [k, v] of Object.entries(dummyData)) {
      const regex = new RegExp(`{{${k}}}`, 'g');
      processedSubject = processedSubject.replace(regex, v);
      processedHtml = processedHtml.replace(regex, v);
    }

    // Usar el email del admin autenticado para el mail de prueba, asumiendo q hay info de admin,
    // o enviarlo a un hardcoded provisto. En este caso pediremos el 'test_email' opcional en el body
    const { test_email } = req.body;
    if (!test_email) {
      return res.status(400).json({ error: 'Por favor provee un email de prueba (test_email) en el body.' });
    }

    const fromEmail = process.env.MAIL_FROM || process.env.SMTP_USER || process.env.MAIL_USER;
    await transporter.sendMail({
      from: `"Fernet Los Horneros" <${fromEmail}>`,
      to: test_email,
      subject: `[PRUEBA] ${processedSubject}`,
      html: processedHtml
    });

    res.json({ message: 'Correo de prueba enviado con éxito a ' + test_email });
  } catch (error: any) {
    console.error('Error sending preview email:', error);
    res.status(500).json({ error: error.message });
  }
});

// Enviar blast masivo
router.post('/:key/send-blast', async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const { audiences, provinces, manualList } = req.body;

    const template = await emailTemplateService.getTemplate(key);
    if (!template) {
      return res.status(404).json({ error: 'Template no encontrado' });
    }

    if ((!audiences || audiences.length === 0) && !manualList) {
      return res.status(400).json({ error: 'Debes seleccionar al menos una audiencia o ingresar una lista manual.' });
    }

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
        SELECT DISTINCT email_cliente as email, nombre_cliente as nombre 
        FROM envios
        WHERE status = 'shipped'
      `;
      if (provinces && provinces.length > 0) {
        q += ` AND provincia IN (?)`;
        replacements.push(provinces);
      }
      queries.push(q);
    }

    let dbRecipients: { email: string, nombre: string }[] = [];
    if (queries.length > 0) {
      const finalQuery = queries.join(' UNION ');
      dbRecipients = await emailTemplateService.getAllTemplates().then(async () => {
        // Usando sequelize desde cualquier lado o importado aquí
        const { QueryTypes } = require('sequelize');
        const sequelize = require('../config/database').default;
        return await sequelize.query(finalQuery, {
          replacements,
          type: QueryTypes.SELECT
        });
      }) as { email: string, nombre: string }[];
    }

    // Procesar lista manual
    const parseManualList = (text?: string) => {
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
    };

    const manualParsed = parseManualList(manualList);

    // Deduplicar
    const finalRecipients: { email: string, nombre: string }[] = [];
    const uniqueEmails = new Set<string>();

    for (const r of dbRecipients) {
      const e = r.email.toLowerCase();
      if (!uniqueEmails.has(e)) {
        uniqueEmails.add(e);
        finalRecipients.push({ email: e, nombre: r.nombre });
      }
    }

    for (const m of manualParsed) {
      const e = m.email;
      if (!uniqueEmails.has(e)) {
        uniqueEmails.add(e);
        finalRecipients.push({ email: e, nombre: m.nombre });
      }
    }

    if (finalRecipients.length === 0) {
      return res.status(400).json({ error: 'No hay destinatarios que coincidan con los filtros o la lista provista.' });
    }

    // Despachar en background para no bloquear la request
    let enviosExitosos = 0;
    
    // Función asíncrona que envía uno por uno (o en lotes)
    const sendBatch = async () => {
      for (const recipient of finalRecipients) {
        try {
          let processedSubject = template.subject;
          let processedHtml = template.html_content;

          // Reemplazar variables comunes
          processedSubject = processedSubject.replace(/{{nombre}}/g, recipient.nombre || 'Cliente');
          processedHtml = processedHtml.replace(/{{nombre}}/g, recipient.nombre || 'Cliente');
          processedSubject = processedSubject.replace(/{{email}}/g, recipient.email);
          processedHtml = processedHtml.replace(/{{email}}/g, recipient.email);

          const fromEmail = process.env.MAIL_FROM || process.env.SMTP_USER || process.env.MAIL_USER;
          await transporter.sendMail({
            from: `"Fernet Los Horneros" <${fromEmail}>`,
            to: recipient.email,
            subject: processedSubject,
            html: processedHtml
          });
          enviosExitosos++;
        } catch (err) {
          console.error(`Error enviando a ${recipient.email}:`, err);
        }
      }
      console.log(`Blast completado: ${enviosExitosos}/${finalRecipients.length} enviados con éxito.`);
    };

    sendBatch(); // Lo ejecutamos sin await para que devuelva la response rapido

    res.json({ message: 'Envío masivo iniciado.', total: finalRecipients.length });
  } catch (error: any) {
    console.error('Error initiating email blast:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

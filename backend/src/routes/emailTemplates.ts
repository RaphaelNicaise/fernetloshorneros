import { Router, Request, Response } from 'express';
import { adminAuth } from '../middleware/adminAuth';
import { emailTemplateService } from '../services/emailTemplateService';
import { transporter } from '../config/mail';
import { getDefaultTemplate } from '../services/mailService';

const router = Router();

// Todos los endpoints protegidos por auth de admin
router.use(adminAuth);

const DEFAULT_TEMPLATES = ['compra_confirmacion', 'envio_tracking', 'notif_vendedor'];

const DEFAULT_SUBJECTS: Record<string, string> = {
  compra_confirmacion: 'Confirmación de tu compra',
  envio_tracking: 'Tu pedido está en camino',
  notif_vendedor: 'Nuevo pedido recibido',
};

// Obtener todas las plantillas (incluyendo defaults vacías)
router.get('/', async (req: Request, res: Response) => {
  try {
    const customTemplates = await emailTemplateService.getAllTemplates();
    const customMap = new Map(customTemplates.map(t => [t.template_key, t]));

    const response = DEFAULT_TEMPLATES.map(key => {
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

    await transporter.sendMail({
      from: `"Fernet Los Horneros" <${process.env.SMTP_USER}>`,
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

export default router;

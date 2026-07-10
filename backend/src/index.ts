import express from 'express';
import path from 'path';
import dotenv from 'dotenv';

import { connectDB } from '@/config/database';
import cors from '@/config/cors';

import paymentsRouter from '@/routes/payments';
import waitlistRouter from '@/routes/waitlist';
import adminRouter from '@/routes/admin';
import productsRouter from '@/routes/products';
import uploadsRouter from '@/routes/uploads';
import ordersRouter from '@/routes/orders';
import shippingRouter from '@/routes/shipping';
import settingsRouter from '@/routes/settings';
import emailTemplatesRouter from '@/routes/emailTemplates';
import couponsRouter from '@/routes/coupons';
import lotesRouter from '@/routes/lotes';
import produccionRouter from '@/routes/produccion';
import audiencesRouter from '@/routes/audiences';
import { produccionService } from '@/services/produccionService';
import backupsRouter from '@/routes/backups';
import cron from 'node-cron';
import { createAutoBackup } from '@/services/backupService';
import { cleanupExpiredOrders } from '@/controllers/paymentsController';

dotenv.config();

const app = express();
const port = process.env.PORT ? Number(process.env.PORT) : 3001;

app.use(cors);
app.use(express.json());

// routes
// archivos estáticos subidos - usar la misma variable de entorno que uploads.ts
const uploadsDir = process.env.UPLOADS_DIR || path.resolve(process.cwd(), 'uploads');
app.use('/uploads', express.static(uploadsDir));
app.use('/uploads', uploadsRouter);

app.get('/', (req, res) => {res.json({ message: 'Backend funcionando' });});
app.get('/health', (req, res) => {res.status(200).json({ status: 'ok' });});
app.use('/waitlist', waitlistRouter);
app.use('/payments', paymentsRouter);
app.use('/admin', adminRouter);
app.use('/products', productsRouter);
app.use('/orders', ordersRouter);
app.use('/shipping', shippingRouter);
app.use('/settings', settingsRouter);
app.use('/email-templates', emailTemplatesRouter);
app.use('/coupons', couponsRouter);
app.use('/lotes', lotesRouter);
app.use('/produccion', produccionRouter);
app.use('/audiences', audiencesRouter);
app.use('/backups', backupsRouter);


const startServer = async () => {
  try {
    await connectDB({ sync: false });
    app.listen(port, '0.0.0.0', () => {
      console.log(`Servidor escuchando en el puerto ${port}`);
      
      // Tarea en segundo plano para limpiar carritos abandonados
      setInterval(() => {
        cleanupExpiredOrders().catch(err => console.error("Error en cron de limpieza:", err));
        produccionService.checkAndCompleteProcesses().catch(err => console.error("Error en cron de produccion:", err));
      }, 60000); // 1 minuto
      
      // Cron job diario para backups a las 3 AM
      cron.schedule('0 3 * * *', async () => {
        try {
          console.log('Iniciando backup automático diario...');
          await createAutoBackup();
          console.log('Backup automático finalizado con éxito.');
        } catch (error) {
          console.error('Error al generar backup automático:', error);
        }
      });
    });
  } catch (error) {
    process.exit(1);
  }
};

startServer();
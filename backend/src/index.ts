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


const startServer = async () => {
  try {
    await connectDB({ sync: false });
    app.listen(port, () => {
      console.log(`Servidor escuchando en el puerto ${port}`);
    });
  } catch (error) {
    process.exit(1);
  }
};

startServer();
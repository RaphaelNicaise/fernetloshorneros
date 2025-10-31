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

dotenv.config();

const app = express();
const port = process.env.PORT ? Number(process.env.PORT) : 3001;

app.use(cors);
app.use(express.json());

// routes
// archivos estáticos subidos
const uploadsDir = path.resolve(process.cwd(), 'uploads');
app.use('/uploads', express.static(uploadsDir));
app.use('/uploads', uploadsRouter);

app.get('/', (req, res) => {res.json({ message: 'Backend funcionando' });});
app.get('/health', (req, res) => {res.status(200).json({ status: 'ok' });});
app.use('/waitlist', waitlistRouter);
app.use('/payments', paymentsRouter);
app.use('/admin', adminRouter);
app.use('/products', productsRouter);

const startServer = async () => {
  try {
    await connectDB({ sync: false });
    app.listen(port, () => {
      console.log(`Servidor escuchando en http://localhost:${port}`);
    });
  } catch (error) {
    process.exit(1);
  }
};

startServer();
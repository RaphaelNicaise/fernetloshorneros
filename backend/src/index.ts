import express from 'express';
import dotenv from 'dotenv';

import { connectDB } from '@/config/database';
import cors from '@/config/cors';

import paymentsRouter from '@/routes/payments';
import waitlistRouter from '@/routes/waitlist';

dotenv.config();

const app = express();
const port = process.env.PORT ? Number(process.env.PORT) : 3001;

app.use(cors);
app.use(express.json());

// routes
app.get('/', (req, res) => {res.json({ message: 'Backend funcionando' });});
app.get('/health', (req, res) => {res.status(200).json({ status: 'ok' });});
app.use('/waitlist', waitlistRouter);
app.use('/payments', paymentsRouter);

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
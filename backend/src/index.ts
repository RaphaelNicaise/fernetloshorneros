import express from 'express';
import dotenv from 'dotenv';

import { connectDB } from '@/config/database';
import router from '@/routes/payments';

import { enviarMailComprador } from '@/services/mailService';

dotenv.config();

const app = express();
const port = process.env.PORT ? Number(process.env.PORT) : 3001;

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Backend funcionando' });
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use('/payments', router);

const startServer = async () => {
  try {
    await connectDB({ sync: false });
    app.listen(port, () => {
      console.log(`🚀 Servidor escuchando en http://localhost:${port}`);
    });
  } catch (error) {
    process.exit(1);
  }
};

startServer();
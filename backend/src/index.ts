import express from 'express';

const app = express();
const port = process.env.PORT ? Number(process.env.PORT) : 3001;

app.get('/', (req, res) => {
  res.json({ message: 'Backend funcionando' });
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});

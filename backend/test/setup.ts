import { connectDB } from '../src/config/database';
import sequelize from '../src/config/database';
import fs from 'fs';
import path from 'path';

beforeAll(async () => {
  // Conectar sin hacer sync, ya que usamos queries crudas
  await connectDB({ sync: false });
  
  // Leer y ejecutar el script SQL inicial
  const sqlPath = path.resolve(__dirname, '../../db/sql/01-init.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  
  // Remover comentarios de linea y bloque
  const cleanSql = sql.replace(/--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
  
  // Separar los statements por ;
  const statements = cleanSql.split(';').filter(stmt => stmt.trim() !== '');
  
  for (const stmt of statements) {
    // Remover CREATE DATABASE y USE ya que estamos conectados a la base de datos de test
    if (stmt.trim().toUpperCase().startsWith('CREATE DATABASE') || stmt.trim().toUpperCase().startsWith('USE')) continue;
    
    try {
        await sequelize.query(stmt);
    } catch (err) {
        console.error("Error ejecutando SQL en setup:", err, stmt);
    }
  }
});

afterAll(async () => {
  await sequelize.close();
});

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("../src/config/database");
const database_2 = __importDefault(require("../src/config/database"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
beforeAll(async () => {
    // Conectar sin hacer sync, ya que usamos queries crudas
    await (0, database_1.connectDB)({ sync: false });
    // Leer y ejecutar el script SQL inicial
    const sqlPath = path_1.default.resolve(__dirname, '../../db/sql/01-init.sql');
    const sql = fs_1.default.readFileSync(sqlPath, 'utf8');
    // Remover comentarios de linea y bloque
    const cleanSql = sql.replace(/--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    // Separar los statements por ;
    const statements = cleanSql.split(';').filter(stmt => stmt.trim() !== '');
    for (const stmt of statements) {
        // Remover CREATE DATABASE y USE ya que estamos conectados a la base de datos de test
        if (stmt.trim().toUpperCase().startsWith('CREATE DATABASE') || stmt.trim().toUpperCase().startsWith('USE'))
            continue;
        try {
            await database_2.default.query(stmt);
        }
        catch (err) {
            console.error("Error ejecutando SQL en setup:", err, stmt);
        }
    }
});
afterAll(async () => {
    await database_2.default.close();
});

import dotenv from "dotenv";
import { Sequelize } from "sequelize";
import path from "path";
import { logger } from "../utils/logger";

dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const {
	DB_HOST = process.env.MYSQL_HOST || "localhost",
	DB_PORT = process.env.MYSQL_PORT || "3306",
	DB_USER = process.env.MYSQL_USER || "root",
	DB_PASSWORD = process.env.MYSQL_ROOT_PASSWORD,
	DB_DIALECT = "mysql",
} = process.env;

const isTest = process.env.NODE_ENV === "test";
const DB_NAME = isTest ? (process.env.MYSQL_DATABASE_TEST || "fernetloshorneros_test") : process.env.MYSQL_DATABASE;

const sequelize = new Sequelize(DB_NAME!, DB_USER!, DB_PASSWORD!, {
	host: DB_HOST,
	port: Number(DB_PORT),
	dialect: DB_DIALECT as any,
	logging: false,
	define: {
		underscored: true,
		timestamps: true,
	},
});

export async function connectDB(options?: { sync?: boolean; force?: boolean; maxAttempts?: number }) {
	const maxAttempts = options?.maxAttempts ?? (isTest ? 1 : 12);
	let attempt = 0;

	while (attempt < maxAttempts) {
		attempt++;
		try {
			await sequelize.authenticate();
			console.log("Sequelize: conexión establecida correctamente");

			if (options?.sync) {
				await sequelize.sync({ force: !!options.force });
			}

			// Asegurar que settings.value sea TEXT para admitir JSONs de múltiples ciudades/tarifas
			try {
				await sequelize.query('ALTER TABLE settings MODIFY COLUMN value TEXT NOT NULL;');
			} catch {
				// Ignorado si ya es TEXT o la tabla aún no existe
			}

			// Safe startup table creation for email campaigns
			try {
				await sequelize.query(`
					CREATE TABLE IF NOT EXISTS email_campanias (
						id INT AUTO_INCREMENT PRIMARY KEY,
						nombre VARCHAR(255) NOT NULL,
						template_key VARCHAR(100) NOT NULL,
						asunto VARCHAR(255) NOT NULL,
						estado ENUM('en_cola', 'procesando', 'pausada', 'completada', 'cancelada') DEFAULT 'en_cola',
						total_destinatarios INT DEFAULT 0,
						enviados_count INT DEFAULT 0,
						fallidos_count INT DEFAULT 0,
						creado_por VARCHAR(100) DEFAULT 'admin',
						fecha_inicio TIMESTAMP NULL DEFAULT NULL,
						fecha_fin TIMESTAMP NULL DEFAULT NULL,
						created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
						updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
						INDEX idx_campanias_estado (estado),
						INDEX idx_campanias_created (created_at)
					);
				`);

				await sequelize.query(`
					CREATE TABLE IF NOT EXISTS email_campania_destinatarios (
						id INT AUTO_INCREMENT PRIMARY KEY,
						campania_id INT NOT NULL,
						email VARCHAR(255) NOT NULL,
						nombre VARCHAR(255) DEFAULT NULL,
						estado ENUM('pendiente', 'enviando', 'enviado', 'fallido') DEFAULT 'pendiente',
						error_mensaje TEXT DEFAULT NULL,
						intentos INT DEFAULT 0,
						enviado_at TIMESTAMP NULL DEFAULT NULL,
						created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
						FOREIGN KEY (campania_id) REFERENCES email_campanias(id) ON DELETE CASCADE,
						INDEX idx_destinatarios_campania_estado (campania_id, estado),
						INDEX idx_destinatarios_estado (estado)
					);
				`);
			} catch (e) {
				logger.warn('Email campaigns tables migration check:', e);
			}

			return sequelize;
		} catch (error) {
			console.error(`Sequelize: intento ${attempt} fallido:`, (error as Error).message ?? error);
			if (attempt >= maxAttempts) {
				console.error("Sequelize: alcanzado numero max de intentos.");
				throw error;
			}
			const baseDelay = 1000; // 1s
			const delay = Math.min(baseDelay * 2 ** (attempt - 1), 20000);
			const jitter = Math.floor(Math.random() * 300);
			const wait = delay + jitter;
			console.log(`Sequelize: reintentando en ${wait}ms...`);
			await new Promise((resolve) => setTimeout(resolve, wait));
		}
	}

	throw new Error("Sequelize: no se pudo conectar a la base de datos");
}

export default sequelize;
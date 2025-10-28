import dotenv from "dotenv";
import { Sequelize } from "sequelize";

dotenv.config();

const {
	DB_HOST = process.env.MYSQL_HOST || "localhost",
	DB_PORT = process.env.MYSQL_PORT || "3306",
	DB_USER = process.env.MYSQL_USER || "root",
	DB_PASSWORD = process.env.MYSQL_ROOT_PASSWORD,
	DB_NAME = process.env.MYSQL_DATABASE,
	DB_DIALECT = "mysql",
} = process.env;

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

export async function connectDB(options?: { sync?: boolean; force?: boolean }) {
	const maxAttempts = 12;
	let attempt = 0;

	while (attempt < maxAttempts) {
		attempt++;
		try {
			await sequelize.authenticate();
			console.log("Sequelize: conexión establecida correctamente");

			if (options?.sync) {
				await sequelize.sync({ force: !!options.force });
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
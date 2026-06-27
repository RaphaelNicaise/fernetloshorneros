const mysqldump = require('mysqldump');
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const DB_HOST = process.env.MYSQL_HOST || "localhost";
const DB_PORT = process.env.MYSQL_PORT || "3306";
const DB_USER = process.env.MYSQL_USER || "root";
const DB_PASSWORD = process.env.MYSQL_ROOT_PASSWORD;
const DB_NAME = process.env.MYSQL_DATABASE;

const BACKUPS_DIR = path.join(__dirname, '../../backups');

// Ensure backups dir exists
if (!fs.existsSync(BACKUPS_DIR)) {
    fs.mkdirSync(BACKUPS_DIR, { recursive: true });
}

export async function createManualBackup(): Promise<string> {
    if (!DB_NAME || !DB_USER) {
        throw new Error("Database configuration is missing");
    }
    const tempFilePath = path.join(BACKUPS_DIR, `backup_manual_${Date.now()}.sql`);
    await mysqldump({
        connection: {
            host: DB_HOST,
            port: Number(DB_PORT),
            user: DB_USER,
            password: DB_PASSWORD || '',
            database: DB_NAME,
        },
        dumpToFile: tempFilePath,
    });
    return tempFilePath;
}

export async function createAutoBackup(): Promise<string> {
    if (!DB_NAME || !DB_USER) {
        throw new Error("Database configuration is missing");
    }
    const autoFilePath = path.join(BACKUPS_DIR, 'daily_backup.sql');
    await mysqldump({
        connection: {
            host: DB_HOST,
            port: Number(DB_PORT),
            user: DB_USER,
            password: DB_PASSWORD || '',
            database: DB_NAME,
        },
        dumpToFile: autoFilePath,
    });
    return autoFilePath;
}

export function getAutoBackupPath(): string | null {
    const autoFilePath = path.join(BACKUPS_DIR, 'daily_backup.sql');
    if (fs.existsSync(autoFilePath)) {
        return autoFilePath;
    }
    return null;
}

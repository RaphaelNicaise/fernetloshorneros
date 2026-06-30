import sequelize from '../config/database';
import { QueryTypes } from 'sequelize';

interface Setting {
    id: number;
    key_name: string;
    value: string;
    created_at: Date;
    updated_at: Date;
}

export const getSetting = async (key: string): Promise<Setting | null> => {
    const results = await sequelize.query<Setting>(
        'SELECT * FROM settings WHERE key_name = ?',
        {
            replacements: [key],
            type: QueryTypes.SELECT
        }
    );
    if (results.length > 0) {
        return results[0];
    }
    return null;
};

export const updateSetting = async (key: string, value: string): Promise<Setting | null> => {
    await sequelize.query(
        'INSERT INTO settings (key_name, value, created_at, updated_at) VALUES (?, ?, NOW(), NOW()) ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = NOW()',
        {
            replacements: [key, value],
            type: QueryTypes.INSERT
        }
    );
    return getSetting(key);
};

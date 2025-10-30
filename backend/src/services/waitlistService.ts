import sequelize from "@/config/database";
import { QueryTypes } from "sequelize";

export type WaitlistInput = {
    nombre: string;
    email: string;
    provincia: string;
};

export const PROVINCIAS_ARGENTINA = ["Buenos Aires", "Catamarca", "Chaco", "Chubut", "Córdoba", "Corrientes", "Entre Ríos", "Formosa", "Jujuy", "La Pampa", "La Rioja", "Mendoza", "Misiones", "Neuquén", "Río Negro", "Salta", "San Juan", "San Luis", "Santa Cruz", "Santa Fe", "Santiago del Estero", "Tierra del Fuego", "Tucumán", "Montevideo Uruguay"];

export async function addToWaitlist({ nombre, email, provincia }: WaitlistInput): Promise<void> {
    if (!PROVINCIAS_ARGENTINA.includes(provincia)) {
        throw new Error("Provincia inválida. Debe ser una de las 23 provincias de Argentina.");
    }
    
    try {
        await sequelize.query(
            `INSERT INTO usuario_lista_espera (nombre, email, provincia) VALUES (:nombre, :email, :provincia)`,
            {
                replacements: { nombre, email, provincia },
                type: QueryTypes.INSERT,
            }
        );
    } catch (err: any) {
        if (err?.original?.code === "ER_DUP_ENTRY") {
            throw new Error("El email ya está registrado en la lista de espera.");
        }
        throw err;
    }
}

export async function getWaitlistUsers(): Promise<WaitlistInput[]> {
    const users = await sequelize.query<WaitlistInput>(
        `SELECT nombre, email, provincia FROM usuario_lista_espera`,
        {
            type: QueryTypes.SELECT,
        }
    );
    return users;
}

export async function getCountWaitlistUsers(): Promise<number> {
    const result = await sequelize.query<{ count: number }>(
        `SELECT COUNT(*) as count FROM usuario_lista_espera`,
        {
            type: QueryTypes.SELECT,
        }
    );
    return result[0].count;
}
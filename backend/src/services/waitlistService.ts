import sequelize from "@/config/database";
import { QueryTypes } from "sequelize";

export type WaitlistInput = {
    nombre: string;
    email: string;
    provincia: string;
};

export type WaitlistRow = {
    id: number;
    nombre: string;
    email: string;
    provincia: string;
    fecha_registro: string; // ISO string
};

export const PROVINCIAS_ARGENTINA = ["Buenos Aires", "Catamarca", "Chaco", "Chubut", "Córdoba", "Corrientes", "Entre Ríos", "Formosa", "Jujuy", "La Pampa", "La Rioja", "Mendoza", "Misiones", "Neuquén", "Río Negro", "Salta", "San Juan", "San Luis", "Santa Cruz", "Santa Fe", "Santiago del Estero", "Tierra del Fuego", "Tucumán"];

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

export async function getWaitlistUsers(): Promise<WaitlistRow[]> {
    const users = await sequelize.query<WaitlistRow>(
        `SELECT id, nombre, email, provincia, fecha_registro FROM usuario_lista_espera ORDER BY fecha_registro DESC`,
        {
            type: QueryTypes.SELECT,
        }
    );
    // Normalizamos fecha a ISO string por simplicidad
    return users.map(u => ({ ...u, fecha_registro: new Date(u.fecha_registro as unknown as string).toISOString() }));
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
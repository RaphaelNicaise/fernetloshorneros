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
export type WaitlistImportRow = {
    id?: number;
    nombre?: string;
    email?: string;
    provincia?: string;
    fecha_registro?: string; // puede venir en CSV
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

// Bulk import de filas desde CSV ya parseado en memoria.
// Devuelve cantidad insertada y duplicados por email.
export async function importWaitlist(rows: WaitlistImportRow[]): Promise<{ inserted: number; duplicates: number; invalid: number; }>{
    if (!Array.isArray(rows) || rows.length === 0) return { inserted: 0, duplicates: 0, invalid: 0 };
    // Limpiamos y normalizamos
    const cleaned = rows.map(r => ({
        nombre: (r.nombre || '').trim(),
        email: (r.email || '').trim().toLowerCase(),
        provincia: (r.provincia || '').trim(),
        fecha_registro: r.fecha_registro ? new Date(r.fecha_registro) : null,
    }));

    // Filtrar inválidos básicos
    const valid = cleaned.filter(r => r.nombre && r.email && r.provincia && PROVINCIAS_ARGENTINA.includes(r.provincia));
    const invalidCount = cleaned.length - valid.length;
    if (valid.length === 0) return { inserted: 0, duplicates: 0, invalid: invalidCount };

    // Obtener existentes por email
    const emails = valid.map(v => v.email);
    const existing = await sequelize.query<{ email: string }>(
        `SELECT email FROM usuario_lista_espera WHERE email IN (:emails)`,
        { replacements: { emails }, type: QueryTypes.SELECT }
    );
    const existingSet = new Set(existing.map(e => e.email.toLowerCase()));
    const toInsert = valid.filter(v => !existingSet.has(v.email));
    const duplicates = valid.length - toInsert.length;
    if (toInsert.length === 0) return { inserted: 0, duplicates, invalid: invalidCount };

    // Insert en lotes
    const now = new Date();
    const rowsSql = toInsert.map(_ => '( :nombre, :email, :provincia, :fecha_registro )').join(',');
    // Sequelize no soporta multi-values con replacements distintos fácilmente.
    // Usamos ejecución por cada fila para simplicidad (menos eficiente pero claro).
    let inserted = 0;
    for (const r of toInsert) {
        try {
            await sequelize.query(
                `INSERT INTO usuario_lista_espera (nombre, email, provincia, fecha_registro) VALUES (:nombre, :email, :provincia, :fecha_registro)`,
                {
                    replacements: {
                        nombre: r.nombre,
                        email: r.email,
                        provincia: r.provincia,
                        fecha_registro: (r.fecha_registro || now).toISOString().slice(0, 19).replace('T',' ')
                    },
                    type: QueryTypes.INSERT,
                }
            );
            inserted++;
        } catch(err:any){
            if (err?.original?.code === 'ER_DUP_ENTRY') {
                // Carrera: otro proceso insertó
                continue;
            } else throw err;
        }
    }
    return { inserted, duplicates, invalid: invalidCount };
}
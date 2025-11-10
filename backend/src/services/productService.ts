import sequelize from "@/config/database";
import { QueryTypes } from "sequelize";

export type Product = {
    id: string;
    name: string;
    description: string;
    price: number;
    image: string;
    limite: number; // 0 = sin límite
    status: 'disponible' | 'proximamente' | 'agotado';
}

export async function getAllProducts(): Promise<Product[]> {
    const products = await sequelize.query<Product>(
        `SELECT id, name, description, price, image, limite, status FROM productos ORDER BY name ASC`,
        {
            type: QueryTypes.SELECT,
        }
    );
    // Aseguramos limite numérico
    return products.map(p => ({ ...p, limite: Number(p.limite) || 0 }));
}

export async function getProductById(id: string): Promise<Product | null> {
    const products = await sequelize.query<Product>(
        `SELECT id, name, description, price, image, limite, status FROM productos WHERE id = :id`,
        {
            replacements: { id },
            type: QueryTypes.SELECT,
        }
    );
    if (products.length === 0) return null;
    const p = products[0];
    return { ...p, limite: Number(p.limite) || 0 };
}

export async function createProduct(product: Product): Promise<void> {
    await sequelize.query(
        `INSERT INTO productos (id, name, description, price, image, limite, status) VALUES (:id, :name, :description, :price, :image, :limite, :status)`,
        {
            replacements: product,
            type: QueryTypes.INSERT,
        }
    );
}

export async function updateProduct(product: Product): Promise<void> {
    await sequelize.query(
        `UPDATE productos SET name = :name, description = :description, price = :price, image = :image, limite = :limite, status = :status WHERE id = :id`,
        {
            replacements: product,
            type: QueryTypes.UPDATE,
        }
    );
}

export async function deleteProduct(id: string): Promise<void> {
    await sequelize.query(
        `DELETE FROM productos WHERE id = :id`,
        {
            replacements: { id },
            type: QueryTypes.DELETE,
        }
    );
}
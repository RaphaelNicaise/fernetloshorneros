import sequelize from "@/config/database";
import { QueryTypes } from "sequelize";

export type Product = {
    id: string;
    name: string;
    description: string;
    price: number;
    image: string;
    limite: number; // 0 = sin límite
    stock: number; // cantidad disponible
    status: 'disponible' | 'proximamente' | 'agotado';
}

export async function getAllProducts(): Promise<Product[]> {
    const products = await sequelize.query<Product>(
        `SELECT id, name, description, price, image, limite, stock, status FROM productos ORDER BY name ASC`,
        {
            type: QueryTypes.SELECT,
        }
    );
    // Aseguramos limite y stock numéricos
    return products.map(p => ({ ...p, limite: Number(p.limite) || 0, stock: Number(p.stock) || 0 }));
}

export async function getProductById(id: string): Promise<Product | null> {
    const products = await sequelize.query<Product>(
        `SELECT id, name, description, price, image, limite, stock, status FROM productos WHERE id = :id`,
        {
            replacements: { id },
            type: QueryTypes.SELECT,
        }
    );
    if (products.length === 0) return null;
    const p = products[0];
    return { ...p, limite: Number(p.limite) || 0, stock: Number(p.stock) || 0 };
}

export async function createProduct(product: Product): Promise<void> {
    await sequelize.query(
        `INSERT INTO productos (id, name, description, price, image, limite, stock, status) VALUES (:id, :name, :description, :price, :image, :limite, :stock, :status)`,
        {
            replacements: product,
            type: QueryTypes.INSERT,
        }
    );
}

export async function updateProduct(product: Product): Promise<void> {
    await sequelize.query(
        `UPDATE productos SET name = :name, description = :description, price = :price, image = :image, limite = :limite, stock = :stock, status = :status WHERE id = :id`,
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

/**
 * Descuenta el stock de un producto y actualiza el status a 'agotado' si llega a 0
 * @returns El nuevo stock del producto
 */
export async function decreaseStock(id: string, quantity: number): Promise<number> {
    // Primero obtenemos el producto para verificar el stock actual
    const product = await getProductById(id);
    if (!product) {
        throw new Error(`Producto ${id} no encontrado`);
    }

    const newStock = Math.max(0, product.stock - quantity);
    const newStatus = newStock === 0 ? 'agotado' : product.status;

    await sequelize.query(
        `UPDATE productos SET stock = :newStock, status = :newStatus WHERE id = :id`,
        {
            replacements: { id, newStock, newStatus },
            type: QueryTypes.UPDATE,
        }
    );

    return newStock;
}

/**
 * Actualiza solo el stock de un producto
 */
export async function updateStock(id: string, stock: number): Promise<void> {
    const newStatus = stock === 0 ? 'agotado' : undefined;
    
    if (newStatus) {
        await sequelize.query(
            `UPDATE productos SET stock = :stock, status = :newStatus WHERE id = :id`,
            {
                replacements: { id, stock, newStatus },
                type: QueryTypes.UPDATE,
            }
        );
    } else {
        await sequelize.query(
            `UPDATE productos SET stock = :stock WHERE id = :id`,
            {
                replacements: { id, stock },
                type: QueryTypes.UPDATE,
            }
        );
    }
}
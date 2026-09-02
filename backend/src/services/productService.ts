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
    let newStatus = product.status;
    if (product.stock === 0 && product.status !== 'proximamente') {
        newStatus = 'agotado';
    } else if (product.stock > 0 && product.status === 'agotado') {
        newStatus = 'disponible';
    }

    await sequelize.query(
        `UPDATE productos SET name = :name, description = :description, price = :price, image = :image, limite = :limite, stock = :stock, status = :status WHERE id = :id`,
        {
            replacements: { ...product, status: newStatus },
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
 * Descuenta el stock de un producto de forma atómica en SQL y actualiza el status a 'agotado' si llega a 0
 * @returns El nuevo stock del producto
 */
export async function decreaseStock(id: string, quantity: number): Promise<number> {
    const [, metadata]: any = await sequelize.query(
        `UPDATE productos 
         SET stock = stock - :quantity,
             status = CASE WHEN (stock - :quantity) <= 0 AND status != 'proximamente' THEN 'agotado' ELSE status END
         WHERE id = :id AND stock >= :quantity`,
        {
            replacements: { id, quantity },
            type: QueryTypes.UPDATE,
        }
    );

    const affectedRows = typeof metadata === 'number' ? metadata : (metadata?.affectedRows ?? 0);
    if (affectedRows === 0) {
        const product = await getProductById(id);
        if (!product) {
            throw new Error(`Producto ${id} no encontrado`);
        }
        throw new Error(`Stock insuficiente para ${product.name} (disponible: ${product.stock})`);
    }

    const updated = await getProductById(id);
    return updated ? updated.stock : 0;
}

/**
 * Actualiza solo el stock de un producto
 */
export async function updateStock(id: string, stock: number): Promise<void> {
    const product = await getProductById(id);
    if (!product) return;

    let newStatus = product.status;
    if (stock === 0 && product.status !== 'proximamente') {
        newStatus = 'agotado';
    } else if (stock > 0 && product.status === 'agotado') {
        newStatus = 'disponible';
    }

    await sequelize.query(
        `UPDATE productos SET stock = :stock, status = :newStatus WHERE id = :id`,
        {
            replacements: { id, stock, newStatus },
            type: QueryTypes.UPDATE,
        }
    );
}

/**
 * Incrementa el stock de un producto (para reponer reservas expiradas o pagos fallidos) de forma atómica
 * También actualiza el status a 'disponible' si estaba 'agotado'
 */
export async function increaseStock(id: string, quantity: number): Promise<number> {
    await sequelize.query(
        `UPDATE productos 
         SET stock = stock + :quantity,
             status = CASE WHEN status = 'agotado' AND (stock + :quantity) > 0 THEN 'disponible' ELSE status END
         WHERE id = :id`,
        {
            replacements: { id, quantity },
            type: QueryTypes.UPDATE,
        }
    );

    const updated = await getProductById(id);
    return updated ? updated.stock : 0;
}
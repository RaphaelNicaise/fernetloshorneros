import { 
    createProduct, 
    getProductById, 
    getAllProducts, 
    updateProduct, 
    deleteProduct, 
    decreaseStock, 
    increaseStock,
    Product
} from "../productService";

describe("productService Integration Tests", () => {
    
    // Asumimos que el script de setup ya corrió y creó la tabla `productos`

    const testProduct: Product = {
        id: "test-prod-1",
        name: "Producto Test",
        description: "Un producto de prueba",
        price: 1500,
        image: "test.jpg",
        limite: 0,
        stock: 10,
        status: "disponible"
    };

    beforeEach(async () => {
        // Limpiamos antes de cada test para asegurar asilamiento
        try {
            await deleteProduct(testProduct.id);
        } catch (e) {
            // Ignorar error si no existe
        }
    });

    it("should create and retrieve a product", async () => {
        await createProduct(testProduct);
        
        const retrieved = await getProductById(testProduct.id);
        expect(retrieved).not.toBeNull();
        expect(retrieved?.id).toBe(testProduct.id);
        expect(retrieved?.name).toBe(testProduct.name);
        expect(retrieved?.stock).toBe(testProduct.stock);
    });

    it("should update a product and its stock", async () => {
        await createProduct(testProduct);
        
        const updatedProduct = { ...testProduct, price: 2000, name: "Producto Actualizado" };
        await updateProduct(updatedProduct);
        
        const retrieved = await getProductById(testProduct.id);
        expect(retrieved?.price).toBe("2000.00"); // MySQL DECIMAL devuelve string usualmente en crudo o numero en Sequelize dependiendo de la config
        expect(retrieved?.name).toBe("Producto Actualizado");
    });

    it("should decrease stock correctly and change status if stock reaches 0", async () => {
        const prod = { ...testProduct, stock: 2, id: "test-prod-decrease" };
        await createProduct(prod);

        const newStock = await decreaseStock(prod.id, 2);
        expect(newStock).toBe(0);

        const retrieved = await getProductById(prod.id);
        expect(retrieved?.stock).toBe(0);
        expect(retrieved?.status).toBe("agotado");
        
        await deleteProduct(prod.id);
    });

    it("should increase stock and change status to disponible if it was agotado", async () => {
        const prod = { ...testProduct, stock: 0, status: "agotado" as const, id: "test-prod-increase" };
        await createProduct(prod);

        const newStock = await increaseStock(prod.id, 5);
        expect(newStock).toBe(5);

        const retrieved = await getProductById(prod.id);
        expect(retrieved?.stock).toBe(5);
        expect(retrieved?.status).toBe("disponible");
        
        await deleteProduct(prod.id);
    });
});

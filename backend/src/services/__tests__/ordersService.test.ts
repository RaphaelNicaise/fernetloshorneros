import sequelize, { connectDB } from "@/config/database";
import {
    createOrder,
    manualUpdateOrderStatus,
    updateOrderDetails,
    getOrderById,
    getEnvioByOrderId,
    getOrderItems
} from "../ordersService";

beforeAll(async () => {
    await connectDB({ sync: false });
});

afterAll(async () => {
    await sequelize.close();
});

describe("Orders Service", () => {
    beforeEach(async () => {
        // Limpiar tablas y crear datos de prueba
        await sequelize.query("DELETE FROM pagos");
        await sequelize.query("DELETE FROM envios");
        await sequelize.query("DELETE FROM pedido_items");
        await sequelize.query("DELETE FROM pedidos");
        await sequelize.query("DELETE FROM productos");

        // Insertar un producto de prueba
        await sequelize.query(`
            INSERT INTO productos (id, title, price, stock, status, categoria) 
            VALUES ('test-prod-1', 'Producto de Prueba', 1000, 10, 'disponible', 'merchandising')
        `);
    });

    it("should create an order successfully with items and shipping", async () => {
        const input = {
            total: 1000,
            external_reference: "ext-ref-1",
            items: [
                {
                    id_producto: "test-prod-1",
                    title: "Producto de Prueba",
                    cantidad: 2,
                    precio_unitario: 500
                }
            ],
            shipping_info: {
                cost: 0,
                rate_id: "rate-1",
                service_type: "delivery",
                contact: {
                    nombre: "Juan Perez",
                    email: "juan@example.com",
                    dni: "12345678",
                    telefono: "123456789"
                },
                address: {
                    provincia: "Buenos Aires",
                    ciudad: "La Plata",
                    codigoPostal: "1900",
                    direccion: "Calle Falsa",
                    numero: "123"
                }
            }
        };

        const order = await createOrder(input);

        expect(order).toBeDefined();
        expect(order.total).toBe(1000);
        expect(order.status).toBe("pending");
        expect(order.external_reference).toBe("ext-ref-1");

        const items = await getOrderItems(order.id);
        expect(items.length).toBe(1);
        expect(items[0].id_producto).toBe("test-prod-1");
        expect(items[0].cantidad).toBe(2);

        const envio = await getEnvioByOrderId(order.id);
        expect(envio).toBeDefined();
        expect(envio?.nombre_cliente).toBe("Juan Perez");
        expect(envio?.ciudad).toBe("La Plata");
    });

    it("should manually update order status and restore stock if cancelled", async () => {
        // Create order
        const order = await createOrder({
            total: 1000,
            external_reference: "ext-ref-cancel",
            items: [{ id_producto: "test-prod-1", title: "Test", cantidad: 2, precio_unitario: 500 }],
        });

        // Reserve stock
        await sequelize.query("UPDATE pedidos SET stock_reserved = 1 WHERE id = ?", { replacements: [order.id] });
        await sequelize.query("UPDATE productos SET stock = 8 WHERE id = 'test-prod-1'");

        // Manual update to cancel and restore stock
        await manualUpdateOrderStatus(order.id, "cancelado", null, true);

        const updatedOrder = await getOrderById(order.id);
        expect(updatedOrder?.status).toBe("cancelled");

        const productRow: any = await sequelize.query("SELECT stock FROM productos WHERE id = 'test-prod-1'", { type: sequelize.QueryTypes.SELECT });
        expect(productRow[0].stock).toBe(10); // 8 + 2
    });
});

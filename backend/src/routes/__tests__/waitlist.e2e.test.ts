import request from "supertest";
import express from "express";
import waitlistRouter from "../waitlist";
import sequelize from "@/config/database";

// Mockear el servicio de mail para evitar enviar correos reales durante las pruebas
jest.mock("@/services/mailService", () => ({
    enviarMailListaEspera: jest.fn().mockResolvedValue(true)
}));

const app = express();
app.use(express.json());
app.use("/waitlist", waitlistRouter);

describe("Waitlist E2E Tests", () => {
    
    beforeAll(async () => {
        // Setup is handled by test/setup.ts
        // Limpiamos la tabla antes de arrancar los tests de esta suite
        await sequelize.query("DELETE FROM usuario_lista_espera");
    });

    afterEach(async () => {
        await sequelize.query("DELETE FROM usuario_lista_espera");
    });

    it("should register a new user in the waitlist successfully", async () => {
        const payload = {
            nombre: "Juan Perez",
            email: "juan.perez.test@example.com",
            provincia: "Buenos Aires"
        };

        const res = await request(app)
            .post("/waitlist/")
            .send(payload);

        expect(res.status).toBe(201);
        expect(res.body.message).toBe("Registrado en lista de espera exitosamente");

        // Verify in DB
        const [results] = await sequelize.query("SELECT * FROM usuario_lista_espera WHERE email = ?", {
            replacements: [payload.email]
        });
        
        expect((results as any[]).length).toBe(1);
        expect((results as any[])[0].nombre).toBe(payload.nombre);
    });

    it("should return 400 if required fields are missing", async () => {
        const payload = {
            nombre: "Juan Perez"
            // Missing email and provincia
        };

        const res = await request(app)
            .post("/waitlist/")
            .send(payload);

        expect(res.status).toBe(400);
        expect(res.body.error).toBe("Faltan campos requeridos");
    });

    it("should return 409 if email is already registered", async () => {
        const payload = {
            nombre: "Maria Garcia",
            email: "maria.garcia.test@example.com",
            provincia: "Córdoba"
        };

        // First registration
        await request(app).post("/waitlist/").send(payload);

        // Second registration with same email
        const res2 = await request(app)
            .post("/waitlist/")
            .send(payload);

        expect(res2.status).toBe(409);
        expect(res2.body.error).toBe("El email ya está registrado en la lista de espera.");
    });
});

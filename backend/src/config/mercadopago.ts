import { MercadoPagoConfig, Preference } from "mercadopago";
import dotenv from "dotenv";

dotenv.config();

const client = new MercadoPagoConfig({
  accessToken: process.env.TEST_MP_ACCESS_TOKEN!,
});

export const preferenceClient = new Preference(client);
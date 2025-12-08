import dotenv from 'dotenv';

dotenv.config();

const ZIPNOVA_API_KEY = process.env.ZIPNOVA_API_KEY;
const ZIPNOVA_API_SECRET = process.env.ZIPNOVA_API_SECRET;
const ZIPNOVA_BASE_URL = process.env.ZIPNOVA_BASE_URL;

export const getZipnovaHeaders = () => {
  if (!ZIPNOVA_API_KEY || !ZIPNOVA_API_SECRET) {
    throw new Error("FATAL: Faltan credenciales de Zipnova en el archivo .env");
  }

  // el basic auth pide credenciales de user password en base64
  const credentials = `${ZIPNOVA_API_KEY}:${ZIPNOVA_API_SECRET}`;
  const encodedCredentials = Buffer.from(credentials).toString('base64');

  return {
    'Authorization': `Basic ${encodedCredentials}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };
};
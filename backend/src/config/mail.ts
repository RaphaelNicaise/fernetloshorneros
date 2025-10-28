import nodemailer from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';
import dotenv from 'dotenv';

dotenv.config();

const SMTP_HOST = process.env.SMTP_HOST ?? '';
const SMTP_PORT = Number(process.env.SMTP_PORT ?? '587');
const MAIL_USER = process.env.MAIL_USER ?? '';
const MAIL_PASSWORD = process.env.MAIL_PASSWORD ?? '';

const transportOptions: SMTPTransport.Options = {
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465,
  auth: MAIL_USER && MAIL_PASSWORD ? { user: MAIL_USER, pass: MAIL_PASSWORD } : undefined,
};

export const transporter = nodemailer.createTransport(transportOptions);
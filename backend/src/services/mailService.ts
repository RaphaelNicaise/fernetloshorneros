import { transporter } from '@/config/mail';
//ZIPNOVA SE ENCARGA DE ENVIAR LOS MAILS
export async function enviarMailComprador(email: string, nombre: string, trackingUrl: string, pedidoId: string) {
  await transporter.sendMail({
    from: `"Los Horneros - Fernet" <${process.env.MAIL_USER}>`,
    to: email,
    subject: `Tu pedido ${pedidoId} ha sido enviado`,
    html: `<p>Hola ${nombre}, tu pedido ${pedidoId} ha sido enviado. Tracking: <a href="${trackingUrl}">Ver</a></p>`,
  });
}

export async function enviarMailVendedor(email: string, pedidoId: string, detalles: string) {
  await transporter.sendMail({
    from: `"Los Horneros - Fernet" <${process.env.MAIL_USER}>`,
    to: email,
    subject: `Se realizó una venta: Pedido ${pedidoId}`,
    html: `<p>Pedido ${pedidoId} registrado.</p><pre>${detalles}</pre>`,
  });
}
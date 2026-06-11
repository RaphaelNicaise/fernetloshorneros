import { transporter } from '@/config/mail';
import { OrderItem } from './ordersService';

/**
 * Genera el contenedor HTML común para mantener una estética unificada de marca (premium dark mode)
 */
function getEmailWrapper(title: string, contentHtml: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
        body {
          margin: 0;
          padding: 0;
          background-color: #1a1512;
          font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
          color: #f5f0eb;
          -webkit-font-smoothing: antialiased;
        }
        table {
          border-collapse: collapse;
          width: 100%;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #241d1a;
          border-radius: 8px;
          overflow: hidden;
          border: 1px solid #3d2f29;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.4);
        }
        .header {
          background-color: #150f0d;
          padding: 30px 20px;
          text-align: center;
          border-bottom: 2px solid #c9933b;
        }
        .header h1 {
          color: #c9933b;
          font-family: 'Georgia', serif;
          margin: 0;
          font-size: 26px;
          letter-spacing: 2px;
          text-transform: uppercase;
        }
        .header p {
          color: #a39081;
          margin: 5px 0 0 0;
          font-size: 11px;
          letter-spacing: 3px;
          text-transform: uppercase;
        }
        .content {
          padding: 35px 25px;
          text-align: left;
        }
        .content h2 {
          color: #c9933b;
          font-family: 'Georgia', serif;
          font-size: 20px;
          margin-top: 0;
          margin-bottom: 20px;
        }
        .content p {
          line-height: 1.6;
          color: #d1c7bd;
          font-size: 15px;
          margin-top: 0;
          margin-bottom: 20px;
        }
        .button-container {
          text-align: center;
          margin: 30px 0;
        }
        .btn {
          background-color: #c9933b;
          color: #150f0d !important;
          padding: 12px 28px;
          text-decoration: none;
          font-weight: bold;
          border-radius: 4px;
          display: inline-block;
          font-size: 15px;
        }
        .btn:hover {
          background-color: #dfa84a;
        }
        .order-table {
          margin: 25px 0;
          border-top: 1px solid #3d2f29;
          border-bottom: 1px solid #3d2f29;
        }
        .order-table th {
          text-align: left;
          padding: 12px 8px;
          color: #a39081;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 1px;
          border-bottom: 1px solid #3d2f29;
        }
        .order-table td {
          padding: 12px 8px;
          font-size: 14px;
          border-bottom: 1px solid #2d231f;
          color: #e6ded6;
        }
        .order-table tr:last-child td {
          border-bottom: none;
        }
        .summary-row td {
          font-weight: bold;
          padding-top: 12px;
          padding-bottom: 12px;
          font-size: 15px;
        }
        .summary-row .label {
          color: #a39081;
          text-align: right;
        }
        .summary-row .value {
          color: #c9933b;
          text-align: right;
        }
        .tracking-box {
          background-color: #150f0d;
          border: 1px dashed #c9933b;
          padding: 15px;
          border-radius: 6px;
          text-align: center;
          margin: 25px 0;
        }
        .tracking-box code {
          font-family: 'Courier New', Courier, monospace;
          font-size: 20px;
          color: #c9933b;
          font-weight: bold;
          letter-spacing: 1px;
        }
        .footer {
          background-color: #150f0d;
          padding: 25px;
          text-align: center;
          border-top: 1px solid #2d231f;
          font-size: 12px;
          color: #6e5e54;
        }
        .footer p {
          margin: 5px 0;
        }
      </style>
    </head>
    <body>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #1a1512; padding: 20px 0; margin: 0;">
        <tr>
          <td align="center">
            <div class="container">
              <div class="header">
                <h1>Los Horneros</h1>
                <p>Fernet de Autor</p>
              </div>
              <div class="content">
                ${contentHtml}
              </div>
              <div class="footer">
                <p>Este correo electrónico fue enviado de forma automática en relación con tu transacción en Fernet Los Horneros.</p>
                <p>&copy; ${new Date().getFullYear()} Fernet Los Horneros. Todos los derechos reservados.</p>
              </div>
            </div>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

/**
 * Envia el correo de confirmación de compra ("Gracias por tu compra")
 */
export async function enviarMailConfirmacionCompra(
  email: string,
  nombre: string,
  pedidoId: string,
  items: OrderItem[],
  total: number,
  costoEnvio: number
) {
  // Construir filas de la tabla de items
  const itemsHtml = items.map(item => `
    <tr>
      <td style="text-align: left;">${item.title}</td>
      <td style="text-align: center;">${item.cantidad}</td>
      <td style="text-align: right; font-weight: 500;">$${Number(item.precio_unitario * item.cantidad).toFixed(2)}</td>
    </tr>
  `).join('');

  const subtotal = total - costoEnvio;

  const contentHtml = `
    <h2>¡Gracias por tu compra, ${nombre}!</h2>
    <p>Hemos registrado tu pago para el pedido <strong>#${pedidoId}</strong> de forma exitosa y ya estamos trabajando en su preparación.</p>
    
    <p style="background-color: #2d231f; border-left: 3px solid #c9933b; padding: 12px 15px; border-radius: 4px; color: #dfa84a; font-size: 14px;">
      <strong>Información de Envío:</strong> Una vez que despachemos tu paquete, te llegará otro correo con el enlace y código de seguimiento de Correo Argentino para que puedas seguir tu envío en tiempo real.
    </p>

    <h3 style="color: #c9933b; font-family: 'Georgia', serif; font-size: 16px; margin-top: 30px; margin-bottom: 10px; border-bottom: 1px solid #3d2f29; padding-bottom: 5px;">Detalle de Compra</h3>
    <table class="order-table" cellspacing="0" cellpadding="0">
      <thead>
        <tr>
          <th style="width: 60%; text-align: left;">Producto</th>
          <th style="width: 15%; text-align: center;">Cant.</th>
          <th style="width: 25%; text-align: right;">Subtotal</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
        <tr class="summary-row">
          <td colspan="2" class="label">Subtotal:</td>
          <td class="value">$${Number(subtotal).toFixed(2)}</td>
        </tr>
        <tr class="summary-row">
          <td colspan="2" class="label" style="padding-top: 5px; padding-bottom: 5px;">Envío:</td>
          <td class="value" style="padding-top: 5px; padding-bottom: 5px;">$${Number(costoEnvio).toFixed(2)}</td>
        </tr>
        <tr class="summary-row" style="border-top: 1px solid #3d2f29;">
          <td colspan="2" class="label" style="font-size: 18px; color: #f5f0eb;">Total:</td>
          <td class="value" style="font-size: 18px; color: #dfa84a;">$${Number(total).toFixed(2)}</td>
        </tr>
      </tbody>
    </table>
    
    <p style="margin-top: 30px; font-size: 14px; color: #a39081; text-align: center;">
      Si tenés alguna consulta, no dudes en responder directamente a este mail.
    </p>
  `;

  const html = getEmailWrapper(`Confirmación de Pago - Pedido #${pedidoId}`, contentHtml);

  await transporter.sendMail({
    from: `"Fernet Los Horneros" <${process.env.MAIL_USER}>`,
    to: email,
    subject: `¡Gracias por tu compra! - Pedido #${pedidoId}`,
    html,
  });
}

/**
 * Envia el correo con la información de tracking de Correo Argentino cuando se despacha el pedido
 */
export async function enviarMailComprador(
  email: string,
  nombre: string,
  trackingUrl: string,
  pedidoId: string,
  trackingCode?: string
) {
  const contentHtml = `
    <h2>¡Tu pedido #${pedidoId} está en camino!</h2>
    <p>Hola ${nombre}, queremos avisarte que tu compra de Fernet Los Horneros ya fue despachada y se encuentra en viaje hacia tu destino.</p>
    
    <p>Espero que lo disfrutes y que compartas este gran fernet de autor con los tuyos tanto como nosotros disfrutamos elaborándolo para vos.</p>

    <div class="tracking-box">
      <p style="margin: 0 0 5px 0; font-size: 11px; text-transform: uppercase; color: #a39081; letter-spacing: 1px;">Código de Seguimiento</p>
      <code>${trackingCode || 'Código cargado en enlace'}</code>
    </div>

    <div class="button-container">
      <a href="${trackingUrl}" target="_blank" class="btn">Rastrear mi pedido</a>
    </div>

    <p style="font-size: 13px; color: #a39081; text-align: center;">
      También podés seguir el envío ingresando el código en el portal de Correo Argentino.
    </p>
  `;

  const html = getEmailWrapper(`Tu pedido #${pedidoId} ha sido enviado`, contentHtml);

  await transporter.sendMail({
    from: `"Fernet Los Horneros" <${process.env.MAIL_USER}>`,
    to: email,
    subject: `Tu pedido #${pedidoId} ha sido enviado - ¡Espero que lo disfrutes!`,
    html,
  });
}

/**
 * Mail heredado para notificar al vendedor de una venta
 */
export async function enviarMailVendedor(email: string, pedidoId: string, detalles: string) {
  await transporter.sendMail({
    from: `"Fernet Los Horneros" <${process.env.MAIL_USER}>`,
    to: email,
    subject: `Se realizó una venta: Pedido ${pedidoId}`,
    html: `<p>Pedido ${pedidoId} registrado.</p><pre>${detalles}</pre>`,
  });
}
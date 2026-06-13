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
          background-color: #0b0a07;
          font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
          color: #ffffff;
          -webkit-font-smoothing: antialiased;
        }
        table {
          border-collapse: collapse;
          width: 100%;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #14120f;
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid #ffffff15;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.8);
        }
        .header {
          background-color: #0b0a07;
          padding: 40px 20px;
          text-align: center;
          border-bottom: 1px solid #AA6F3B;
        }
        .header h1 {
          color: #ffffff;
          font-family: 'Georgia', serif;
          margin: 0;
          font-size: 28px;
          letter-spacing: 2px;
          text-transform: uppercase;
        }
        .header p {
          color: #AA6F3B;
          margin: 8px 0 0 0;
          font-size: 12px;
          letter-spacing: 4px;
          text-transform: uppercase;
          font-weight: bold;
        }
        .content {
          padding: 40px 30px;
          text-align: left;
        }
        .content h2 {
          color: #ffffff;
          font-family: 'Georgia', serif;
          font-size: 22px;
          margin-top: 0;
          margin-bottom: 20px;
        }
        .content p {
          line-height: 1.6;
          color: #cccccc;
          font-size: 15px;
          margin-top: 0;
          margin-bottom: 20px;
        }
        .button-container {
          text-align: center;
          margin: 35px 0;
        }
        .btn {
          background-color: #AA6F3B;
          color: #ffffff !important;
          padding: 14px 32px;
          text-decoration: none;
          font-weight: bold;
          border-radius: 6px;
          display: inline-block;
          font-size: 15px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .order-table {
          margin: 30px 0;
          border-top: 1px solid #ffffff15;
          border-bottom: 1px solid #ffffff15;
        }
        .order-table th {
          text-align: left;
          padding: 15px 8px;
          color: #AA6F3B;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 1px;
          border-bottom: 1px solid #ffffff15;
        }
        .order-table td {
          padding: 15px 8px;
          font-size: 14px;
          border-bottom: 1px solid #ffffff0a;
          color: #eeeeee;
        }
        .order-table tr:last-child td {
          border-bottom: none;
        }
        .summary-row td {
          font-weight: bold;
          padding-top: 15px;
          padding-bottom: 15px;
          font-size: 15px;
        }
        .summary-row .label {
          color: #aaaaaa;
          text-align: right;
        }
        .summary-row .value {
          color: #ffffff;
          text-align: right;
        }
        .tracking-box {
          background-color: #0b0a07;
          border: 1px dashed #AA6F3B;
          padding: 20px;
          border-radius: 8px;
          text-align: center;
          margin: 30px 0;
        }
        .tracking-box code {
          font-family: 'Courier New', Courier, monospace;
          font-size: 22px;
          color: #AA6F3B;
          font-weight: bold;
          letter-spacing: 2px;
        }
        .footer {
          background-color: #0b0a07;
          padding: 30px;
          text-align: center;
          border-top: 1px solid #ffffff15;
          font-size: 12px;
          color: #666666;
        }
        .footer p {
          margin: 5px 0;
        }
      </style>
    </head>
    <body>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #0b0a07; padding: 40px 0; margin: 0;">
        <tr>
          <td align="center">
            <div class="container">
              <div class="header" style="padding: 0; overflow: hidden;">
                <!-- Hero Banner -->
                <div style="width: 100%; max-height: 120px; overflow: hidden; background-color: #1a1713;">
                  <img src="${process.env.FRONTEND_URL || 'https://fernetloshorneros.com.ar'}/fernet1.webp" alt="Botella Los Horneros" style="width: 100%; min-height: 120px; object-fit: cover; object-position: 58% 42%; display: block; opacity: 0.8;" />
                </div>
                <!-- Logos -->
                <div style="padding: 30px 20px 0 20px;">
                  <div style="text-align: center; margin-bottom: 5px;">
                    <img src="${process.env.FRONTEND_URL || 'https://fernetloshorneros.com.ar'}/logonuevo.webp" alt="Pájaro" style="height: 40px; width: auto; display: inline-block; vertical-align: middle; margin-right: 10px; filter: invert(1); opacity: 0.9;" />
                    <img src="${process.env.FRONTEND_URL || 'https://fernetloshorneros.com.ar'}/logo-fernet.webp" alt="Los Horneros" style="height: 40px; width: auto; display: inline-block; vertical-align: middle; filter: invert(1); opacity: 0.9;" />
                  </div>
                  <p>Fernet de Autor</p>
                </div>
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
import { jsPDF } from "jspdf";

export type LabelOrder = {
  id: number;
  nombre_cliente: string | null;
  direccion: string | null;
  numero: string | null;
  extra: string | null;
  ciudad: string | null;
  provincia: string | null;
  codigo_postal: string | null;
  telefono_cliente: string | null;
  email_cliente: string | null;
  tracking_code: string | null;
};

// Configuración del remitente
const REMITENTE = {
  nombre: "Fernet Los Horneros",
  direccion: "Av. Ejemplo 123", // TODO: Rellenar con la real
  ciudad: "Córdoba",
  provincia: "Córdoba",
  codigo_postal: "X5000",
};

/**
 * Genera el PDF con las etiquetas de envío (una por página A6).
 * Tamaño A6: 105 x 148 mm.
 */
export function generateShippingLabels(orders: LabelOrder[]) {
  if (!orders || orders.length === 0) return;

  // Orientación portrait, unidad mm, tamaño A6
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a6",
  });

  orders.forEach((order, index) => {
    if (index > 0) {
      doc.addPage();
    }

    // --- RECTÁNGULO BORDE ---
    doc.setLineWidth(0.5);
    doc.rect(5, 5, 95, 138);

    // --- ENCABEZADO (REMITENTE) ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(REMITENTE.nombre, 10, 15);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`${REMITENTE.direccion}`, 10, 22);
    doc.text(`${REMITENTE.ciudad}, ${REMITENTE.provincia} (${REMITENTE.codigo_postal})`, 10, 27);

    // PEDIDO # EN TOP RIGHT
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(`PEDIDO #${order.id}`, 95, 15, { align: "right" });

    // --- DIVIDER LINE ---
    doc.setLineWidth(0.5);
    doc.setDrawColor(150, 150, 150);
    doc.line(5, 35, 100, 35);
    doc.setDrawColor(0, 0, 0);

    // --- DESTINATARIO ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("DESTINATARIO:", 10, 48);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    const nombre = order.nombre_cliente || "Sin Nombre";
    // Si el nombre es muy largo, se corta o se ajusta
    const splitNombre = doc.splitTextToSize(nombre, 85);
    doc.text(splitNombre, 10, 58);
    
    const nombreHeight = splitNombre.length * 7;
    let currentY = 58 + nombreHeight + 2;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    const dirStr = `${order.direccion || ""} ${order.numero || ""}`.trim();
    if (dirStr) {
      doc.text(dirStr, 10, currentY);
      currentY += 7;
    }
    
    if (order.extra) {
      doc.text(`Obs: ${order.extra}`, 10, currentY);
      currentY += 7;
    }

    const cityStr = `${order.ciudad || ""}, ${order.provincia || ""} (${order.codigo_postal || ""})`.trim();
    if (cityStr) {
      const splitCity = doc.splitTextToSize(cityStr, 85);
      doc.text(splitCity, 10, currentY);
      currentY += splitCity.length * 6;
    }

    currentY += 5;
    doc.setFontSize(10);
    if (order.telefono_cliente) {
      doc.text(`Tel: ${order.telefono_cliente}`, 10, currentY);
      currentY += 6;
    }
    if (order.email_cliente) {
      doc.text(`Email: ${order.email_cliente}`, 10, currentY);
      currentY += 6;
    }

    // --- TRACKING CODE ---
    if (order.tracking_code) {
      doc.setLineWidth(0.5);
      doc.setDrawColor(150, 150, 150);
      doc.line(5, 120, 100, 120);
      doc.setDrawColor(0, 0, 0);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("TRACKING CODE:", 10, 128);
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text(order.tracking_code, 10, 135);
    }
  });

  const ts = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const filename = `etiquetas-envio-${ts.getFullYear()}${pad(ts.getMonth() + 1)}${pad(ts.getDate())}_${pad(ts.getHours())}${pad(ts.getMinutes())}.pdf`;
  
  doc.save(filename);
}

export function generateSingleLabel(order: LabelOrder) {
  generateShippingLabels([order]);
}

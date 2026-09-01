export type OrderStatus = "pending" | "paid" | "failed" | "cancelled";

export type Order = {
    id: number;
    total: number;
    status: OrderStatus;
    fecha: string;
    external_reference: string;
    zipnova_shipment_id?: string | null;
    tracking_code?: string | null;
    envio_status?: string | null;
    nombre_cliente?: string | null;
    email_cliente?: string | null;
    dni_cliente?: string | null;
    telefono_cliente?: string | null;
    provincia?: string | null;
    ciudad?: string | null;
    codigo_postal?: string | null;
    direccion?: string | null;
    numero?: string | null;
    extra?: string | null;
    costo_envio?: number | null;
    cupon_codigo?: string | null;
    cupon_descuento?: number | null;
    lote_id?: number | null;
};

export type OrderItem = {
    id: number;
    id_pedido: number;
    id_producto: string;
    title: string;
    cantidad: number;
    precio_unitario: number;
};

export type CreateOrderInput = {
    items: Array<{
        id_producto: string;
        title: string;
        cantidad: number;
        precio_unitario: number;
    }>;
    total: number;
    external_reference: string;
    shipping_info?: {
        cost: number;
        rate_id: string;
        service_type: string;
        logistic_type?: string | null;
        carrier_id?: number | null;
        point_id?: string | null;
        address?: {
            provincia?: string;
            ciudad?: string;
            codigoPostal?: string;
            direccion?: string;
            numero?: string;
            extra?: string;
        } | null;
        contact: {
            nombre: string;
            email: string;
            dni: string;
            telefono: string;
        };
    };
    cupon_codigo?: string | null;
    cupon_descuento?: number;
    lote_id?: number | null;
};

export type Payment = {
    id: number;
    id_pedido: number;
    mp_payment_id: string;
    status: string;
    payment_method: string | null;
    total: number;
    fecha: string;
};

export type Envio = {
    id: string;
    id_pedido: number;
    rate_id: string;
    service_type: string;
    logistic_type: string | null;
    carrier_id: string | null;
    point_id: string | null;
    costo: number;
    provincia: string | null;
    ciudad: string | null;
    codigo_postal: string | null;
    direccion: string | null;
    numero: string | null;
    extra: string | null;
    nombre_cliente: string;
    email_cliente: string;
    dni_cliente: string;
    telefono_cliente: string;
    status: string;
    tracking_code: string | null;
    zipnova_shipment_id: string | null;
    fecha: string;
};

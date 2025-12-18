// Cotizar Envios -> https://docs.zipnova.com/envios/recursos-api/envios/cotizar-envios
// (Zipnova se encarga de enviar los mails de notificacion al comprador, asi que nos olvidamos)
// Crear Envios -> https://docs.zipnova.com/envios/recursos-api/envios/crear-envios

import { getZipnovaHeaders } from "@/config/zipnovaClient";

const ZIPNOVA_BASE_URL = process.env.ZIPNOVA_BASE_URL || "https://api.zipnova.com.ar/v2";
const ZIPNOVA_ACCOUNT_ID = Number(process.env.ZIPNOVA_ACCOUNT_ID) || 20104;
const ZIPNOVA_ORIGIN_ID = Number(process.env.ZIPNOVA_ORIGIN_ID) || 372979;

export interface QuoteDestination {
  city: string;
  state: string;
  zipcode: string;
}

export interface QuoteItem {
  sku: string;
}

export interface QuoteRequest {
  destination: QuoteDestination;
  items: QuoteItem[];
  declared_value: number;
}

// Estructura de pickup point de Zipnova
export interface PickupPoint {
  point_id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zipcode: string;
  distance?: number;
  hours?: string;
}

// Estructura de una opción de envío de Zipnova
export interface ShippingOption {
  rate_id: string;
  carrier_name: string;
  carrier_logo?: string;
  service_type: 'standard_delivery' | 'pickup_point';
  service_name?: string;
  amounts: {
    price: number;
    price_incl_tax: number;
  };
  estimated_delivery: {
    min_days: number;
    max_days: number;
    estimated_date?: string;
  };
  pickup_points?: PickupPoint[];
  tags?: string[];
}

export interface QuoteResponse {
  success: boolean;
  price?: number;
  carrier?: string;
  delivery_time?: string;
  error?: string;
}

export interface FullQuoteResponse {
  success: boolean;
  all_results?: ShippingOption[];
  error?: string;
}

/**
 * Cotiza un envío con Zipnova - devuelve todas las opciones
 */
export async function quoteShipmentFull(request: QuoteRequest): Promise<FullQuoteResponse> {
  try {
    const headers = getZipnovaHeaders();
    
    const body = {
      account_id: ZIPNOVA_ACCOUNT_ID,
      origin_id: ZIPNOVA_ORIGIN_ID,
      declared_value: request.declared_value,
      destination: {
        city: request.destination.city,
        state: request.destination.state,
        zipcode: request.destination.zipcode,
      },
      items: request.items,
    };

    console.log("Cotizando envío:", JSON.stringify(body, null, 2));

    const response = await fetch(`${ZIPNOVA_BASE_URL}/shipments/quote`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    const data: any = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || data.error || `Error ${response.status}`,
      };
    }

    // zipnova devuelve un objeto con all_results como array
    const rawResults = data.all_results;

    if (Array.isArray(rawResults) && rawResults.length > 0) {

      const allResults: ShippingOption[] = rawResults.map((option: any) => ({

        rate_id: option.rate?.id || option.rate?.tariff_id || String(Math.random()),
        
        carrier_name: option.carrier?.name || 'Transportista',
        carrier_logo: option.carrier?.logo,
        
        service_type: option.service_type?.code || (option.pickup_points?.length > 0 ? 'pickup_point' : 'standard_delivery'),
        service_name: option.service_type?.name,

        amounts: {
          price: option.amounts?.price || 0,
          price_incl_tax: option.amounts?.price_incl_tax || option.amounts?.price || 0,
        },

        estimated_delivery: {
          min_days: option.delivery_time?.min || 3,
          max_days: option.delivery_time?.max || 7,
          estimated_date: option.delivery_time?.estimated_delivery,
        },

        // puntos de retiro tienen estructura anidada en 'location'
        pickup_points: option.pickup_points?.map((pp: any) => ({
          point_id: pp.point_id,
          name: pp.description || pp.name, // zipnova usa 'description' para el nombre
          address: pp.location?.street 
            ? `${pp.location.street} ${pp.location.street_number || ''}`.trim()
            : pp.address || '',
          city: pp.location?.city || pp.city || '',
          state: pp.location?.state || pp.state || '',
          zipcode: pp.location?.zipcode || pp.zipcode || '',
          distance: pp.location?.geolocation?.distance || pp.distance,
          hours: pp.hours,
        })),
        
        tags: option.tags || [],
      }));

      return {
        success: true,
        all_results: allResults,
      };
    }

    // Fallback: si la respuesta tiene otra estructura
    if (data.rate || data.carrier) {
      return {
        success: true,
        all_results: [{
          rate_id: data.rate?.id || String(Math.random()),
          carrier_name: data.carrier?.name || 'Transportista',
          service_type: data.service_type?.code || 'standard_delivery',
          amounts: {
            price: data.amounts?.price || 0,
            price_incl_tax: data.amounts?.price_incl_tax || data.amounts?.price || 0,
          },
          estimated_delivery: {
            min_days: data.delivery_time?.min || 3,
            max_days: data.delivery_time?.max || 7,
          },
        }],
      };
    }

    return {
      success: false,
      error: "No se encontraron opciones de envío disponibles",
    };
  } catch (error: any) {
    console.error("Error cotizando envío:", error);
    return {
      success: false,
      error: error.message || "Error al cotizar envío",
    };
  }
}

/**
 * Cotiza un envío con Zipnova - devuelve solo la opción más barata (legacy)
 */
export async function quoteShipment(request: QuoteRequest): Promise<QuoteResponse> {
  const fullResponse = await quoteShipmentFull(request);
  
  if (!fullResponse.success || !fullResponse.all_results?.length) {
    return {
      success: false,
      error: fullResponse.error || "No hay opciones de envío disponibles",
    };
  }

  const sorted = [...fullResponse.all_results].sort(
    (a, b) => a.amounts.price_incl_tax - b.amounts.price_incl_tax
  );
  const cheapest = sorted[0];

  return {
    success: true,
    price: cheapest.amounts.price_incl_tax,
    carrier: cheapest.carrier_name,
    delivery_time: `${cheapest.estimated_delivery.min_days}-${cheapest.estimated_delivery.max_days} días`,
  };
}


export interface CreateShipmentRequest {
  external_id: string
  declared_value: number;
  service_type: 'standard_delivery' | 'pickup_point';
  destination: {
    name: string;
    email: string;
    phone: string;
    document: string;
    city: string;
    state: string;
    zipcode: string;
    street?: string;
    street_number?: string;
    street_extras?: string;
  };
  items: QuoteItem[];
  point_id?: string; // en caso de pickup_point
}

export interface CreateShipmentResponse {
  success: boolean;
  shipment_id?: string; // id de Zipnova
  tracking_number?: string;
  error?: string;
}

/**
 * Crea un envío en Zipnova después de que el pago fue aprobado
 */
export async function createShipment(request: CreateShipmentRequest): Promise<CreateShipmentResponse> {
  try {
    const headers = getZipnovaHeaders();
    
    const body: any = {
      account_id: ZIPNOVA_ACCOUNT_ID,
      origin_id: ZIPNOVA_ORIGIN_ID,
      declared_value: request.declared_value,
      external_id: request.external_id,
      service_type: request.service_type,
      destination: {
        name: request.destination.name,
        email: request.destination.email,
        phone: request.destination.phone,
        document: request.destination.document,
        city: request.destination.city,
        state: request.destination.state,
        zipcode: request.destination.zipcode,
      },
      items: request.items,
    };

    if (request.service_type === 'standard_delivery') {
      body.destination.street = request.destination.street || '';
      body.destination.street_number = request.destination.street_number || '';
      body.destination.street_extras = request.destination.street_extras || '';
    }

    if (request.service_type === 'pickup_point' && request.point_id) {
      body.point_id = request.point_id;
    }

    console.log("Creando envío en Zipnova:", JSON.stringify(body, null, 2));

    const response = await fetch(`${ZIPNOVA_BASE_URL}/shipments/`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    const data: any = await response.json();
    console.log("Respuesta de Zipnova:", JSON.stringify(data, null, 2));

    if (!response.ok) {
      return {
        success: false,
        error: data.message || data.error || `Error ${response.status}`,
      };
    }

    // zipnova devuelve el shipment creado
    return {
      success: true,
      shipment_id: data.id || data.shipment_id,
      tracking_number: data.tracking_number || data.tracking,
    };
  } catch (error: any) {
    console.error("Error creando envío en Zipnova:", error);
    return {
      success: false,
      error: error.message || "Error al crear envío",
    };
  }
}
export type Product = {
  id: string
  name: string
  description: string
  price: number
  image: string
  status: 'disponible' | 'proximamente' | 'agotado'
  limite?: number // 0 = sin límite (ausente o 0 => ilimitado)
  stock?: number // cantidad disponible
}

// URLs para cliente (navegador) y servidor (SSR)
// En producción detrás de Nginx el backend vive en /api
// NEXT_PUBLIC_API_URL debe ser "/api" para llamadas desde el navegador.
// Por defecto en prod detrás de Nginx, la API vive en /api
export const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api'
// Para SSR o acciones internas se puede usar la misma ruta pública ya que Nginx hace proxy.
export const API_URL_INTERNAL = process.env.NEXT_INTERNAL_API_URL || API_URL
export const API_BASE_URL = typeof window === 'undefined' ? API_URL_INTERNAL : API_URL

const getAuthToken = () => typeof window !== 'undefined' ? localStorage.getItem("admin_token") : null;

export const api = {
  get: async (url: string) => {
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    const token = getAuthToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE_URL}${url}`, { headers });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Error desconocido' }));
      throw new Error(error.message || `HTTP ${res.status}`);
    }
    const data = await res.json();
    return { data };
  },
  put: async (url: string, body: any) => {
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    const token = getAuthToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE_URL}${url}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Error desconocido' }));
      throw new Error(error.message || `HTTP ${res.status}`);
    }
    const data = await res.json();
    return { data };
  }
};

export function getImageSrc(src: string) {
  if (!src) return ''
  if (src.startsWith('http://') || src.startsWith('https://')) return src
  // En prod Nginx sirve /uploads directo en el mismo dominio
  if (src.startsWith('/uploads/')) return src
  return src
}

export async function fetchProducts(): Promise<Product[]> {
  const res = await fetch(`${API_BASE_URL}/products`, { cache: 'no-store' })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const raw = await res.json()
  // Aceptamos objetos parcialmente tipados y normalizamos
  return (raw as any[]).map((p) => {
    const priceRaw = (p as any).price
    const limiteRaw = (p as any).limite
    const stockRaw = (p as any).stock
    return {
      id: String(p.id),
      name: String(p.name),
      description: String(p.description ?? ''),
      image: String(p.image ?? ''),
      status: ['disponible','proximamente','agotado'].includes(p.status) ? p.status : 'disponible',
      price: typeof priceRaw === 'string' ? Number(priceRaw) : Number(priceRaw),
      limite: limiteRaw === undefined || limiteRaw === null ? 0 : Number(limiteRaw) || 0,
      stock: stockRaw === undefined || stockRaw === null ? 0 : Number(stockRaw) || 0,
    }
  })
}

export interface ShippingInfo {
  cost: number
  rate_id: string
  service_type: string
  point_id?: string | null
  address?: {
    provincia: string
    ciudad: string
    codigoPostal: string
    direccion: string
    numero: string
    extra?: string
  } | null
  contact: {
    nombre: string
    email: string
    dni: string
    telefono: string
  }
}

export async function createPaymentPreference(
  items: Array<{ id: string; quantity: number }>,
  shipping: ShippingInfo
) {
  const res = await fetch(`${API_BASE_URL}/payments/create-preference`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items, shipping }),
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Error desconocido' }))
    throw new Error(error.error || `HTTP ${res.status}`)
  }
  return await res.json()
}

export interface ShippingDestination {
  city?: string
  state: string
  zipcode: string
}

export interface ShippingQuoteRequest {
  destination: ShippingDestination
  items: Array<{ id: string; quantity: number }>
}

export interface ShippingQuoteResponse {
  success: boolean
  shipping_cost?: number
  carrier?: string
  delivery_time?: string
  products_total?: number
  total?: number
  error?: string
}

// Tipos para el flujo de dos pasos
export interface PickupPoint {
  point_id: string
  name: string
  address: string
  city: string
  state: string
  zipcode: string
  distance?: number
  hours?: string
}

export interface ShippingOption {
  rate_id: string
  carrier_name: string
  carrier_logo?: string
  service_type: 'standard_delivery' | 'pickup_point'
  service_name?: string
  amounts: {
    price: number
    price_incl_tax: number
  }
  estimated_delivery: {
    min_days: number
    max_days: number
    estimated_date?: string
  }
  pickup_points?: PickupPoint[]
  tags?: string[]
}

export interface ShippingOptionsResponse {
  success: boolean
  all_results?: ShippingOption[]
  products_total?: number
  error?: string
}

export async function quoteShipping(request: ShippingQuoteRequest): Promise<ShippingQuoteResponse> {
  const res = await fetch(`${API_BASE_URL}/shipping/quote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })
  const data = await res.json()
  return data
}

export async function quoteShippingOptions(request: ShippingQuoteRequest): Promise<ShippingOptionsResponse> {
  const res = await fetch(`${API_BASE_URL}/shipping/quote-options`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })
  const data = await res.json()
  return data
}

export interface Provincia {
  id: string
  nombre: string
}

export interface Localidad {
  id: string
  nombre: string
}

export async function fetchProvincias(): Promise<Provincia[]> {
  const res = await fetch('https://apis.datos.gob.ar/georef/api/provincias')
  if (!res.ok) throw new Error('Error cargando provincias')
  const data = await res.json()
  return (data.provincias || []).sort((a: Provincia, b: Provincia) => 
    a.nombre.localeCompare(b.nombre)
  )
}

export async function fetchLocalidades(provincia: string): Promise<Localidad[]> {
  const res = await fetch(
    `https://apis.datos.gob.ar/georef/api/localidades?provincia=${encodeURIComponent(provincia)}&max=2000`
  )
  if (!res.ok) throw new Error('Error cargando localidades')
  const data = await res.json()
  return (data.localidades || []).sort((a: Localidad, b: Localidad) => 
    a.nombre.localeCompare(b.nombre)
  )
}


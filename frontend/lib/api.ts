export type Product = {
  id: string
  name: string
  description: string
  price: number
  image: string
  status: 'disponible' | 'proximamente' | 'agotado'
}

// URLs para cliente (navegador) y servidor (SSR)
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
export const API_URL_INTERNAL =
  process.env.NEXT_INTERNAL_API_URL || process.env.API_URL_INTERNAL || API_URL
export const API_BASE_URL = typeof window === 'undefined' ? API_URL_INTERNAL : API_URL

export function getImageSrc(src: string) {
  if (!src) return ''
  if (src.startsWith('http://') || src.startsWith('https://')) return src
  if (src.startsWith('/uploads/')) return `${API_URL}${src}`
  return src
}

export async function fetchProducts(): Promise<Product[]> {
  const res = await fetch(`${API_BASE_URL}/products`, { cache: 'no-store' })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = (await res.json()) as Product[]
  // Normalizar price a number por si viene como string (por ej. DECIMAL de MySQL)
  return data.map((p) => ({
    ...p,
    price: typeof (p as any).price === 'string' ? Number((p as any).price) : p.price,
  }))
}

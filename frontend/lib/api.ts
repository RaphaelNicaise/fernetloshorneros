export type Product = {
  id: string
  name: string
  description: string
  price: number
  image: string
  status: 'disponible' | 'proximamente' | 'agotado'
  limite?: number // 0 = sin límite (ausente o 0 => ilimitado)
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
  const raw = await res.json()
  // Aceptamos objetos parcialmente tipados y normalizamos
  return (raw as any[]).map((p) => {
    const priceRaw = (p as any).price
    const limiteRaw = (p as any).limite
    return {
      id: String(p.id),
      name: String(p.name),
      description: String(p.description ?? ''),
      image: String(p.image ?? ''),
      status: ['disponible','proximamente','agotado'].includes(p.status) ? p.status : 'disponible',
      price: typeof priceRaw === 'string' ? Number(priceRaw) : Number(priceRaw),
      limite: limiteRaw === undefined || limiteRaw === null ? 0 : Number(limiteRaw) || 0,
    }
  })
}

import { NextRequest, NextResponse } from 'next/server'

// URL interna al backend (solo accesible desde el contenedor)
const INTERNAL_API_URL =
  process.env.NEXT_INTERNAL_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://backend:3001'

// Cache simple en memoria: evita llamar al backend en CADA request
let maintenanceCache: { active: boolean; allowedIps: string[]; expiresAt: number } | null = null
const CACHE_TTL_MS = 10_000 // 10 segundos

async function getMaintenanceStatus(): Promise<{ active: boolean; allowedIps: string[] }> {
  const now = Date.now()
  if (maintenanceCache && maintenanceCache.expiresAt > now) {
    return { active: maintenanceCache.active, allowedIps: maintenanceCache.allowedIps }
  }
  try {
    const res = await fetch(`${INTERNAL_API_URL}/settings/maintenance-check`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(2000),
    })
    if (!res.ok) return { active: false, allowedIps: [] }
    const data = await res.json()
    const active = Boolean(data.maintenance)
    const allowedIps = Array.isArray(data.allowed_ips) ? data.allowed_ips : []
    maintenanceCache = { active, allowedIps, expiresAt: now + CACHE_TTL_MS }
    return { active, allowedIps }
  } catch {
    // Si el backend no responde, no bloquear el acceso
    return { active: false, allowedIps: [] }
  }
}

function getClientIps(req: NextRequest): string[] {
  const ips: string[] = []

  // Cloudflare header
  const cfIp = req.headers.get('cf-connecting-ip')?.trim()
  if (cfIp) ips.push(cfIp)

  // X-Real-IP
  const realIp = req.headers.get('x-real-ip')?.trim()
  if (realIp) ips.push(realIp)

  // X-Forwarded-For (puede ser una lista: client, proxy1, proxy2)
  const forwardedFor = req.headers.get('x-forwarded-for')
  if (forwardedFor) {
    forwardedFor.split(',').forEach((ip) => {
      const trimmed = ip.trim()
      if (trimmed) ips.push(trimmed)
    })
  }

  // Normalizar IPv4-mapped IPv6 (ej: ::ffff:190.x.x.x -> 190.x.x.x) y minúsculas para IPv6
  const normalized = ips.map((ip) =>
    ip
      .replace(/^::ffff:/i, '')
      .replace(/^\[(.*)\]$/, '$1')
      .trim()
      .toLowerCase()
  )
  return Array.from(new Set(normalized))
}

function isIpAllowed(req: NextRequest, backendAllowedIps: string[] = []): boolean {
  const envAllowed = (process.env.MAINTENANCE_ALLOWED_IPS || '')
    .split(',')
    .map((ip) =>
      ip
        .replace(/^::ffff:/i, '')
        .replace(/^\[(.*)\]$/, '$1')
        .trim()
        .toLowerCase()
    )
    .filter(Boolean)

  const dbAllowed = backendAllowedIps.map((ip) =>
    ip
      .replace(/^::ffff:/i, '')
      .replace(/^\[(.*)\]$/, '$1')
      .trim()
      .toLowerCase()
  )

  const allAllowed = Array.from(new Set([...envAllowed, ...dbAllowed]))
  if (allAllowed.length === 0) return false

  const clientIps = getClientIps(req)
  return clientIps.some((clientIp) => allAllowed.includes(clientIp))
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Rutas que siempre están disponibles (assets, api interna de Next, la página de mantenimiento misma, admin)
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/admin') ||
    pathname === '/mantenimiento' ||
    pathname.startsWith('/mantenimiento') ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    pathname.startsWith('/favicon') ||
    // imágenes y recursos estáticos
    /\.(png|jpg|jpeg|webp|svg|ico|gif|woff2?|ttf|otf|css|js)$/.test(pathname)
  ) {
    return NextResponse.next()
  }

  const { active, allowedIps } = await getMaintenanceStatus()
  if (!active) return NextResponse.next()

  if (isIpAllowed(req, allowedIps)) return NextResponse.next()

  // Redirigir a la página de mantenimiento
  return NextResponse.redirect(new URL('/mantenimiento', req.url))
}

export const config = {
  matcher: [
    /*
     * Aplicar a todas las rutas excepto las de Next.js internals.
     * Las exclusiones finas se hacen dentro del middleware para mayor claridad.
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}

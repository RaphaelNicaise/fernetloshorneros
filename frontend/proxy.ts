import { NextRequest, NextResponse } from 'next/server'

// IPs autorizadas durante el modo mantenimiento (separadas por coma en .env)
// Ejemplo: MAINTENANCE_ALLOWED_IPS=192.168.1.1,203.0.113.5
const ALLOWED_IPS = (process.env.MAINTENANCE_ALLOWED_IPS || '')
  .split(',')
  .map((ip) => ip.trim())
  .filter(Boolean)

// URL interna al backend (solo accesible desde el contenedor)
const INTERNAL_API_URL =
  process.env.NEXT_INTERNAL_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://backend:3001'

// Cache simple en memoria: evita llamar al backend en CADA request
let maintenanceCache: { value: boolean; expiresAt: number } | null = null
const CACHE_TTL_MS = 15_000 // 15 segundos

async function isMaintenanceActive(): Promise<boolean> {
  const now = Date.now()
  if (maintenanceCache && maintenanceCache.expiresAt > now) {
    return maintenanceCache.value
  }
  try {
    const res = await fetch(`${INTERNAL_API_URL}/settings/maintenance-check`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(2000),
    })
    if (!res.ok) return false
    const data = await res.json()
    maintenanceCache = { value: Boolean(data.maintenance), expiresAt: now + CACHE_TTL_MS }
    return maintenanceCache.value
  } catch {
    // Si el backend no responde, no bloquear el acceso
    return false
  }
}

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    '127.0.0.1'
  )
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

  const active = await isMaintenanceActive()
  if (!active) return NextResponse.next()

  const clientIp = getClientIp(req)
  if (ALLOWED_IPS.includes(clientIp)) return NextResponse.next()

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

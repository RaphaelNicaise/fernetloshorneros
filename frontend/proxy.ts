import { NextRequest, NextResponse } from 'next/server'

// URL interna al backend (solo accesible desde el contenedor)
const INTERNAL_API_URL =
  process.env.NEXT_INTERNAL_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://backend:3001'

// Cache simple en memoria: evita llamar al backend en CADA request
let maintenanceCache: { active: boolean; expiresAt: number } | null = null
const CACHE_TTL_MS = 10_000 // 10 segundos

async function isMaintenanceActive(): Promise<boolean> {
  const now = Date.now()
  if (maintenanceCache && maintenanceCache.expiresAt > now) {
    return maintenanceCache.active
  }
  try {
    const res = await fetch(`${INTERNAL_API_URL}/settings/maintenance-check`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(2000),
    })
    if (!res.ok) return false
    const data = await res.json()
    const active = Boolean(data.maintenance)
    maintenanceCache = { active, expiresAt: now + CACHE_TTL_MS }
    return active
  } catch {
    // Si el backend no responde, no bloquear el acceso
    return false
  }
}

function isAdminLoggedIn(req: NextRequest): boolean {
  const adminToken = req.cookies.get('admin_token')?.value
  return Boolean(adminToken && adminToken.trim().length > 10)
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Rutas que siempre están disponibles (assets, api interna de Next, admin, mantenimiento)
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

  // Si el usuario está autenticado como administrador, puede navegar libremente por toda la web
  if (isAdminLoggedIn(req)) {
    return NextResponse.next()
  }

  // Redirigir a la página de mantenimiento
  return NextResponse.redirect(new URL('/mantenimiento', req.url))
}

export const config = {
  matcher: [
    /*
     * Aplicar a todas las rutas excepto las de Next.js internals.
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}

"use client"

import Script from "next/script"
import { usePathname } from "next/navigation"

export function UmamiAnalytics() {
  const pathname = usePathname()

  // No cargamos el script de seguimiento si estamos en una ruta de admin
  if (pathname?.startsWith("/admin")) {
    return null
  }

  return (
    <Script
      src="https://umami.fernetloshorneros.com/script.js"
      data-website-id="a0377baa-7149-482e-b4a5-3d19cfb08a15"
      strategy="lazyOnload"
    />
  )
}

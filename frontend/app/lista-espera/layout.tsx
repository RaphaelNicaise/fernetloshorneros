import type { Metadata } from "next"
import type { ReactNode } from "react"

/**
 * Esta ruta está deprecada. El layout se mantiene solo para
 * evitar errores de build. El page.tsx redirige al home.
 */
export const metadata: Metadata = {
  title: "Lista de Espera — Los Horneros Fernet",
  robots: { index: false, follow: false }, // Decirle a Google que no indexe esta URL
  alternates: {
    canonical: "https://fernetloshorneros.com",
  },
}

export default function ListaEsperaLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}

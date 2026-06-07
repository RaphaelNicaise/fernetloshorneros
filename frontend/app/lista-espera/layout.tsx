import type { Metadata } from "next"
import type { ReactNode } from "react"

export const metadata: Metadata = {
  title: "Lista de Espera — Lote 2",
  description:
    "Anotate en la lista de espera del Lote 2 de Fernet Los Horneros. Solo 17.500 botellas numeradas disponibles. Preventa Junio 2026. Te avisamos 24hs antes del lanzamiento público.",
  openGraph: {
    title: "Lista de Espera Lote 2 | Los Horneros Fernet",
    description:
      "Solo 17.500 botellas numeradas. Anotate y te avisamos 24hs antes del lanzamiento. Preventa Septiembre 2026.",
    images: [{ url: "/fernet1.webp", width: 1200, height: 630, alt: "Lista de Espera Lote 2 — Los Horneros Fernet" }],
  },
}

export default function ListaEsperaLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}

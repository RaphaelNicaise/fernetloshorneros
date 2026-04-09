import type { Metadata } from "next"
import type { ReactNode } from "react"

export const metadata: Metadata = {
  title: "Productos",
  description:
    "Explorá el catálogo de Fernet Los Horneros. Fernet artesanal en lotes limitados y numerados, elaborado con más de 20 hierbas seleccionadas.",
  openGraph: {
    title: "Productos | Los Horneros Fernet",
    description:
      "Fernet artesanal en lotes limitados. Solo 2.500 botellas numeradas por lote.",
    images: [{ url: "/fernet1.webp", width: 1200, height: 630, alt: "Productos Los Horneros Fernet" }],
  },
}

export default function ProductosLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}

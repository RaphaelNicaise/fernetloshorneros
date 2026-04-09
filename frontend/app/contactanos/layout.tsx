import type { Metadata } from "next"
import type { ReactNode } from "react"

export const metadata: Metadata = {
  title: "Contacto",
  description:
    "Contactate con el equipo de Los Horneros Fernet. Consultas sobre productos, pedidos o distribución.",
  openGraph: {
    title: "Contacto | Los Horneros Fernet",
    description: "Contactate con el equipo de Los Horneros Fernet.",
  },
}

export default function ContactanosLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}

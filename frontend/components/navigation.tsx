"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { ShoppingCart } from "lucide-react"
import { useCart } from "@/lib/cart-context"
import { Link as VTLink } from "next-view-transitions"

export function Navigation() {
  const { items } = useCart()
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/"
    return pathname.startsWith(href)
  }

  const linkClass = (href: string) =>
    [
      "inline-block transition-all duration-150 transform-gpu",
      isActive(href) ? "text-black font-semibold" : "text-gray-500 hover:text-black",
      "hover:scale-[1.05]",
    ].join(" ")

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <VTLink href="/" className="flex items-center gap-2" aria-label="Ir al inicio">
          <Image
            src="/icon.png"
            alt="Fernet Los Horneros"
            width={32}
            height={32}
            className="rounded-full"
            priority
          />
          <Image
            src="/logo-fernet.png"
            alt="Fernet Los Horneros"
            width={160}
            height={32}
            className="h-8 w-auto object-contain"
            priority
          />
        </VTLink>
        <nav className="hidden md:flex items-center gap-6">
          <VTLink href="/" className={linkClass("/")}>Inicio</VTLink>
          <VTLink href="/productos" className={linkClass("/productos")}>
            Productos
          </VTLink>
          <VTLink href="/lista-espera" className={linkClass("/lista-espera")}>
            Lista de Espera
          </VTLink>
        </nav>
        <VTLink
          href="/cart"
          className="relative flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100 transition-colors transform-gpu hover:scale-110"
        >
          <ShoppingCart className="w-6 h-6 text-black" />
          {itemCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-black text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {itemCount}
            </span>
          )}
        </VTLink>
      </div>
    </header>
  )
}

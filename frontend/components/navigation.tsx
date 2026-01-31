"use client"

import Link from "next/link"
import Image from "next/image"
import { useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import { ShoppingCart } from "lucide-react"
import { useCart } from "@/lib/cart-context"
 

export function Navigation() {
  const { items } = useCart()
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)
  const pathname = usePathname()

  // Animación del carrito cuando se agrega un producto
  const [bump, setBump] = useState(false)
  const firstRender = useRef(true)
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    // Dispara la animación en cada cambio de cantidad
    setBump(true)
    const t = setTimeout(() => setBump(false), 400)
    return () => clearTimeout(t)
  }, [itemCount])

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
  <div className="container mx-auto px-4 py-4 flex items-center justify-between md:grid md:grid-cols-[1fr_auto_1fr]">
  <Link href="/" className="group flex items-center gap-3 transition-transform transform-gpu hover:scale-[1.03] justify-self-start" aria-label="Ir al inicio">
          <Image
            src="/logonuevo.png"
            alt="Fernet Los Horneros"
            width={40}
            height={40}
            className="rounded-full transition-transform duration-150 group-hover:scale-105"
            priority
          />
          <Image
            src="/logo-fernet.png"
            alt="Fernet Los Horneros"
            width={190}
            height={40}
            className="h-10 w-auto object-contain transition-transform duration-150 group-hover:scale-105"
            priority
          />
  </Link>
        <nav className="hidden md:flex items-center gap-6 justify-self-center">
          <Link href="/" className={linkClass("/")}>Inicio</Link>
          <Link href="/productos" className={linkClass("/productos")}>
            Productos
          </Link>
          <Link href="/lista-espera" className={linkClass("/lista-espera")}>
            Lista de Espera
          </Link>
        </nav>
        <Link
          href="/cart"
          className="relative flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100 transition-colors transform-gpu hover:scale-110 justify-self-end"
        >
          <span className={`${bump ? "animate-[cart-bump_400ms_ease]" : ""}`}>
            <ShoppingCart className="w-6 h-6 text-black" />
          </span>
          {itemCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-black text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {itemCount}
            </span>
          )}
        </Link>
      </div>
    </header>
  )
}

"use client"

import Link from "next/link"
import Image from "next/image"
import { useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import { ShoppingCart, Menu, X } from "lucide-react"
import { useCart } from "@/lib/cart-context"
import { motion, AnimatePresence } from "framer-motion"

const navLinks = [
  { href: "/", label: "Inicio" },
  { href: "/productos", label: "Productos" },
  { href: "/lista-espera", label: "Lista de Espera" },
]

export function Navigation() {
  const { items } = useCart()
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  const [bump, setBump] = useState(false)
  const firstRender = useRef(true)
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return }
    setBump(true)
    const t = setTimeout(() => setBump(false), 400)
    return () => clearTimeout(t)
  }, [itemCount])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false) }, [pathname])

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href)

  return (
    <>
      <header
        className={`sticky top-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-100"
            : "bg-white border-b border-gray-200"
        }`}
      >
        <div className="container mx-auto px-4 py-3 flex items-center justify-between md:grid md:grid-cols-[1fr_auto_1fr]">
          {/* Logo */}
          <Link
            href="/"
            className="group flex items-center gap-3 justify-self-start"
            aria-label="Ir al inicio"
          >
            <motion.div whileHover={{ scale: 1.05 }} transition={{ duration: 0.2 }}>
              <Image
                src="/logonuevo.png"
                alt="Fernet Los Horneros"
                width={40}
                height={40}
                className="rounded-full"
                priority
              />
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
              <Image
                src="/logo-fernet.png"
                alt="Fernet Los Horneros"
                width={190}
                height={40}
                className="h-10 w-auto object-contain"
                priority
              />
            </motion.div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1 justify-self-center">
            {navLinks.map(({ href, label }) => {
              const active = isActive(href)
              return (
                <Link key={href} href={href} className="relative px-4 py-2 group">
                  <span
                    className={`relative z-10 text-sm font-medium transition-colors duration-200 ${
                      active ? "text-primary" : "text-gray-500 group-hover:text-primary"
                    }`}
                  >
                    {label}
                  </span>
                  {/* Active underline */}
                  {active && (
                    <motion.div
                      layoutId="nav-underline"
                      className="absolute bottom-0 left-3 right-3 h-0.5 bg-primary rounded-full"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  {/* Hover background */}
                  <span className="absolute inset-0 rounded-lg bg-primary/0 group-hover:bg-primary/5 transition-colors duration-200" />
                </Link>
              )
            })}
          </nav>

          {/* Right side: cart + hamburger */}
          <div className="flex items-center gap-2 justify-self-end">
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
              <Link
                href="/cart"
                className="relative flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Ver carrito"
              >
                <motion.span animate={bump ? { scale: [1, 1.3, 1] } : {}} transition={{ duration: 0.35 }}>
                  <ShoppingCart className="w-5 h-5 text-gray-700" />
                </motion.span>
                <AnimatePresence>
                  {itemCount > 0 && (
                    <motion.span
                      key="badge"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center"
                    >
                      {itemCount}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            </motion.div>

            {/* Hamburger — mobile only */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              className="md:hidden flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100 transition-colors"
              onClick={() => setMobileOpen((o) => !o)}
              aria-label="Menú"
            >
              <AnimatePresence mode="wait" initial={false}>
                {mobileOpen ? (
                  <motion.span key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
                    <X className="w-5 h-5 text-gray-700" />
                  </motion.span>
                ) : (
                  <motion.span key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
                    <Menu className="w-5 h-5 text-gray-700" />
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm md:hidden"
              onClick={() => setMobileOpen(false)}
            />
            {/* Drawer */}
            <motion.div
              key="drawer"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: "easeOut" as const }}
              className="fixed top-[65px] left-0 right-0 z-50 bg-white border-b border-gray-100 shadow-lg md:hidden px-4 py-4"
            >
              <nav className="flex flex-col gap-1">
                {navLinks.map(({ href, label }, i) => {
                  const active = isActive(href)
                  return (
                    <motion.div
                      key={href}
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06, duration: 0.2 }}
                    >
                      <Link
                        href={href}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150 ${
                          active
                            ? "bg-primary/8 text-primary"
                            : "text-gray-600 hover:bg-gray-50 hover:text-primary"
                        }`}
                      >
                        {active && <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />}
                        {label}
                      </Link>
                    </motion.div>
                  )
                })}
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}


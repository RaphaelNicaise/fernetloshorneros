"use client"

import Link from "next/link"
import Image from "next/image"
import { useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import { ShoppingCart, Menu, X } from "lucide-react"
import { useCart } from "@/lib/cart-context"
import { useWaitlistModal } from "@/lib/waitlist-modal-context"
import { motion, AnimatePresence } from "framer-motion"

const navLinks = [
  { href: "/", label: "Inicio" },
  { href: "/productos", label: "Productos" },
  { href: "modal:waitlist", label: "Lista de Espera" },
]

export function Navigation() {
  const { items } = useCart()
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)
  const pathname = usePathname()
  const { open } = useWaitlistModal()
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

  const handleNavClick = (href: string) => {
    if (href === "modal:waitlist") {
      open()
      setMobileOpen(false)
    }
  }

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#0b0a07]/80 backdrop-blur-xl transition-all duration-400 ${
        scrolled
          ? "py-2 shadow-[0_14px_40px_rgba(0,0,0,0.22)]"
          : "py-4"
      }`}
    >
      <div className="container mx-auto flex items-center justify-between px-4 md:grid md:grid-cols-[1fr_auto_1fr]">
        {/* Logo */}
        <Link
          href="/"
          className="group flex items-center gap-3 justify-self-start"
          aria-label="Ir al inicio"
        >
          <motion.div whileHover={{ rotate: -8, scale: 1.08 }} transition={{ duration: 0.3 }}>
            <Image
              src="/logonuevo.webp"
              alt="Fernet Los Horneros"
              width={46}
              height={46}
              className={`object-contain brightness-0 invert transition-all duration-500 ${scrolled ? "h-[38px] w-[38px]" : "h-[46px] w-[46px]"}`}
              priority
            />
          </motion.div>
          <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }} className="leading-none">
            <Image
              src="/logo-fernet.webp"
              alt="Fernet Los Horneros"
              width={190}
              height={40}
              className={`h-auto w-auto object-contain brightness-0 invert transition-all duration-500 ${scrolled ? "max-h-8" : "max-h-10"}`}
              priority
            />
          </motion.div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-2 justify-self-center md:flex">
          {navLinks.map(({ href, label }) => {
            const active = href.startsWith("modal:") ? false : isActive(href)
            const linkClasses = `group relative px-4 py-2 text-sm font-medium transition-colors duration-200 ${
              active ? "text-white" : "text-white/72 hover:text-white"
            }`

            if (href.startsWith("modal:")) {
              return (
                <button key={href} type="button" className={linkClasses} onClick={() => handleNavClick(href)}>
                  <span className="relative z-10">{label}</span>
                  <span className="pointer-events-none absolute bottom-1 left-4 right-4 h-px origin-left scale-x-0 bg-[#6B5743] transition-transform duration-300 ease-out group-hover:scale-x-100" />
                </button>
              )
            }

            return (
              <Link key={href} href={href} className={linkClasses}>
                <span className="relative z-10">{label}</span>
                <span className={`pointer-events-none absolute bottom-1 left-4 right-4 h-px origin-left bg-[#6B5743] transition-transform duration-300 ease-out ${active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"}`} />
              </Link>
            )
          })}
        </nav>

        {/* Right side: cart + hamburger */}
        <div className="flex items-center gap-2 justify-self-end">
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
            <Link
              href="/cart"
              className="relative flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/4 transition-colors hover:bg-white/8 md:h-11 md:w-11"
              aria-label="Ver carrito"
            >
              <motion.span animate={bump ? { scale: [1, 1.3, 1] } : {}} transition={{ duration: 0.35 }}>
                <ShoppingCart className="h-5 w-5 text-white" />
              </motion.span>
              <AnimatePresence>
                {itemCount > 0 && (
                  <motion.span
                    key="badge"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#AA6F3B] text-[10px] font-bold text-white"
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
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/4 transition-colors hover:bg-white/8 md:hidden"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="Menú"
          >
            <AnimatePresence mode="wait" initial={false}>
              {mobileOpen ? (
                <motion.span key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
                  <X className="h-5 w-5 text-white" />
                </motion.span>
              ) : (
                <motion.span key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
                  <Menu className="h-5 w-5 text-white" />
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </div>

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
              className="absolute left-0 right-0 top-full z-50 border-b border-t border-white/10 bg-[#0b0a07]/98 px-4 py-4 shadow-2xl md:hidden"
            >
              <nav className="flex flex-col gap-1">
                {navLinks.map(({ href, label }, i) => {
                  const active = href.startsWith("modal:") ? false : isActive(href)
                  return (
                    <motion.div
                      key={href}
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06, duration: 0.2 }}
                    >
                      {href.startsWith("modal:") ? (
                        <button
                          type="button"
                          onClick={() => handleNavClick(href)}
                          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-white/75 transition-all duration-150 hover:bg-white/5 hover:text-white"
                        >
                          {label}
                        </button>
                      ) : (
                        <Link
                          href={href}
                          className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-150 ${
                            active ? "bg-white/6 text-white" : "text-white/75 hover:bg-white/5 hover:text-white"
                          }`}
                        >
                          {active && <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#6B5743]" />}
                          {label}
                        </Link>
                      )}
                    </motion.div>
                  )
                })}
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  )
}


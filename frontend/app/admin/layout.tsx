"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { API_BASE_URL } from "@/lib/api"
import { motion, AnimatePresence } from "framer-motion"
import {
  Package,
  ShoppingBag,
  Users,
  Settings,
  BarChart3,
  LogOut,
  Server,
  Database,
  ChevronRight,
  Menu,
  X,
} from "lucide-react"

const NAV_ITEMS = [
  { href: "/admin/productos", label: "Productos", icon: Package },
  { href: "/admin/pedidos", label: "Pedidos", icon: ShoppingBag },
  { href: "/admin/lista-espera", label: "Lista de Espera", icon: Users },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/config", label: "Configuración", icon: Settings },
]

const EXTERNAL_ITEMS = [
  { href: "/phpmyadmin", label: "phpMyAdmin", icon: Database },
  { href: "/portainer", label: "Portainer", icon: Server },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [checked, setChecked] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const isLoginPage = pathname === "/admin/login"

  useEffect(() => {
    if (isLoginPage) {
      setChecked(true)
      return
    }
    const token = localStorage.getItem("admin_token")
    if (!token) {
      router.replace("/admin/login")
      return
    }
    const verify = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/admin/verify`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) {
          localStorage.removeItem("admin_token")
          router.replace("/admin/login")
          return
        }
        setChecked(true)
      } catch {
        router.replace("/admin/login")
      }
    }
    verify()
  }, [router, pathname, isLoginPage])

  const handleLogout = () => {
    localStorage.removeItem("admin_token")
    router.replace("/admin/login")
  }

  if (!checked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b0a07]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#AA6F3B] border-t-transparent" />
      </div>
    )
  }

  if (isLoginPage) {
    return <>{children}</>
  }

  return (
    <div className="flex min-h-screen bg-[#0f0d0a]">
      {/* Sidebar backdrop (mobile) */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-white/8 bg-[#0b0a07] transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-white/8 px-5">
          <Image src="/logonuevo.webp" alt="Los Horneros" width={32} height={32} className="brightness-0 invert opacity-80" />
          <div className="leading-none">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#AA6F3B]">Panel de</p>
            <p className="font-serif text-base font-bold text-white">Administración</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setSidebarOpen(false)}
                className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                  active
                    ? "bg-[#AA6F3B]/18 text-[#AA6F3B]"
                    : "text-white/55 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon className={`h-4.5 w-4.5 flex-shrink-0 ${active ? "text-[#AA6F3B]" : "text-white/40 group-hover:text-white/70"}`} size={18} />
                {label}
                {active && <ChevronRight className="ml-auto h-3.5 w-3.5 text-[#AA6F3B]/60" />}
              </Link>
            )
          })}

          <div className="my-3 border-t border-white/8" />
          <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/25">Herramientas</p>
          {EXTERNAL_ITEMS.map(({ href, label, icon: Icon }) => (
            <a
              key={href}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/40 transition-all duration-150 hover:bg-white/5 hover:text-white/70"
            >
              <Icon className="h-4.5 w-4.5 flex-shrink-0 text-white/30 group-hover:text-white/50" size={18} />
              {label}
              <span className="ml-auto text-[10px] text-white/25">↗</span>
            </a>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-white/8 p-3">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/45 transition-all duration-150 hover:bg-red-500/10 hover:text-red-400"
          >
            <LogOut size={18} className="flex-shrink-0" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex flex-1 flex-col lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-white/8 bg-[#0b0a07]/90 px-4 backdrop-blur-xl sm:px-6">
          <button
            onClick={() => setSidebarOpen((o) => !o)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-white/60 transition-colors hover:border-white/20 hover:text-white lg:hidden"
          >
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-white/35">Admin</span>
            <span className="text-white/20">/</span>
            <span className="font-medium text-white/80">
              {NAV_ITEMS.find((n) => pathname.startsWith(n.href))?.label ?? "Panel"}
            </span>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <Link
              href="/"
              target="_blank"
              className="text-xs text-white/35 transition-colors hover:text-white/60"
            >
              Ver sitio ↗
            </Link>
            <div className="h-4 w-px bg-white/10" />
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#AA6F3B]/20 text-[10px] font-bold text-[#AA6F3B]">
              A
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  )
}

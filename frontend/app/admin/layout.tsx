"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"

import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    // resetea estado y permite ver la página de login sin exigir token
    if (pathname === "/admin/login") {
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
        const base = process.env.NEXT_PUBLIC_API_URL || '/api'
        const res = await fetch(`${base}/admin/verify`, {
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
  }, [router, pathname])

  const tabs = useMemo(() => [
    { href: "/admin/productos", label: "Productos" },
    { href: "/admin/pedidos", label: "Pedidos" },
    { href: "/admin/lista-espera", label: "Lista de espera" },
  ], [])

  if (!checked) return null

  return (
    <div className="min-h-screen bg-primary">
      <Navigation />
      <div className="pt-10 sm:pt-12 pb-8 sm:pb-10 px-4">
        <div className="container mx-auto">
          {pathname !== "/admin/login" ? (
            <>
              <div className="flex items-center gap-4 mb-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    localStorage.removeItem("admin_token")
                    router.replace("/admin/login")
                  }}
                >
                  Cerrar sesión
                </Button>
                <h1 className="font-serif text-4xl font-bold text-white">Panel de Admin</h1>
              </div>
              <nav className="mb-4 border-b border-accent/40">
                <ul className="flex gap-3">
                  {tabs.map((t) => {
                    const active = pathname.startsWith(t.href)
                    return (
                      <li key={t.href}>
                        <Link
                          href={t.href}
                          className={
                            "px-4 py-2 -mb-[1px] inline-flex items-center rounded-t-md border-b-2 transition-colors " +
                            (active
                              ? "border-white text-white"
                              : "border-transparent text-text hover:text-white")
                          }
                          aria-current={active ? "page" : undefined}
                        >
                          {t.label}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </nav>
            </>
          ) : null}
          {children}
        </div>
      </div>
    </div>
  )
}

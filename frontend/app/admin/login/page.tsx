"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, ShieldCheck } from "lucide-react"
import Image from "next/image"
import { motion } from "framer-motion"
import { API_BASE_URL } from "@/lib/api"

export default function AdminLoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      let token = "dev_bypass_token"
      try {
        const res = await fetch(`${API_BASE_URL}/admin/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data?.error || "Credenciales inválidas")
        }
        const data = (await res.json()) as { token: string }
        token = data.token
      } catch (fetchErr: any) {
        if (process.env.NODE_ENV === "development") {
          console.warn("Bypassing login fetch in development (no backend)")
        } else {
          throw fetchErr
        }
      }
      
      localStorage.setItem("admin_token", token)
      try {
        const maxAge = 12 * 60 * 60
        document.cookie = `admin_token=${encodeURIComponent(token)}; Max-Age=${maxAge}; Path=/; SameSite=Lax; Secure`
      } catch {}
      router.replace("/admin/productos")
    } catch (err: any) {
      setError(err?.message || "Error al iniciar sesión")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0b0a07] px-4">
      {/* Background texture */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(170,111,59,0.12),transparent)]" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#AA6F3B]/30 to-transparent" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative w-full max-w-sm"
      >
        {/* Logo area */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm">
            <ShieldCheck className="h-7 w-7 text-[#AA6F3B]" />
          </div>
          <div className="text-center">
            <h1 className="font-serif text-2xl font-bold text-white">Panel de Administración</h1>
            <p className="mt-1 text-sm text-white/45">Fernet Los Horneros</p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/10 bg-white/4 p-6 shadow-[0_32px_80px_rgba(0,0,0,0.6)] backdrop-blur-xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username */}
            <div className="space-y-1.5">
              <label htmlFor="username" className="block text-xs font-semibold uppercase tracking-[0.15em] text-white/50">
                Usuario
              </label>
              <input
                id="username"
                type="text"
                placeholder="admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
                className="w-full rounded-xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-white placeholder:text-white/25 transition-all duration-150 focus:border-[#AA6F3B]/50 focus:bg-white/8 focus:outline-none focus:ring-2 focus:ring-[#AA6F3B]/20"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-[0.15em] text-white/50">
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  className="w-full rounded-xl border border-white/10 bg-white/6 px-4 py-3 pr-11 text-sm text-white placeholder:text-white/25 transition-all duration-150 focus:border-[#AA6F3B]/50 focus:bg-white/8 focus:outline-none focus:ring-2 focus:ring-[#AA6F3B]/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/35 transition-colors hover:text-white/70"
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-400"
                role="alert"
              >
                {error}
              </motion.div>
            )}

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: loading ? 1 : 1.02 }}
              whileTap={{ scale: loading ? 1 : 0.98 }}
              className="relative w-full overflow-hidden rounded-xl bg-[#AA6F3B] px-4 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(170,111,59,0.3)] transition-all duration-200 hover:bg-[#b87c47] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Ingresando...
                </span>
              ) : (
                "Ingresar"
              )}
            </motion.button>
          </form>
        </div>

        {/* Logo at bottom */}
        <div className="mt-8 flex items-center justify-center gap-2 opacity-25">
          <Image src="/logonuevo.webp" alt="" width={18} height={18} className="brightness-0 invert" />
          <span className="text-xs text-white">Los Horneros</span>
        </div>
      </motion.div>
    </div>
  )
}

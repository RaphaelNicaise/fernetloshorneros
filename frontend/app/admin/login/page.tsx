"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, ShieldCheck } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

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
      const base = process.env.NEXT_PUBLIC_API_URL || '/api'
      const res = await fetch(`${base}/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || "Credenciales inválidas")
      }
      const data = (await res.json()) as { token: string }
      localStorage.setItem("admin_token", data.token)
      router.replace("/admin")
    } catch (err: any) {
      setError(err?.message || "Error al iniciar sesión")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-primary">
      <div className="pt-24 sm:pt-32 pb-16 sm:pb-24 px-4">
        <div className="container mx-auto max-w-md">
          <Card className="bg-secondary border-accent/40">
            <CardHeader>
              <CardTitle className="font-serif text-3xl text-black flex items-center gap-2">
                <ShieldCheck className="size-6 text-black" /> Login Admin
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label htmlFor="username" className="block text-foreground font-semibold">
                    Usuario
                  </label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="admin"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="password" className="block text-foreground font-semibold">
                    Contraseña
                  </label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1.5 top-1.5 hover:bg-transparent hover:text-inherit"
                      aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                      onClick={() => setShowPassword((v) => !v)}
                    >
                      {showPassword ? <EyeOff /> : <Eye />}
                    </Button>
                  </div>
                </div>

                {error && (
                  <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
                    {error}
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Ingresando..." : "Ingresar"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

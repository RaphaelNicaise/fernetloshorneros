"use client"

import type React from "react"

import { Navigation } from "@/components/navigation"
import { API_BASE_URL } from "@/lib/api"
import { useState } from "react"

export const PROVINCIAS_ARGENTINA = ["Buenos Aires", "Catamarca", "Chaco", "Chubut", "Córdoba", "Corrientes", "Entre Ríos", "Formosa", "Jujuy", "La Pampa", "La Rioja", "Mendoza", "Misiones", "Neuquén", "Río Negro", "Salta", "San Juan", "San Luis", "Santa Cruz", "Santa Fe", "Santiago del Estero", "Tierra del Fuego", "Tucumán"];

export default function WaitlistPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    province: "",
  })
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const res = await fetch(`${API_BASE_URL}/waitlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: formData.name.trim(),
          email: formData.email.trim(),
          provincia: formData.province,
        }),
      })

      if (!res.ok) {
        // Intenta leer JSON para mostrar un mensaje amigable
        let friendly = "Ocurrió un problema. Intentá nuevamente."
        try {
          const data = await res.json()
          const rawMsg: string | undefined = data?.error || data?.message
          if (res.status === 409 || (rawMsg && rawMsg.toLowerCase().includes("ya está registrado"))) {
            friendly = "Este email ya está registrado en la lista de espera."
          } else if (rawMsg) {
            friendly = rawMsg
          }
        } catch {
          // Si no es JSON, no mostramos el texto crudo para evitar {"error":...}
        }
        throw new Error(friendly)
      }

      setSubmitted(true)
      setFormData({ name: "", email: "", province: "" })
    } catch (err: any) {
      setError(err?.message || "No pudimos enviar tu solicitud. Revisá tu conexión e intentá de nuevo.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  return (
    <div className="min-h-screen bg-primary">
      <Navigation />

      <div className="pt-24 sm:pt-32 pb-16 sm:pb-24 px-4">
        <div className="container mx-auto max-w-4xl">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-6">
              Únete a Nuestra Lista de Espera
            </h1>
            <p className="text-lg sm:text-xl text-text max-w-2xl mx-auto leading-relaxed">
              Sé el primero en conocer nuestros nuevos lotes, ediciones especiales y eventos exclusivos. Únete a la
              comunidad de Los Horneros.
            </p>
          </div>

          {/* Form */}
          <div className="bg-secondary rounded-lg p-6 sm:p-8 md:p-12">
            {submitted ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="font-serif text-2xl font-bold text-foreground mb-2">¡Bienvenido a la familia de Fernet Los Horneros!</h3>
                <p className="text-text">Te contactaremos pronto con novedades exclusivas.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-foreground font-semibold mb-2">
                    Nombre Completo *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-accent border border-accent text-foreground placeholder-text rounded-lg focus:outline-none focus:border-foreground transition-colors"
                    placeholder="Juan Pérez"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-foreground font-semibold mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-accent border border-accent text-foreground placeholder-text rounded-lg focus:outline-none focus:border-foreground transition-colors"
                    placeholder="juan@ejemplo.com"
                  />
                </div>

                <div>
                  <label htmlFor="province" className="block text-foreground font-semibold mb-2">
                    Provincia *
                  </label>
                  <select
                    id="province"
                    name="province"
                    required
                    value={formData.province}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-accent border border-accent text-foreground rounded-lg focus:outline-none focus:border-foreground transition-colors"
                  >
                    <option value="" disabled className="text-gray-400">
                      Seleccioná una provincia
                    </option>
                    {PROVINCIAS_ARGENTINA.map((p) => (
                      <option key={p} value={p} className="text-foreground">
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                {error && (
                  <div
                    className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                    role="alert"
                    aria-live="polite"
                  >
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full px-8 py-4 bg-white text-primary font-bold rounded-lg hover:bg-text transition-colors disabled:opacity-60"
                >
                  {isSubmitting ? "Enviando..." : "Unirme a la Lista de Espera"}
                </button>

                <p className="text-text text-sm text-center">
                  Al unirte, aceptas recibir comunicaciones de Fernet Los Horneros.
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

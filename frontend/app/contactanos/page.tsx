"use client"

import { useState } from "react"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { Mail, MessageCircle, Phone, Copy, Check, ExternalLink, ShieldCheck } from "lucide-react"

export default function ContactanosPage() {
  const [copiedEmail, setCopiedEmail] = useState(false)
  const [copiedPhone, setCopiedPhone] = useState(false)

  const email = "loshornerosbb@gmail.com"
  const phone = "+54 9 2916 41-5881"
  const phoneClean = "5492916415881"

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(email)
    setCopiedEmail(true)
    setTimeout(() => setCopiedEmail(false), 2000)
  }

  const handleCopyPhone = () => {
    navigator.clipboard.writeText(phone)
    setCopiedPhone(true)
    setTimeout(() => setCopiedPhone(false), 2000)
  }

  return (
    <div className="min-h-screen bg-[#080705] text-white flex flex-col overflow-x-hidden">
      <Navigation />
      <main className="flex-1 pt-28 pb-20">
        <section className="container mx-auto px-4 max-w-4xl">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-[#AA6F3B]/40 bg-[#AA6F3B]/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-widest text-[#AA6F3B] mb-4">
              <ShieldCheck className="h-3.5 w-3.5" />
              Atención Directa
            </div>
            <h1 className="font-serif text-4xl sm:text-5xl font-bold tracking-tight text-white mb-4">
              Contactanos
            </h1>
            <p className="text-lg text-white/60 max-w-xl mx-auto leading-relaxed">
              Estamos a tu disposición para consultas sobre preventas, compras, distribución o eventos.
            </p>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {/* Email Card */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-7 backdrop-blur-sm transition-all hover:border-[#AA6F3B]/50 hover:bg-white/[0.05]">
              <div className="flex items-center gap-4 mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#AA6F3B]/20 text-[#AA6F3B]">
                  <Mail className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-white/50">Correo Electrónico</h2>
                  <p className="text-base sm:text-lg font-bold text-white select-all">{email}</p>
                </div>
              </div>
              <p className="text-xs text-white/50 mb-6">
                Escribinos por consultas comerciales, pedidos o información general.
              </p>
              <div className="flex items-center gap-2">
                <a
                  href={`mailto:${email}`}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#AA6F3B] hover:bg-[#8a5a2f] text-white py-3 text-xs font-semibold uppercase tracking-wider transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                  Enviar Email
                </a>
                <button
                  type="button"
                  onClick={handleCopyEmail}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white px-4 py-3 text-xs font-medium transition-colors"
                  title="Copiar email"
                >
                  {copiedEmail ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                  {copiedEmail ? "Copiado" : "Copiar"}
                </button>
              </div>
            </div>

            {/* WhatsApp Card */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-7 backdrop-blur-sm transition-all hover:border-[#AA6F3B]/50 hover:bg-white/[0.05]">
              <div className="flex items-center gap-4 mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
                  <MessageCircle className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-white/50">WhatsApp / Teléfono</h2>
                  <p className="text-base sm:text-lg font-bold text-white select-all">{phone}</p>
                </div>
              </div>
              <p className="text-xs text-white/50 mb-6">
                Chateá en tiempo real con nuestro equipo para respuestas rápidas.
              </p>
              <div className="flex items-center gap-2">
                <a
                  href={`https://wa.me/${phoneClean}?text=Hola%20Fernet%20Los%20Horneros,%20quer%C3%ADa%20hacerles%20una%20consulta`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white py-3 text-xs font-semibold uppercase tracking-wider transition-colors"
                >
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </a>
                <a
                  href={`tel:${phone}`}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white px-3 py-3 text-xs font-medium transition-colors"
                  title="Llamar"
                >
                  <Phone className="h-4 w-4" />
                </a>
                <button
                  type="button"
                  onClick={handleCopyPhone}
                  className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white p-3 text-xs font-medium transition-colors"
                  title="Copiar teléfono"
                >
                  {copiedPhone ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Horario */}
          <div className="mt-12 text-center">
            <p className="text-xs text-white/40">
              Horario de atención: Lunes a Domingos de 9:00 a 20:00 hs (Bahía Blanca, Argentina).
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}

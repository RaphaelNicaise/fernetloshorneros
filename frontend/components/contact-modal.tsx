"use client"

import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Mail, MessageCircle, Phone, Copy, Check, X, ExternalLink } from "lucide-react"
import { useContactModal } from "@/lib/contact-modal-context"

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.25, ease: "easeOut" as const } },
  exit: { opacity: 0, transition: { duration: 0.2, ease: "easeIn" as const } },
}

const panelVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as const },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 15,
    transition: { duration: 0.2, ease: "easeIn" as const },
  },
}

export function ContactModal() {
  const { isOpen, close } = useContactModal()
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
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <motion.div
            key="backdrop"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="absolute inset-0 bg-[#080705]/85 backdrop-blur-md"
            onClick={close}
          />

          <motion.div
            key="panel"
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative w-full max-w-md overflow-hidden rounded-2xl border border-[#AA6F3B]/30 bg-[#120e0b] p-6 sm:p-7 shadow-[0_0_50px_rgba(170,111,59,0.15)]"
            role="dialog"
            aria-modal="true"
            aria-label="Contacto"
          >
            {/* Ambient gold glow */}
            <div className="pointer-events-none absolute left-1/2 top-0 h-28 w-48 -translate-x-1/2 bg-[#AA6F3B]/15 blur-2xl" />

            {/* Header */}
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <span className="inline-block text-[11px] font-semibold uppercase tracking-widest text-[#AA6F3B] mb-1">
                  Atención Directa
                </span>
                <h2 className="font-serif text-2xl font-bold text-white">Contactanos</h2>
                <p className="text-xs text-white/60 mt-0.5">
                  Escribinos o llamanos por cualquiera de nuestros canales oficiales:
                </p>
              </div>
              <button
                type="button"
                onClick={close}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Contact Items */}
            <div className="space-y-3">
              {/* Email Card */}
              <div className="rounded-xl border border-white/10 bg-black/40 p-4 transition-all hover:border-[#AA6F3B]/40">
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#AA6F3B]/15 text-[#AA6F3B]">
                    <Mail className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs text-white/50 uppercase font-medium">Correo Electrónico</p>
                    <p className="text-sm font-semibold text-white select-all">{email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                  <a
                    href={`mailto:${email}`}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#AA6F3B] hover:bg-[#8a5a2f] text-white py-2 text-xs font-semibold transition-colors"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Enviar Mail
                  </a>
                  <button
                    type="button"
                    onClick={handleCopyEmail}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white px-3 py-2 text-xs font-medium transition-colors"
                    title="Copiar email"
                  >
                    {copiedEmail ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                    {copiedEmail ? "Copiado" : "Copiar"}
                  </button>
                </div>
              </div>

              {/* Phone / WhatsApp Card */}
              <div className="rounded-xl border border-white/10 bg-black/40 p-4 transition-all hover:border-[#AA6F3B]/40">
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
                    <MessageCircle className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs text-white/50 uppercase font-medium">WhatsApp / Teléfono</p>
                    <p className="text-sm font-semibold text-white select-all">{phone}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                  <a
                    href={`https://wa.me/${phoneClean}?text=Hola%20Fernet%20Los%20Horneros,%20quer%C3%ADa%20hacerles%20una%20consulta`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white py-2 text-xs font-semibold transition-colors"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    WhatsApp
                  </a>
                  <a
                    href={`tel:${phone}`}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white px-3 py-2 text-xs font-medium transition-colors"
                    title="Llamar"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    Llamar
                  </a>
                  <button
                    type="button"
                    onClick={handleCopyPhone}
                    className="inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white p-2 text-xs font-medium transition-colors"
                    title="Copiar número"
                  >
                    {copiedPhone ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Footer notice */}
            <div className="mt-5 text-center">
              <p className="text-[11px] text-white/40">
                Respondemos consultas todos los días de 9:00 a 20:00 hs.
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

"use client"

import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import { ShieldAlert, ShieldCheck, ArrowRight, ArrowLeft } from "lucide-react"

export function AgeGate() {
  const [mounted, setMounted] = useState(false)
  const [isVerified, setIsVerified] = useState(true) // Start as true to prevent server flash
  const [isRejected, setIsRejected] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    setMounted(true)
    const verified = localStorage.getItem("loshorneros_age_verified")
    if (verified === "true") {
      setIsVerified(true)
    } else {
      setIsVerified(false)
    }
  }, [])

  // Do not display AgeGate in admin panel or if not mounted
  if (!mounted || pathname?.startsWith("/admin")) {
    return null
  }

  const handleConfirmAge = () => {
    try {
      localStorage.setItem("loshorneros_age_verified", "true")
    } catch {
      // Storage might be restricted
    }
    setIsVerified(true)
  }

  const handleRejectAge = () => {
    setIsRejected(true)
    if (typeof window !== "undefined") {
      // If user came from another site, attempt to go back
      if (window.history.length > 1 && document.referrer && !document.referrer.includes(window.location.host)) {
        window.history.back()
      }
    }
  }

  const handleExitSite = () => {
    if (typeof window !== "undefined") {
      if (window.history.length > 1) {
        window.history.back()
      } else {
        window.location.href = "https://www.google.com"
      }
    }
  }

  return (
    <AnimatePresence>
      {!isVerified && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.4, ease: "easeInOut" } }}
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-[#080705]/95 backdrop-blur-2xl p-4 sm:p-6"
        >
          {/* Subtle atmospheric gold glow */}
          <div className="absolute w-96 h-96 bg-[#AA6F3B]/10 rounded-full blur-3xl pointer-events-none -top-20 -left-20" />
          <div className="absolute w-96 h-96 bg-[#AA6F3B]/10 rounded-full blur-3xl pointer-events-none -bottom-20 -right-20" />

          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: -10 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-[#AA6F3B]/30 bg-[#0d0c09] p-7 sm:p-10 text-center shadow-[0_0_60px_rgba(170,111,59,0.18)]"
          >
            {/* Header Badge */}
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-black/40 border border-[#AA6F3B]/30 p-2 shadow-inner">
              <Image
                src="/logonuevo.webp"
                alt="Los Horneros Fernet"
                width={64}
                height={64}
                className="brightness-0 invert object-contain"
                priority
              />
            </div>

            {!isRejected ? (
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full border border-[#AA6F3B]/40 bg-[#AA6F3B]/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-widest text-[#AA6F3B] mb-4">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Control de Edad
                </div>

                <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-white mb-3">
                  ¿Tenés más de 18 años?
                </h1>

                <p className="text-sm sm:text-base text-neutral-300 mb-8 leading-relaxed">
                  Para ingresar a este sitio y comprar nuestros productos debés tener la edad legal para consumir bebidas con graduación alcohólica en tu país.
                </p>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3.5">
                  <button
                    type="button"
                    onClick={handleConfirmAge}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-[#AA6F3B] hover:bg-[#8a5a2f] text-white px-7 py-3.5 text-sm font-semibold tracking-wide uppercase transition-all duration-200 hover:shadow-[0_0_25px_rgba(170,111,59,0.5)] active:scale-95"
                  >
                    Sí, soy mayor (+18)
                    <ArrowRight className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={handleRejectAge}
                    className="inline-flex items-center justify-center rounded-full border border-white/20 hover:border-white/40 bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white px-6 py-3.5 text-sm font-medium transition-colors"
                  >
                    No, soy menor
                  </button>
                </div>

                <div className="mt-8 border-t border-white/10 pt-4">
                  <p className="text-[11px] text-neutral-500 uppercase tracking-wider">
                    Beber con moderación. Prohibida su venta a menores de 18 años. Ley 24.788.
                  </p>
                </div>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <div className="inline-flex items-center gap-1.5 rounded-full border border-red-500/40 bg-red-500/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-widest text-red-400 mb-4">
                  <ShieldAlert className="h-3.5 w-3.5" />
                  Acceso Restringido
                </div>

                <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-white mb-3">
                  No podés comprar alcohol
                </h2>

                <p className="text-sm sm:text-base text-neutral-300 mb-8 leading-relaxed">
                  Lo sentimos, no podés acceder al sitio web ni adquirir bebidas alcohólicas siendo menor de 18 años, de conformidad con la Ley Nacional N° 24.788.
                </p>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3.5">
                  <button
                    type="button"
                    onClick={handleExitSite}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-red-600 hover:bg-red-700 text-white px-7 py-3.5 text-sm font-semibold tracking-wide uppercase transition-all duration-200 active:scale-95"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Salir del sitio
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsRejected(false)}
                    className="inline-flex items-center justify-center rounded-full border border-white/20 hover:border-white/40 bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white px-5 py-3.5 text-xs font-medium transition-colors"
                  >
                    ¿Te equivocaste? Volver
                  </button>
                </div>

                <div className="mt-8 border-t border-white/10 pt-4">
                  <p className="text-[11px] text-neutral-500 uppercase tracking-wider">
                    Cumplimiento normativo Ley Nacional N° 24.788 de Lucha contra el Alcoholismo.
                  </p>
                </div>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

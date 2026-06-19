"use client"

import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useEffect, Suspense } from "react"
import { API_BASE_URL } from "@/lib/api"

function PaymentFailureContent() {
  const searchParams = useSearchParams()
  
  useEffect(() => {
    const reference = searchParams.get("external_reference")
    if (reference) {
      // Intentar cancelar la orden si el usuario volvió a la tienda o el pago fue rechazado de inmediato
      fetch(`${API_BASE_URL}/payments/cancel/${reference}`, {
        method: "POST",
      }).catch(err => console.error("Error cancelando orden al volver:", err))
    }
  }, [searchParams])

  return (
    <div className="max-w-md mx-auto text-center">
      <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg
          className="w-12 h-12 text-red-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </div>
      <h1 className="font-serif text-3xl font-bold text-foreground mb-4">
        Pago Rechazado
      </h1>
      <p className="text-muted-foreground mb-8">
        Lo sentimos, tu pago no pudo ser procesado. Por favor, intenta nuevamente o utiliza
        otro método de pago.
      </p>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Link
          href="/cart"
          className="inline-flex items-center justify-center px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-lg transition-all duration-200 transform-gpu hover:bg-primary/90 hover:shadow-md hover:scale-105 active:scale-95"
        >
          Volver al Carrito
        </Link>
        <Link
          href="/"
          className="inline-flex items-center justify-center px-6 py-3 border border-primary text-primary font-semibold rounded-lg transition-all duration-200 transform-gpu hover:bg-primary/10 hover:scale-105 active:scale-95"
        >
          Ir al Inicio
        </Link>
      </div>
    </div>
  )
}

export default function PaymentFailurePage() {
  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
      <Navigation />

      <main className="flex-1">
        <div className="container mx-auto px-4 pt-28 pb-20 sm:pt-32">
          <Suspense fallback={<div className="text-center text-muted-foreground">Cargando...</div>}>
            <PaymentFailureContent />
          </Suspense>
        </div>
      </main>

      <Footer />
    </div>
  )
}

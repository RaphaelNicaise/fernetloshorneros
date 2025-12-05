"use client"

import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import Link from "next/link"

export default function PaymentPendingPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />

      <main className="flex-1">
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-md mx-auto text-center">
            <div className="w-24 h-24 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-12 h-12 text-yellow-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h1 className="font-serif text-3xl font-bold text-foreground mb-4">
              Pago Pendiente
            </h1>
            <p className="text-muted-foreground mb-8">
              Tu pago está siendo procesado. Te notificaremos por correo electrónico cuando se
              confirme el pago.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/"
                className="inline-flex items-center justify-center px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-lg transition-all duration-200 transform-gpu hover:bg-primary/90 hover:shadow-md hover:scale-105 active:scale-95"
              >
                Volver al Inicio
              </Link>
              <Link
                href="/productos"
                className="inline-flex items-center justify-center px-6 py-3 border border-primary text-primary font-semibold rounded-lg transition-all duration-200 transform-gpu hover:bg-primary/10 hover:scale-105 active:scale-95"
              >
                Ver Productos
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

"use client"

import { useEffect, useState } from "react"
import { initMercadoPago, Payment } from "@mercadopago/sdk-react"
import { api } from "@/lib/api"
import { useRouter } from "next/navigation"
import { Lock, ShieldCheck } from "lucide-react"
import type { ShippingData } from "./step-shipping"
import type { CouponData } from "./step-coupon-summary"
import type { CartItem } from "@/lib/cart-context"

// Inicializar MP
const MP_PUBLIC_KEY = process.env.NEXT_PUBLIC_MP_PUBLIC_KEY || "APP_USR-6caa59ec-7cdf-4901-abee-a3d549ca8ccb"
console.log("[PaymentBrick] Inicializando SDK con Public Key que empieza en:", MP_PUBLIC_KEY.substring(0, 12))
initMercadoPago(MP_PUBLIC_KEY)

interface StepPaymentProps {
  items: CartItem[]
  shipping: ShippingData
  coupon: CouponData | null
  total: number
  onBack: () => void
}

export function StepPayment({ items, shipping, coupon, total, onBack }: StepPaymentProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const initialization = {
    amount: total,
    payer: {
      email: shipping.contact.email,
      entityType: "individual",
    }
  }

  const onSubmit = async ({ formData }: any) => {
    console.log("[PaymentBrick] onSubmit ejecutado. Datos recibidos del Brick:", formData)
    setIsProcessing(true)
    setError(null)
    
    try {
      // 1. Armar orderData igual que createPreference
      const orderData = {
        items: items.map(i => ({ id: i.id, quantity: i.quantity })),
        shipping: {
          cost: shipping.shipping_cost,
          rate_id: shipping.rate_id,
          service_type: shipping.service_type,
          logistic_type: null, // MP brick flow simplificado
          carrier_id: null,
          point_id: null,
          address: shipping.address,
          contact: shipping.contact,
        },
        couponCode: coupon?.codigo
      }

      // 2. Enviar a nuestro backend endpoint unificado
      const res = await api.post("/payments/process", {
        formData,
        orderData
      })

      // 3. Evaluar respuesta
      if (res.data.status === "approved" || res.data.status === "pending" || res.data.status === "in_process") {
        router.push("/payment/success")
      } else {
        setError(`El pago fue rechazado. (${res.data.status_detail || res.data.status}). Por favor, intenta con otro medio de pago.`)
        setIsProcessing(false)
      }
    } catch (err: any) {
      console.error("Error procesando pago:", err)
      setError(err.message || "Ocurrió un error al procesar el pago. Por favor, intenta nuevamente.")
      setIsProcessing(false)
    }
  }

  const onError = (error: any) => {
    console.error("[PaymentBrick] Error interno del Brick (onError):", error)
    if (error && typeof error === 'object') {
      try {
        console.error("[PaymentBrick] Detalles del error:", JSON.stringify(error, null, 2))
      } catch (e) {}
    }
    setError("Ocurrió un error al cargar el formulario de pago. Revisá la consola para más detalles.")
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="flex items-center gap-3 rounded-2xl bg-green-50/50 p-4 border border-green-100">
        <ShieldCheck className="h-6 w-6 text-green-600" />
        <div>
          <p className="text-sm font-semibold text-green-900">Pago 100% seguro</p>
          <p className="text-xs text-green-700">Tus datos están protegidos por Mercado Pago</p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 shadow-sm">
          <p className="font-semibold">Atención</p>
          <p>{error}</p>
        </div>
      )}

      <div className="relative overflow-hidden rounded-2xl border border-black/8 bg-white shadow-[0_18px_38px_rgba(11,10,7,0.05)] min-h-[400px]">
        {/* Este ID es usado por la SDK internamente */}
        <div className="p-1 sm:p-4">
          <Payment
            initialization={initialization}
            onSubmit={onSubmit}
            onError={onError}
          />
        </div>
        
        {isProcessing && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#aa825e] border-t-transparent" />
            <p className="mt-4 font-serif font-bold text-[#0b0a07]">Procesando tu pago...</p>
            <p className="text-sm text-black/50">Por favor no cierres esta ventana</p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-2">
        <button 
          onClick={onBack} 
          disabled={isProcessing}
          className="text-sm font-medium text-black/50 hover:text-[#0b0a07] transition-colors disabled:opacity-50"
        >
          Volver
        </button>
        <div className="flex items-center gap-1.5 text-xs font-medium text-black/40">
          <Lock className="h-3 w-3" />
          <span>Transacción encriptada</span>
        </div>
      </div>
    </div>
  )
}

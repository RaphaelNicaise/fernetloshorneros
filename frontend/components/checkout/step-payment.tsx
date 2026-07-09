"use client"

import { useEffect, useState } from "react"
import { initMercadoPago, Payment } from "@mercadopago/sdk-react"
import { api } from "@/lib/api"
import { useRouter } from "next/navigation"
import { Lock, ShieldCheck, Loader2 } from "lucide-react"
import type { ShippingData } from "./step-shipping"
import type { CouponData } from "./step-coupon-summary"
import type { CartItem } from "@/lib/cart-context"

// Inicializar MP
const MP_PUBLIC_KEY = process.env.NEXT_PUBLIC_MP_PUBLIC_KEY
if (!MP_PUBLIC_KEY) {
  console.error("[PaymentBrick] ERROR: NEXT_PUBLIC_MP_PUBLIC_KEY no está definida.")
}
console.log("[PaymentBrick] Public Key:", MP_PUBLIC_KEY?.substring(0, 12))
if (MP_PUBLIC_KEY) {
  initMercadoPago(MP_PUBLIC_KEY, { locale: "es-AR" })
}

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
  const [preferenceId, setPreferenceId] = useState<string | null>(null)
  const [orderId, setOrderId] = useState<number | null>(null)
  const [externalReference, setExternalReference] = useState<string | null>(null)
  const [isLoadingPreference, setIsLoadingPreference] = useState(true)

  // Al montar, crear la preferencia + orden + reservar stock via createPreference
  useEffect(() => {
    let cancelled = false

    const initPayment = async () => {
      try {
        setIsLoadingPreference(true)
        setError(null)

        // Usamos el endpoint que YA crea orden + reserva stock + genera preferencia
        const orderData = {
          items: items.map(i => ({ id: i.id, quantity: i.quantity })),
          shipping: {
            cost: shipping.shipping_cost,
            rate_id: shipping.rate_id,
            service_type: shipping.service_type,
            logistic_type: null,
            carrier_id: null,
            point_id: null,
            address: shipping.address,
            contact: shipping.contact,
          },
          couponCode: coupon?.codigo
        }

        console.log("[PaymentBrick] Creando preferencia + orden:", orderData)
        const res = await api.post("/payments/create-preference", orderData)
        
        if (!cancelled) {
          console.log("[PaymentBrick] Preferencia:", res.data.id, "Orden:", res.data.order_id)
          setPreferenceId(res.data.id)
          setOrderId(res.data.order_id)
          setExternalReference(res.data.external_reference)
        }
      } catch (err: any) {
        if (!cancelled) {
          console.error("[PaymentBrick] Error creando preferencia:", err)
          setError(err.response?.data?.error || "Error al preparar el formulario de pago. Intenta nuevamente.")
        }
      } finally {
        if (!cancelled) {
          setIsLoadingPreference(false)
        }
      }
    }

    initPayment()
    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const initialization = preferenceId ? {
    amount: total,
    preferenceId: preferenceId,
    payer: {
      email: shipping.contact.email,
    }
  } : null

  const onSubmit = async ({ formData }: any) => {
    console.log("[PaymentBrick] onSubmit. formData:", formData, "orderId:", orderId)
    setIsProcessing(true)
    setError(null)
    
    try {
      // Enviar formData del Brick + orderId de la orden ya creada
      const res = await api.post("/payments/process", {
        formData,
        orderId
      })

      if (res.data.status === "approved" || res.data.status === "pending" || res.data.status === "in_process") {
        router.push("/payment/success")
      } else {
        setError(`El pago fue rechazado. (${res.data.status_detail || res.data.status}). Por favor, intenta con otro medio de pago.`)
        setIsProcessing(false)
      }
    } catch (err: any) {
      console.error("Error procesando pago:", err)
      setError(err.response?.data?.error || err.message || "Ocurrió un error al procesar el pago.")
      setIsProcessing(false)
    }
  }

  const onBrickError = (error: any) => {
    // Errores non_critical son informativos (usuario aún escribiendo tarjeta)
    if (error?.type === "non_critical") {
      console.warn("[PaymentBrick] non_critical:", error.message)
      return
    }
    console.error("[PaymentBrick] Error crítico:", error)
    setError("Ocurrió un error al cargar el formulario de pago.")
  }

  const handleBack = async () => {
    if (externalReference && !isProcessing) {
      try {
        console.log("[PaymentBrick] Cancelando orden:", externalReference)
        await api.post(`/payments/cancel/${externalReference}`)
      } catch (err) {
        console.error("Error cancelando orden al volver:", err)
      }
    }
    onBack()
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
        <div className="p-1 sm:p-4">
          {isLoadingPreference ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-[#aa825e]" />
              <p className="text-sm text-black/50">Preparando formulario de pago...</p>
            </div>
          ) : initialization ? (
            <Payment
              initialization={initialization}
              customization={{
                paymentMethods: {
                  creditCard: "all",
                  debitCard: "all",
                  ticket: "all",
                },
              }}
              onSubmit={onSubmit}
              onError={onBrickError}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <p className="text-sm text-red-600">No se pudo cargar el formulario de pago.</p>
              <button
                onClick={() => window.location.reload()}
                className="rounded-xl bg-[#0b0a07] px-6 py-3 text-sm font-medium text-white hover:bg-black/80"
              >
                Reintentar
              </button>
            </div>
          )}
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
          onClick={handleBack} 
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

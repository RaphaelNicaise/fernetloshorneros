"use client"

import { useState } from "react"
import { api } from "@/lib/api"
import { Tag, Loader2, CheckCircle2, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"

export interface CouponData {
  codigo: string
  tipo_descuento: 'porcentaje' | 'fijo' | 'envio_gratis'
  valor: number
  amountApplied: number
}

interface StepCouponSummaryProps {
  cartTotal: number
  shippingCost: number
  onContinue: (coupon: CouponData | null) => void
  onBack: () => void
  appliedCoupon: CouponData | null
}

export function StepCouponSummary({ cartTotal, shippingCost, onContinue, onBack, appliedCoupon }: StepCouponSummaryProps) {
  const [couponCode, setCouponCode] = useState(appliedCoupon?.codigo || "")
  const [loading, setLoading] = useState(false)
  const [couponState, setCouponState] = useState<CouponData | null>(appliedCoupon)
  const [error, setError] = useState<string>("")

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return
    setLoading(true)
    setError("")
    
    try {
      // Usamos el endpoint existente que devuelve los datos del cupón
      const { data } = await api.get(`/coupons/${couponCode.toUpperCase()}`)
      
      let amountApplied = 0
      if (data.tipo_descuento === "porcentaje") {
        amountApplied = (cartTotal * data.valor) / 100
      } else if (data.tipo_descuento === "fijo") {
        amountApplied = data.valor
      } else if (data.tipo_descuento === "envio_gratis") {
        amountApplied = shippingCost
      }

      // El descuento fijo/porcentaje no puede superar el costo de los productos
      if (data.tipo_descuento !== "envio_gratis" && amountApplied > cartTotal) {
        amountApplied = cartTotal
      }

      setCouponState({ ...data, amountApplied })
    } catch (err: any) {
      setError(err.message || "Cupón inválido o expirado")
      setCouponState(null)
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveCoupon = () => {
    setCouponCode("")
    setCouponState(null)
    setError("")
  }

  const total = cartTotal + shippingCost - (couponState?.amountApplied || 0)

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="rounded-2xl border border-black/8 bg-white p-5 sm:p-7 shadow-[0_18px_38px_rgba(11,10,7,0.05)]">
        <h2 className="mb-5 font-serif text-xl font-bold text-[#0b0a07]">Cupón de Descuento</h2>
        
        {couponState ? (
          <div className="flex items-center justify-between rounded-xl border border-green-200 bg-green-50 p-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
              <div>
                <p className="font-bold text-green-900">{couponState.codigo}</p>
                <p className="text-sm text-green-700">
                  {couponState.tipo_descuento === 'envio_gratis' 
                    ? 'Envío gratis aplicado' 
                    : `Descuento de $${couponState.amountApplied.toLocaleString('es-AR')} aplicado`}
                </p>
              </div>
            </div>
            <button onClick={handleRemoveCoupon} className="text-sm font-medium text-green-800 hover:underline">
              Quitar
            </button>
          </div>
        ) : (
          <div className="flex max-w-md flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Tag className="h-5 w-5 text-black/30" />
              </div>
              <input
                type="text"
                placeholder="Ingresar código"
                value={couponCode}
                onChange={e => setCouponCode(e.target.value.toUpperCase())}
                className={cn(
                  "block w-full rounded-xl border border-black/10 bg-white py-3 pr-4 pl-10 text-[#0b0a07] placeholder:text-black/30 focus:border-[#aa825e]/45 focus:ring-2 focus:ring-[#aa825e]/20 focus:outline-none transition-all uppercase",
                  error && "border-red-300 focus:border-red-500 focus:ring-red-200"
                )}
              />
            </div>
            <button
              onClick={handleApplyCoupon}
              disabled={!couponCode.trim() || loading}
              className="flex items-center justify-center rounded-xl bg-[#0b0a07] px-6 py-3 font-medium text-white transition-all hover:bg-black/80 disabled:opacity-50 sm:w-auto"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Aplicar"}
            </button>
          </div>
        )}
        {error && (
          <div className="mt-2 flex items-center gap-1.5 text-sm text-red-600">
            <XCircle className="h-4 w-4" />
            <p>{error}</p>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-[#aa825e]/20 bg-[#fbf8f5] p-5 sm:p-7">
        <h2 className="mb-5 font-serif text-xl font-bold text-[#0b0a07]">Resumen Final</h2>
        
        <div className="space-y-3 text-sm sm:text-base">
          <div className="flex justify-between text-black/60">
            <span>Subtotal (productos)</span>
            <span>${cartTotal.toLocaleString("es-AR")}</span>
          </div>
          <div className="flex justify-between text-black/60">
            <span>Envío</span>
            <span>${shippingCost.toLocaleString("es-AR")}</span>
          </div>
          {couponState && (
            <div className="flex justify-between font-medium text-green-600">
              <span>Descuento ({couponState.codigo})</span>
              <span>-${couponState.amountApplied.toLocaleString("es-AR")}</span>
            </div>
          )}
          <div className="my-4 h-px w-full bg-black/10" />
          <div className="flex justify-between items-end">
            <span className="font-serif text-xl font-bold text-[#0b0a07]">Total a Pagar</span>
            <span className="text-2xl font-black text-[#aa825e]">
              ${total.toLocaleString("es-AR")}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        <button onClick={onBack} className="text-sm font-medium text-black/50 hover:text-[#0b0a07] transition-colors">
          Volver
        </button>
        <button
          onClick={() => onContinue(couponState)}
          className="inline-flex transform-gpu items-center justify-center rounded-full bg-[#aa825e] px-8 py-3.5 font-semibold text-white transition-all duration-200 hover:scale-[1.01] hover:bg-[#b78d68] hover:shadow-lg active:scale-95"
        >
          Ir al pago seguro
        </button>
      </div>
    </div>
  )
}

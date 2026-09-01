"use client"

import type { CartItem } from "@/lib/cart-context"
import type { ShippingData } from "./step-shipping"
import type { CouponData } from "./step-coupon-summary"

interface OrderSummarySidebarProps {
  items: CartItem[]
  shipping: ShippingData | null
  coupon: CouponData | null
}

export function OrderSummarySidebar({ items, shipping, coupon }: OrderSummarySidebarProps) {
  if (items.length === 0) return null

  const itemsTotal = items.reduce((acc, item) => acc + (item.price * item.quantity), 0)
  const shippingCost = shipping?.shipping_cost || 0
  const discount = coupon?.amountApplied || 0
  const total = itemsTotal + shippingCost - discount

  return (
    <div className="rounded-2xl border border-black/8 bg-white p-5 sm:p-6 shadow-[0_18px_38px_rgba(11,10,7,0.03)] lg:sticky lg:top-24">
      <h2 className="mb-4 font-serif text-lg font-bold text-[#0b0a07]">Tu pedido</h2>
      
      {/* Items preview (max 3, luego "y X más") */}
      <div className="mb-6 space-y-3">
        {items.slice(0, 3).map(item => (
          <div key={item.id} className="flex items-center gap-3">
            <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-[#f5f0e6]">
              <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
              <div className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-black/60 text-[10px] font-bold text-white">
                {item.quantity}
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-semibold text-[#0b0a07]">{item.name}</p>
              <p className="text-xs text-black/50">${(item.price * item.quantity).toLocaleString("es-AR")}</p>
            </div>
          </div>
        ))}
        {items.length > 3 && (
          <p className="text-xs font-medium text-black/40">y {items.length - 3} producto(s) más...</p>
        )}
      </div>

      <div className="mb-4 h-px w-full bg-black/5" />

      {/* Totals */}
      <div className="space-y-2.5 text-sm">
        <div className="flex justify-between text-black/60">
          <span>Subtotal</span>
          <span>${itemsTotal.toLocaleString("es-AR")}</span>
        </div>
        
        {shipping && (
          <div className="flex justify-between text-black/60">
            <span>Envío ({shipping.carrier_name})</span>
            <span>${shippingCost.toLocaleString("es-AR")}</span>
          </div>
        )}
        
        {coupon && (
          <div className="flex justify-between font-medium text-green-600">
            <span>Descuento</span>
            <span>-${discount.toLocaleString("es-AR")}</span>
          </div>
        )}
      </div>

      <div className="mt-4 mb-1 h-px w-full bg-black/5" />

      <div className="flex items-end justify-between pt-2">
        <span className="font-serif text-base font-bold text-[#0b0a07]">Total</span>
        <span className="font-serif text-2xl font-bold text-[#aa825e]">${total.toLocaleString("es-AR")}</span>
      </div>
    </div>
  )
}

"use client"

import { Trash2 } from "lucide-react"
import type { CartItem } from "@/lib/cart-context"
import type { Product } from "@/lib/api"
import { useState } from "react"

interface StepProductsProps {
  items: CartItem[]
  updateQuantity: (id: string, quantity: number) => void
  removeItem: (id: string) => void
  addItem: (item: Omit<CartItem, "quantity">) => void
  totalPrice: number
  minPurchaseAmount: number
  recommended: Product[]
  onContinue: () => void
}

function RecommendedCard({
  product,
  onAdd,
  wide,
}: {
  product: Product
  onAdd: () => void
  wide?: boolean
}) {
  const [added, setAdded] = useState(false)
  const outOfStock = (product.stock ?? 0) <= 0

  const handleAdd = () => {
    if (outOfStock) return
    onAdd()
    setAdded(true)
    setTimeout(() => setAdded(false), 1200)
  }

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border border-black/8 bg-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_38px_rgba(11,10,7,0.08)] ${wide ? "flex flex-row items-center" : ""}`}
    >
      <div className={`relative overflow-hidden ${wide ? "h-28 w-28 flex-shrink-0" : "h-32"}`}>
        <img
          src={product.image || "/placeholder.svg"}
          alt={product.name}
          className={`h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 ${outOfStock ? "opacity-50" : ""}`}
        />
      </div>
      <div className={`flex flex-col gap-1.5 p-3 ${wide ? "flex-1" : ""}`}>
        <p className="text-foreground line-clamp-1 text-sm leading-tight font-semibold">
          {product.name}
        </p>
        {product.description && (
          <p className="line-clamp-1 text-xs text-black/55">{product.description}</p>
        )}
        <div className="mt-auto flex items-center justify-between gap-2">
          <span className="font-serif text-sm font-bold text-[#0b0a07]">
            ${Number(product.price || 0).toLocaleString("es-AR")}
          </span>
          {outOfStock ? (
            <span className="text-xs text-black/45">Sin stock</span>
          ) : (
            <button
              onClick={handleAdd}
              className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-[#aa825e]/30 px-3 py-1.5 text-xs font-medium text-[#6B5743] transition-all duration-150 hover:border-[#aa825e]/50 hover:bg-[#aa825e]/10 hover:text-[#0b0a07] active:scale-95"
            >
              {added ? (
                <>
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Agregado
                </>
              ) : (
                <>+ Agregar</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export function StepProducts({
  items,
  updateQuantity,
  removeItem,
  addItem,
  totalPrice,
  minPurchaseAmount,
  recommended,
  onContinue,
}: StepProductsProps) {
  const canContinue = items.length > 0 && totalPrice >= minPurchaseAmount

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-2xl border border-black/8 bg-white p-4 shadow-[0_18px_38px_rgba(11,10,7,0.05)] sm:p-6"
          >
            <div className="flex gap-4">
              <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-[#f5f0e6] sm:h-24 sm:w-24">
                <img src={item.image || "/placeholder.svg"} alt={item.name} className="h-full w-full object-cover" />
              </div>
              <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:justify-between">
                <div>
                  <h3 className="mb-1 font-serif text-base font-bold text-[#0b0a07] sm:text-lg">{item.name}</h3>
                  <p className="mb-3 text-xs text-black/55 sm:text-sm">
                    ${Number(item.price || 0).toLocaleString("es-AR")} por artículo
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1 rounded-full border border-[#6B5743]/18 bg-[#f8f5f1] p-1">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        aria-label={`Reducir cantidad de ${item.name}`}
                        className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-lg leading-none font-medium text-[#6B5743] transition-colors hover:bg-[#aa825e]/14 hover:text-[#0b0a07] active:scale-95"
                      >
                        <span className="-mt-px">-</span>
                      </button>
                      <span className="flex min-w-11 items-center justify-center px-2 text-sm font-semibold text-[#0b0a07] tabular-nums">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        aria-label={`Aumentar cantidad de ${item.name}`}
                        className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-lg leading-none font-medium text-[#6B5743] transition-colors hover:bg-[#aa825e]/14 hover:text-[#0b0a07] active:scale-95"
                      >
                        <span className="-mt-px">+</span>
                      </button>
                    </div>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="cursor-pointer text-sm text-black/48 transition-colors hover:text-[#aa825e]"
                      aria-label={`Quitar ${item.name} del carrito`}
                    >
                      <Trash2 className="h-5 w-5 text-red-400 transition-colors hover:text-red-500" />
                    </button>
                  </div>
                </div>
                <div className="mt-2 text-left sm:mt-0 sm:text-right">
                  <p className="font-serif text-base font-bold text-[#0b0a07] sm:text-lg">
                    ${(Number(item.price || 0) * (item.quantity || 1)).toLocaleString("es-AR")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Upsell */}
      {recommended.length > 0 && (
        <div className="pt-2 pb-1">
          <p className="mb-3 text-sm font-medium text-black/52">¿Te falta algo para tu set?</p>
          <div className={`grid gap-3 ${recommended.length === 1 ? "max-w-sm grid-cols-1" : "grid-cols-1 sm:grid-cols-2"}`}>
            {recommended.map((product) => (
              <RecommendedCard
                key={product.id}
                product={product}
                wide={recommended.length === 1}
                onAdd={() =>
                  addItem({
                    id: product.id,
                    name: product.name,
                    price: product.price,
                    image: product.image,
                    stock: product.stock ?? 0,
                    limite: product.limite ?? 0,
                  })
                }
              />
            ))}
          </div>
        </div>
      )}

      {/* Alerta monto mínimo */}
      {totalPrice < minPurchaseAmount && minPurchaseAmount > 0 && (
        <div className="border-l-4 border-[#aa825e] bg-[#f5ede5] p-4 text-[#6B5743]" role="alert">
          <p className="font-bold">Atención</p>
          <p>
            El monto mínimo de compra es de ${minPurchaseAmount.toLocaleString("es-AR")}.
            ¡Agregá más productos para continuar!
          </p>
        </div>
      )}

      {/* Botón continuar */}
      <div className="flex justify-end pt-2">
        <button
          onClick={onContinue}
          disabled={!canContinue}
          className="inline-flex transform-gpu items-center justify-center rounded-full bg-[#aa825e] px-8 py-3.5 font-semibold text-white transition-all duration-200 hover:scale-[1.01] hover:bg-[#b78d68] hover:shadow-lg active:scale-95 disabled:scale-100 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
        >
          Continuar al envío
        </button>
      </div>
    </div>
  )
}

"use client"

import { useCart } from "@/lib/cart-context"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import Link from "next/link"
import { fetchProducts, createPaymentPreference } from "@/lib/api"
import { toast } from "@/hooks/use-toast"
import { useState, useCallback } from "react"
import { ShippingSelector, type ShippingSelection } from "@/components/shipping-selector"

export default function CartPage() {
  const { items, removeItem, updateQuantity, clearCart, totalPrice } = useCart()
  const [loading, setLoading] = useState(false)
  
  // Selección de envío
  const [shippingSelection, setShippingSelection] = useState<ShippingSelection | null>(null)
  const [totalWithShipping, setTotalWithShipping] = useState(totalPrice)

  const handleShippingComplete = useCallback((selection: ShippingSelection) => {
    setShippingSelection(selection)
  }, [])

  const handleTotalChange = useCallback((total: number) => {
    setTotalWithShipping(total)
  }, [])

  // Verificar si se puede proceder al pago
  const canCheckout = shippingSelection !== null

  async function handleCheckout() {
    if (!canCheckout || !shippingSelection) {
      toast({
        title: "Datos incompletos",
        description: "Por favor completa todos los datos de envío antes de continuar",
      })
      return
    }

    try {
      setLoading(true)
      const catalog = await fetchProducts()
      const byId = new Map(catalog.map((p) => [p.id, p]))
      const removedNames: string[] = []
      
      for (const it of items) {
        const p = byId.get(it.id)
        if (!p || p.status !== "disponible") {
          removedNames.push(it.name)
          removeItem(it.id)
        }
      }
      
      if (removedNames.length > 0) {
        toast({
          title: "Lo sentimos",
          description:
            removedNames.length === 1
              ? `El producto "${removedNames[0]}" no está más disponible y fue quitado del carrito.`
              : `Estos productos ya no están disponibles y fueron quitados del carrito: ${removedNames.join(", ")}.`,
        })
        setLoading(false)
        return
      }

      // Crear preferencia de pago en MercadoPago (incluye productos + envío)
      const preference = await createPaymentPreference(
        items.map(item => ({
          id: item.id,
          quantity: item.quantity,
        })),
        {
          cost: shippingSelection.shipping_cost,
          rate_id: shippingSelection.rate_id,
          service_type: shippingSelection.service_type,
          point_id: shippingSelection.point_id || null,
          address: shippingSelection.address || null,
          contact: shippingSelection.contact,
        }
      )

      // Redirigir a MercadoPago
      if (preference.init_point) {
        window.location.href = preference.init_point
      } else {
        throw new Error("No se recibió URL de pago")
      }
    } catch (e: any) {
      console.error("Error en checkout:", e)
      toast({ 
        title: "Error", 
        description: e?.message || "No se pudo procesar el pago" 
      })
      setLoading(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navigation />

        {/* Empty Cart */}
        <main className="flex-1">
          <div className="container mx-auto px-4 py-20">
            <div className="max-w-md mx-auto text-center">
            <div className="w-24 h-24 bg-secondary rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                />
              </svg>
            </div>
            <h1 className="font-serif text-3xl font-bold text-foreground mb-4">Tu Carrito está Vacío</h1>
            <p className="text-muted-foreground mb-8">
              Parece que aún no has agregado productos a tu carrito. Explora nuestra tienda.
            </p>
            <Link
              href="/productos"
              className="inline-flex items-center justify-center px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-lg transition-all duration-200 transform-gpu hover:bg-primary/90 hover:shadow-md hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              Ver Productos
            </Link>
            </div>
          </div>
        </main>

        {/* Footer */}
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />

      {/* Cart Content */}
      <main className="flex-1">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h1 className="font-serif text-4xl font-bold text-foreground">Carrito</h1>
            <button
              onClick={clearCart}
              className="text-sm text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
            >
              Limpiar Carrito
            </button>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Cart Items y Envío */}
            <div className="lg:col-span-2 space-y-6">
              {/* Productos */}
              <div className="space-y-4">
                <h2 className="font-serif text-xl font-bold text-foreground">Productos</h2>
                {items.map((item) => (
                  <div key={item.id} className="bg-card border border-border rounded-xl p-6">
                    <div className="flex gap-4">
                      <div className="relative w-24 h-24 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={item.image || "/placeholder.svg"} alt={item.name} className="object-cover w-full h-full" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-serif text-lg font-bold text-foreground mb-1">{item.name}</h3>
                        <p className="text-muted-foreground text-sm mb-3">${item.price.toLocaleString('es-AR')} por articulo</p>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center border border-border rounded-lg">
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              className="px-3 py-1 hover:bg-secondary transition-colors cursor-pointer transform-gpu active:scale-95"
                            >
                              -
                            </button>
                            <span className="px-4 py-1 border-x border-border font-medium">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="px-3 py-1 hover:bg-secondary transition-colors cursor-pointer transform-gpu active:scale-95"
                            >
                              +
                            </button>
                          </div>
                          <button
                            onClick={() => removeItem(item.id)}
                            className="text-sm text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                          >
                            Quitar
                          </button>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-foreground text-lg">${(item.price * item.quantity).toLocaleString('es-AR')}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Selector de Envío */}
              <ShippingSelector
                items={items.map(item => ({ id: item.id, quantity: item.quantity }))}
                productsTotal={totalPrice}
                onSelectionComplete={handleShippingComplete}
                onTotalChange={handleTotalChange}
              />
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-card border border-border rounded-xl p-6 sticky top-24">
                <h2 className="font-serif text-2xl font-bold text-foreground mb-6">Resumen del Pedido</h2>
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal productos</span>
                    <span>${totalPrice.toLocaleString('es-AR')}</span>
                  </div>
                  
                  <div className="flex justify-between text-muted-foreground">
                    <span>Envío</span>
                    {shippingSelection ? (
                      <span>${shippingSelection.shipping_cost.toLocaleString('es-AR')}</span>
                    ) : (
                      <span className="text-sm">Completa los datos</span>
                    )}
                  </div>

                  {shippingSelection && (
                    <div className="text-xs text-muted-foreground">
                      <span>{shippingSelection.carrier_name}</span>
                      <span className="block">
                        {shippingSelection.service_type === 'standard_delivery' 
                          ? 'Envío a domicilio' 
                          : 'Retiro en punto de entrega'}
                      </span>
                    </div>
                  )}
                  
                  <div className="border-t border-border pt-3 flex justify-between">
                    <span className="font-bold text-foreground text-lg">Total</span>
                    <span className="font-bold text-foreground text-lg">
                      ${totalWithShipping.toLocaleString('es-AR')}
                    </span>
                  </div>
                </div>

                {!canCheckout && (
                  <p className="text-sm text-amber-600 dark:text-amber-400 mb-3">
                    Completa todos los datos de envío para continuar
                  </p>
                )}

                <button
                  onClick={handleCheckout}
                  disabled={loading || !canCheckout}
                  className="w-full py-3 bg-primary text-primary-foreground font-semibold rounded-lg transition-all duration-200 transform-gpu hover:bg-primary/90 hover:shadow-md hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 mb-3 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {loading ? "Procesando..." : "Ir a pagar"}
                </button>
                <Link
                  href="/productos"
                  className="block text-center text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Continuar comprando
                </Link>
              </div>
            </div>
          </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  )
}

"use client"

import { useCart } from "@/lib/cart-context"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import Link from "next/link"
import Image from "next/image"
import { Instagram, Music } from "lucide-react"

export default function CartPage() {
  const { items, removeItem, updateQuantity, clearCart, totalPrice } = useCart()

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
          <div className="max-w-5xl mx-auto">
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
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {items.map((item) => (
                <div key={item.id} className="bg-card border border-border rounded-lg p-6">
                  <div className="flex gap-4">
                    <div className="relative w-24 h-24 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                      <Image src={item.image || "/placeholder.svg"} alt={item.name} fill className="object-cover" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-serif text-lg font-bold text-foreground mb-1">{item.name}</h3>
                      <p className="text-muted-foreground text-sm mb-3">${item.price.toFixed(2)} por articulo</p>
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
                      <p className="font-bold text-foreground text-lg">${(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-card border border-border rounded-lg p-6 sticky top-24">
                <h2 className="font-serif text-2xl font-bold text-foreground mb-6">Resumen del Pedido</h2>
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span>${totalPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Shipping</span>
                    <span>Calculated at checkout</span>
                  </div>
                  <div className="border-t border-border pt-3 flex justify-between">
                    <span className="font-bold text-foreground text-lg">Total</span>
                    <span className="font-bold text-foreground text-lg">${totalPrice.toFixed(2)}</span>
                  </div>
                </div>
                <button className="w-full py-3 bg-primary text-primary-foreground font-semibold rounded-lg transition-all duration-200 transform-gpu hover:bg-primary/90 hover:shadow-md hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 mb-3 cursor-pointer">
                  Ir a pagar
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

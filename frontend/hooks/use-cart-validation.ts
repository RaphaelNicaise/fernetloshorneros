"use client"

import { useEffect, useRef } from "react"
import { useCart } from "@/lib/cart-context"
import { fetchProducts } from "@/lib/api"
import { toast } from "@/hooks/use-toast"

/**
 * Hook que valida el carrito cada 20 segundos
 * - Verifica si los productos tienen stock suficiente
 * - Ajusta cantidades si el stock se redujo
 * - Alerta al usuario de cambios
 */
export function useCartValidation() {
  const { items, updateQuantity, updatePrice, removeItem } = useCart()
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastCheckRef = useRef<Record<string, number>>({})
  const lastPriceRef = useRef<Record<string, number>>({})

  useEffect(() => {
    if (items.length === 0) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    const validateCart = async () => {
      try {
        const products = await fetchProducts()
        const byId = new Map(products.map((p) => [p.id, p]))

        for (const item of items) {
          const product = byId.get(item.id)

          // Si el producto no existe o no está disponible, quitarlo
          if (!product || product.status !== "disponible") {
            removeItem(item.id)
            toast({
              title: "Producto removido",
              description: `"${item.name}" ya no está disponible.`,
              variant: "destructive",
            })
            continue
          }

          // Detectar cambio de precio
          const currentPrice = Number(product.price)
          const lastPrice = lastPriceRef.current[item.id]
          if (lastPrice !== undefined && lastPrice !== currentPrice) {
            updatePrice(item.id, currentPrice)
            toast({
              title: "Precio actualizado",
              description: `"${item.name}" cambió de $${lastPrice.toLocaleString('es-AR')} a $${currentPrice.toLocaleString('es-AR')}.`,
            })
          }
          lastPriceRef.current[item.id] = currentPrice

          const availableStock = product.stock ?? 0
          const lastStock = lastCheckRef.current[item.id] ?? availableStock

          // Siempre verificar que la cantidad en carrito no supere el stock actual
          if (availableStock === 0) {
            removeItem(item.id)
            lastCheckRef.current[item.id] = 0
            toast({
              title: "Producto agotado",
              description: `"${item.name}" se agotó y fue removido de tu carrito.`,
              variant: "destructive",
            })
          } else if (availableStock < item.quantity) {
            updateQuantity(item.id, availableStock)
            lastCheckRef.current[item.id] = availableStock
            toast({
              title: "Stock actualizado",
              description: `"${item.name}": cantidad ajustada a ${availableStock} (stock disponible).`,
            })
          } else if (lastStock !== availableStock) {
            // Stock cambió pero sigue siendo suficiente
            lastCheckRef.current[item.id] = availableStock
            if (availableStock > lastStock) {
              toast({
                title: "Stock disponible",
                description: `"${item.name}" tiene más stock disponible.`,
              })
            }
          } else {
            lastCheckRef.current[item.id] = availableStock
          }
        }
      } catch (error) {
        console.error("Error validando carrito:", error)
      }
    }

    // Validar inmediatamente y luego cada 15 segundos
    validateCart()
    intervalRef.current = setInterval(validateCart, 15000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [items, updateQuantity, removeItem])
}

"use client"

import { useCart } from "@/lib/cart-context"
import { useState } from "react"
import clsx from "clsx"
import { Check } from "lucide-react"
import { getImageSrc } from "@/lib/api"
import Image from "next/image"
import { toast } from "@/hooks/use-toast"

interface Product {
  id: string
  name: string
  price: number
  image: string
  description: string
  roastLevel?: string
  status?: "disponible" | "proximamente" | "agotado"
  limite?: number
  stock?: number
}

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  const { addItem } = useCart()
  const [isAdding, setIsAdding] = useState(false)
  const isAvailable = (product.status ?? "disponible") === "disponible"
  const hasStock = (product.stock ?? 0) > 0
  const priceNumber = Number(product.price)

  const handleAddToCart = () => {
    if (!isAvailable) return
    
    if (!hasStock) {
      toast({
        title: "Producto agotado",
        description: `${product.name} no tiene stock disponible en este momento.`,
        variant: "destructive",
      })
      return
    }

    addItem({
      id: product.id,
      name: product.name,
      price: Number.isFinite(priceNumber) ? priceNumber : 0,
      image: getImageSrc(product.image),
      limite: product.limite,
      stock: product.stock,
    })
    setIsAdding(true)
    setTimeout(() => setIsAdding(false), 1000)
  }

  return (
    <div className="bg-card rounded-lg overflow-hidden border border-border hover:shadow-lg transition-shadow flex flex-col h-full">
      <div className="relative h-64 bg-muted">
        <Image 
          src={getImageSrc(product.image) || "/placeholder.svg"} 
          alt={product.name} 
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover"
          loading="lazy"
        />
        {product.roastLevel && (
          <div className="absolute top-3 right-3 bg-background/90 backdrop-blur px-3 py-1 rounded-full text-sm font-medium text-foreground">
            {product.roastLevel}
          </div>
        )}
      </div>
      <div className="p-6 flex flex-col flex-1">
        <h3 className="font-serif text-xl font-bold text-foreground mb-2">{product.name}</h3>
        <p className="text-muted-foreground text-sm leading-relaxed mb-4">{product.description}</p>
        <div className="mt-auto flex items-center justify-between pt-2 gap-3">
          <span className="text-2xl font-bold text-foreground">
            {Number.isFinite(priceNumber)
              ? priceNumber.toLocaleString("es-AR", {
                  style: "currency",
                  currency: "ARS",
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })
              : "-"}
          </span>
          <div className="flex items-center gap-2">
            {!isAvailable && (
              <span className="text-sm rounded-full bg-muted px-2 py-1 text-muted-foreground">
                {product.status === "proximamente" ? "Próximamente" : product.status === "agotado" ? "Agotado" : ""}
              </span>
            )}
            {isAvailable && !hasStock && (
              <span className="text-sm rounded-full bg-red-100 px-2 py-1 text-red-700">
                Agotado
              </span>
            )}
            <button
              onClick={handleAddToCart}
              disabled={isAdding || !isAvailable || !hasStock}
              aria-label="Agregar al carrito"
              className={`px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-lg transition-colors duration-200 hover:bg-primary/90 hover:brightness-110 hover:shadow-lg disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${isAdding ? "bg-green-600 hover:bg-green-600" : ""}`}
            >
              <span className="relative inline-flex items-center justify-center w-5 h-5">
                {/* Carrito */}
                <span
                  className={clsx(
                    "absolute inset-0 flex items-center justify-center transition-all duration-200",
                    isAdding ? "opacity-0 rotate-90 scale-75" : "opacity-100 rotate-0 scale-100"
                  )}
                  aria-hidden={isAdding}
                >
                  <span className="material-symbols-outlined text-[20px] leading-none align-middle translate-y-[1px]">add_shopping_cart</span>
                </span>
                {/* Check */}
                <span
                  className={clsx(
                    "absolute inset-0 flex items-center justify-center transition-all duration-200",
                    isAdding ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-75"
                  )}
                  aria-hidden={!isAdding}
                >
                  <Check className="w-5 h-5 text-white translate-y-[1px]" />
                </span>
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

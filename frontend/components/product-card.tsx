"use client"

import Image from "next/image"
import { useCart } from "@/lib/cart-context"
import { useState } from "react"

interface Product {
  id: string
  name: string
  price: number
  image: string
  description: string
  roastLevel?: string
}

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  const { addItem } = useCart()
  const [isAdding, setIsAdding] = useState(false)

  const handleAddToCart = () => {
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
    })
    setIsAdding(true)
    setTimeout(() => setIsAdding(false), 1000)
  }

  return (
    <div className="bg-card rounded-lg overflow-hidden border border-border hover:shadow-lg transition-shadow flex flex-col h-full">
      <div className="relative h-64 bg-muted">
        <Image src={product.image || "/placeholder.svg"} alt={product.name} fill className="object-cover" />
        {product.roastLevel && (
          <div className="absolute top-3 right-3 bg-background/90 backdrop-blur px-3 py-1 rounded-full text-sm font-medium text-foreground">
            {product.roastLevel}
          </div>
        )}
      </div>
      <div className="p-6 flex flex-col flex-1">
        <h3 className="font-serif text-xl font-bold text-foreground mb-2">{product.name}</h3>
        <p className="text-muted-foreground text-sm leading-relaxed mb-4">{product.description}</p>
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="text-2xl font-bold text-foreground">${product.price.toFixed(2)}</span>
          <button
            onClick={handleAddToCart}
            disabled={isAdding}
            className="px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-lg transition-all duration-200 transform-gpu hover:bg-primary/90 hover:shadow-md hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            {isAdding ? "Added!" : "Add to Cart"}
          </button>
        </div>
      </div>
    </div>
  )
}

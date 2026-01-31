"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { toast } from "@/hooks/use-toast"

export interface CartItem {
  id: string
  name: string
  price: number
  image: string
  quantity: number
  limite?: number // 0 o undefined = sin límite
  stock?: number // stock disponible del producto
}

interface CartContextType {
  items: CartItem[]
  addItem: (item: Omit<CartItem, "quantity">) => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  clearCart: () => void
  totalItems: number
  totalPrice: number
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem("artisan-cart")
    if (savedCart) {
      setItems(JSON.parse(savedCart))
    }
  }, [])

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("artisan-cart", JSON.stringify(items))
  }, [items])

  const addItem = (newItem: Omit<CartItem, "quantity">) => {
    let showLimitToast: { limite: number } | null = null
    let showStockToast: { stock: number } | null = null
    setItems((currentItems) => {
      const existingItem = currentItems.find((item) => item.id === newItem.id)
      const limite = newItem.limite ?? existingItem?.limite ?? 0
      const stock = newItem.stock ?? existingItem?.stock ?? 0
      
      if (existingItem) {
        // Validar límite
        if (limite > 0 && existingItem.quantity >= limite) {
          showLimitToast = { limite }
          return currentItems
        }
        
        // Validar stock disponible
        if (stock > 0 && existingItem.quantity >= stock) {
          showStockToast = { stock }
          return currentItems
        }
        
        return currentItems.map((item) => (item.id === newItem.id ? { ...item, quantity: item.quantity + 1 } : item))
      }
      
      return [...currentItems, { ...newItem, limite, stock, quantity: 1 }]
    })
    
    if (showStockToast) {
      setTimeout(() => {
        toast({
          title: "Stock limitado",
          description: `Solo hay ${showStockToast!.stock} unidad(es) disponible(s) de este producto.`,
          variant: "destructive",
        })
      }, 0)
    } else if (showLimitToast) {
      setTimeout(() => {
        toast({
          title: "Límite alcanzado",
          description: `No podés agregar más de ${showLimitToast!.limite} unidad(es) de este producto.`,
        })
      }, 0)
    }
  }

  const removeItem = (id: string) => {
    setItems((currentItems) => currentItems.filter((item) => item.id !== id))
  }

  const updateQuantity = (id: string, quantity: number) => {
    let showLimitToast: { limite: number } | null = null
    let showStockToast: { stock: number } | null = null
    setItems((currentItems) => {
      const item = currentItems.find(i => i.id === id)
      if (!item) return currentItems
      const limite = item.limite ?? 0
      const stock = item.stock ?? 0
      if (quantity <= 0) {
        return currentItems.filter(i => i.id === id)
      }
      if (stock > 0 && quantity > stock) {
        showStockToast = { stock }
        return currentItems.map(i => i.id === id ? { ...i, quantity: stock } : i)
      }
      if (limite > 0 && quantity > limite) {
        showLimitToast = { limite }
        return currentItems.map(i => i.id === id ? { ...i, quantity: limite } : i)
      }
      return currentItems.map(i => i.id === id ? { ...i, quantity } : i)
    })
    if (showStockToast) {
      setTimeout(() => {
        toast({ title: "Stock limitado", description: `Solo hay ${showStockToast!.stock} unidad(es) disponible(s) de este producto.`, variant: "destructive" })
      }, 0)
    } else if (showLimitToast) {
      setTimeout(() => {
        toast({ title: "Límite alcanzado", description: `Máximo permitido: ${showLimitToast!.limite}.` })
      }, 0)
    }
  }

  const clearCart = () => {
    setItems([])
  }

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
  const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0)

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, totalItems, totalPrice }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider")
  }
  return context
}

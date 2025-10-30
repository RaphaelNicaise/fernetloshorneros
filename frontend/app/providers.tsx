"use client"

import type React from "react"

import { CartProvider } from "@/lib/cart-context"

export function Providers({ children }: { children: React.ReactNode }) {
  return <CartProvider>{children}</CartProvider>
}

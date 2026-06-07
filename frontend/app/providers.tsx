"use client"

import type React from "react"
import { CartProvider } from "@/lib/cart-context"
import { WaitlistModalProvider } from "@/lib/waitlist-modal-context"
import { WaitlistModal } from "@/components/waitlist-modal"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <WaitlistModalProvider>
        {children}
        <WaitlistModal />
      </WaitlistModalProvider>
    </CartProvider>
  )
}

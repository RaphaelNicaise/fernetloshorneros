"use client"

import type React from "react"
import { CartProvider } from "@/lib/cart-context"
import { WaitlistModalProvider } from "@/lib/waitlist-modal-context"
import { ContactModalProvider } from "@/lib/contact-modal-context"
import { WaitlistModal } from "@/components/waitlist-modal"
import { ContactModal } from "@/components/contact-modal"
import { AgeGate } from "@/components/age-gate"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <WaitlistModalProvider>
        <ContactModalProvider>
          {children}
          <WaitlistModal />
          <ContactModal />
          <AgeGate />
        </ContactModalProvider>
      </WaitlistModalProvider>
    </CartProvider>
  )
}

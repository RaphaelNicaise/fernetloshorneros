"use client"

import { createContext, useContext, useMemo, useState, type ReactNode } from "react"

interface ContactModalContextValue {
  isOpen: boolean
  open: () => void
  close: () => void
}

const ContactModalContext = createContext<ContactModalContextValue | null>(null)

export function ContactModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)

  const value = useMemo<ContactModalContextValue>(
    () => ({
      isOpen,
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
    }),
    [isOpen],
  )

  return <ContactModalContext.Provider value={value}>{children}</ContactModalContext.Provider>
}

export function useContactModal() {
  const context = useContext(ContactModalContext)

  if (!context) {
    throw new Error("useContactModal must be used within ContactModalProvider")
  }

  return context
}

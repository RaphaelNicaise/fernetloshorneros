"use client"

import { createContext, useContext, useMemo, useState, type ReactNode } from "react"

interface WaitlistModalContextValue {
  isOpen: boolean
  open: () => void
  close: () => void
}

const WaitlistModalContext = createContext<WaitlistModalContextValue | null>(null)

export function WaitlistModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)

  const value = useMemo<WaitlistModalContextValue>(
    () => ({
      isOpen,
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
    }),
    [isOpen],
  )

  return <WaitlistModalContext.Provider value={value}>{children}</WaitlistModalContext.Provider>
}

export function useWaitlistModal() {
  const context = useContext(WaitlistModalContext)

  if (!context) {
    throw new Error("useWaitlistModal must be used within WaitlistModalProvider")
  }

  return context
}
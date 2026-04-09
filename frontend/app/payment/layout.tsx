import type { Metadata } from "next"
import type { ReactNode } from "react"

export const metadata: Metadata = {
  title: "Pago",
  robots: { index: false, follow: false },
}

export default function PaymentLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}

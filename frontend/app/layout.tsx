import type React from "react"
import type { Metadata } from "next"
import { Playfair_Display, Montserrat } from "next/font/google"
import "./globals.css"
import { CartProvider } from "@/lib/cart-context"
import { ViewTransitions } from "next-view-transitions"

const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-serif" })
const montserrat = Montserrat({ subsets: ["latin"], variable: "--font-sans" })

export const metadata: Metadata = {
  title: "Los Horneros - Fernet",
  description: "Ethically-sourced, small-batch artisan coffee roasted to perfection",
    generator: 'v0.app',
    icons: {
      icon: '/icon.png',
      shortcut: '/icon.png',
      apple: '/icon.png',
    }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ViewTransitions>
      <html lang="es">
        <body className={`${playfair.variable} ${montserrat.variable} font-sans antialiased`}>
          <CartProvider>{children}</CartProvider>
        </body>
      </html>
    </ViewTransitions>
  )
}

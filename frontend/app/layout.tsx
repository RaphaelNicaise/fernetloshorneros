import type React from "react"
import type { Metadata } from "next"
import { Cinzel_Decorative, Montserrat } from "next/font/google"
import "./globals.css"
import { Providers } from "@/app/providers"
import { Toaster } from "@/components/ui/toaster"
import { LoadingScreen } from "@/components/loading-screen"

const cinzelDecorative = Cinzel_Decorative({
  weight: ["400", "700", "900"],
  subsets: ["latin"],
  variable: "--font-serif",
})
const montserrat = Montserrat({ subsets: ["latin"], variable: "--font-sans" })

const SITE_URL = "https://fernetloshorneros.com"
const OG_IMAGE = `${SITE_URL}/fernet1.webp`

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: SITE_URL,
  },
  title: {
    default: "Los Horneros Fernet — Artesanal Argentino",
    template: "%s | Los Horneros Fernet",
  },
  description:
    "Fernet artesanal argentino elaborado con más de 20 hierbas seleccionadas. Lote 2 en preventa — solo 17.500 botellas numeradas. Septiembre 2026.",
  keywords: [
    "fernet artesanal",
    "fernet argentino",
    "los horneros fernet",
    "fernet premium",
    "fernet edición limitada",
    "fernet artesanal argentina",
    "fernet lote limitado",
  ],
  authors: [{ name: "Los Horneros Fernet" }],
  icons: {
    icon: "/logonuevo.webp",
    shortcut: "/logonuevo.webp",
    apple: "/logonuevo.webp",
  },
  openGraph: {
    title: "Los Horneros Fernet — Artesanal Argentino",
    description:
      "Fernet artesanal elaborado con más de 20 hierbas seleccionadas. Lote 2 en preventa — solo 17.500 botellas numeradas. Septiembre 2026.",
    url: SITE_URL,
    siteName: "Los Horneros Fernet",
    locale: "es_AR",
    type: "website",
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: "Fernet Los Horneros — Artesanal Argentino" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Los Horneros Fernet — Artesanal Argentino",
    description: "Solo 17.500 botellas numeradas. Preventa Septiembre 2026.",
    images: [OG_IMAGE],
  },
  robots: { index: true, follow: true },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&icon_names=add_shopping_cart"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "Los Horneros Fernet",
              url: SITE_URL,
              logo: `${SITE_URL}/logo-fernet.png`,
              sameAs: [
                "https://www.instagram.com/fernetloshorneros",
                "https://www.tiktok.com/@santiredruelloo",
              ],
              description:
                "Fernet artesanal argentino elaborado con más de 20 hierbas seleccionadas. Producción en lotes limitados y numerados.",
            }),
          }}
        />
      </head>
      <body suppressHydrationWarning className={`${cinzelDecorative.variable} ${montserrat.variable} font-sans antialiased`}>
        <LoadingScreen />
        <Providers>
          {children}
          <Toaster />
        </Providers>
        
        {/* Umami Analytics (proxied via Nginx) */}
        <script
          defer
          src="https://umami.fernetloshorneros.com/script.js"
          data-website-id="8c2a3f89-8d67-4632-a567-bd1c0d45362a" 
        ></script>
      </body>
    </html>
  )
}

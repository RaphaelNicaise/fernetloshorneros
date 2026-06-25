"use client"

import dynamic from "next/dynamic"
import Image from "next/image"

const HomePageContent = dynamic(() => import("@/components/home-page-client"), {
  ssr: false,
  loading: () => (
    <div className="relative min-h-screen bg-[#0b0a07] flex flex-col items-center justify-center gap-4">
      <Image
        src="/logonuevo.webp"
        alt="Los Horneros"
        width={80}
        height={80}
        className="animate-pulse brightness-0 invert"
        priority
      />
      <div className="text-[#aa825e] font-serif text-sm sm:text-base animate-pulse tracking-[0.2em] uppercase">
        Cargando Los Horneros...
      </div>
    </div>
  )
})

export default function HomePage() {
  return <HomePageContent />
}

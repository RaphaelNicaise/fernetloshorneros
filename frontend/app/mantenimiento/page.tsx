"use client"

import { ImageCarousel } from "@/components/image-carousel"
import Image from "next/image"

const heroImages = [
  { src: "/fernet1.webp", alt: "Fernet 1" },
  { src: "/fernet2.webp", alt: "Fernet 2" },
  { src: "/fernet3.webp", alt: "Fernet 3" },
]

export default function MantenimientoPage() {
  return (
    <div className="relative min-h-screen bg-white overflow-hidden">
      {/* Navbar bloqueado — solo logo, sin link */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-sm border-b border-neutral-200/60">
        <div className="container mx-auto max-w-6xl px-4 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 pointer-events-none select-none">
            <Image
              src="/logo-fernet.png"
              alt="Fernet Los Horneros"
              width={200}
              height={48}
              className="h-8 sm:h-9 w-auto object-contain"
              priority
            />
          </div>
          {/* Nav items deshabilitados visualmente */}
          <nav className="hidden md:flex items-center gap-6" aria-hidden>
            {["Inicio", "Productos", "Lista de Espera"].map((label) => (
              <span key={label} className="text-sm font-medium text-neutral-300 cursor-not-allowed select-none">
                {label}
              </span>
            ))}
          </nav>
        </div>
      </header>

      {/* Banner de mantenimiento */}
      <div className="pt-14 sm:pt-16">
        <div className="bg-neutral-900 text-white text-center py-3 px-4">
          <p className="text-sm font-medium tracking-wide">
            🔧 Estamos realizando mejoras en la web. Volvemos pronto.
          </p>
        </div>
      </div>

      {/* Hero — copia exacta sin botones de navegación */}
      <section className="relative pt-12 sm:pt-16 pb-16 sm:pb-20 px-4 bg-white overflow-hidden">
        {/* Fondo */}
        <img
          src="/fontscreen.webp"
          alt=""
          aria-hidden
          loading="lazy"
          className="pointer-events-none absolute inset-0 w-full h-full object-cover opacity-40 md:opacity-25"
        />
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
            {/* Columna izquierda */}
            <div className="relative order-2 md:order-1">
              {/* Logo */}
              <div className="relative inline-block mb-8">
                <img
                  src="/horneros.webp"
                  alt=""
                  aria-hidden
                  role="presentation"
                  loading="lazy"
                  className="pointer-events-none select-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[46%] sm:w-[52%] md:w-[57%] lg:w-[63%] opacity-15 hidden md:block z-0"
                />
                <Image
                  src="/logo-fernet.png"
                  alt="Fernet Los Horneros"
                  width={520}
                  height={140}
                  className="relative z-10 h-20 sm:h-24 md:h-28 w-auto object-contain"
                  priority
                />
              </div>

              {/* Headline */}
              <h1 className="font-serif text-3xl sm:text-4xl md:text-[2.75rem] font-bold text-neutral-900 leading-[1.15] mb-5 text-center md:text-left">
                Preventa Junio 2026
                <span className="font-serif text-lg sm:text-xl md:text-2xl tracking-[0.15em] uppercase text-neutral-400 ml-3 align-baseline">
                  Lote 2
                </span>
              </h1>

              {/* Subheadline */}
              <p className="text-neutral-500 text-base sm:text-lg leading-[1.75] mb-8 max-w-lg text-center md:text-left">
                Solo <span className="font-semibold text-neutral-700">17.500 botellas</span>.
                Reservá tu lugar en la lista para asegurar tu unidad antes de que se abra al público.
              </p>

              {/* Mensaje de mantenimiento en lugar de los botones */}
              <div className="flex flex-col items-center md:items-start gap-4">
                <div className="inline-flex items-center gap-3 px-6 py-4 bg-neutral-900 text-white rounded-lg">
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                  <div>
                    <p className="font-semibold text-sm">Sitio en mantenimiento</p>
                    <p className="text-neutral-400 text-xs mt-0.5">Estamos mejorando la experiencia para vos.</p>
                  </div>
                </div>
                <span className="text-[11px] text-neutral-400">
                  Te avisaremos cuando estemos de vuelta.
                </span>
              </div>
            </div>

            {/* Columna derecha — Carousel */}
            <div className="group/hero relative h-[400px] sm:h-[500px] rounded-lg overflow-hidden order-1 md:order-2">
              <ImageCarousel images={heroImages} autoPlayInterval={12000} />
              <div className="absolute top-5 right-5 z-20 flex justify-end">
                <div className="bg-neutral-900/80 backdrop-blur-sm text-white px-5 py-2.5 rounded-full text-xs font-semibold tracking-[0.1em] uppercase shadow-lg flex items-center flex-row-reverse whitespace-nowrap">
                  <span>Lote 1 · Sold Out</span>
                  <span className="inline-flex overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.25,0.1,0.25,1)] max-w-0 opacity-0 group-hover/hero:max-w-[250px] group-hover/hero:opacity-100">
                    <span className="pr-2">180 botellas en 8 min ·</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

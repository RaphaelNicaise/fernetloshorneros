"use client"

import { useEffect, useRef, useState } from "react"

/**
 * Sutil fondo animado para la Home usando parallax ligero.
 * - Solo visual: pointer-events-none y z-index negativo.
 * - Efecto: translateY proporcional al scroll (suave), con leve blur y baja opacidad.
 */
export function FontscreenBackground() {
  const [offset, setOffset] = useState(0)
  const rafId = useRef<number | null>(null)
  const lastScroll = useRef(0)

  useEffect(() => {
    const onScroll = () => {
      lastScroll.current = window.scrollY || window.pageYOffset
      if (rafId.current == null) {
        rafId.current = window.requestAnimationFrame(() => {
          // Parallax suave: mover más lento que el scroll
          setOffset(lastScroll.current * 0.12)
          rafId.current = null
        })
      }
    }
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => {
      window.removeEventListener("scroll", onScroll)
      if (rafId.current) cancelAnimationFrame(rafId.current)
    }
  }, [])

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {/* Capa de imagen */}
      <img
        src="/fontscreen.png"
        alt=""
        aria-hidden
        loading="lazy"
        className="w-full h-full object-cover opacity-15 blur-[0.5px] select-none will-change-transform transform-gpu"
        style={{ transform: `translateY(${offset}px) scale(1.05)` }}
      />
      {/* Degradado para legibilidad y transición sutil al fondo */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-transparent to-white/70" />
    </div>
  )
}

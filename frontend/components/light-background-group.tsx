"use client"

import React from "react"

type Props = {
  children: React.ReactNode
  /** Opacidad del fondo (0 a 1). Por defecto 0.25 */
  opacity?: number
}

/**
 * Envuelve secciones claras y dibuja un fondo sticky que acompaña el scroll
 * dentro del grupo. Útil para que el fondo sea visible en zonas claras y
 * desaparezca al atravesar secciones oscuras fuera del grupo.
 */
export function LightBackgroundGroup({ children, opacity = 0.25 }: Props) {
  return (
    <div className="relative isolate">
      {/* Capa de fondo: se mantiene visible mientras se recorre el grupo */}
      <div aria-hidden className="pointer-events-none sticky top-0 z-0 h-screen">
        <img
          src="/fontscreen.png"
          alt=""
          className="w-full h-full object-contain"
          style={{ opacity }}
        />
      </div>
      {/* Contenido por encima del fondo */}
      <div className="relative z-10">{children}</div>
    </div>
  )
}

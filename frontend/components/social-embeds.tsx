"use client"

import { useEffect, useRef, useState } from "react"

import { InstagramEmbed } from "./instagram-embed"
import { TikTokEmbed } from "./tiktok-embed"
import { Spinner } from "@/components/ui/spinner"

export function SocialEmbedsWithLoading() {
  // Estados de readiness por embed y delay mínimo de 3s
  const [igReady, setIgReady] = useState(false)
  const [ttReady, setTtReady] = useState(false)
  const [delayOver, setDelayOver] = useState(false)

  const igRef = useRef<HTMLDivElement | null>(null)
  const ttRef = useRef<HTMLDivElement | null>(null)

  // Delay mínimo para la experiencia percibida
  useEffect(() => {
    const t = setTimeout(() => setDelayOver(true), 3000)
    return () => clearTimeout(t)
  }, [])

  // Utilidad: espera a que aparezca un iframe dentro del contenedor y se dispare su load
  function waitForIframe(container: HTMLElement, onDone: () => void) {
    const markDoneOnce = (() => {
      let done = false
      return () => {
        if (!done) {
          done = true
          onDone()
        }
      }
    })()

    const tryAttach = (iframe: HTMLIFrameElement | null) => {
      if (!iframe) return false
      // Si ya tiene src, esperamos el load; si ya cargó, resolvemos tras un microtask
      const handler = () => markDoneOnce()
      iframe.addEventListener("load", handler, { once: true })
      // Fallback por si el load ocurrió antes de registrar el listener
      setTimeout(handler, 800)
      return true
    }

    const existing = container.querySelector("iframe") as HTMLIFrameElement | null
    if (tryAttach(existing)) return

    const mo = new MutationObserver(() => {
      const ifr = container.querySelector("iframe") as HTMLIFrameElement | null
      if (tryAttach(ifr)) {
        mo.disconnect()
      }
    })
    mo.observe(container, { childList: true, subtree: true })
  }

  // Vigilar creación/carga de iframes generados por los scripts de Instagram/TikTok
  useEffect(() => {
    if (igRef.current) {
      waitForIframe(igRef.current, () => setIgReady(true))
    }
    if (ttRef.current) {
      waitForIframe(ttRef.current, () => setTtReady(true))
    }
  }, [])

  const ready = igReady && ttReady && delayOver

  return (
    <div
      className={ready ? "relative mb-10" : "relative mb-10 min-h-[520px] md:min-h-[620px]"}
      aria-busy={!ready}
      aria-live="polite"
    >
      {/* Contenido: montado desde el inicio pero invisible hasta que esté listo */}
      <div className={ready ? "opacity-100 transition-opacity" : "opacity-0 pointer-events-none select-none"}>
        <div className="grid md:grid-cols-2 gap-6 items-start">
          <div ref={igRef} className="order-1 self-start">
            <InstagramEmbed />
          </div>
          <div ref={ttRef} className="order-2 self-start">
            <TikTokEmbed />
          </div>
        </div>
      </div>

      {/* Overlay de carga completamente opaco */}
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-secondary">
          <div className="flex items-center gap-3 text-foreground">
            <Spinner className="size-10" />
            <span className="text-sm font-medium">Cargando…</span>
          </div>
        </div>
      )}
    </div>
  )
}

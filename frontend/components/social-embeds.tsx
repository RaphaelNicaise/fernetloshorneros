"use client"

import { useEffect, useRef, useState } from "react"

import { InstagramEmbed } from "./instagram-embed"
import { Spinner } from "@/components/ui/spinner"

export function SocialEmbedsWithLoading() {
  // Estados de readiness por embed y delay mínimo de 3s
  const [igReady, setIgReady] = useState(false)
  const [ttReady, setTtReady] = useState(false)
  const [delayOver, setDelayOver] = useState(false)

  const igRef = useRef<HTMLDivElement | null>(null)
  const ttRef = useRef<HTMLDivElement | null>(null)

  // Delay mínimo (pedido: 1s) y NO esperamos iframes para evitar spinner infinito
  useEffect(() => {
    const t = setTimeout(() => setDelayOver(true), 1000)
    return () => clearTimeout(t)
  }, [])

  // Cargar script oficial de TikTok si no existe
  useEffect(() => {
    if (typeof document === "undefined") return
    const existing = document.querySelector(
      'script[src="https://www.tiktok.com/embed.js"]'
    ) as HTMLScriptElement | null
    if (!existing) {
      const script = document.createElement("script")
      script.src = "https://www.tiktok.com/embed.js"
      script.async = true
      document.body.appendChild(script)
    }
  }, [])

  // En lugar de esperar iframes, marcamos ambos como listos de forma optimista
  useEffect(() => {
    setIgReady(true)
    setTtReady(true)
  }, [])

  const ready = igReady && ttReady && delayOver

  // Igualar alturas entre los dos embeds cuando el contenido esté visible
  useEffect(() => {
    if (!ready) return
    const a = igRef.current
    const b = ttRef.current
    if (!a || !b) return

    const apply = () => {
      // reset para recalcular correctamente
      a.style.minHeight = ""
      b.style.minHeight = ""
      const h1 = a.offsetHeight
      const h2 = b.offsetHeight
      const maxH = Math.max(h1, h2)
      a.style.minHeight = `${maxH}px`
      b.style.minHeight = `${maxH}px`
    }

    const ro1 = new ResizeObserver(apply)
    const ro2 = new ResizeObserver(apply)
    ro1.observe(a)
    ro2.observe(b)
    // primer cálculo
    apply()

    return () => {
      ro1.disconnect()
      ro2.disconnect()
      if (a) a.style.minHeight = ""
      if (b) b.style.minHeight = ""
    }
  }, [ready])

  // Re-procesar los embeds cuando volvemos a la página (scripts ya cargados no re-parsean automáticamente)
  useEffect(() => {
    if (!ready) return
    const process = () => {
      try {
        ;(window as any)?.instgrm?.Embeds?.process?.()
      } catch {}
      try {
        const w: any = window as any
        const loadTikTok = w?.tiktokEmbed?.load || w?.TikTokEmbed?.load || w?.tiktok?.load
        if (typeof loadTikTok === "function") {
          loadTikTok()
        } else {
          // Fallback: reinyectar el script para forzar el parseo
          const s = document.createElement("script")
          s.src = `https://www.tiktok.com/embed.js?reload=${Date.now()}`
          s.async = true
          document.body.appendChild(s)
        }
      } catch {}
    }
    const t = setTimeout(process, 50)
    return () => clearTimeout(t)
  }, [ready])

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
            <div className="w-full flex justify-center mb-8">
              <blockquote
                className="tiktok-embed"
                cite="https://www.tiktok.com/@santiredruelloo"
                data-unique-id="santiredruelloo"
                data-embed-type="creator"
                style={{ maxWidth: "780px", minWidth: "288px", margin: 0 }}
              >
                <section>
                  <a
                    target="_blank"
                    href="https://www.tiktok.com/@santiredruelloo?refer=creator_embed"
                  >
                    @santiredruelloo
                  </a>
                </section>
              </blockquote>
            </div>
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

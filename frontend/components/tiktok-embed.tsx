"use client"

import { useEffect } from "react"

export function TikTokEmbed() {
  useEffect(() => {
    const existing = document.querySelector('script[src="https://www.tiktok.com/embed.js"]') as HTMLScriptElement | null
    if (!existing) {
      const script = document.createElement("script")
      script.src = "https://www.tiktok.com/embed.js"
      script.async = true
      document.body.appendChild(script)
    }
  }, [])

  return (
    <div className="w-full flex justify-center mb-8">
      <blockquote
        className="tiktok-embed"
        cite="https://www.tiktok.com/@santiagoredruelloo/video/7520004858120834310"
        data-video-id="7520004858120834310"
        style={{ maxWidth: "605px", minWidth: "325px", margin: 0 }}
      >
        <section>
          <a
            target="_blank"
            rel="noreferrer"
            title="@santiagoredruelloo"
            href="https://www.tiktok.com/@santiagoredruelloo?refer=embed"
          >
            @santiagoredruelloo
          </a>{" "}
          Dia 3 creando Fernet Artesanal documentandolo todo 🎥{" "}
          <a
            title="emprendedores"
            target="_blank"
            rel="noreferrer"
            href="https://www.tiktok.com/tag/emprendedores?refer=embed"
          >
            #emprendedores
          </a>{" "}
          <a
            title="negocioonline"
            target="_blank"
            rel="noreferrer"
            href="https://www.tiktok.com/tag/negocioonline?refer=embed"
          >
            #negocioonline
          </a>{" "}
          <a
            title="emprendimiento"
            target="_blank"
            rel="noreferrer"
            href="https://www.tiktok.com/tag/emprendimiento?refer=embed"
          >
            #emprendimiento
          </a>{" "}
          <a
            title="redessociales"
            target="_blank"
            rel="noreferrer"
            href="https://www.tiktok.com/tag/redessociales?refer=embed"
          >
            #redessociales
          </a>{" "}
          <a
            title="marketing"
            target="_blank"
            rel="noreferrer"
            href="https://www.tiktok.com/tag/marketing?refer=embed"
          >
            #marketing
          </a>{" "}
          <a
            title="marketingdigital"
            target="_blank"
            rel="noreferrer"
            href="https://www.tiktok.com/tag/marketingdigital?refer=embed"
          >
            #marketingdigital
          </a>{" "}
          <a
            title="emprendedor"
            target="_blank"
            rel="noreferrer"
            href="https://www.tiktok.com/tag/emprendedor?refer=embed"
          >
            #emprendedor
          </a>{"\u00A0"}
          <a
            title="entrepreneur"
            target="_blank"
            rel="noreferrer"
            href="https://www.tiktok.com/tag/entrepreneur?refer=embed"
          >
            #entrepreneur
          </a>{"\u00A0"}
          <a
            title="motivacion"
            target="_blank"
            rel="noreferrer"
            href="https://www.tiktok.com/tag/motivacion?refer=embed"
          >
            #motivacion
          </a>{" "}
          <a
            target="_blank"
            rel="noreferrer"
            title="\u266B sonido original - Santiago Redruello"
            href="https://www.tiktok.com/music/sonido-original-7520004894223043334?refer=embed"
          >
            \u266B sonido original - Santiago Redruello
          </a>
        </section>
      </blockquote>
    </div>
  )
}

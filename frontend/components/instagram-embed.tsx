"use client"

import { useEffect } from "react"

export function InstagramEmbed() {
  useEffect(() => {
    const existing = document.querySelector('script[src="https://www.instagram.com/embed.js"]') as HTMLScriptElement | null
    if (!existing) {
      const script = document.createElement("script")
      script.src = "https://www.instagram.com/embed.js"
      script.async = true
      document.body.appendChild(script)
    }
  }, [])

  return (
    <div className="w-full flex justify-center">
      <blockquote
        className="instagram-media"
        data-instgrm-permalink="https://www.instagram.com/fernetloshorneros/"
        data-instgrm-version="12"
        style={{
          background: "#FFF",
          border: 0,
          borderRadius: 3,
          boxShadow: "0 0 1px 0 rgba(0,0,0,0.5),0 1px 10px 0 rgba(0,0,0,0.15)",
          margin: 0,
          maxWidth: 540,
          minWidth: 326,
          padding: 0,
          width: "99.375%",
        }}
      >
        <div style={{ padding: 16 }}>
          <a
            id="main_link"
            href="https://www.instagram.com/fernetloshorneros/"
            target="_blank"
            rel="noreferrer"
            style={{ background: "#FFFFFF", lineHeight: 0, padding: 0, textAlign: "center", textDecoration: "none", width: "100%" }}
          >
            Ver perfil en Instagram
          </a>
        </div>
      </blockquote>
    </div>
  )
}

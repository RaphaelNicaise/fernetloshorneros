"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import type { ComponentProps, MouseEvent } from "react"

// Pequeño envoltorio de Link que usa View Transitions API si está disponible
export function VTLink(props: ComponentProps<typeof Link>) {
  const { href, onClick, ...rest } = props
  const router = useRouter()

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e)
    if (e.defaultPrevented) return

    // Ignorar si es nueva pestaña/ventana o modificadores
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return

    // Evitar navegación nativa; la haremos manual con router.push
    e.preventDefault()

    const anyDoc = document as any
    const navigate = () => {
      // next/link acepta string | URL; router.push también
      // @ts-expect-error: href puede ser URL | string
      router.push(href)
    }

    if (anyDoc?.startViewTransition) {
      anyDoc.startViewTransition(() => navigate())
    } else {
      navigate()
    }
  }

  return <Link href={href} onClick={handleClick} {...rest} />
}

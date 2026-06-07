"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

/**
 * /lista-espera ya no existe como página independiente.
 * Redirige al home con ?waitlist=1 para que el modal se abra automáticamente.
 * El link de Google que indexó esta URL seguirá funcionando sin 404.
 */
export default function ListaEsperaRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/?waitlist=1")
  }, [router])

  // Pantalla en blanco mientras redirige (instantáneo)
  return null
}

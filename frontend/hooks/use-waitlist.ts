"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { API_BASE_URL } from "@/lib/api"

export type WaitlistUser = {
  id: number
  nombre: string
  email: string
  provincia: string
  fecha_registro: string
}

type UseWaitlistOptions = {
  auto?: boolean
}

export function useWaitlist(options: UseWaitlistOptions = { auto: true }) {
  const [data, setData] = useState<WaitlistUser[] | null>(null)
  const [loading, setLoading] = useState<boolean>(!!options.auto)
  const [error, setError] = useState<string | null>(null)
  const controllerRef = useRef<AbortController | null>(null)

  const endpoint = `${API_BASE_URL}/waitlist`

  const fetchWaitlist = useCallback(async () => {
    // endpoint siempre definido desde API_BASE_URL
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    setLoading(true)
    setError(null)
    try {
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null
  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(endpoint, { signal: controller.signal, headers })
      if (!res.ok) {
        const body = await res.json().catch(() => ({} as any))
        throw new Error(body?.error || `Error ${res.status}`)
      }
      const json = (await res.json()) as WaitlistUser[]
      setData(json)
    } catch (err: any) {
      if (err?.name === "AbortError") return
      setError(err?.message || "Error al obtener la lista de espera")
    } finally {
      setLoading(false)
    }
  }, [endpoint])

  useEffect(() => {
    if (options.auto) {
      fetchWaitlist()
    }
    return () => controllerRef.current?.abort()
  }, [fetchWaitlist, options.auto])

  return { data, loading, error, refetch: fetchWaitlist }
}

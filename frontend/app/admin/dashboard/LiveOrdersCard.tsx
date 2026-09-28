"use client"

import { useEffect, useState, useRef } from "react"
import { API_BASE_URL } from "@/lib/api"
import { ShoppingBag, Radio } from "lucide-react"

type OrderStatus = 'pending' | 'paid' | 'failed' | 'cancelled'

type Order = {
  id: number
  total: number
  status: OrderStatus
  fecha: string
  external_reference?: string
  envio_status?: string | null
  nombre_cliente?: string | null
  email_cliente?: string | null
}

type EffectiveStatus = 'pendiente' | 'para_despachar' | 'enviado' | 'cancelado' | 'venta_local'

function getEffectiveStatus(order: Order): EffectiveStatus {
  if (
    order.envio_status === 'cancelled' ||
    order.status === 'cancelled' ||
    order.status === 'failed'
  ) {
    return 'cancelado'
  }
  if (order.status === 'paid') {
    if (order.envio_status === 'local') return 'venta_local'
    if (order.envio_status === 'shipped') return 'enviado'
    return 'para_despachar'
  }
  return 'pendiente'
}

const STATUS_LABELS: Record<EffectiveStatus, string> = {
  pendiente: 'Pendiente de Pago',
  para_despachar: 'Para Despachar',
  enviado: 'Enviado',
  cancelado: 'Cancelado',
  venta_local: 'Venta en Local',
}

const STATUS_STYLES: Record<EffectiveStatus, string> = {
  pendiente: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
  para_despachar: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  enviado: 'bg-green-500/10 text-green-400 border border-green-500/20',
  cancelado: 'bg-white/5 text-white/50 border border-white/10',
  venta_local: 'bg-green-600/20 text-green-300 border border-green-500/30',
}

function formatDate(isoString: string): string {
  try {
    const date = new Date(isoString)
    return new Intl.DateTimeFormat('es-AR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date)
  } catch {
    return isoString
  }
}

export function LiveOrdersCard() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const isFirstLoad = useRef(true)

  const fetchOrders = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null
      const res = await fetch(`${API_BASE_URL}/orders`, {
        cache: 'no-store',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })
      if (res.ok) {
        const data: Order[] = await res.json()
        setOrders(data)
      }
    } catch {
      // Mantener los datos actuales en caso de error transitorio
    } finally {
      if (isFirstLoad.current) {
        setLoading(false)
        isFirstLoad.current = false
      }
    }
  }

  useEffect(() => {
    fetchOrders()
    const interval = setInterval(fetchOrders, 2000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex flex-col rounded-2xl border border-white/8 bg-[#14120e] p-5 shadow-xl min-w-0">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between border-b border-white/6 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#AA6F3B]/15 text-[#AA6F3B]">
            <ShoppingBag className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-serif text-lg font-bold text-white">Pedidos en Vivo</h2>
            <p className="text-xs text-white/40">Feed de órdenes en tiempo real</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            En vivo
          </span>
          <span className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] font-mono font-medium text-white/50">
            {orders.length}
          </span>
        </div>
      </div>

      {/* Orders List / Scroll */}
      <div className="h-[520px] overflow-y-auto pr-1 space-y-2.5">
        {loading ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-white/40">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#AA6F3B] border-t-transparent" />
            <span className="text-xs">Cargando pedidos...</span>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-white/40">
            <Radio className="mb-2 h-8 w-8 text-white/20" />
            <p className="text-sm">No hay pedidos registrados todavía</p>
          </div>
        ) : (
          orders.map((order) => {
            const effStatus = getEffectiveStatus(order)
            return (
              <div
                key={order.id}
                className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] p-3.5 transition-colors hover:bg-white/[0.04]"
              >
                <div className="min-w-0 pr-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-white/90">
                      #{order.id}
                    </span>
                    <span className="text-[11px] text-white/35">
                      {formatDate(order.fecha)}
                    </span>
                  </div>
                  <p className="truncate text-sm font-medium text-white/80">
                    {order.nombre_cliente?.trim() || 'Cliente no registrado'}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span className="font-mono text-sm font-semibold text-white">
                    {order.total.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}
                  </span>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_STYLES[effStatus]}`}>
                    {STATUS_LABELS[effStatus]}
                  </span>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

"use client"

import React, { useState, useEffect, useMemo } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { API_BASE_URL } from "@/lib/api"
import { ChevronDown, ChevronRight } from "lucide-react"

type OrderStatus = "pending" | "paid" | "failed" | "cancelled"

type Order = {
  id: number
  total: number
  status: OrderStatus
  fecha: string
  external_reference: string
  zipnova_shipment_id?: string | null
  envio_status?: string | null
}

type OrderItem = {
  id: number
  id_pedido: number
  id_producto: string
  title: string
  cantidad: number
  precio_unitario: number
}

type SortKey = keyof Pick<Order, "id" | "status" | "fecha" | "total">

// ============================================
// ESTADOS EFECTIVOS SIMPLIFICADOS (3 estados)
// ============================================
// Lógica:
// - "Cancelado": si el envío fue anulado (envio_status === 'cancelled')
// - "Pagado": si el pago fue aprobado (status === 'paid') y no está cancelado
// - "Pendiente": cualquier otro caso (pending, failed, etc.)
// ============================================

type EffectiveStatus = "pendiente" | "pagado" | "cancelado"

function getEffectiveStatus(order: Order): EffectiveStatus {
  // Prioridad 1: si el envío fue cancelado → Cancelado
  if (order.envio_status === 'cancelled') return "cancelado"
  // Prioridad 2: si el pago fue aprobado → Pagado
  if (order.status === 'paid') return "pagado"
  // Default: Pendiente (incluye pending, failed, etc.)
  return "pendiente"
}

const EFFECTIVE_STATUS_LABELS: Record<EffectiveStatus, string> = {
  pendiente: "Pendiente",
  pagado: "Pagado",
  cancelado: "Cancelado",
}

const EFFECTIVE_STATUS_COLORS: Record<EffectiveStatus, string> = {
  pendiente: "bg-yellow-100 text-yellow-800",
  pagado: "bg-green-100 text-green-800",
  cancelado: "bg-gray-100 text-gray-800",
}

const PAGE_SIZE = 15

export default function AdminPedidosPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [expandedOrders, setExpandedOrders] = useState<Set<number>>(new Set())
  const [orderItems, setOrderItems] = useState<Map<number, OrderItem[]>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<EffectiveStatus | "all">("all")
  const [page, setPage] = useState(1)
  const [sortKey, setSortKey] = useState<SortKey>("fecha")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")

  useEffect(() => {
    fetchOrders()
  }, [])

  async function fetchOrders() {
    try {
      setLoading(true)
      const token = localStorage.getItem("admin_token")
      const res = await fetch(`${API_BASE_URL}/orders`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!res.ok) {
        throw new Error(`Error ${res.status}`)
      }

      const data = await res.json()
      setOrders(data)
      setError(null)
    } catch (e: any) {
      setError(e?.message || "Error al cargar pedidos")
    } finally {
      setLoading(false)
    }
  }

  async function toggleOrder(orderId: number) {
    const newExpanded = new Set(expandedOrders)
    
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId)
      setExpandedOrders(newExpanded)
    } else {
      newExpanded.add(orderId)
      setExpandedOrders(newExpanded)

      // Cargar items si no están ya cargados
      if (!orderItems.has(orderId)) {
        try {
          const token = localStorage.getItem("admin_token")
          const res = await fetch(`${API_BASE_URL}/orders/${orderId}/items`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          })

          if (!res.ok) {
            throw new Error(`Error ${res.status}`)
          }

          const items = await res.json()
          setOrderItems(new Map(orderItems).set(orderId, items))
        } catch (e: any) {
          console.error("Error cargando items:", e)
        }
      }
    }
  }

  const sorted = useMemo(() => {
    if (!orders) return [] as Order[]
    const copy = [...orders]
    copy.sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      let res = 0
      if (sortKey === "id" || sortKey === "total") {
        res = (av as number) - (bv as number)
      } else if (sortKey === "fecha") {
        res = new Date(av as string).getTime() - new Date(bv as string).getTime()
      } else { // sortKey === "status" → ordenar por estado efectivo
        const sa = getEffectiveStatus(a)
        const sb = getEffectiveStatus(b)
        res = sa.localeCompare(sb)
      }
      return sortDir === "asc" ? res : -res
    })
    return copy
  }, [orders, sortKey, sortDir])

  const filteredOrders = useMemo(() => {
    if (filterStatus === "all") return sorted
    return sorted.filter(order => getEffectiveStatus(order) === filterStatus)
  }, [sorted, filterStatus])

  const total = filteredOrders.length
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const current = Math.min(page, pages)
  const start = (current - 1) * PAGE_SIZE
  const visible = filteredOrders.slice(start, start + PAGE_SIZE)

  const changeSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir("asc")
    }
    setPage(1)
  }

  if (loading) {
    return <div className="text-white">Cargando pedidos...</div>
  }

  if (error) {
    return <div className="text-red-400">Error: {error}</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-3xl font-bold text-white">
          Pedidos {total > 0 && <span className="text-white/70 text-2xl ml-2">({total})</span>}
        </h2>
        <div className="flex items-center gap-3">
          <select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value as EffectiveStatus | "all"); setPage(1) }}
            className="px-3 py-2 rounded-md border border-gray-300 bg-white text-black text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">Todos los estados</option>
            <option value="pendiente">Pendientes</option>
            <option value="pagado">Pagados</option>
            <option value="cancelado">Cancelados</option>
          </select>
          <Button variant="outline" onClick={fetchOrders}>
            Recargar
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white text-black shadow-sm">
        <Table className="w-full">
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead className="w-20 cursor-pointer whitespace-nowrap" onClick={() => changeSort("id")}>
                ID {sortKey === "id" ? (sortDir === "asc" ? "▲" : "▼") : null}
              </TableHead>
              <TableHead className="w-32 cursor-pointer whitespace-nowrap" onClick={() => changeSort("status")}>
                Estado {sortKey === "status" ? (sortDir === "asc" ? "▲" : "▼") : null}
              </TableHead>
              <TableHead className="w-48 cursor-pointer whitespace-nowrap" onClick={() => changeSort("fecha")}>
                Fecha {sortKey === "fecha" ? (sortDir === "asc" ? "▲" : "▼") : null}
              </TableHead>
              <TableHead className="w-32 text-right cursor-pointer whitespace-nowrap" onClick={() => changeSort("total")}>
                Total {sortKey === "total" ? (sortDir === "asc" ? "▲" : "▼") : null}
              </TableHead>
              <TableHead className="w-36">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                  {filterStatus === "all" ? "No hay pedidos registrados" : `No hay pedidos con estado "${EFFECTIVE_STATUS_LABELS[filterStatus as EffectiveStatus]}"`}
                </TableCell>
              </TableRow>
            ) : (
              visible.map((order) => {
                const isExpanded = expandedOrders.has(order.id)
                const items = orderItems.get(order.id) || []
                const effectiveStatus = getEffectiveStatus(order)

                return (
                  <React.Fragment key={order.id}>
                    <TableRow className="hover:bg-gray-50 cursor-pointer" onClick={() => toggleOrder(order.id)}>
                      <TableCell>
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-gray-500" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-gray-500" />
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{order.id}</TableCell>
                      <TableCell>
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${EFFECTIVE_STATUS_COLORS[effectiveStatus]}`}>
                          {EFFECTIVE_STATUS_LABELS[effectiveStatus]}
                        </span>
                      </TableCell>
                      <TableCell>{new Date(order.fecha).toLocaleString()}</TableCell>
                      <TableCell className="text-right font-semibold">${Number(order.total).toFixed(2)}</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          {/* Ver Envío: solo si está Pagado */}
                          {effectiveStatus === 'pagado' && order.zipnova_shipment_id ? (
                            <Button
                              asChild
                              size="sm"
                              className="bg-green-100 text-green-700 hover:bg-green-200 border border-green-300"
                              variant="outline"
                            >
                              <a
                                href={`https://app.zipnova.com.ar/shipments/${order.zipnova_shipment_id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                Ver Envío
                              </a>
                            </Button>
                          ) : effectiveStatus === 'cancelado' ? (
                            <span className="text-xs text-gray-500 italic">Anulado</span>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}

                          {/* Anular: solo si está Pagado */}
                          {effectiveStatus === 'pagado' && order.zipnova_shipment_id && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="bg-red-100 text-red-700 hover:bg-red-200 border border-red-300"
                              onClick={async () => {
                                const confirmed = window.confirm('¿Confirmás anular el envío?');
                                if (!confirmed) return;
                                try {
                                  const token = localStorage.getItem('admin_token');
                                  const res = await fetch(`${API_BASE_URL}/orders/${order.id}/cancel-shipment`, {
                                    method: 'POST',
                                    headers: {
                                      Authorization: `Bearer ${token}`,
                                    },
                                  });
                                  const data = await res.json().catch(() => ({}));
                                  if (!res.ok || data.success !== true) {
                                    alert(data.error || `Error HTTP ${res.status}`);
                                    return;
                                  }
                                  alert('Envío anulado correctamente');
                                  fetchOrders();
                                } catch (err: any) {
                                  alert(err?.message || 'Error al anular envío');
                                }
                              }}
                            >
                              Anular
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow>
                        <TableCell colSpan={6} className="bg-gray-50 p-0">
                          <div className="p-4">
                            <h4 className="font-semibold text-sm mb-3 text-gray-700">Items del pedido:</h4>
                            <Table className="border border-gray-200">
                              <TableHeader>
                                <TableRow className="bg-gray-100">
                                  <TableHead className="text-xs">ID Producto</TableHead>
                                  <TableHead className="text-xs">Título</TableHead>
                                  <TableHead className="text-xs text-center">Cantidad</TableHead>
                                  <TableHead className="text-xs text-right">Precio Unit.</TableHead>
                                  <TableHead className="text-xs text-right">Subtotal</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {items.length === 0 ? (
                                  <TableRow>
                                    <TableCell colSpan={5} className="text-center text-gray-500 text-sm py-4">
                                      Cargando items...
                                    </TableCell>
                                  </TableRow>
                                ) : (
                                  items.map((item) => (
                                    <TableRow key={item.id}>
                                      <TableCell className="text-xs font-mono">{item.id_producto}</TableCell>
                                      <TableCell className="text-sm">{item.title}</TableCell>
                                      <TableCell className="text-sm text-center">{item.cantidad}</TableCell>
                                      <TableCell className="text-sm text-right">${Number(item.precio_unitario).toFixed(2)}</TableCell>
                                      <TableCell className="text-sm text-right font-medium">
                                        ${(Number(item.precio_unitario) * item.cantidad).toFixed(2)}
                                      </TableCell>
                                    </TableRow>
                                  ))
                                )}
                              </TableBody>
                            </Table>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Paginación */}
      <div className="flex items-center justify-between text-white mt-2">
        <div>
          Mostrando {visible.length > 0 ? start + 1 : 0}–{Math.min(start + PAGE_SIZE, total)} de {total}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" disabled={current === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            Anterior
          </Button>
          <span>Página {current} / {pages}</span>
          <Button variant="outline" disabled={current === pages} onClick={() => setPage((p) => Math.min(pages, p + 1))}>
            Siguiente
          </Button>
        </div>
      </div>
    </div>
  )
}

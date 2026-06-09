"use client"

import React, { useState, useEffect, useMemo } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { API_BASE_URL } from "@/lib/api"
import { ChevronDown, ChevronRight, Info } from "lucide-react"

type OrderStatus = "pending" | "paid" | "failed" | "cancelled"

type Order = {
  id: number
  total: number
  status: OrderStatus
  fecha: string
  external_reference: string
  zipnova_shipment_id?: string | null
  tracking_code?: string | null
  envio_status?: string | null
  nombre_cliente?: string | null
  email_cliente?: string | null
  dni_cliente?: string | null
  telefono_cliente?: string | null
  provincia?: string | null
  ciudad?: string | null
  codigo_postal?: string | null
  direccion?: string | null
  numero?: string | null
  extra?: string | null
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
// ESTADOS EFECTIVOS SIMPLIFICADOS (4 estados)
// ============================================

type EffectiveStatus = "pendiente" | "para_despachar" | "enviado" | "cancelado"

function getEffectiveStatus(order: Order): EffectiveStatus {
  if (order.envio_status === 'cancelled' || order.status === 'cancelled' || order.status === 'failed') return "cancelado"
  if (order.status === 'paid') {
    if (order.envio_status === 'shipped') return "enviado"
    return "para_despachar"
  }
  return "pendiente"
}

const EFFECTIVE_STATUS_LABELS: Record<EffectiveStatus, string> = {
  pendiente: "Pendiente de Pago",
  para_despachar: "Para Despachar",
  enviado: "Enviado",
  cancelado: "Cancelado",
}

const EFFECTIVE_STATUS_COLORS: Record<EffectiveStatus, string> = {
  pendiente: "bg-yellow-100 text-yellow-800",
  para_despachar: "bg-blue-100 text-blue-800",
  enviado: "bg-green-100 text-green-800",
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
            <option value="pendiente">Pendientes de Pago</option>
            <option value="para_despachar">Para Despachar</option>
            <option value="enviado">Enviados</option>
            <option value="cancelado">Cancelados</option>
          </select>
          <Button variant="outline" onClick={fetchOrders}>
            Recargar
          </Button>
        </div>
      </div>

      <div className="bg-white/10 rounded-xl p-4 flex gap-3 text-white/90 text-sm border border-white/20 shadow-sm">
        <Info className="w-5 h-5 text-blue-300 shrink-0 mt-0.5" />
        <div className="flex flex-col gap-1.5">
          <p><strong className="text-yellow-300">Pendiente de Pago:</strong> El cliente generó la orden pero el pago en MercadoPago aún no fue procesado o fue rechazado.</p>
          <p><strong className="text-blue-300">Para Despachar:</strong> El pago se acreditó exitosamente y el pedido está listo para ser preparado y enviado.</p>
          <p><strong className="text-green-300">Enviado:</strong> Se cargó el código de seguimiento de Correo Argentino (el cliente ya recibió el email).</p>
          <p><strong className="text-gray-300">Cancelado:</strong> El pago falló definitivamente, o un pedido "Para Despachar" fue anulado manualmente por un administrador.</p>
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
                          {/* Acciones principales */}
                          {effectiveStatus === 'para_despachar' ? (
                            <Button
                              size="sm"
                              className="bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-300"
                              variant="outline"
                              onClick={async (e) => {
                                e.stopPropagation();
                                const code = window.prompt('Ingresá el código de seguimiento de Correo Argentino:');
                                if (!code) return;
                                try {
                                  const token = localStorage.getItem('admin_token');
                                  const res = await fetch(`${API_BASE_URL}/orders/${order.id}/set-tracking`, {
                                    method: 'POST',
                                    headers: {
                                      'Content-Type': 'application/json',
                                      Authorization: `Bearer ${token}`,
                                    },
                                    body: JSON.stringify({ trackingCode: code }),
                                  });
                                  const data = await res.json().catch(() => ({}));
                                  if (!res.ok || data.success !== true) {
                                    alert(data.error || `Error HTTP ${res.status}`);
                                    return;
                                  }
                                  alert('Código de seguimiento cargado y estado actualizado');
                                  fetchOrders();
                                } catch (err: any) {
                                  alert(err?.message || 'Error al cargar código');
                                }
                              }}
                            >
                              Cargar Seguimiento
                            </Button>
                          ) : effectiveStatus === 'enviado' && order.tracking_code ? (
                            <Button
                              asChild
                              size="sm"
                              className="bg-green-100 text-green-700 hover:bg-green-200 border border-green-300"
                              variant="outline"
                            >
                              <a
                                href={`https://www.correoargentino.com.ar/formularios/e-commerce?tracking=${order.tracking_code}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                Ver Seguimiento
                              </a>
                            </Button>
                          ) : effectiveStatus === 'cancelado' ? (
                            <span className="text-xs text-gray-500 italic">Anulado</span>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}

                          {/* Anular: solo si está Para Despachar */}
                          {effectiveStatus === 'para_despachar' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="bg-red-100 text-red-700 hover:bg-red-200 border border-red-300"
                              onClick={async (e) => {
                                e.stopPropagation();
                                const confirmed = window.confirm('¿Confirmás anular la orden?');
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
                                  alert('Orden anulada correctamente');
                                  fetchOrders();
                                } catch (err: any) {
                                  alert(err?.message || 'Error al anular');
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
                            <div className="grid md:grid-cols-2 gap-6 p-4">
                              <div>
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
                              
                              <div>
                                <h4 className="font-semibold text-sm mb-3 text-gray-700">Información de Envío:</h4>
                                <div className="bg-white p-4 border border-gray-200 rounded-lg text-sm text-gray-800 space-y-2">
                                  <p><span className="font-medium text-gray-500 w-24 inline-block">Nombre:</span> {order.nombre_cliente || '-'}</p>
                                  <p><span className="font-medium text-gray-500 w-24 inline-block">Email:</span> {order.email_cliente || '-'}</p>
                                  <p><span className="font-medium text-gray-500 w-24 inline-block">DNI:</span> {order.dni_cliente || '-'}</p>
                                  <p><span className="font-medium text-gray-500 w-24 inline-block">Teléfono:</span> {order.telefono_cliente || '-'}</p>
                                  <hr className="my-2" />
                                  <p><span className="font-medium text-gray-500 w-24 inline-block">Provincia:</span> {order.provincia || '-'}</p>
                                  <p><span className="font-medium text-gray-500 w-24 inline-block">Ciudad:</span> {order.ciudad || '-'}</p>
                                  <p><span className="font-medium text-gray-500 w-24 inline-block">Código Postal:</span> {order.codigo_postal || '-'}</p>
                                  <p><span className="font-medium text-gray-500 w-24 inline-block">Dirección:</span> {order.direccion} {order.numero} {order.extra ? `(Depto: ${order.extra})` : ''}</p>
                                  {order.tracking_code && (
                                    <>
                                      <hr className="my-2" />
                                      <p><span className="font-medium text-gray-500 w-24 inline-block">Tracking:</span> <span className="font-mono bg-gray-100 px-1 py-0.5 rounded text-gray-700">{order.tracking_code}</span></p>
                                    </>
                                  )}
                                </div>
                              </div>
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

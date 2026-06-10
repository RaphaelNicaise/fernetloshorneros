"use client"

import React, { useState, useEffect, useMemo } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { API_BASE_URL } from "@/lib/api"
import { ChevronDown, ChevronRight, Info, Search, Download } from "lucide-react"
import { Input } from "@/components/ui/input"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { Checkbox } from "@/components/ui/checkbox"
import * as XLSX from "xlsx"

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
  const [searchQuery, setSearchQuery] = useState("")
  const [page, setPage] = useState(1)
  const [sortKey, setSortKey] = useState<SortKey>("fecha")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")

  // Estados para modal de cambio de estado
  const [statusModalOpen, setStatusModalOpen] = useState(false)
  const [statusModalTarget, setStatusModalTarget] = useState<Order | null>(null)
  const [statusModalNewStatus, setStatusModalNewStatus] = useState<EffectiveStatus | "">("")
  const [statusModalTrackingCode, setStatusModalTrackingCode] = useState("")
  const [statusModalSendEmail, setStatusModalSendEmail] = useState(true)
  const [statusModalRestoreStock, setStatusModalRestoreStock] = useState(true)
  const [submittingStatus, setSubmittingStatus] = useState(false)

  useEffect(() => {
    fetchOrders()
  }, [])

  function openStatusModal(order: Order) {
    setStatusModalTarget(order);
    const eff = getEffectiveStatus(order);
    setStatusModalNewStatus(eff);
    setStatusModalTrackingCode(order.tracking_code || "");
    setStatusModalSendEmail(false); // por defecto falso en manual
    setStatusModalRestoreStock(true);
    setStatusModalOpen(true);
  }

  async function handleUpdateStatus() {
    if (!statusModalNewStatus || !statusModalTarget) return;
    try {
      setSubmittingStatus(true);
      const token = localStorage.getItem("admin_token");
      
      const payload = {
        status: statusModalNewStatus,
        trackingCode: statusModalNewStatus === "enviado" ? statusModalTrackingCode : undefined,
        sendEmail: statusModalNewStatus === "enviado" ? statusModalSendEmail : undefined,
        restoreStock: statusModalNewStatus === "cancelado" ? statusModalRestoreStock : undefined,
      };

      const res = await fetch(`${API_BASE_URL}/orders/${statusModalTarget.id}/update-status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success !== true) {
        alert(data.error || `Error HTTP ${res.status}`);
        return;
      }

      alert("Estado actualizado correctamente");
      setStatusModalOpen(false);
      fetchOrders();
    } catch (e: any) {
      alert(e?.message || "Error al actualizar estado");
    } finally {
      setSubmittingStatus(false);
    }
  }

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
    let result = sorted
    
    if (filterStatus !== "all") {
      result = result.filter(order => getEffectiveStatus(order) === filterStatus)
    }

    const q = searchQuery.trim().toLowerCase()
    if (q) {
      result = result.filter((o) => {
        const idMatch = String(o.id).includes(q)
        const nameMatch = (o.nombre_cliente || "").toLowerCase().includes(q)
        const emailMatch = (o.email_cliente || "").toLowerCase().includes(q)
        const trackingMatch = (o.tracking_code || "").toLowerCase().includes(q)
        return idMatch || nameMatch || emailMatch || trackingMatch
      })
    }

    return result
  }, [sorted, filterStatus, searchQuery])

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

  const exportXlsx = () => {
    if (!filteredOrders || filteredOrders.length === 0) return
    const rows = filteredOrders.map((o) => ({
      ID: o.id,
      Estado: EFFECTIVE_STATUS_LABELS[getEffectiveStatus(o)],
      Total: o.total,
      Fecha: new Date(o.fecha).toLocaleString(),
      "Nombre Cliente": o.nombre_cliente || "-",
      "Email Cliente": o.email_cliente || "-",
      "DNI": o.dni_cliente || "-",
      "Teléfono": o.telefono_cliente || "-",
      "Provincia": o.provincia || "-",
      "Ciudad": o.ciudad || "-",
      "CP": o.codigo_postal || "-",
      "Dirección": `${o.direccion || ""} ${o.numero || ""}`,
      "Extra/Depto": o.extra || "-",
      "Tracking": o.tracking_code || "-",
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Pedidos")
    const ts = new Date()
    const pad = (n: number) => String(n).padStart(2, "0")
    const filename = `pedidos_${ts.getFullYear()}${pad(ts.getMonth() + 1)}${pad(ts.getDate())}_${pad(ts.getHours())}${pad(ts.getMinutes())}.xlsx`
    XLSX.writeFile(wb, filename)
  }

  if (loading) {
    return <div className="text-white">Cargando pedidos...</div>
  }

  if (error) {
    return <div className="text-red-400">Error: {error}</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="font-serif text-3xl font-bold text-white">
          Pedidos {total > 0 && <span className="text-white/70 text-2xl ml-2">({total})</span>}
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Buscar por ID, Nombre, Email..."
              className="pl-9 bg-white text-black placeholder:text-gray-500 border-gray-300"
              value={searchQuery}
              onChange={(e) => { setPage(1); setSearchQuery(e.target.value) }}
            />
          </div>
          <HoverCard>
            <HoverCardTrigger asChild>
              <Button variant="outline" className="h-10 bg-white text-black hover:bg-gray-100 flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-500" />
                Guía de Estados
              </Button>
            </HoverCardTrigger>
            <HoverCardContent className="w-80 bg-white p-4 shadow-xl border border-gray-200">
              <div className="flex flex-col gap-2 text-sm text-gray-800">
                <p><strong className="text-yellow-600">Pendiente de Pago:</strong> El cliente generó la orden pero el pago en MercadoPago aún no fue procesado o fue rechazado.</p>
                <p><strong className="text-blue-600">Para Despachar:</strong> El pago se acreditó exitosamente y el pedido está listo para ser preparado y enviado.</p>
                <p><strong className="text-green-600">Enviado:</strong> Se cargó el código de seguimiento de Correo Argentino (el cliente ya recibió el email).</p>
                <p><strong className="text-gray-500">Cancelado:</strong> El pago falló definitivamente, o un pedido "Para Despachar" fue anulado manualmente por un administrador.</p>
              </div>
            </HoverCardContent>
          </HoverCard>
          <select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value as EffectiveStatus | "all"); setPage(1) }}
            className="px-3 py-2 rounded-md border border-gray-300 bg-white text-black text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary h-10"
          >
            <option value="all">Todos los estados</option>
            <option value="pendiente">Pendientes de Pago</option>
            <option value="para_despachar">Para Despachar</option>
            <option value="enviado">Enviados</option>
            <option value="cancelado">Cancelados</option>
          </select>
          <Button variant="outline" className="h-10 bg-white text-black hover:bg-gray-100" onClick={exportXlsx} disabled={total === 0}>
            <Download className="w-4 h-4 mr-2" />
            Exportar Excel
          </Button>
          <Button variant="secondary" className="h-10" onClick={fetchOrders}>
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
              <TableHead className="w-44">Acción</TableHead>
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
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="bg-purple-100 text-purple-700 hover:bg-purple-200 border border-purple-300"
                            onClick={(e) => {
                              e.stopPropagation();
                              openStatusModal(order);
                            }}
                          >
                            Estado
                          </Button>

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
                              Seguimiento
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
                                Ver
                              </a>
                            </Button>
                          ) : effectiveStatus === 'cancelado' ? (
                            <span className="text-xs text-gray-500 italic">Anulado</span>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}

                          {/* Anular con reembolso: solo si está Para Despachar */}
                          {effectiveStatus === 'para_despachar' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="bg-red-100 text-red-700 hover:bg-red-200 border border-red-300"
                              onClick={async (e) => {
                                e.stopPropagation();
                                const confirmed = window.confirm('¿Confirmás anular la orden con reembolso en MercadoPago?');
                                if (!confirmed) return;
                                
                                const restore = window.confirm('¿Querés devolver el stock de los productos al inventario?');
                                
                                try {
                                  const token = localStorage.getItem('admin_token');
                                  const res = await fetch(`${API_BASE_URL}/orders/${order.id}/cancel-shipment`, {
                                    method: 'POST',
                                    headers: {
                                      'Content-Type': 'application/json',
                                      Authorization: `Bearer ${token}`,
                                    },
                                    body: JSON.stringify({ restoreStock: restore }),
                                  });
                                  const data = await res.json().catch(() => ({}));
                                  if (!res.ok || data.success !== true) {
                                    alert(data.error || `Error HTTP ${res.status}`);
                                    return;
                                  }
                                  alert('Orden anulada y reembolso procesado correctamente');
                                  fetchOrders();
                                } catch (err: any) {
                                  alert(err?.message || 'Error al anular');
                                }
                              }}
                            >
                              Anular (Reembolso MP)
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
                                  <p><span className="font-medium text-gray-500 w-24 inline-block">Dirección:</span> {order.direccion} {order.numero}</p>
                                  
                                  {order.extra && (
                                    <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-md">
                                      <span className="font-semibold text-amber-800 text-xs uppercase tracking-wider block mb-1">Aclaración / Depto / Piso:</span>
                                      <span className="text-amber-900 font-medium">{order.extra}</span>
                                    </div>
                                  )}

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

      {/* Modal de Cambio de Estado (Glassmorphic Overlay) */}
      {statusModalOpen && statusModalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden transform transition-all duration-300 scale-100 flex flex-col text-black">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <h3 className="font-serif text-lg font-bold text-gray-950">
                Cambiar Estado: Pedido #{statusModalTarget.id}
              </h3>
              <button 
                onClick={() => setStatusModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4 flex-1">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Nuevo Estado</label>
                <select
                  value={statusModalNewStatus}
                  onChange={(e) => {
                    const s = e.target.value as EffectiveStatus;
                    setStatusModalNewStatus(s);
                    // establecer valores por defecto
                    if (s === "enviado") {
                      setStatusModalSendEmail(true); // activar por defecto en individual
                    } else if (s === "cancelado") {
                      setStatusModalRestoreStock(true);
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-black font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="" disabled>Seleccioná un estado...</option>
                  <option value="pendiente">Pendiente de Pago</option>
                  <option value="para_despachar">Para Despachar</option>
                  <option value="enviado">Enviado (Despachado)</option>
                  <option value="cancelado">Cancelado (Anulado)</option>
                </select>
              </div>

              {/* Campos condicionales */}
              {statusModalNewStatus === "enviado" && (
                <div className="space-y-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Código de Seguimiento (Opcional)</label>
                    <Input
                      placeholder="Ej: CP123456789AR"
                      value={statusModalTrackingCode}
                      onChange={(e) => setStatusModalTrackingCode(e.target.value)}
                      className="bg-white border-gray-300 text-black text-sm"
                    />
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Checkbox
                      id="sendEmailCheckbox"
                      checked={statusModalSendEmail}
                      onCheckedChange={(checked) => setStatusModalSendEmail(!!checked)}
                    />
                    <label htmlFor="sendEmailCheckbox" className="text-xs font-medium text-gray-600 select-none cursor-pointer">
                      Enviar email de notificación de envío al comprador
                    </label>
                  </div>
                </div>
              )}

              {statusModalNewStatus === "cancelado" && (
                <div className="p-3 bg-red-50 rounded-lg border border-red-100 flex items-center gap-2">
                  <Checkbox
                    id="restoreStockCheckbox"
                    checked={statusModalRestoreStock}
                    onCheckedChange={(checked) => setStatusModalRestoreStock(!!checked)}
                  />
                  <label htmlFor="restoreStockCheckbox" className="text-xs font-medium text-red-900 select-none cursor-pointer">
                    Restaurar stock de productos (devolver al inventario)
                  </label>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setStatusModalOpen(false)}
                disabled={submittingStatus}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleUpdateStatus}
                disabled={!statusModalNewStatus || submittingStatus}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {submittingStatus ? "Guardando..." : "Confirmar"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

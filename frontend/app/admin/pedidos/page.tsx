"use client"

import React, { useState, useEffect, useMemo } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { API_BASE_URL } from "@/lib/api"
import { ChevronDown, ChevronRight, Info, Search, Download, Pencil, Trash2, AlertTriangle } from "lucide-react"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
  costo_envio?: number | null
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
  pendiente: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20",
  para_despachar: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
  enviado: "bg-green-500/10 text-green-400 border border-green-500/20",
  cancelado: "bg-white/5 text-white/50 border border-white/10",
}

const PAGE_SIZE = 75

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

  // Estados para modales personalizados y edición de datos
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editModalTarget, setEditModalTarget] = useState<Order | null>(null)
  
  // Estados para despacho rápido
  const [dispatchModalOpen, setDispatchModalOpen] = useState(false)
  const [dispatchModalTarget, setDispatchModalTarget] = useState<Order | null>(null)
  const [quickTrackingCode, setQuickTrackingCode] = useState("")
  const [quickSendEmail, setQuickSendEmail] = useState(true)

  // Campos del formulario de edición
  const [formStatus, setFormStatus] = useState<EffectiveStatus | "">("")
  const [formTrackingCode, setFormTrackingCode] = useState("")
  const [formSendEmail, setFormSendEmail] = useState(false)
  const [formRestoreStock, setFormRestoreStock] = useState(true)

  const [formNombre, setFormNombre] = useState("")
  const [formEmail, setFormEmail] = useState("")
  const [formDni, setFormDni] = useState("")
  const [formTelefono, setFormTelefono] = useState("")
  
  const [formProvincia, setFormProvincia] = useState("")
  const [formCiudad, setFormCiudad] = useState("")
  const [formCodigoPostal, setFormCodigoPostal] = useState("")
  const [formDireccion, setFormDireccion] = useState("")
  const [formNumero, setFormNumero] = useState("")
  const [formExtra, setFormExtra] = useState("")

  const [submittingStatus, setSubmittingStatus] = useState(false)
  const [exporting, setExporting] = useState(false)

  // Estados para crear pedido manual
  const [createManualModalOpen, setCreateManualModalOpen] = useState(false)
  const [availableProducts, setAvailableProducts] = useState<any[]>([])
  const [manualOrderItems, setManualOrderItems] = useState<{id_producto: string, cantidad: number, max: number, price: number}[]>([])
  const [manualNombre, setManualNombre] = useState("")
  const [manualEmail, setManualEmail] = useState("")
  const [manualTelefono, setManualTelefono] = useState("")
  const [manualDni, setManualDni] = useState("")

  // Diálogo de confirmación personalizado
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: React.ReactNode;
    onConfirm: (stockChecked?: boolean) => void;
    confirmText?: string;
    cancelText?: string;
    showStockOption?: boolean;
    stockOptionChecked?: boolean;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  // Alerta/Mensaje personalizado
  const [alertDialog, setAlertDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: "success" | "error" | "info";
  }>({
    isOpen: false,
    title: "",
    message: "",
    type: "info"
  });

  useEffect(() => {
    fetchOrders()
  }, [])

  // Cerrar modales con Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (confirmDialog.isOpen) {
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        }
        if (editModalOpen) {
          setEditModalOpen(false);
        }
        if (dispatchModalOpen) {
          setDispatchModalOpen(false);
        }
        if (alertDialog.isOpen) {
          setAlertDialog(prev => ({ ...prev, isOpen: false }));
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [confirmDialog.isOpen, editModalOpen, dispatchModalOpen, alertDialog.isOpen]);

  async function openCreateManualModal() {
    setCreateManualModalOpen(true);
    setManualOrderItems([]);
    setManualNombre("");
    setManualEmail("");
    setManualTelefono("");
    setManualDni("");
    try {
      const res = await fetch(`${API_BASE_URL}/products`, { cache: 'no-store' });
      const prods = await res.json();
      setAvailableProducts(prods.filter((p: any) => p.status !== 'agotado' && p.stock > 0));
    } catch (e) {
      console.error(e);
    }
  }

  async function handleCreateManualOrder() {
    if (!manualNombre || !manualEmail || manualOrderItems.length === 0) {
        setAlertDialog({ isOpen: true, title: "Error", message: "Completá nombre, email y seleccioná al menos un producto.", type: "error" });
        return;
    }
    try {
      setSubmittingStatus(true);
      const token = localStorage.getItem("admin_token");
      const payload = {
        cliente: {
            nombre: manualNombre,
            email: manualEmail,
            telefono: manualTelefono,
            dni: manualDni
        },
        items: manualOrderItems
      };
      const res = await fetch(`${API_BASE_URL}/orders/manual`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success !== true) {
        throw new Error(data.error || "Error al crear el pedido manual");
      }
      setAlertDialog({
        isOpen: true,
        title: "Éxito",
        message: "Pedido manual creado correctamente.",
        type: "success"
      });
      setCreateManualModalOpen(false);
      fetchOrders(true);
    } catch (e: any) {
      setAlertDialog({ isOpen: true, title: "Error", message: e?.message || "Error", type: "error" });
    } finally {
      setSubmittingStatus(false);
    }
  }

  function addManualItem(id_producto: string) {
    const prod = availableProducts.find(p => p.id === id_producto);
    if (!prod) return;
    const limit = prod.limite > 0 ? Math.min(prod.limite, prod.stock) : prod.stock;
    if (manualOrderItems.some(i => i.id_producto === id_producto)) return;
    setManualOrderItems([...manualOrderItems, { id_producto, cantidad: 1, max: limit, price: prod.price }]);
  }

  function removeManualItem(id_producto: string) {
    setManualOrderItems(manualOrderItems.filter(i => i.id_producto !== id_producto));
  }

  function updateManualItemQuantity(id_producto: string, cantidad: number) {
    setManualOrderItems(manualOrderItems.map(i => {
        if (i.id_producto === id_producto) {
            return { ...i, cantidad: Math.max(1, Math.min(cantidad, i.max)) };
        }
        return i;
    }));
  }

  function openEditModal(order: Order) {
    setEditModalTarget(order);
    const eff = getEffectiveStatus(order);
    setFormStatus(eff);
    setFormTrackingCode(order.tracking_code || "");
    setFormSendEmail(false); 
    setFormRestoreStock(true);

    setFormNombre(order.nombre_cliente || "");
    setFormEmail(order.email_cliente || "");
    setFormDni(order.dni_cliente || "");
    setFormTelefono(order.telefono_cliente || "");

    setFormProvincia(order.provincia || "");
    setFormCiudad(order.ciudad || "");
    setFormCodigoPostal(order.codigo_postal || "");
    setFormDireccion(order.direccion || "");
    setFormNumero(order.numero || "");
    setFormExtra(order.extra || "");

    setEditModalOpen(true);
  }

  async function handleSaveOrder() {
    if (!editModalTarget || !formStatus) return;
    try {
      setSubmittingStatus(true);
      const token = localStorage.getItem("admin_token");

      // 1. Actualizar estado y/o código de seguimiento si cambiaron
      const currentEff = getEffectiveStatus(editModalTarget);
      const statusChanged = currentEff !== formStatus || editModalTarget.tracking_code !== formTrackingCode;
      
      if (statusChanged) {
        const payload = {
          status: formStatus,
          trackingCode: formStatus === "enviado" ? formTrackingCode : undefined,
          sendEmail: formStatus === "enviado" ? formSendEmail : undefined,
          restoreStock: formStatus === "cancelado" ? formRestoreStock : undefined,
        };

        const res = await fetch(`${API_BASE_URL}/orders/${editModalTarget.id}/update-status`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok || data.success !== true) {
          throw new Error(data.error || "Error al actualizar el estado");
        }
      }

      // 2. Actualizar datos de contacto y dirección si cambiaron
      const detailsChanged = 
        editModalTarget.nombre_cliente !== formNombre ||
        editModalTarget.email_cliente !== formEmail ||
        editModalTarget.dni_cliente !== formDni ||
        editModalTarget.telefono_cliente !== formTelefono ||
        editModalTarget.provincia !== formProvincia ||
        editModalTarget.ciudad !== formCiudad ||
        editModalTarget.codigo_postal !== formCodigoPostal ||
        editModalTarget.direccion !== formDireccion ||
        editModalTarget.numero !== formNumero ||
        editModalTarget.extra !== formExtra;

      if (detailsChanged) {
        const payload = {
          nombre_cliente: formNombre,
          email_cliente: formEmail,
          dni_cliente: formDni,
          telefono_cliente: formTelefono,
          provincia: formProvincia,
          ciudad: formCiudad,
          codigo_postal: formCodigoPostal,
          direccion: formDireccion,
          numero: formNumero,
          extra: formExtra || null
        };

        const res = await fetch(`${API_BASE_URL}/orders/${editModalTarget.id}/details`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok || data.success !== true) {
          throw new Error(data.error || "Error al actualizar los detalles del pedido");
        }
      }

      setAlertDialog({
        isOpen: true,
        title: "Éxito",
        message: "El pedido fue actualizado correctamente.",
        type: "success"
      });
      setEditModalOpen(false);
      fetchOrders(true);
    } catch (e: any) {
      setAlertDialog({
        isOpen: true,
        title: "Error",
        message: e?.message || "Ocurrió un error al guardar los cambios.",
        type: "error"
      });
    } finally {
      setSubmittingStatus(false);
    }
  }

  function openDispatchModal(order: Order) {
    setDispatchModalTarget(order);
    setQuickTrackingCode(order.tracking_code || "");
    setQuickSendEmail(true);
    setDispatchModalOpen(true);
  }

  async function handleQuickDispatch() {
    if (!dispatchModalTarget) return;
    try {
      setSubmittingStatus(true);
      const token = localStorage.getItem("admin_token");
      const payload = {
        status: "enviado",
        trackingCode: quickTrackingCode,
        sendEmail: quickSendEmail,
      };

      const res = await fetch(`${API_BASE_URL}/orders/${dispatchModalTarget.id}/update-status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success !== true) {
        throw new Error(data.error || "Error al actualizar el estado");
      }

      setAlertDialog({
        isOpen: true,
        title: "Pedido Despachado",
        message: `El pedido #${dispatchModalTarget.id} fue marcado como enviado exitosamente.`,
        type: "success",
      });

      setDispatchModalOpen(false);
      setDispatchModalTarget(null);
      setQuickTrackingCode("");
      fetchOrders(true);
    } catch (e: any) {
      setAlertDialog({
        isOpen: true,
        title: "Error al Despachar",
        message: e?.message || "Ocurrió un error al despachar el pedido.",
        type: "error",
      });
    } finally {
      setSubmittingStatus(false);
    }
  }

  function handleCancelClick(order: Order) {
    setConfirmDialog({
      isOpen: true,
      title: "Anular Pedido con Reembolso",
      message: `¿Estás seguro de que querés anular el pedido #${order.id} y procesar el reembolso en MercadoPago?`,
      confirmText: "Anular y Reembolsar",
      cancelText: "Cancelar",
      showStockOption: true,
      stockOptionChecked: true,
      onConfirm: async (stockChecked?: boolean) => {
        try {
          const token = localStorage.getItem('admin_token');
          const res = await fetch(`${API_BASE_URL}/orders/${order.id}/cancel-shipment`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ restoreStock: stockChecked }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok || data.success !== true) {
            setAlertDialog({
              isOpen: true,
              title: "Error",
              message: data.error || `Error HTTP ${res.status}`,
              type: "error"
            });
            return;
          }
          setAlertDialog({
            isOpen: true,
            title: "Éxito",
            message: "La orden fue anulada y el reembolso fue procesado correctamente.",
            type: "success"
          });
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
          fetchOrders(true);
        } catch (err: any) {
          setAlertDialog({
            isOpen: true,
            title: "Error",
            message: err?.message || 'Error al anular',
            type: "error"
          });
        }
      }
    });
  }

  function handleDeleteOrderClick(order: Order) {
    const effectiveStatus = getEffectiveStatus(order);
    let warningMessage: React.ReactNode = "¿Estás seguro de que deseas eliminar este pedido por completo? Esta acción no se puede deshacer y borrará todos los registros (ítems, envíos, pagos).";

    if (effectiveStatus === 'para_despachar') {
      warningMessage = (
        <div className="flex flex-col gap-3">
          <p>¿Estás seguro de que deseas eliminar este pedido por completo?</p>
          <div className="bg-red-500/10 border border-red-500/30 p-3 rounded-lg flex gap-3 text-left">
            <AlertTriangle className="text-red-400 w-5 h-5 shrink-0 mt-0.5" />
            <div className="text-sm text-red-200">
              <span className="font-bold block mb-1">¡PELIGRO EXTREMO!</span>
              Este pedido <strong className="text-white">ya está pagado</strong> y listo para despachar. Si lo eliminas, perderás los datos de envío del cliente y no podrás mandarle el producto, a pesar de que ya te pagó.
            </div>
          </div>
        </div>
      );
    } else if (effectiveStatus === 'pendiente') {
      warningMessage = (
        <div className="flex flex-col gap-3">
          <p>¿Estás seguro de que deseas eliminar este pedido por completo?</p>
          <div className="bg-orange-500/10 border border-orange-500/30 p-3 rounded-lg flex gap-3 text-left">
            <AlertTriangle className="text-orange-400 w-5 h-5 shrink-0 mt-0.5" />
            <div className="text-sm text-orange-200">
              <span className="font-bold block mb-1">Cuidado: Pendiente de Pago</span>
              Si el cliente llega a pagar el pedido más tarde a través de MercadoPago, el pago ingresará pero <strong className="text-white">no tendrás el registro de qué compró ni a dónde enviarlo</strong> porque el pedido fue borrado.
            </div>
          </div>
        </div>
      );
    }

    setConfirmDialog({
      isOpen: true,
      title: "Eliminar Pedido Definitivamente",
      message: warningMessage,
      showStockOption: true,
      stockOptionChecked: true,
      confirmText: "Sí, Eliminar Definitivamente",
      cancelText: "Cancelar",
      onConfirm: async (stockChecked?: boolean) => {
        try {
          const token = localStorage.getItem('admin_token');
          const res = await fetch(`${API_BASE_URL}/orders/${order.id}?restoreStock=${!!stockChecked}`, {
            method: "DELETE",
            headers: {
              "Authorization": `Bearer ${token}`
            }
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok || data.success !== true) {
            setAlertDialog({
              isOpen: true,
              title: "Error",
              message: data.error || `Error HTTP ${res.status}`,
              type: "error"
            });
            return;
          }
          setAlertDialog({
            isOpen: true,
            title: "Eliminado",
            message: "El pedido fue borrado por completo del sistema.",
            type: "success"
          });
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
          fetchOrders(true);
        } catch (error) {
          console.error(error);
          setAlertDialog({
            isOpen: true,
            title: "Error",
            message: "Error de red eliminando el pedido.",
            type: "error"
          });
        }
      }
    });
  }

  async function fetchOrders(background = false) {
    try {
      if (!background) setLoading(true)
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

  const exportXlsx = async () => {
    if (!filteredOrders || filteredOrders.length === 0) return
    try {
      setExporting(true)
      const token = localStorage.getItem("admin_token")
      const res = await fetch(`${API_BASE_URL}/orders/all-items`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (!res.ok) {
        throw new Error("No se pudieron obtener los detalles de los productos para la exportación.")
      }
      const allItems: { id_pedido: number; title: string; cantidad: number; precio_unitario: number }[] = await res.json()

      // Agrupar items por id_pedido
      const itemsMap = new Map<number, string[]>()
      for (const item of allItems) {
        if (!itemsMap.has(item.id_pedido)) {
          itemsMap.set(item.id_pedido, [])
        }
        itemsMap.get(item.id_pedido)!.push(`${item.cantidad}x ${item.title}`)
      }

      const rows = filteredOrders.map((o) => {
        const prodList = itemsMap.get(o.id) || []
        const productosFormatted = prodList.length > 0 ? prodList.join(", ") : "-"

        return {
          ID: o.id,
          Estado: EFFECTIVE_STATUS_LABELS[getEffectiveStatus(o)],
          Total: Number(o.total),
          "Costo Envío": o.costo_envio ? Number(o.costo_envio) : 0,
          Fecha: new Date(o.fecha).toLocaleString(),
          "Referencia Pago": o.external_reference || "-",
          "Nombre Cliente": o.nombre_cliente || "-",
          "Email Cliente": o.email_cliente || "-",
          "DNI": o.dni_cliente || "-",
          "Teléfono": o.telefono_cliente || "-",
          "Provincia": o.provincia || "-",
          "Ciudad": o.ciudad || "-",
          "CP": o.codigo_postal || "-",
          "Dirección": `${o.direccion || ""} ${o.numero || ""}`,
          "Aclaraciones": o.extra || "-",
          "Tracking": o.tracking_code || "-",
          "Productos": productosFormatted,
        }
      })

      const ws = XLSX.utils.json_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Pedidos")
      const ts = new Date()
      const pad = (n: number) => String(n).padStart(2, "0")
      const filename = `pedidos_${ts.getFullYear()}${pad(ts.getMonth() + 1)}${pad(ts.getDate())}_${pad(ts.getHours())}${pad(ts.getMinutes())}.xlsx`
      XLSX.writeFile(wb, filename)
    } catch (e: any) {
      setAlertDialog({
        isOpen: true,
        title: "Error al Exportar",
        message: e?.message || "Ocurrió un error al obtener la información de los productos.",
        type: "error",
      })
    } finally {
      setExporting(false)
    }
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
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-white/40" />
            <Input
              placeholder="Buscar por ID, Nombre, Email..."
              className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:border-[#AA6F3B]/50 h-10"
              value={searchQuery}
              onChange={(e) => { setPage(1); setSearchQuery(e.target.value) }}
            />
          </div>
          <HoverCard>
            <HoverCardTrigger asChild>
              <Button variant="outline" className="h-10 border-white/10 bg-white/5 text-white hover:bg-white/10 flex items-center gap-2">
                <Info className="w-4 h-4 text-[#AA6F3B]" />
                Guía de Estados
              </Button>
            </HoverCardTrigger>
            <HoverCardContent className="w-85 bg-[#0b0a07] p-4 shadow-2xl border border-white/10 text-white">
              <div className="flex flex-col gap-2 text-sm text-white/80">
                <p><strong className="text-yellow-500">Pendiente de Pago:</strong> El cliente generó la orden pero el pago en MercadoPago aún no fue procesado o fue rechazado.</p>
                <p><strong className="text-blue-400">Para Despachar:</strong> El pago se acreditó exitosamente y el pedido está listo para ser preparado y enviado.</p>
                <p><strong className="text-green-400">Enviado:</strong> Se cargó el código de seguimiento de Correo Argentino (el cliente ya recibió el email).</p>
                <p><strong className="text-gray-400">Cancelado:</strong> El pago falló definitivamente, o un pedido "Para Despachar" fue anulado manualmente por un administrador.</p>
              </div>
            </HoverCardContent>
          </HoverCard>
          <Select
            value={filterStatus}
            onValueChange={(val) => { setFilterStatus(val as EffectiveStatus | "all"); setPage(1) }}
          >
            <SelectTrigger className="w-full md:w-48 bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:border-[#AA6F3B]/50 h-10 cursor-pointer select-none">
              <SelectValue placeholder="Todos los estados" />
            </SelectTrigger>
            <SelectContent className="bg-[#0b0a07] border border-white/10 text-white">
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="pendiente">Pendientes de Pago</SelectItem>
              <SelectItem value="para_despachar">Para Despachar</SelectItem>
              <SelectItem value="enviado">Enviados</SelectItem>
              <SelectItem value="cancelado">Cancelados</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="h-10 border-white/10 bg-white/5 text-white hover:bg-white/10 flex items-center gap-2" onClick={exportXlsx} disabled={total === 0 || exporting}>
            <Download className="w-4 h-4" />
            {exporting ? "Exportando..." : "Exportar Excel"}
          </Button>
          <Button variant="secondary" className="h-10 bg-[#AA6F3B]/20 text-[#AA6F3B] hover:bg-[#AA6F3B]/30 border border-[#AA6F3B]/30" onClick={() => fetchOrders()}>
            Recargar
          </Button>
          <Button className="h-10 bg-[#AA6F3B] hover:bg-[#AA6F3B]/90 text-white border-0 font-semibold" onClick={openCreateManualModal}>
            Crear Pedido Manual
          </Button>
        </div>
      </div>
      <div className="rounded-xl border border-white/8 bg-[#0b0a07]/40 shadow-2xl backdrop-blur-sm text-white overflow-hidden">
        <Table className="w-full">
          <TableHeader className="border-b border-white/8">
            <TableRow className="hover:bg-transparent border-b border-white/8">
              <TableHead className="w-12"></TableHead>
              <TableHead className="w-20 cursor-pointer whitespace-nowrap text-white/60 hover:text-white" onClick={() => changeSort("id")}>
                ID {sortKey === "id" ? (sortDir === "asc" ? "▲" : "▼") : null}
              </TableHead>
              <TableHead className="w-32 cursor-pointer whitespace-nowrap text-white/60 hover:text-white" onClick={() => changeSort("status")}>
                Estado {sortKey === "status" ? (sortDir === "asc" ? "▲" : "▼") : null}
              </TableHead>
              <TableHead className="w-48 cursor-pointer whitespace-nowrap text-white/60 hover:text-white" onClick={() => changeSort("fecha")}>
                Fecha {sortKey === "fecha" ? (sortDir === "asc" ? "▲" : "▼") : null}
              </TableHead>
              <TableHead className="w-32 text-right cursor-pointer whitespace-nowrap text-white/60 hover:text-white" onClick={() => changeSort("total")}>
                Total {sortKey === "total" ? (sortDir === "asc" ? "▲" : "▼") : null}
              </TableHead>
              <TableHead className="w-72 text-white/60">Acción</TableHead>
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
                    <TableRow className="hover:bg-white/5 border-b border-white/5 cursor-pointer text-white/90" onClick={() => toggleOrder(order.id)}>
                      <TableCell>
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-white/40" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-white/40" />
                        )}
                      </TableCell>
                      <TableCell className="font-medium text-white">{order.id}</TableCell>
                      <TableCell>
                        <span className={`inline-flex px-2 py-0.5 text-[11px] font-semibold rounded-full ${EFFECTIVE_STATUS_COLORS[effectiveStatus]}`}>
                          {EFFECTIVE_STATUS_LABELS[effectiveStatus]}
                        </span>
                      </TableCell>
                      <TableCell className="text-white/80">{new Date(order.fecha).toLocaleString()}</TableCell>
                      <TableCell className="text-right font-semibold text-white">${Number(order.total).toFixed(2)}</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2 flex-nowrap whitespace-nowrap">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-2 border-blue-500/40 text-blue-300 hover:bg-blue-500/20 bg-blue-500/10 flex items-center gap-1.5 h-8 px-3 rounded-md transition-colors font-semibold"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditModal(order);
                            }}
                          >
                            <Pencil className="w-3.5 h-3.5 text-blue-300" />
                            Editar
                          </Button>
 
                          {/* Acciones principales rápidas */}
                          {effectiveStatus === 'para_despachar' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-2 border-green-500/40 text-green-300 hover:bg-green-500/20 bg-green-500/10 h-8 px-3 rounded-md transition-colors font-semibold"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openDispatchModal(order);
                                }}
                              >
                                Despachar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-2 border-red-500/40 text-red-300 hover:bg-red-500/20 bg-red-500/10 h-8 px-3 rounded-md transition-colors font-semibold"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCancelClick(order);
                                }}
                              >
                                Anular (Reembolso MP)
                              </Button>
                            </>
                          )}
 
                          {effectiveStatus === 'enviado' && order.tracking_code && (
                            <Button
                              asChild
                              size="sm"
                              variant="outline"
                              className="border-2 border-blue-500/40 text-blue-300 hover:bg-blue-500/20 bg-blue-500/10 h-8 px-3 rounded-md transition-colors font-semibold"
                            >
                              <a
                                href={`https://www.correoargentino.com.ar/formularios/e-commerce?tracking=${order.tracking_code}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                Ver Envío
                              </a>
                            </Button>
                          )}

                          {/* Botón Eliminar (siempre disponible pero requiere doble check) */}
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-2 border-red-500/40 text-red-300 hover:bg-red-500/20 bg-red-500/10 flex items-center justify-center w-8 h-8 p-0 rounded-md transition-colors ml-auto"
                            title="Eliminar Pedido"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteOrderClick(order);
                            }}
                          >
                            <Trash2 className="w-4 h-4 text-red-300" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow className="border-b border-white/5">
                        <TableCell colSpan={6} className="bg-white/2 p-0 border-b border-white/5">
                            <div className="grid md:grid-cols-2 gap-6 p-4">
                              <div>
                                <h4 className="font-semibold text-sm mb-3 text-white/60">Items del pedido:</h4>
                                <Table className="border border-white/8">
                                  <TableHeader>
                                    <TableRow className="bg-white/5 hover:bg-white/5 border-b border-white/8">
                                      <TableHead className="text-xs text-white/50 h-8">ID Producto</TableHead>
                                      <TableHead className="text-xs text-white/50 h-8">Título</TableHead>
                                      <TableHead className="text-xs text-white/50 text-center h-8">Cantidad</TableHead>
                                      <TableHead className="text-xs text-white/50 text-right h-8">Precio Unit.</TableHead>
                                      <TableHead className="text-xs text-white/50 text-right h-8">Subtotal</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {items.length === 0 ? (
                                      <TableRow>
                                        <TableCell colSpan={5} className="text-center text-white/40 text-sm py-4">
                                          Cargando items...
                                        </TableCell>
                                      </TableRow>
                                    ) : (
                                      items.map((item) => (
                                        <TableRow key={item.id} className="border-b border-white/5 hover:bg-white/2">
                                          <TableCell className="text-xs font-mono text-white/70">{item.id_producto}</TableCell>
                                          <TableCell className="text-sm text-white">{item.title}</TableCell>
                                          <TableCell className="text-sm text-center text-white/80">{item.cantidad}</TableCell>
                                          <TableCell className="text-sm text-right text-white/80">${Number(item.precio_unitario).toFixed(2)}</TableCell>
                                          <TableCell className="text-sm text-right font-medium text-white">
                                            ${(Number(item.precio_unitario) * item.cantidad).toFixed(2)}
                                          </TableCell>
                                        </TableRow>
                                      ))
                                    )}
                                  </TableBody>
                                </Table>
                              </div>
                              
                              <div>
                                <h4 className="font-semibold text-sm mb-3 text-white/60">Información de Envío:</h4>
                                <div className="bg-white/3 p-4 border border-white/8 rounded-lg text-sm text-white/85 space-y-2">
                                  <p><span className="font-medium text-white/40 w-24 inline-block">Nombre:</span> {order.nombre_cliente || '-'}</p>
                                  <p><span className="font-medium text-white/40 w-24 inline-block">Email:</span> {order.email_cliente || '-'}</p>
                                  <p><span className="font-medium text-white/40 w-24 inline-block">DNI:</span> {order.dni_cliente || '-'}</p>
                                  <p><span className="font-medium text-white/40 w-24 inline-block">Teléfono:</span> {order.telefono_cliente || '-'}</p>
                                  <hr className="my-2 border-white/8" />
                                  <p><span className="font-medium text-white/40 w-24 inline-block">Provincia:</span> {order.provincia || '-'}</p>
                                  <p><span className="font-medium text-white/40 w-24 inline-block">Ciudad:</span> {order.ciudad || '-'}</p>
                                  <p><span className="font-medium text-white/40 w-24 inline-block">Código Postal:</span> {order.codigo_postal || '-'}</p>
                                  <p><span className="font-medium text-white/40 w-24 inline-block">Dirección:</span> {order.direccion} {order.numero}</p>
                                  
                                  {order.extra && (
                                    <div className="mt-2 p-2 bg-[#AA6F3B]/10 border border-[#AA6F3B]/30 rounded-md">
                                      <span className="font-semibold text-[#AA6F3B] text-xs uppercase tracking-wider block mb-1">Aclaración / Depto / Piso:</span>
                                      <span className="text-white font-medium">{order.extra}</span>
                                    </div>
                                  )}
 
                                  {order.tracking_code && (
                                    <>
                                      <hr className="my-2 border-white/8" />
                                      <p><span className="font-medium text-white/40 w-24 inline-block">Tracking:</span> <span className="font-mono bg-white/5 border border-white/10 px-1 py-0.5 rounded text-[#AA6F3B]">{order.tracking_code}</span></p>
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

      {/* Paginación Sticky */}
      <div className="sticky bottom-4 z-10 bg-[#0b0a07]/90 backdrop-blur-md border border-white/10 px-6 py-4 shadow-[0_12px_40px_rgba(0,0,0,0.7)] flex flex-col sm:flex-row items-center justify-between gap-4 text-white rounded-xl mt-4">
        <div className="text-sm font-medium text-white/80">
          Mostrando <span className="text-white font-semibold">{visible.length > 0 ? start + 1 : 0}</span>–<span className="text-white font-semibold">{Math.min(start + PAGE_SIZE, total)}</span> de <span className="text-[#AA6F3B] font-semibold">{total}</span>
        </div>
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            disabled={current === 1} 
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="border-white/10 bg-white/5 text-white hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-white/5"
          >
            Anterior
          </Button>
          <span className="text-sm text-white/80">
            Página <span className="text-[#AA6F3B] font-semibold">{current}</span> / {pages}
          </span>
          <Button 
            variant="outline" 
            disabled={current === pages} 
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            className="border-white/10 bg-white/5 text-white hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-white/5"
          >
            Siguiente
          </Button>
        </div>
      </div>

      {/* Modal de Edición Completo */}
      {editModalOpen && editModalTarget && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4"
          onClick={() => setEditModalOpen(false)}
        >
          <div 
            className="w-full max-w-3xl bg-[#0b0a07] rounded-xl shadow-2xl border border-white/10 overflow-hidden flex flex-col text-white max-h-[95vh] transform transition-all duration-300"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                submitEditForm();
              }
            }}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-white/8 bg-white/5 flex items-center justify-between">
              <h3 className="font-serif text-lg font-bold text-white">
                Editar Pedido #{editModalTarget.id}
              </h3>
              <button 
                onClick={() => setEditModalOpen(false)}
                className="text-white/40 hover:text-white transition-colors font-bold"
              >
                ✕
              </button>
            </div>
 
            {/* Content (Scrollable Grid) */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 max-h-[calc(95vh-130px)]">
              <div className="grid md:grid-cols-2 gap-6">
                
                {/* Columna Izquierda: Estado y Seguimiento */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-sm text-[#AA6F3B] border-b border-white/10 pb-2">Estado y Logística</h4>
                  
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-white/40 uppercase tracking-wider block">Estado del Pedido</label>
                    <Select
                      value={formStatus}
                      onValueChange={(val) => {
                        const s = val as EffectiveStatus;
                        setFormStatus(s);
                        if (s === "enviado") {
                          setFormSendEmail(true);
                        } else if (s === "cancelado") {
                          setFormRestoreStock(true);
                        }
                      }}
                    >
                      <SelectTrigger className="w-full bg-white/5 border border-white/10 text-white text-sm rounded-lg h-10 px-3 py-2 outline-none focus:border-[#AA6F3B]/50 cursor-pointer select-none">
                        <SelectValue placeholder="Seleccionar estado" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0b0a07] border border-white/10 text-white">
                        <SelectItem value="pendiente">Pendiente de Pago</SelectItem>
                        <SelectItem value="para_despachar">Para Despachar</SelectItem>
                        <SelectItem value="enviado">Enviado (Despachado)</SelectItem>
                        <SelectItem value="cancelado">Cancelado (Anulado)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
 
                  {formStatus === "enviado" && (
                    <div className="space-y-3 p-3 bg-white/3 rounded-lg border border-white/8">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-white/40 uppercase tracking-wider block">Código de Seguimiento (Correo Argentino)</label>
                        <Input
                          autoFocus
                          placeholder="Ej: CP123456789AR"
                          value={formTrackingCode}
                          onChange={(e) => setFormTrackingCode(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              submitEditForm();
                            }
                          }}
                          className="bg-white/5 border-white/10 text-white text-sm placeholder:text-white/30 focus:border-[#AA6F3B]/50 h-10"
                        />
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Checkbox
                          id="formSendEmailCheckbox"
                          checked={formSendEmail}
                          onCheckedChange={(checked) => setFormSendEmail(!!checked)}
                        />
                        <label htmlFor="formSendEmailCheckbox" className="text-xs font-medium text-white/60 select-none cursor-pointer">
                          Enviar email de seguimiento al comprador
                        </label>
                      </div>
                    </div>
                  )}
 
                  {formStatus === "cancelado" && (
                    <div className="p-3 bg-red-950/20 rounded-lg border border-red-500/20 flex items-center gap-2">
                      <Checkbox
                        id="formRestoreStockCheckbox"
                        checked={formRestoreStock}
                        onCheckedChange={(checked) => setFormRestoreStock(!!checked)}
                      />
                      <label htmlFor="formRestoreStockCheckbox" className="text-xs font-medium text-red-300 select-none cursor-pointer">
                        Restaurar stock de productos (devolver al inventario)
                      </label>
                    </div>
                  )}
                </div>
 
                {/* Columna Derecha: Datos del Cliente */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-sm text-[#AA6F3B] border-b border-white/10 pb-2">Información del Cliente</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-white/40 uppercase block">Nombre</label>
                      <Input
                        value={formNombre}
                        onChange={(e) => setFormNombre(e.target.value)}
                        className="bg-white/5 border-white/10 text-white text-sm placeholder:text-white/30 focus:border-[#AA6F3B]/50 h-10"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-white/40 uppercase block">Email</label>
                      <Input
                        type="email"
                        value={formEmail}
                        onChange={(e) => setFormEmail(e.target.value)}
                        className="bg-white/5 border-white/10 text-white text-sm placeholder:text-white/30 focus:border-[#AA6F3B]/50 h-10"
                      />
                    </div>
                  </div>
 
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-white/40 uppercase block">DNI</label>
                      <Input
                        value={formDni}
                        onChange={(e) => setFormDni(e.target.value)}
                        className="bg-white/5 border-white/10 text-white text-sm placeholder:text-white/30 focus:border-[#AA6F3B]/50 h-10"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-white/40 uppercase block">Teléfono</label>
                      <Input
                        value={formTelefono}
                        onChange={(e) => setFormTelefono(e.target.value)}
                        className="bg-white/5 border-white/10 text-white text-sm placeholder:text-white/30 focus:border-[#AA6F3B]/50 h-10"
                      />
                    </div>
                  </div>
                </div>
              </div>
 
              {/* Sección inferior: Dirección de Envío */}
              <div className="space-y-4 border-t border-white/10 pt-4">
                <h4 className="font-semibold text-sm text-[#AA6F3B] border-b border-white/10 pb-2">Dirección de Envío</h4>
                
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-white/40 uppercase block">Provincia</label>
                    <Input
                      value={formProvincia}
                      onChange={(e) => setFormProvincia(e.target.value)}
                      className="bg-white/5 border-white/10 text-white text-sm placeholder:text-white/30 focus:border-[#AA6F3B]/50 h-10"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-white/40 uppercase block">Ciudad</label>
                    <Input
                      value={formCiudad}
                      onChange={(e) => setFormCiudad(e.target.value)}
                      className="bg-white/5 border-white/10 text-white text-sm placeholder:text-white/30 focus:border-[#AA6F3B]/50 h-10"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-white/40 uppercase block">Código Postal</label>
                    <Input
                      value={formCodigoPostal}
                      onChange={(e) => setFormCodigoPostal(e.target.value)}
                      className="bg-white/5 border-white/10 text-white text-sm placeholder:text-white/30 focus:border-[#AA6F3B]/50 h-10"
                    />
                  </div>
                </div>
 
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-xs font-semibold text-white/40 uppercase block">Calle / Dirección</label>
                    <Input
                      value={formDireccion}
                      onChange={(e) => setFormDireccion(e.target.value)}
                      className="bg-white/5 border-white/10 text-white text-sm placeholder:text-white/30 focus:border-[#AA6F3B]/50 h-10"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-white/40 uppercase block">Número</label>
                    <Input
                      value={formNumero}
                      onChange={(e) => setFormNumero(e.target.value)}
                      className="bg-white/5 border-white/10 text-white text-sm placeholder:text-white/30 focus:border-[#AA6F3B]/50 h-10"
                    />
                  </div>
                </div>
 
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-white/40 uppercase block">Aclaraciones / Piso / Departamento</label>
                  <Input
                    placeholder="Ej: Piso 3 Depto B, casa con portón negro... (Opcional)"
                    value={formExtra}
                    onChange={(e) => setFormExtra(e.target.value)}
                    className="bg-white/5 border-white/10 text-white text-sm placeholder:text-white/30 focus:border-[#AA6F3B]/50 h-10"
                  />
                </div>
              </div>
            </div>
 
            {/* Footer */}
            <div className="px-6 py-4 border-t border-white/8 bg-white/5 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setEditModalOpen(false)}
                disabled={submittingStatus}
                className="border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white h-10 font-semibold"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSaveOrder}
                disabled={!formStatus || submittingStatus}
                className="bg-[#AA6F3B] hover:bg-[#AA6F3B]/90 text-white font-semibold h-10 border-0"
              >
                {submittingStatus ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Diálogo de Confirmación Personalizado */}
      {confirmDialog.isOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
          onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
        >
          <div 
            className="w-full max-w-md bg-[#0b0a07] rounded-xl shadow-2xl border border-white/10 overflow-hidden text-white transform transition-all duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-white/8 bg-white/5 flex items-center justify-between">
              <h3 className="font-serif text-lg font-bold text-white">
                {confirmDialog.title}
              </h3>
              <button 
                onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                className="text-white/40 hover:text-white transition-colors font-bold"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-3">
              <div className="text-sm text-white/80">
                {confirmDialog.message}
              </div>

              {confirmDialog.showStockOption && (
                <div className="flex items-center gap-2 p-3 bg-red-950/20 rounded-lg border border-red-500/20 mt-4">
                  <Checkbox
                    id="confirmRestoreStockCheckbox"
                    checked={confirmDialog.stockOptionChecked}
                    onCheckedChange={(checked) => {
                      setConfirmDialog(prev => ({ ...prev, stockOptionChecked: !!checked }));
                    }}
                  />
                  <label htmlFor="confirmRestoreStockCheckbox" className="text-xs font-medium text-red-300 select-none cursor-pointer">
                    Restaurar stock de los productos en el inventario
                  </label>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-white/8 bg-white/5 flex justify-end gap-2">
              <div className="flex gap-3 mt-8">
                <Button 
                  variant="outline" 
                  className="flex-1 bg-transparent border-white/20 text-white hover:bg-white/10"
                  onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                >
                  {confirmDialog.cancelText || "Cancelar"}
                </Button>
                <Button 
                  className="flex-1 bg-[#AA6F3B] hover:bg-[#8a572a] text-white"
                  onClick={() => confirmDialog.onConfirm(confirmDialog.stockOptionChecked)}
                >
                  {confirmDialog.confirmText || "Confirmar"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Alerta / Mensaje Personalizado */}
      {alertDialog.isOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
          onClick={() => setAlertDialog(prev => ({ ...prev, isOpen: false }))}
        >
          <div 
            className="w-full max-w-sm bg-[#0b0a07] rounded-xl shadow-2xl border border-white/10 p-6 text-white text-center space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center">
              {alertDialog.type === "success" ? (
                <div className="w-12 h-12 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center text-2xl font-bold border border-green-500/30">
                  ✓
                </div>
              ) : alertDialog.type === "error" ? (
                <div className="w-12 h-12 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center text-2xl font-bold border border-red-500/30">
                  ✕
                </div>
              ) : (
                <div className="w-12 h-12 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center text-2xl font-bold border border-blue-500/30">
                  i
                </div>
              )}
            </div>
            
            <div className="space-y-1">
              <h4 className="font-bold text-white text-lg">{alertDialog.title}</h4>
              <p className="text-sm text-white/80">{alertDialog.message}</p>
            </div>

            <Button
              onClick={() => setAlertDialog(prev => ({ ...prev, isOpen: false }))}
              className="w-full bg-[#AA6F3B] hover:bg-[#AA6F3B]/90 text-[#0b0a07] font-bold border-0"
            >
              Aceptar
            </Button>
          </div>
        </div>
      )}

      {/* Modal Rápido de Despacho */}
      {dispatchModalOpen && dispatchModalTarget && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
          onClick={() => {
            setDispatchModalOpen(false);
            setDispatchModalTarget(null);
          }}
        >
          <div 
            className="w-full max-w-md bg-[#0b0a07] rounded-xl shadow-2xl border border-white/10 overflow-hidden text-white transform transition-all duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-white/8 bg-white/5 flex items-center justify-between">
              <h3 className="font-serif text-lg font-bold text-white">
                Despachar Pedido #{dispatchModalTarget.id}
              </h3>
              <button 
                onClick={() => {
                  setDispatchModalOpen(false);
                  setDispatchModalTarget(null);
                }}
                className="text-white/40 hover:text-white transition-colors font-bold"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-white/40 uppercase tracking-wider block">
                  Link o Código de Seguimiento (Correo Argentino)
                </label>
                <Input
                  value={quickTrackingCode}
                  onChange={(e) => setQuickTrackingCode(e.target.value)}
                  placeholder="Ej: CP123456789AR o link completo"
                  className="bg-[#14120f] border-white/10 focus:border-[#AA6F3B] focus:ring-1 focus:ring-[#AA6F3B] text-white placeholder-white/30 h-10 w-full"
                />
              </div>

              <div className="flex items-center gap-2 p-3 bg-white/5 rounded-lg border border-white/10">
                <Checkbox
                  id="quickSendEmailCheckbox"
                  checked={quickSendEmail}
                  onCheckedChange={(checked) => setQuickSendEmail(!!checked)}
                />
                <label htmlFor="quickSendEmailCheckbox" className="text-xs font-medium text-white/70 select-none cursor-pointer">
                  Enviar mail de despacho automático al comprador
                </label>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-white/8 bg-white/5 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setDispatchModalOpen(false);
                  setDispatchModalTarget(null);
                }}
                className="border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white h-10 font-semibold"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleQuickDispatch}
                disabled={submittingStatus || !quickTrackingCode.trim()}
                className="bg-[#AA6F3B] hover:bg-[#AA6F3B]/90 text-white font-semibold h-10 border-0"
              >
                {submittingStatus ? "Despachando..." : "Confirmar Envío"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Crear Pedido Manual */}
      <Dialog open={createManualModalOpen} onOpenChange={setCreateManualModalOpen}>
        <DialogContent className="bg-[#0b0a07] border-white/10 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Crear Pedido Manual</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-white/60">Nombre completo *</label>
                <Input value={manualNombre} onChange={e => setManualNombre(e.target.value)} className="bg-white/5 border-white/10" placeholder="Ej. Juan Pérez" />
              </div>
              <div>
                <label className="text-xs text-white/60">Email *</label>
                <Input type="email" value={manualEmail} onChange={e => setManualEmail(e.target.value)} className="bg-white/5 border-white/10" placeholder="juan@gmail.com" />
              </div>
              <div>
                <label className="text-xs text-white/60">DNI (Opcional)</label>
                <Input value={manualDni} onChange={e => setManualDni(e.target.value)} className="bg-white/5 border-white/10" />
              </div>
              <div>
                <label className="text-xs text-white/60">Teléfono (Opcional)</label>
                <Input value={manualTelefono} onChange={e => setManualTelefono(e.target.value)} className="bg-white/5 border-white/10" />
              </div>
            </div>

            <div className="space-y-2 mt-4">
              <label className="text-xs text-white/60 font-semibold">Agregar Producto</label>
              <Select onValueChange={addManualItem}>
                <SelectTrigger className="bg-white/5 border-white/10">
                  <SelectValue placeholder="Seleccioná un producto..." />
                </SelectTrigger>
                <SelectContent className="bg-[#0b0a07] border-white/10 text-white max-h-[200px]">
                  {availableProducts.map(p => (
                    <SelectItem key={p.id} value={p.id} disabled={manualOrderItems.some(i => i.id_producto === p.id)}>
                      {p.name} - ${Number(p.price).toLocaleString('es-AR')} (Stock: {p.stock})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {manualOrderItems.length > 0 && (
              <div className="space-y-2">
                <label className="text-xs text-white/60 font-semibold">Productos Seleccionados</label>
                <div className="space-y-2">
                  {manualOrderItems.map(item => {
                    const p = availableProducts.find(prod => prod.id === item.id_producto);
                    return (
                      <div key={item.id_producto} className="flex items-center gap-3 bg-white/5 p-2 rounded-lg border border-white/10">
                        <div className="flex-1">
                          <p className="text-sm font-semibold">{p?.name}</p>
                          <p className="text-xs text-white/60">${item.price.toLocaleString('es-AR')} c/u (Max: {item.max})</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input 
                            type="number" 
                            min={1} 
                            max={item.max} 
                            value={item.cantidad} 
                            onChange={e => updateManualItemQuantity(item.id_producto, Number(e.target.value))}
                            className="w-20 bg-white/5 border-white/10 text-center h-8"
                          />
                          <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-300 hover:bg-red-500/20" onClick={() => removeManualItem(item.id_producto)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="flex justify-end pt-2 text-lg font-bold">
                  Total: ${manualOrderItems.reduce((acc, item) => acc + (item.cantidad * item.price), 0).toLocaleString('es-AR')}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-white/10 text-white hover:bg-white/10" onClick={() => setCreateManualModalOpen(false)}>Cancelar</Button>
            <Button className="bg-[#AA6F3B] hover:bg-[#AA6F3B]/90 text-white" disabled={submittingStatus || manualOrderItems.length === 0 || !manualNombre || !manualEmail} onClick={handleCreateManualOrder}>
              {submittingStatus ? "Creando..." : "Crear Pedido"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { API_BASE_URL } from '@/lib/api';
import {
  ChevronDown,
  ChevronRight,
  Info,
  Search,
  Download,
  Pencil,
  Trash2,
  AlertTriangle,
  Printer,
  CheckSquare,
  RefreshCw,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import * as XLSX from 'xlsx';
import { generateShippingLabels, generateSingleLabel, LabelOrder } from '@/lib/label-generator';

type OrderStatus = 'pending' | 'paid' | 'failed' | 'cancelled';

type Order = {
  id: number;
  total: number;
  status: OrderStatus;
  fecha: string;
  external_reference: string;
  zipnova_shipment_id?: string | null;
  tracking_code?: string | null;
  envio_status?: string | null;
  nombre_cliente?: string | null;
  email_cliente?: string | null;
  dni_cliente?: string | null;
  telefono_cliente?: string | null;
  provincia?: string | null;
  ciudad?: string | null;
  codigo_postal?: string | null;
  direccion?: string | null;
  numero?: string | null;
  extra?: string | null;
  costo_envio?: number | null;
  cupon_codigo?: string | null;
  cupon_descuento?: number | null;
  lote_id?: number | null;
};

type OrderItem = {
  id: number;
  id_pedido: number;
  id_producto: string;
  title: string;
  cantidad: number;
  precio_unitario: number;
};

type SortKey = keyof Pick<Order, 'id' | 'status' | 'fecha' | 'total'>;

// ============================================
// ESTADOS EFECTIVOS SIMPLIFICADOS (4 estados)
// ============================================

type EffectiveStatus = 'pendiente' | 'para_despachar' | 'enviado' | 'cancelado' | 'venta_local';

function getEffectiveStatus(order: Order): EffectiveStatus {
  if (
    order.envio_status === 'cancelled' ||
    order.status === 'cancelled' ||
    order.status === 'failed'
  )
    return 'cancelado';
  if (order.status === 'paid') {
    if (order.envio_status === 'local') return 'venta_local';
    if (order.envio_status === 'shipped') return 'enviado';
    return 'para_despachar';
  }
  return 'pendiente';
}

const EFFECTIVE_STATUS_LABELS: Record<EffectiveStatus, string> = {
  pendiente: 'Pendiente de Pago',
  para_despachar: 'Para Despachar',
  enviado: 'Enviado',
  cancelado: 'Cancelado',
  venta_local: 'Venta en Local',
};

const EFFECTIVE_STATUS_COLORS: Record<EffectiveStatus, string> = {
  pendiente: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
  para_despachar: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  enviado: 'bg-green-500/10 text-green-400 border border-green-500/20',
  cancelado: 'bg-white/5 text-white/50 border border-white/10',
  venta_local: 'bg-green-600/20 text-green-300 border border-green-500/30',
};

const PAGE_SIZE = 75;

export default function AdminPedidosPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [expandedOrders, setExpandedOrders] = useState<Set<number>>(new Set());
  const [orderItems, setOrderItems] = useState<Map<number, OrderItem[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<EffectiveStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey>('fecha');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const [lotes, setLotes] = useState<any[]>([]);
  const [filterLote, setFilterLote] = useState<string>('all');

  // Estados para modo de selección (Etiquetas en lote)
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState<Set<number>>(new Set());

  // Estados para modales personalizados y edición de datos
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editModalTarget, setEditModalTarget] = useState<Order | null>(null);

  // Estados para despacho rápido
  const [dispatchModalOpen, setDispatchModalOpen] = useState(false);
  const [dispatchModalTarget, setDispatchModalTarget] = useState<Order | null>(null);
  const [quickTrackingCode, setQuickTrackingCode] = useState('');
  const [quickSendEmail, setQuickSendEmail] = useState(true);

  // Campos del formulario de edición
  const [formStatus, setFormStatus] = useState<EffectiveStatus | ''>('');
  const [formTrackingCode, setFormTrackingCode] = useState('');
  const [formSendEmail, setFormSendEmail] = useState(false);
  const [formRestoreStock, setFormRestoreStock] = useState(true);

  const [formNombre, setFormNombre] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formDni, setFormDni] = useState('');
  const [formTelefono, setFormTelefono] = useState('');

  const [formProvincia, setFormProvincia] = useState('');
  const [formCiudad, setFormCiudad] = useState('');
  const [formCodigoPostal, setFormCodigoPostal] = useState('');
  const [formDireccion, setFormDireccion] = useState('');
  const [formNumero, setFormNumero] = useState('');
  const [formExtra, setFormExtra] = useState('');

  const [submittingStatus, setSubmittingStatus] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Estados para crear pedido manual y venta local
  const [createManualModalOpen, setCreateManualModalOpen] = useState(false);
  const [createLocalModalOpen, setCreateLocalModalOpen] = useState(false);
  const [availableProducts, setAvailableProducts] = useState<any[]>([]);
  const [manualOrderItems, setManualOrderItems] = useState<
    { id_producto: string; cantidad: number; max: number; price: number }[]
  >([]);
  const [manualNombre, setManualNombre] = useState('');
  const [manualEmail, setManualEmail] = useState('');
  const [manualTelefono, setManualTelefono] = useState('');
  const [manualDni, setManualDni] = useState('');
  const [manualProvincia, setManualProvincia] = useState('');
  const [manualCiudad, setManualCiudad] = useState('');
  const [manualCodigoPostal, setManualCodigoPostal] = useState('');
  const [manualDireccion, setManualDireccion] = useState('');
  const [manualNumero, setManualNumero] = useState('');
  const [manualPisoDepto, setManualPisoDepto] = useState('');

  const [localNombre, setLocalNombre] = useState('');
  const [localEmail, setLocalEmail] = useState('');
  const [localTelefono, setLocalTelefono] = useState('');
  const [localDni, setLocalDni] = useState('');

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
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Alerta/Mensaje personalizado
  const [alertDialog, setAlertDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
  });

  useEffect(() => {
    fetchLotes();
  }, []);

  useEffect(() => {
    if (filterLote !== '') {
      fetchOrders(false, filterLote);
    }
  }, [filterStatus, filterLote, page]);

  useEffect(() => {
    if (filterLote === '') return;
    const interval = setInterval(() => {
      fetchOrders(true, filterLote);
    }, 2000);
    return () => clearInterval(interval);
  }, [filterLote]);

  async function fetchLotes() {
    try {
      const res = await fetch(`${API_BASE_URL}/lotes`);
      if (res.ok) {
        const data = await res.json();
        setLotes(data);
        const active = data.find((l: any) => l.activo);
        setFilterLote(active ? active.id.toString() : 'all');
      } else {
        setFilterLote('all');
      }
    } catch (e) {
      console.error('Error cargando lotes:', e);
      setFilterLote('all');
    }
  }

  // Cerrar modales con Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (confirmDialog.isOpen) {
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }
        if (editModalOpen) {
          setEditModalOpen(false);
        }
        if (dispatchModalOpen) {
          setDispatchModalOpen(false);
        }
        if (alertDialog.isOpen) {
          setAlertDialog((prev) => ({ ...prev, isOpen: false }));
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [confirmDialog.isOpen, editModalOpen, dispatchModalOpen, alertDialog.isOpen]);

  async function openCreateManualModal() {
    setCreateManualModalOpen(true);
    setManualOrderItems([]);
    setManualNombre('');
    setManualEmail('');
    setManualTelefono('');
    setManualDni('');
    setManualProvincia('');
    setManualCiudad('');
    setManualCodigoPostal('');
    setManualDireccion('');
    setManualNumero('');
    setManualPisoDepto('');
    try {
      const res = await fetch(`${API_BASE_URL}/products`, { cache: 'no-store' });
      const prods = await res.json();
      setAvailableProducts(prods.filter((p: any) => p.status !== 'agotado' && p.stock > 0));
    } catch (e) {
      console.error(e);
    }
  }

  async function openCreateLocalModal() {
    setCreateLocalModalOpen(true);
    setManualOrderItems([]);
    setLocalNombre('');
    setLocalEmail('');
    setLocalTelefono('');
    setLocalDni('');
    try {
      const res = await fetch(`${API_BASE_URL}/products`, { cache: 'no-store' });
      const prods = await res.json();
      setAvailableProducts(prods.filter((p: any) => p.status !== 'agotado' && p.stock > 0));
    } catch (e) {
      console.error(e);
    }
  }

  async function handleCreateManualOrder() {
    if (
      !manualNombre ||
      !manualEmail ||
      !manualDireccion ||
      !manualCiudad ||
      !manualProvincia ||
      manualOrderItems.length === 0
    ) {
      setAlertDialog({
        isOpen: true,
        title: 'Error',
        message:
          'Completá nombre, email, dirección, ciudad, provincia y seleccioná al menos un producto.',
        type: 'error',
      });
      return;
    }
    try {
      setSubmittingStatus(true);
      const token = localStorage.getItem('admin_token');
      const payload = {
        cliente: {
          nombre: manualNombre,
          email: manualEmail,
          telefono: manualTelefono,
          dni: manualDni,
        },
        items: manualOrderItems,
        direccion: manualDireccion,
        numero: manualNumero,
        piso_depto: manualPisoDepto,
        codigo_postal: manualCodigoPostal,
        ciudad: manualCiudad,
        provincia: manualProvincia,
      };
      const res = await fetch(`${API_BASE_URL}/orders/manual`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success !== true) {
        throw new Error(data.error || 'Error al crear el pedido manual');
      }
      setAlertDialog({
        isOpen: true,
        title: 'Éxito',
        message: 'Pedido manual creado correctamente.',
        type: 'success',
      });
      setCreateManualModalOpen(false);
      await fetchOrders(true, filterLote);
    } catch (e: any) {
      setAlertDialog({
        isOpen: true,
        title: 'Error',
        message: e?.message || 'Error',
        type: 'error',
      });
    } finally {
      setSubmittingStatus(false);
    }
  }

  async function handleCreateLocalOrder() {
    if (!localNombre || !localEmail || manualOrderItems.length === 0) {
      setAlertDialog({
        isOpen: true,
        title: 'Error',
        message: 'Completá nombre, email del comprador y seleccioná al menos un producto.',
        type: 'error',
      });
      return;
    }
    try {
      setSubmittingStatus(true);
      const token = localStorage.getItem('admin_token');
      const payload = {
        cliente: {
          nombre: localNombre,
          email: localEmail,
          telefono: localTelefono,
          dni: localDni,
        },
        items: manualOrderItems,
        venta_local: true,
      };
      const res = await fetch(`${API_BASE_URL}/orders/manual`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success !== true) {
        throw new Error(data.error || 'Error al registrar la venta física');
      }
      setAlertDialog({
        isOpen: true,
        title: 'Éxito',
        message: 'Venta física registrada correctamente.',
        type: 'success',
      });
      await fetchOrders();
      setCreateLocalModalOpen(false);
    } catch (e: any) {
      setAlertDialog({ isOpen: true, title: 'Error', message: e.message, type: 'error' });
    } finally {
      setSubmittingStatus(false);
    }
  }

  function addManualItem(id_producto: string) {
    const prod = availableProducts.find((p) => p.id === id_producto);
    if (!prod) return;
    const limit = prod.limite > 0 ? Math.min(prod.limite, prod.stock) : prod.stock;
    if (manualOrderItems.some((i) => i.id_producto === id_producto)) return;
    setManualOrderItems([
      ...manualOrderItems,
      { id_producto, cantidad: 1, max: limit, price: prod.price },
    ]);
  }

  function removeManualItem(id_producto: string) {
    setManualOrderItems(manualOrderItems.filter((i) => i.id_producto !== id_producto));
  }

  function updateManualItemQuantity(id_producto: string, cantidad: number) {
    setManualOrderItems(
      manualOrderItems.map((i) => {
        if (i.id_producto === id_producto) {
          return { ...i, cantidad: Math.max(1, Math.min(cantidad, i.max)) };
        }
        return i;
      })
    );
  }

  function openEditModal(order: Order) {
    setEditModalTarget(order);
    const eff = getEffectiveStatus(order);
    setFormStatus(eff);
    setFormTrackingCode(order.tracking_code || '');
    setFormSendEmail(false);
    setFormRestoreStock(true);

    setFormNombre(order.nombre_cliente || '');
    setFormEmail(order.email_cliente || '');
    setFormDni(order.dni_cliente || '');
    setFormTelefono(order.telefono_cliente || '');

    setFormProvincia(order.provincia || '');
    setFormCiudad(order.ciudad || '');
    setFormCodigoPostal(order.codigo_postal || '');
    setFormDireccion(order.direccion || '');
    setFormNumero(order.numero || '');
    setFormExtra(order.extra || '');

    setEditModalOpen(true);
  }

  async function handleSaveOrder() {
    if (!editModalTarget || !formStatus) return;
    try {
      setSubmittingStatus(true);
      const token = localStorage.getItem('admin_token');

      // 1. Actualizar estado y/o código de seguimiento si cambiaron
      const currentEff = getEffectiveStatus(editModalTarget);
      const statusChanged =
        currentEff !== formStatus || editModalTarget.tracking_code !== formTrackingCode;

      if (statusChanged) {
        const payload = {
          status: formStatus,
          trackingCode: formStatus === 'enviado' ? formTrackingCode : undefined,
          sendEmail: formStatus === 'enviado' ? formSendEmail : undefined,
          restoreStock: formStatus === 'cancelado' ? formRestoreStock : undefined,
        };

        const res = await fetch(`${API_BASE_URL}/orders/${editModalTarget.id}/update-status`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok || data.success !== true) {
          throw new Error(data.error || 'Error al actualizar el estado');
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
          extra: formExtra || null,
        };

        const res = await fetch(`${API_BASE_URL}/orders/${editModalTarget.id}/details`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok || data.success !== true) {
          throw new Error(data.error || 'Error al actualizar los detalles del pedido');
        }
      }

      setAlertDialog({
        isOpen: true,
        title: 'Éxito',
        message: 'El pedido fue actualizado correctamente.',
        type: 'success',
      });
      setEditModalOpen(false);
      fetchOrders(true, filterLote);
    } catch (e: any) {
      setAlertDialog({
        isOpen: true,
        title: 'Error',
        message: e?.message || 'Ocurrió un error al guardar los cambios.',
        type: 'error',
      });
    } finally {
      setSubmittingStatus(false);
    }
  }

  function openDispatchModal(order: Order) {
    setDispatchModalTarget(order);
    setQuickTrackingCode(order.tracking_code || '');
    setQuickSendEmail(true);
    setDispatchModalOpen(true);
  }

  async function handleQuickDispatch() {
    if (!dispatchModalTarget) return;
    try {
      setSubmittingStatus(true);
      const token = localStorage.getItem('admin_token');
      const payload = {
        status: 'enviado',
        trackingCode: quickTrackingCode,
        sendEmail: quickSendEmail,
      };

      const res = await fetch(`${API_BASE_URL}/orders/${dispatchModalTarget.id}/update-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success !== true) {
        throw new Error(data.error || 'Error al actualizar el estado');
      }

      setAlertDialog({
        isOpen: true,
        title: 'Pedido Despachado',
        message: `El pedido #${dispatchModalTarget.id} fue marcado como enviado exitosamente.`,
        type: 'success',
      });

      setDispatchModalOpen(false);
      setDispatchModalTarget(null);
      setQuickTrackingCode('');
      fetchOrders(true, filterLote);
    } catch (e: any) {
      setAlertDialog({
        isOpen: true,
        title: 'Error al Despachar',
        message: e?.message || 'Ocurrió un error al despachar el pedido.',
        type: 'error',
      });
    } finally {
      setSubmittingStatus(false);
    }
  }

  function handleCancelClick(order: Order) {
    setConfirmDialog({
      isOpen: true,
      title: 'Anular Pedido con Reembolso',
      message: `¿Estás seguro de que querés anular el pedido #${order.id} y procesar el reembolso en MercadoPago?`,
      confirmText: 'Anular y Reembolsar',
      cancelText: 'Cancelar',
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
              title: 'Error',
              message: data.error || `Error HTTP ${res.status}`,
              type: 'error',
            });
            return;
          }
          setAlertDialog({
            isOpen: true,
            title: 'Éxito',
            message: 'La orden fue anulada y el reembolso fue procesado correctamente.',
            type: 'success',
          });
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
          fetchOrders(true);
        } catch (err: any) {
          setAlertDialog({
            isOpen: true,
            title: 'Error',
            message: err?.message || 'Error al anular',
            type: 'error',
          });
        }
      },
    });
  }

  function handleDeleteOrderClick(order: Order) {
    const effectiveStatus = getEffectiveStatus(order);
    let warningMessage: React.ReactNode =
      '¿Estás seguro de que deseas eliminar este pedido por completo? Esta acción no se puede deshacer y borrará todos los registros (ítems, envíos, pagos).';

    if (effectiveStatus === 'para_despachar') {
      warningMessage = (
        <div className="flex flex-col gap-3">
          <p>¿Estás seguro de que deseas eliminar este pedido por completo?</p>
          <div className="flex gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-left">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
            <div className="text-sm text-red-200">
              <span className="mb-1 block font-bold">¡PELIGRO EXTREMO!</span>
              Este pedido <strong className="text-white">ya está pagado</strong> y listo para
              despachar. Si lo eliminas, perderás los datos de envío del cliente y no podrás
              mandarle el producto, a pesar de que ya te pagó.
            </div>
          </div>
        </div>
      );
    } else if (effectiveStatus === 'pendiente') {
      warningMessage = (
        <div className="flex flex-col gap-3">
          <p>¿Estás seguro de que deseas eliminar este pedido por completo?</p>
          <div className="flex gap-3 rounded-lg border border-orange-500/30 bg-orange-500/10 p-3 text-left">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-orange-400" />
            <div className="text-sm text-orange-200">
              <span className="mb-1 block font-bold">Cuidado: Pendiente de Pago</span>
              Si el cliente llega a pagar el pedido más tarde a través de MercadoPago, el pago
              ingresará pero{' '}
              <strong className="text-white">
                no tendrás el registro de qué compró ni a dónde enviarlo
              </strong>{' '}
              porque el pedido fue borrado.
            </div>
          </div>
        </div>
      );
    }

    setConfirmDialog({
      isOpen: true,
      title: 'Eliminar Pedido Definitivamente',
      message: warningMessage,
      showStockOption: true,
      stockOptionChecked: true,
      confirmText: 'Sí, Eliminar Definitivamente',
      cancelText: 'Cancelar',
      onConfirm: async (stockChecked?: boolean) => {
        try {
          const token = localStorage.getItem('admin_token');
          const res = await fetch(
            `${API_BASE_URL}/orders/${order.id}?restoreStock=${!!stockChecked}`,
            {
              method: 'DELETE',
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );
          const data = await res.json().catch(() => ({}));
          if (!res.ok || data.success !== true) {
            setAlertDialog({
              isOpen: true,
              title: 'Error',
              message: data.error || `Error HTTP ${res.status}`,
              type: 'error',
            });
            return;
          }
          setAlertDialog({
            isOpen: true,
            title: 'Eliminado',
            message: 'El pedido fue borrado por completo del sistema.',
            type: 'success',
          });
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
          fetchOrders(true);
        } catch (error) {
          console.error(error);
          setAlertDialog({
            isOpen: true,
            title: 'Error',
            message: 'Error de red eliminando el pedido.',
            type: 'error',
          });
        }
      },
    });
  }

  async function fetchOrders(background = false, loteId: string = filterLote) {
    try {
      if (!background) setLoading(true);
      const token = localStorage.getItem('admin_token');
      const url = loteId !== 'all' ? `${API_BASE_URL}/orders?lote_id=${loteId}` : `${API_BASE_URL}/orders`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error(`Error ${res.status}`);
      }

      const data = await res.json();
      setOrders(data);
      setError(null);
    } catch (e: any) {
      setError(e?.message || 'Error al cargar pedidos');
    } finally {
      setLoading(false);
    }
  }

  async function toggleOrder(orderId: number) {
    const newExpanded = new Set(expandedOrders);

    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId);
      setExpandedOrders(newExpanded);
    } else {
      newExpanded.add(orderId);
      setExpandedOrders(newExpanded);

      // Cargar items si no están ya cargados
      if (!orderItems.has(orderId)) {
        try {
          const token = localStorage.getItem('admin_token');
          const res = await fetch(`${API_BASE_URL}/orders/${orderId}/items`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (!res.ok) {
            throw new Error(`Error ${res.status}`);
          }

          const items = await res.json();
          setOrderItems(new Map(orderItems).set(orderId, items));
        } catch (e: any) {
          console.error('Error cargando items:', e);
        }
      }
    }
  }

  const sorted = useMemo(() => {
    if (!orders) return [] as Order[];
    const copy = [...orders];
    copy.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      let res = 0;
      if (sortKey === 'id' || sortKey === 'total') {
        res = (av as number) - (bv as number);
      } else if (sortKey === 'fecha') {
        res = new Date(av as string).getTime() - new Date(bv as string).getTime();
      } else {
        // sortKey === "status" → ordenar por estado efectivo
        const sa = getEffectiveStatus(a);
        const sb = getEffectiveStatus(b);
        res = sa.localeCompare(sb);
      }
      return sortDir === 'asc' ? res : -res;
    });
    return copy;
  }, [orders, sortKey, sortDir]);

  const filteredOrders = useMemo(() => {
    let result = sorted;

    if (filterStatus !== 'all') {
      result = result.filter((order) => getEffectiveStatus(order) === filterStatus);
    }

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter((o) => {
        const idMatch = String(o.id).includes(q);
        const nameMatch = (o.nombre_cliente || '').toLowerCase().includes(q);
        const emailMatch = (o.email_cliente || '').toLowerCase().includes(q);
        const trackingMatch = (o.tracking_code || '').toLowerCase().includes(q);
        return idMatch || nameMatch || emailMatch || trackingMatch;
      });
    }

    return result;
  }, [sorted, filterStatus, searchQuery]);

  const total = filteredOrders.length;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const current = Math.min(page, pages);
  const start = (current - 1) * PAGE_SIZE;
  const visible = filteredOrders.slice(start, start + PAGE_SIZE);

  const changeSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setPage(1);
  };

  const exportXlsx = async () => {
    if (!filteredOrders || filteredOrders.length === 0) return;
    try {
      setExporting(true);
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${API_BASE_URL}/orders/all-items`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        throw new Error(
          'No se pudieron obtener los detalles de los productos para la exportación.'
        );
      }
      const allItems: {
        id_pedido: number;
        title: string;
        cantidad: number;
        precio_unitario: number;
      }[] = await res.json();

      // Agrupar items por id_pedido
      const itemsMap = new Map<number, string[]>();
      for (const item of allItems) {
        if (!itemsMap.has(item.id_pedido)) {
          itemsMap.set(item.id_pedido, []);
        }
        itemsMap.get(item.id_pedido)!.push(`${item.cantidad}x ${item.title}`);
      }

      const rows = filteredOrders.map((o) => {
        const prodList = itemsMap.get(o.id) || [];
        const productosFormatted = prodList.length > 0 ? prodList.join(', ') : '-';

        return {
          ID: o.id,
          Estado: EFFECTIVE_STATUS_LABELS[getEffectiveStatus(o)],
          Total: Number(o.total),
          'Costo Envío': o.costo_envio ? Number(o.costo_envio) : 0,
          Fecha: new Date(o.fecha).toLocaleString(),
          'Referencia Pago': o.external_reference || '-',
          'Nombre Cliente': o.nombre_cliente || '-',
          'Email Cliente': o.email_cliente || '-',
          DNI: o.dni_cliente || '-',
          Teléfono: o.telefono_cliente || '-',
          Provincia: o.provincia || '-',
          Ciudad: o.ciudad || '-',
          CP: o.codigo_postal || '-',
          Dirección: `${o.direccion || ''} ${o.numero || ''}`,
          Aclaraciones: o.extra || '-',
          Tracking: o.tracking_code || '-',
          Productos: productosFormatted,
        };
      });

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Pedidos');
      const ts = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const filename = `pedidos_${ts.getFullYear()}${pad(ts.getMonth() + 1)}${pad(ts.getDate())}_${pad(ts.getHours())}${pad(ts.getMinutes())}.xlsx`;
      XLSX.writeFile(wb, filename);
    } catch (e: any) {
      setAlertDialog({
        isOpen: true,
        title: 'Error al Exportar',
        message: e?.message || 'Ocurrió un error al obtener la información de los productos.',
        type: 'error',
      });
    } finally {
      setExporting(false);
    }
  };



  if (error) {
    return <div className="text-red-400">Error: {error}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#AA6F3B]/20">
              <CheckSquare size={20} className="text-[#AA6F3B]" />
            </div>
            <div>
              <h1 className="font-serif text-3xl font-bold tracking-tight text-white">Pedidos</h1>
              <p className="mt-1 text-sm font-medium text-white/40">
                Administrá y despachá tus ventas
              </p>
            </div>
          </div>
          <div className="mx-2 hidden h-8 w-px bg-white/10 sm:block" />
          <Button
            variant="outline"
            size="icon"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/80 shadow-sm transition-colors hover:bg-white/10 hover:text-white"
            onClick={() => fetchOrders(false, filterLote)}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full md:w-64">
            <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-white/40" />
            <Input
              placeholder="Buscar por ID, Nombre, Email..."
              className="h-10 border-white/10 bg-white/5 pl-9 text-white placeholder:text-white/40 focus:border-[#AA6F3B]/50"
              value={searchQuery}
              onChange={(e) => {
                setPage(1);
                setSearchQuery(e.target.value);
              }}
            />
          </div>
          <HoverCard>
            <HoverCardTrigger asChild>
              <Button
                variant="outline"
                className="flex h-10 items-center gap-2 border-white/10 bg-white/5 text-white hover:bg-white/10"
              >
                <Info className="h-4 w-4 text-[#AA6F3B]" />
                Guía de Estados
              </Button>
            </HoverCardTrigger>
            <HoverCardContent className="w-85 border border-white/10 bg-[#0b0a07] p-4 text-white shadow-2xl">
              <div className="flex flex-col gap-2 text-sm text-white/80">
                <p>
                  <strong className="text-yellow-500">Pendiente de Pago:</strong> El cliente generó
                  la orden pero el pago en MercadoPago aún no fue procesado o fue rechazado.
                </p>
                <p>
                  <strong className="text-blue-400">Para Despachar:</strong> El pago se acreditó
                  exitosamente y el pedido está listo para ser preparado y enviado.
                </p>
                <p>
                  <strong className="text-green-400">Enviado:</strong> Se cargó el código de
                  seguimiento de Correo Argentino (el cliente ya recibió el email).
                </p>
                <p>
                  <strong className="text-gray-400">Cancelado:</strong> El pago falló
                  definitivamente, o un pedido "Para Despachar" fue anulado manualmente por un
                  administrador.
                </p>
              </div>
            </HoverCardContent>
          </HoverCard>
          <Select
            value={filterStatus}
            onValueChange={(val) => {
              setFilterStatus(val as EffectiveStatus | 'all');
              setPage(1);
            }}
          >
            <SelectTrigger className="h-10 w-full cursor-pointer border-white/10 bg-white/5 text-white select-none placeholder:text-white/40 focus:border-[#AA6F3B]/50 md:w-48">
              <SelectValue placeholder="Todos los estados" />
            </SelectTrigger>
            <SelectContent className="border border-white/10 bg-[#0b0a07] text-white">
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="pendiente">Pendientes de Pago</SelectItem>
              <SelectItem value="para_despachar">Para Despachar</SelectItem>
              <SelectItem value="enviado">Enviados</SelectItem>
              <SelectItem value="cancelado">Cancelados</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filterLote}
            onValueChange={(val) => {
              setFilterLote(val);
              setPage(1);
              fetchOrders(false, val);
            }}
          >
            <SelectTrigger className="h-10 w-full cursor-pointer border-white/10 bg-white/5 text-white select-none placeholder:text-white/40 focus:border-[#AA6F3B]/50 md:w-48">
              <SelectValue placeholder="Todos los lotes" />
            </SelectTrigger>
            <SelectContent className="border border-white/10 bg-[#0b0a07] text-white">
              <SelectItem value="all">Todos los lotes</SelectItem>
              {lotes.map(l => (
                <SelectItem key={l.id} value={String(l.id)}>{l.nombre} {l.activo ? '(Actual)' : ''}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            className="flex h-10 items-center gap-2 border-white/10 bg-white/5 text-white hover:bg-white/10"
            onClick={exportXlsx}
            disabled={total === 0 || exporting}
          >
            <Download className="h-4 w-4" />
            {exporting ? 'Exportando...' : 'Exportar Excel'}
          </Button>
          {selectionMode ? (
            <>
              <Button
                variant="secondary"
                className="h-10 border border-[#AA6F3B]/30 bg-[#AA6F3B]/10 text-[#AA6F3B] hover:bg-[#AA6F3B]/20"
                onClick={() => {
                  setSelectionMode(false);
                  setSelectedOrders(new Set());
                }}
              >
                Cancelar Selección
              </Button>
              <Button
                className="h-10 border-0 bg-[#AA6F3B] font-semibold text-white hover:bg-[#AA6F3B]/90"
                disabled={selectedOrders.size === 0}
                onClick={() => {
                  const ordersToPrint = orders.filter((o) => selectedOrders.has(o.id));
                  generateShippingLabels(ordersToPrint as any[]);
                  setSelectionMode(false);
                  setSelectedOrders(new Set());
                }}
              >
                Generar Etiquetas en Lote ({selectedOrders.size})
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              className="flex h-10 items-center gap-2 border-white/10 bg-white/5 text-white hover:bg-white/10"
              onClick={() => setSelectionMode(true)}
            >
              <CheckSquare className="mr-1 h-4 w-4 text-white/40" />
              Seleccionar varios
            </Button>
          )}

          <Button
            className="h-10 border border-green-500/30 bg-green-600/20 font-semibold text-green-300 hover:bg-green-600/30"
            onClick={openCreateLocalModal}
          >
            Crear Venta Física
          </Button>

          <Button
            className="h-10 border-0 bg-[#AA6F3B] font-semibold text-white hover:bg-[#AA6F3B]/90"
            onClick={openCreateManualModal}
          >
            Crear Pedido Manual
          </Button>
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-white/8 bg-[#0b0a07]/40 p-2 text-white shadow-2xl backdrop-blur-sm">
        <Table className="w-full min-w-[1000px]">
          <TableHeader className="border-b border-white/8">
            <TableRow className="border-b border-white/8 hover:bg-transparent">
              {selectionMode && (
                <TableHead className="w-12">
                  <Checkbox
                    checked={
                      visible.length > 0 &&
                      visible.every(
                        (o) =>
                          selectedOrders.has(o.id) ||
                          !['para_despachar', 'enviado'].includes(getEffectiveStatus(o))
                      )
                    }
                    onCheckedChange={(checked) => {
                      if (checked) {
                        const newSelected = new Set(selectedOrders);
                        visible.forEach((o) => {
                          if (['para_despachar', 'enviado'].includes(getEffectiveStatus(o))) {
                            newSelected.add(o.id);
                          }
                        });
                        setSelectedOrders(newSelected);
                      } else {
                        const newSelected = new Set(selectedOrders);
                        visible.forEach((o) => newSelected.delete(o.id));
                        setSelectedOrders(newSelected);
                      }
                    }}
                    className="border-white/40"
                  />
                </TableHead>
              )}
              <TableHead className="w-12"></TableHead>
              <TableHead
                className="w-20 cursor-pointer whitespace-nowrap text-white/60 hover:text-white"
                onClick={() => changeSort('id')}
              >
                ID {sortKey === 'id' ? (sortDir === 'asc' ? '▲' : '▼') : null}
              </TableHead>
              <TableHead
                className="w-32 cursor-pointer whitespace-nowrap text-white/60 hover:text-white"
                onClick={() => changeSort('status')}
              >
                Estado {sortKey === 'status' ? (sortDir === 'asc' ? '▲' : '▼') : null}
              </TableHead>
              <TableHead
                className="w-48 cursor-pointer whitespace-nowrap text-white/60 hover:text-white"
                onClick={() => changeSort('fecha')}
              >
                Fecha {sortKey === 'fecha' ? (sortDir === 'asc' ? '▲' : '▼') : null}
              </TableHead>
              <TableHead
                className="w-32 cursor-pointer text-right whitespace-nowrap text-white/60 hover:text-white"
                onClick={() => changeSort('total')}
              >
                Total {sortKey === 'total' ? (sortDir === 'asc' ? '▲' : '▼') : null}
              </TableHead>
              <TableHead className="w-72 text-white/60">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="py-20 text-center">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#AA6F3B] border-t-transparent" />
                    <span className="text-sm text-white/40">Cargando pedidos...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : visible.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-gray-500">
                  {filterStatus === 'all'
                    ? 'No hay pedidos registrados'
                    : `No hay pedidos con estado "${EFFECTIVE_STATUS_LABELS[filterStatus as EffectiveStatus]}"`}
                </TableCell>
              </TableRow>
            ) : (
              visible.map((order) => {
                const isExpanded = expandedOrders.has(order.id);
                const items = orderItems.get(order.id) || [];
                const effectiveStatus = getEffectiveStatus(order);

                return (
                  <React.Fragment key={order.id}>
                    <TableRow
                      className="cursor-pointer border-b border-white/5 text-white/90 hover:bg-white/5"
                      onClick={() => toggleOrder(order.id)}
                    >
                      {selectionMode && (
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedOrders.has(order.id)}
                            disabled={!['para_despachar', 'enviado'].includes(effectiveStatus)}
                            onCheckedChange={(checked) => {
                              const newSelected = new Set(selectedOrders);
                              if (checked) newSelected.add(order.id);
                              else newSelected.delete(order.id);
                              setSelectedOrders(newSelected);
                            }}
                            className="border-white/40"
                          />
                        </TableCell>
                      )}
                      <TableCell>
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-white/40" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-white/40" />
                        )}
                      </TableCell>
                      <TableCell className="font-medium text-white">{order.id}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${EFFECTIVE_STATUS_COLORS[effectiveStatus]}`}
                        >
                          {EFFECTIVE_STATUS_LABELS[effectiveStatus]}
                        </span>
                      </TableCell>
                      <TableCell className="text-white/80">
                        {new Date(order.fecha).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-white">
                        ${Number(order.total).toFixed(2)}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex flex-nowrap items-center gap-2 whitespace-nowrap">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex h-8 items-center gap-1.5 rounded-md border-2 border-blue-500/40 bg-blue-500/10 px-3 font-semibold text-blue-300 transition-colors hover:bg-blue-500/20"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditModal(order);
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5 text-blue-300" />
                            Editar
                          </Button>

                          {/* Acciones principales rápidas */}
                          {effectiveStatus === 'para_despachar' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex h-8 items-center gap-1.5 rounded-md border-2 border-green-500/40 bg-green-500/10 px-3 font-semibold text-green-300 transition-colors hover:bg-green-500/20"
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
                                className="flex h-8 w-8 items-center justify-center rounded-md border-2 border-slate-500/40 bg-slate-500/10 p-0 text-slate-300 transition-colors hover:bg-slate-500/20"
                                title="Imprimir etiqueta"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  generateSingleLabel(order as any);
                                }}
                              >
                                <Printer className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 rounded-md border-2 border-red-500/40 bg-red-500/10 px-3 font-semibold text-red-300 transition-colors hover:bg-red-500/20"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCancelClick(order);
                                }}
                              >
                                Cancelar
                              </Button>
                            </>
                          )}

                          {effectiveStatus === 'enviado' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex h-8 w-8 items-center justify-center rounded-md border-2 border-slate-500/40 bg-slate-500/10 p-0 text-slate-300 transition-colors hover:bg-slate-500/20"
                              title="Imprimir etiqueta"
                              onClick={(e) => {
                                e.stopPropagation();
                                generateSingleLabel(order as any);
                              }}
                            >
                              <Printer className="h-3.5 w-3.5" />
                            </Button>
                          )}

                          {effectiveStatus === 'enviado' && order.tracking_code && (
                            <Button
                              asChild
                              size="sm"
                              variant="outline"
                              className="h-8 rounded-md border-2 border-blue-500/40 bg-blue-500/10 px-3 font-semibold text-blue-300 transition-colors hover:bg-blue-500/20"
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
                            className="ml-auto flex h-8 w-8 items-center justify-center rounded-md border-2 border-red-500/40 bg-red-500/10 p-0 text-red-300 transition-colors hover:bg-red-500/20"
                            title="Eliminar Pedido"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteOrderClick(order);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-red-300" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow className="border-b border-white/5">
                        <TableCell colSpan={6} className="border-b border-white/5 bg-white/2 p-0">
                          <div className="grid gap-6 p-4 md:grid-cols-2">
                            <div>
                              <div className="mb-3 flex items-center justify-between">
                                <h4 className="text-sm font-semibold text-white/60">
                                  Items del pedido:
                                </h4>
                                {order.lote_id && (
                                  <span className="text-sm font-semibold text-amber-500/80">
                                    Lote: {order.lote_id}
                                  </span>
                                )}
                              </div>
                              <table className="w-full border border-white/8 text-sm">
                                <TableHeader>
                                  <TableRow className="border-b border-white/8 bg-white/5 hover:bg-white/5">
                                    <TableHead className="h-8 text-xs text-white/50">
                                      ID Producto
                                    </TableHead>
                                    <TableHead className="h-8 text-xs text-white/50">
                                      Título
                                    </TableHead>
                                    <TableHead className="h-8 text-center text-xs text-white/50">
                                      Cantidad
                                    </TableHead>
                                    <TableHead className="h-8 text-right text-xs text-white/50">
                                      Precio Unit.
                                    </TableHead>
                                    <TableHead className="h-8 text-right text-xs text-white/50">
                                      Subtotal
                                    </TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {items.length === 0 ? (
                                    <TableRow>
                                      <TableCell
                                        colSpan={5}
                                        className="py-4 text-center text-sm text-white/40"
                                      >
                                        <div className="flex flex-col items-center justify-center gap-2 py-4">
                                          <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#AA6F3B] border-t-transparent" />
                                          <span>Cargando items...</span>
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  ) : (
                                    items.map((item) => (
                                      <TableRow
                                        key={item.id}
                                        className="border-b border-white/5 hover:bg-white/2"
                                      >
                                        <TableCell className="font-mono text-xs text-white/70">
                                          {item.id_producto}
                                        </TableCell>
                                        <TableCell className="text-sm text-white">
                                          {item.title}
                                        </TableCell>
                                        <TableCell className="text-center text-sm text-white/80">
                                          {item.cantidad}
                                        </TableCell>
                                        <TableCell className="text-right text-sm text-white/80">
                                          ${Number(item.precio_unitario).toFixed(2)}
                                        </TableCell>
                                        <TableCell className="text-right text-sm font-medium text-white">
                                          $
                                          {(Number(item.precio_unitario) * item.cantidad).toFixed(
                                            2
                                          )}
                                        </TableCell>
                                      </TableRow>
                                    ))
                                  )}
                                  {order.cupon_codigo ? (
                                    <TableRow className="border-b border-white/5 bg-[#AA6F3B]/10">
                                      <TableCell className="font-mono text-xs text-[#AA6F3B]">
                                        CUPON
                                      </TableCell>
                                      <TableCell className="text-sm font-medium text-[#AA6F3B]">
                                        Cupón aplicado: {order.cupon_codigo}
                                      </TableCell>
                                      <TableCell className="text-center text-sm text-[#AA6F3B]">
                                        -
                                      </TableCell>
                                      <TableCell className="text-right text-sm text-[#AA6F3B]">
                                        -
                                      </TableCell>
                                      <TableCell className="text-right text-sm font-bold text-[#AA6F3B]">
                                        -${Number(order.cupon_descuento || 0).toFixed(2)}
                                      </TableCell>
                                    </TableRow>
                                  ) : null}
                                </TableBody>
                              </table>
                            </div>

                            <div>
                              <h4 className="mb-3 text-sm font-semibold text-white/60">
                                Información de Envío:
                              </h4>
                              <div className="space-y-2 rounded-lg border border-white/8 bg-white/3 p-4 text-sm text-white/85">
                                <p>
                                  <span className="inline-block w-24 font-medium text-white/40">
                                    Nombre:
                                  </span>{' '}
                                  {order.nombre_cliente || '-'}
                                </p>
                                <p>
                                  <span className="inline-block w-24 font-medium text-white/40">
                                    Email:
                                  </span>{' '}
                                  {order.email_cliente || '-'}
                                </p>
                                <p>
                                  <span className="inline-block w-24 font-medium text-white/40">
                                    DNI:
                                  </span>{' '}
                                  {order.dni_cliente || '-'}
                                </p>
                                <p>
                                  <span className="inline-block w-24 font-medium text-white/40">
                                    Teléfono:
                                  </span>{' '}
                                  {order.telefono_cliente || '-'}
                                </p>
                                <hr className="my-2 border-white/8" />
                                <p>
                                  <span className="inline-block w-24 font-medium text-white/40">
                                    Provincia:
                                  </span>{' '}
                                  {order.provincia || '-'}
                                </p>
                                <p>
                                  <span className="inline-block w-24 font-medium text-white/40">
                                    Ciudad:
                                  </span>{' '}
                                  {order.ciudad || '-'}
                                </p>
                                <p>
                                  <span className="inline-block w-24 font-medium text-white/40">
                                    Código Postal:
                                  </span>{' '}
                                  {order.codigo_postal || '-'}
                                </p>
                                <p>
                                  <span className="inline-block w-24 font-medium text-white/40">
                                    Dirección:
                                  </span>{' '}
                                  {order.direccion} {order.numero}
                                </p>

                                {order.extra && (
                                  <div className="mt-2 rounded-md border border-[#AA6F3B]/30 bg-[#AA6F3B]/10 p-2">
                                    <span className="mb-1 block text-xs font-semibold tracking-wider text-[#AA6F3B] uppercase">
                                      Aclaración / Depto / Piso:
                                    </span>
                                    <span className="font-medium text-white">{order.extra}</span>
                                  </div>
                                )}

                                {order.tracking_code && (
                                  <>
                                    <hr className="my-2 border-white/8" />
                                    <p>
                                      <span className="inline-block w-24 font-medium text-white/40">
                                        Tracking:
                                      </span>{' '}
                                      <span className="rounded border border-white/10 bg-white/5 px-1 py-0.5 font-mono text-[#AA6F3B]">
                                        {order.tracking_code}
                                      </span>
                                    </p>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Paginación y Acciones Sticky */}
      <div className="sticky bottom-4 z-10 mt-4 flex min-h-[72px] flex-col items-center justify-between gap-4 rounded-xl border border-white/10 bg-[#0b0a07]/90 px-6 py-4 text-white shadow-[0_12px_40px_rgba(0,0,0,0.7)] backdrop-blur-md sm:flex-row">
        <div className="w-full text-center text-sm font-medium text-white/80 sm:w-auto sm:text-left">
          {selectionMode ? (
            <span className="px-2 font-medium text-[#AA6F3B]">
              {selectedOrders.size} pedidos seleccionados
            </span>
          ) : (
            <>
              Mostrando{' '}
              <span className="font-semibold text-white">{visible.length > 0 ? start + 1 : 0}</span>
              –
              <span className="font-semibold text-white">{Math.min(start + PAGE_SIZE, total)}</span>{' '}
              de <span className="font-semibold text-[#AA6F3B]">{total}</span>
            </>
          )}
        </div>
        <div className="flex w-full items-center justify-center gap-4 sm:w-auto sm:justify-end">
          <Button
            variant="outline"
            disabled={current === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="border-white/10 bg-white/5 text-white hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-white/5"
          >
            Anterior
          </Button>
          <span className="text-sm text-white/80">
            Página <span className="font-semibold text-[#AA6F3B]">{current}</span> / {pages}
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs"
          onClick={() => setEditModalOpen(false)}
        >
          <div
            className="flex max-h-[95vh] w-full max-w-3xl transform flex-col overflow-hidden rounded-xl border border-white/10 bg-[#0b0a07] text-white shadow-2xl transition-all duration-300"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSaveOrder();
              }
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/8 bg-white/5 px-6 py-4">
              <h3 className="font-serif text-lg font-bold text-white">
                Editar Pedido #{editModalTarget.id}
              </h3>
              <button
                onClick={() => setEditModalOpen(false)}
                className="font-bold text-white/40 transition-colors hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Content (Scrollable Grid) */}
            <div className="max-h-[calc(95vh-130px)] flex-1 space-y-6 overflow-y-auto p-6">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Columna Izquierda: Estado y Seguimiento */}
                <div className="space-y-4">
                  <h4 className="border-b border-white/10 pb-2 text-sm font-semibold text-[#AA6F3B]">
                    Estado y Logística
                  </h4>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold tracking-wider text-white/40 uppercase">
                      Estado del Pedido
                    </label>
                    <Select
                      value={formStatus}
                      onValueChange={(val) => {
                        const s = val as EffectiveStatus;
                        setFormStatus(s);
                        if (s === 'enviado') {
                          setFormSendEmail(true);
                        } else if (s === 'cancelado') {
                          setFormRestoreStock(true);
                        }
                      }}
                    >
                      <SelectTrigger className="h-10 w-full cursor-pointer rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none select-none focus:border-[#AA6F3B]/50">
                        <SelectValue placeholder="Seleccionar estado" />
                      </SelectTrigger>
                      <SelectContent className="border border-white/10 bg-[#0b0a07] text-white">
                        <SelectItem value="pendiente">Pendiente de Pago</SelectItem>
                        <SelectItem value="para_despachar">Para Despachar</SelectItem>
                        <SelectItem value="enviado">Enviado (Despachado)</SelectItem>
                        <SelectItem value="cancelado">Cancelado (Anulado)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formStatus === 'enviado' && (
                    <div className="space-y-3 rounded-lg border border-white/8 bg-white/3 p-3">
                      <div className="space-y-1">
                        <label className="block text-xs font-semibold tracking-wider text-white/40 uppercase">
                          Código de Seguimiento (Correo Argentino)
                        </label>
                        <Input
                          autoFocus
                          placeholder="Ej: CP123456789AR"
                          value={formTrackingCode}
                          onChange={(e) => setFormTrackingCode(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSaveOrder();
                            }
                          }}
                          className="h-10 border-white/10 bg-white/5 text-sm text-white placeholder:text-white/30 focus:border-[#AA6F3B]/50"
                        />
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <Checkbox
                          id="formSendEmailCheckbox"
                          checked={formSendEmail}
                          onCheckedChange={(checked) => setFormSendEmail(!!checked)}
                        />
                        <label
                          htmlFor="formSendEmailCheckbox"
                          className="cursor-pointer text-xs font-medium text-white/60 select-none"
                        >
                          Enviar email de seguimiento al comprador
                        </label>
                      </div>
                    </div>
                  )}

                  {formStatus === 'cancelado' && (
                    <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-950/20 p-3">
                      <Checkbox
                        id="formRestoreStockCheckbox"
                        checked={formRestoreStock}
                        onCheckedChange={(checked) => setFormRestoreStock(!!checked)}
                      />
                      <label
                        htmlFor="formRestoreStockCheckbox"
                        className="cursor-pointer text-xs font-medium text-red-300 select-none"
                      >
                        Restaurar stock de productos (devolver al inventario)
                      </label>
                    </div>
                  )}
                </div>

                {/* Columna Derecha: Datos del Cliente */}
                <div className="space-y-4">
                  <h4 className="border-b border-white/10 pb-2 text-sm font-semibold text-[#AA6F3B]">
                    Información del Cliente
                  </h4>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-white/40 uppercase">
                        Nombre
                      </label>
                      <Input
                        value={formNombre}
                        onChange={(e) => setFormNombre(e.target.value)}
                        className="h-10 border-white/10 bg-white/5 text-sm text-white placeholder:text-white/30 focus:border-[#AA6F3B]/50"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-white/40 uppercase">
                        Email
                      </label>
                      <Input
                        type="email"
                        value={formEmail}
                        onChange={(e) => setFormEmail(e.target.value)}
                        className="h-10 border-white/10 bg-white/5 text-sm text-white placeholder:text-white/30 focus:border-[#AA6F3B]/50"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-white/40 uppercase">
                        DNI
                      </label>
                      <Input
                        value={formDni}
                        onChange={(e) => setFormDni(e.target.value)}
                        className="h-10 border-white/10 bg-white/5 text-sm text-white placeholder:text-white/30 focus:border-[#AA6F3B]/50"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-white/40 uppercase">
                        Teléfono
                      </label>
                      <Input
                        value={formTelefono}
                        onChange={(e) => setFormTelefono(e.target.value)}
                        className="h-10 border-white/10 bg-white/5 text-sm text-white placeholder:text-white/30 focus:border-[#AA6F3B]/50"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Sección inferior: Dirección de Envío */}
              <div className="space-y-4 border-t border-white/10 pt-4">
                <h4 className="border-b border-white/10 pb-2 text-sm font-semibold text-[#AA6F3B]">
                  Dirección de Envío
                </h4>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-white/40 uppercase">
                      Provincia
                    </label>
                    <Input
                      value={formProvincia}
                      onChange={(e) => setFormProvincia(e.target.value)}
                      className="h-10 border-white/10 bg-white/5 text-sm text-white placeholder:text-white/30 focus:border-[#AA6F3B]/50"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-white/40 uppercase">
                      Ciudad
                    </label>
                    <Input
                      value={formCiudad}
                      onChange={(e) => setFormCiudad(e.target.value)}
                      className="h-10 border-white/10 bg-white/5 text-sm text-white placeholder:text-white/30 focus:border-[#AA6F3B]/50"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-white/40 uppercase">
                      Código Postal
                    </label>
                    <Input
                      value={formCodigoPostal}
                      onChange={(e) => setFormCodigoPostal(e.target.value)}
                      className="h-10 border-white/10 bg-white/5 text-sm text-white placeholder:text-white/30 focus:border-[#AA6F3B]/50"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-1 md:col-span-2">
                    <label className="block text-xs font-semibold text-white/40 uppercase">
                      Calle / Dirección
                    </label>
                    <Input
                      value={formDireccion}
                      onChange={(e) => setFormDireccion(e.target.value)}
                      className="h-10 border-white/10 bg-white/5 text-sm text-white placeholder:text-white/30 focus:border-[#AA6F3B]/50"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-white/40 uppercase">
                      Número
                    </label>
                    <Input
                      value={formNumero}
                      onChange={(e) => setFormNumero(e.target.value)}
                      className="h-10 border-white/10 bg-white/5 text-sm text-white placeholder:text-white/30 focus:border-[#AA6F3B]/50"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-white/40 uppercase">
                    Aclaraciones / Piso / Departamento
                  </label>
                  <Input
                    placeholder="Ej: Piso 3 Depto B, casa con portón negro... (Opcional)"
                    value={formExtra}
                    onChange={(e) => setFormExtra(e.target.value)}
                    className="h-10 border-white/10 bg-white/5 text-sm text-white placeholder:text-white/30 focus:border-[#AA6F3B]/50"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 border-t border-white/8 bg-white/5 px-6 py-4">
              <Button
                variant="outline"
                onClick={() => setEditModalOpen(false)}
                disabled={submittingStatus}
                className="h-10 border-white/10 bg-white/5 font-semibold text-white hover:bg-white/10 hover:text-white"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSaveOrder}
                disabled={!formStatus || submittingStatus}
                className="h-10 border-0 bg-[#AA6F3B] font-semibold text-white hover:bg-[#AA6F3B]/90"
              >
                {submittingStatus ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Diálogo de Confirmación Personalizado */}
      {confirmDialog.isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
          onClick={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
        >
          <div
            className="w-full max-w-md transform overflow-hidden rounded-xl border border-white/10 bg-[#0b0a07] text-white shadow-2xl transition-all duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/8 bg-white/5 px-6 py-4">
              <h3 className="font-serif text-lg font-bold text-white">{confirmDialog.title}</h3>
              <button
                onClick={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
                className="font-bold text-white/40 transition-colors hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="space-y-3 p-6">
              <div className="text-sm text-white/80">{confirmDialog.message}</div>

              {confirmDialog.showStockOption && (
                <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-950/20 p-3">
                  <Checkbox
                    id="confirmRestoreStockCheckbox"
                    checked={confirmDialog.stockOptionChecked}
                    onCheckedChange={(checked) => {
                      setConfirmDialog((prev) => ({ ...prev, stockOptionChecked: !!checked }));
                    }}
                  />
                  <label
                    htmlFor="confirmRestoreStockCheckbox"
                    className="cursor-pointer text-xs font-medium text-red-300 select-none"
                  >
                    Restaurar stock de los productos en el inventario
                  </label>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 border-t border-white/8 bg-white/5 px-6 py-4">
              <div className="mt-8 flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 border-white/20 bg-transparent text-white hover:bg-white/10"
                  onClick={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
                >
                  {confirmDialog.cancelText || 'Cancelar'}
                </Button>
                <Button
                  className="flex-1 bg-[#AA6F3B] text-white hover:bg-[#8a572a]"
                  onClick={() => confirmDialog.onConfirm(confirmDialog.stockOptionChecked)}
                >
                  {confirmDialog.confirmText || 'Confirmar'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Alerta / Mensaje Personalizado */}
      {alertDialog.isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
          onClick={() => setAlertDialog((prev) => ({ ...prev, isOpen: false }))}
        >
          <div
            className="w-full max-w-sm space-y-4 rounded-xl border border-white/10 bg-[#0b0a07] p-6 text-center text-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center">
              {alertDialog.type === 'success' ? (
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-green-500/30 bg-green-500/20 text-2xl font-bold text-green-400">
                  ✓
                </div>
              ) : alertDialog.type === 'error' ? (
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-red-500/30 bg-red-500/20 text-2xl font-bold text-red-400">
                  ✕
                </div>
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-blue-500/30 bg-blue-500/20 text-2xl font-bold text-blue-400">
                  i
                </div>
              )}
            </div>

            <div className="space-y-1">
              <h4 className="text-lg font-bold text-white">{alertDialog.title}</h4>
              <p className="text-sm text-white/80">{alertDialog.message}</p>
            </div>

            <Button
              onClick={() => setAlertDialog((prev) => ({ ...prev, isOpen: false }))}
              className="w-full border-0 bg-[#AA6F3B] font-bold text-[#0b0a07] hover:bg-[#AA6F3B]/90"
            >
              Aceptar
            </Button>
          </div>
        </div>
      )}

      {/* Modal Rápido de Despacho */}
      {dispatchModalOpen && dispatchModalTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
          onClick={() => {
            setDispatchModalOpen(false);
            setDispatchModalTarget(null);
          }}
        >
          <div
            className="w-full max-w-md transform overflow-hidden rounded-xl border border-white/10 bg-[#0b0a07] text-white shadow-2xl transition-all duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/8 bg-white/5 px-6 py-4">
              <h3 className="font-serif text-lg font-bold text-white">
                Despachar Pedido #{dispatchModalTarget.id}
              </h3>
              <button
                onClick={() => {
                  setDispatchModalOpen(false);
                  setDispatchModalTarget(null);
                }}
                className="font-bold text-white/40 transition-colors hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="space-y-4 p-6">
              <div className="space-y-1">
                <label className="block text-xs font-semibold tracking-wider text-white/40 uppercase">
                  Link o Código de Seguimiento (Correo Argentino)
                </label>
                <Input
                  value={quickTrackingCode}
                  onChange={(e) => setQuickTrackingCode(e.target.value)}
                  placeholder="Ej: CP123456789AR o link completo"
                  className="h-10 w-full border-white/10 bg-[#14120f] text-white placeholder-white/30 focus:border-[#AA6F3B] focus:ring-1 focus:ring-[#AA6F3B]"
                />
              </div>

              <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 p-3">
                <Checkbox
                  id="quickSendEmailCheckbox"
                  checked={quickSendEmail}
                  onCheckedChange={(checked) => setQuickSendEmail(!!checked)}
                />
                <label
                  htmlFor="quickSendEmailCheckbox"
                  className="cursor-pointer text-xs font-medium text-white/70 select-none"
                >
                  Enviar mail de despacho automático al comprador
                </label>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 border-t border-white/8 bg-white/5 px-6 py-4">
              <Button
                variant="outline"
                onClick={() => {
                  setDispatchModalOpen(false);
                  setDispatchModalTarget(null);
                }}
                className="h-10 border-white/10 bg-white/5 font-semibold text-white hover:bg-white/10 hover:text-white"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleQuickDispatch}
                disabled={submittingStatus || !quickTrackingCode.trim()}
                className="h-10 border-0 bg-[#AA6F3B] font-semibold text-white hover:bg-[#AA6F3B]/90"
              >
                {submittingStatus ? 'Despachando...' : 'Confirmar Envío'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Crear Pedido Manual */}
      <Dialog open={createManualModalOpen} onOpenChange={setCreateManualModalOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto border-white/10 bg-[#0b0a07] text-white">
          <DialogHeader>
            <DialogTitle>Crear Pedido Manual</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-white/60">Nombre completo *</label>
                <Input
                  value={manualNombre}
                  onChange={(e) => setManualNombre(e.target.value)}
                  className="border-white/10 bg-white/5 placeholder:text-white/60"
                  placeholder="Ej. Juan Pérez"
                />
              </div>
              <div>
                <label className="text-xs text-white/60">Email *</label>
                <Input
                  type="email"
                  value={manualEmail}
                  onChange={(e) => setManualEmail(e.target.value)}
                  className="border-white/10 bg-white/5 placeholder:text-white/60"
                  placeholder="juan@gmail.com"
                />
              </div>
              <div>
                <label className="text-xs text-white/60">DNI (Opcional)</label>
                <Input
                  value={manualDni}
                  onChange={(e) => setManualDni(e.target.value)}
                  className="border-white/10 bg-white/5 placeholder:text-white/60"
                  placeholder="Ej. 12345678"
                />
              </div>
              <div>
                <label className="text-xs text-white/60">Teléfono (Opcional)</label>
                <Input
                  value={manualTelefono}
                  onChange={(e) => setManualTelefono(e.target.value)}
                  className="border-white/10 bg-white/5 placeholder:text-white/60"
                  placeholder="Ej. 1122334455"
                />
              </div>
            </div>

            {/* Dirección de Envío */}
            <div className="space-y-2 border-t border-white/10 pt-4">
              <label className="text-xs font-semibold text-white">Dirección de Envío</label>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-white/60">Provincia *</label>
                  <Input
                    value={manualProvincia}
                    onChange={(e) => setManualProvincia(e.target.value)}
                    className="border-white/10 bg-white/5 placeholder:text-white/60"
                    placeholder="Buenos Aires"
                  />
                </div>
                <div>
                  <label className="text-xs text-white/60">Ciudad *</label>
                  <Input
                    value={manualCiudad}
                    onChange={(e) => setManualCiudad(e.target.value)}
                    className="border-white/10 bg-white/5 placeholder:text-white/60"
                    placeholder="Tandil"
                  />
                </div>
                <div>
                  <label className="text-xs text-white/60">Código Postal</label>
                  <Input
                    value={manualCodigoPostal}
                    onChange={(e) => setManualCodigoPostal(e.target.value)}
                    className="border-white/10 bg-white/5 placeholder:text-white/60"
                    placeholder="7000"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="text-xs text-white/60">Calle / Dirección *</label>
                  <Input
                    value={manualDireccion}
                    onChange={(e) => setManualDireccion(e.target.value)}
                    className="border-white/10 bg-white/5 placeholder:text-white/60"
                    placeholder="Av. España"
                  />
                </div>
                <div>
                  <label className="text-xs text-white/60">Número</label>
                  <Input
                    value={manualNumero}
                    onChange={(e) => setManualNumero(e.target.value)}
                    className="border-white/10 bg-white/5 placeholder:text-white/60"
                    placeholder="123"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-white/60">Aclaraciones / Piso / Depto</label>
                <Input
                  value={manualPisoDepto}
                  onChange={(e) => setManualPisoDepto(e.target.value)}
                  className="border-white/10 bg-white/5 placeholder:text-white/60"
                  placeholder="Piso 1 Depto B"
                />
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <label className="text-xs font-semibold text-white/60">Agregar Producto</label>
              <Select onValueChange={addManualItem}>
                <SelectTrigger className="border-white/10 bg-white/5">
                  <SelectValue placeholder="Seleccioná un producto..." />
                </SelectTrigger>
                <SelectContent className="max-h-[200px] border-white/10 bg-[#0b0a07] text-white">
                  {availableProducts.map((p) => (
                    <SelectItem
                      key={p.id}
                      value={p.id}
                      disabled={manualOrderItems.some((i) => i.id_producto === p.id)}
                    >
                      {p.name} - ${Number(p.price).toLocaleString('es-AR')} (Stock: {p.stock})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {manualOrderItems.length > 0 && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-white/60">
                  Productos Seleccionados
                </label>
                <div className="space-y-2">
                  {manualOrderItems.map((item) => {
                    const p = availableProducts.find((prod) => prod.id === item.id_producto);
                    return (
                      <div
                        key={item.id_producto}
                        className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-2"
                      >
                        <div className="flex-1">
                          <p className="text-sm font-semibold">{p?.name}</p>
                          <p className="text-xs text-white/60">
                            ${item.price.toLocaleString('es-AR')} c/u (Max: {item.max})
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min={1}
                            max={item.max}
                            value={item.cantidad}
                            onChange={(e) =>
                              updateManualItemQuantity(item.id_producto, Number(e.target.value))
                            }
                            className="h-8 w-20 border-white/10 bg-white/5 text-center"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-400 hover:bg-red-500/20 hover:text-red-300"
                            onClick={() => removeManualItem(item.id_producto)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-end pt-2 text-lg font-bold">
                  Total: $
                  {manualOrderItems
                    .reduce((acc, item) => acc + item.cantidad * item.price, 0)
                    .toLocaleString('es-AR')}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="border-white/10 text-white hover:bg-white/10"
              onClick={() => setCreateManualModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              className="bg-[#AA6F3B] text-white hover:bg-[#AA6F3B]/90"
              disabled={
                submittingStatus ||
                manualOrderItems.length === 0 ||
                !manualNombre ||
                !manualEmail ||
                !manualDireccion ||
                !manualCiudad ||
                !manualProvincia
              }
              onClick={handleCreateManualOrder}
            >
              {submittingStatus ? 'Creando...' : 'Crear Pedido'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal para Crear Venta Física */}
      <Dialog open={createLocalModalOpen} onOpenChange={setCreateLocalModalOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto border-white/10 bg-[#0b0a07] text-white">
          <DialogHeader>
            <DialogTitle className="text-green-400">Crear Venta Física (Local)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-white/60">
              Agregá los productos que se vendieron en el local. No se requiere información de
              envío.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-white/60">Nombre completo *</label>
                <Input
                  value={localNombre}
                  onChange={(e) => setLocalNombre(e.target.value)}
                  className="border-white/10 bg-white/5 placeholder:text-white/60"
                  placeholder="Ej. Juan Pérez"
                />
              </div>
              <div>
                <label className="text-xs text-white/60">Email *</label>
                <Input
                  type="email"
                  value={localEmail}
                  onChange={(e) => setLocalEmail(e.target.value)}
                  className="border-white/10 bg-white/5 placeholder:text-white/60"
                  placeholder="cliente@gmail.com"
                />
              </div>
              <div>
                <label className="text-xs text-white/60">DNI (Opcional)</label>
                <Input
                  value={localDni}
                  onChange={(e) => setLocalDni(e.target.value)}
                  className="border-white/10 bg-white/5 placeholder:text-white/60"
                  placeholder="Ej. 12345678"
                />
              </div>
              <div>
                <label className="text-xs text-white/60">Teléfono (Opcional)</label>
                <Input
                  value={localTelefono}
                  onChange={(e) => setLocalTelefono(e.target.value)}
                  className="border-white/10 bg-white/5 placeholder:text-white/60"
                  placeholder="Ej. 1122334455"
                />
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <label className="text-xs font-semibold text-white/60">Agregar Producto</label>
              <Select onValueChange={addManualItem}>
                <SelectTrigger className="border-white/10 bg-white/5">
                  <SelectValue placeholder="Seleccioná un producto..." />
                </SelectTrigger>
                <SelectContent className="max-h-[200px] border-white/10 bg-[#0b0a07] text-white">
                  {availableProducts.map((p) => (
                    <SelectItem
                      key={p.id}
                      value={p.id}
                      disabled={manualOrderItems.some((i) => i.id_producto === p.id)}
                    >
                      {p.name} - ${Number(p.price).toLocaleString('es-AR')} (Stock: {p.stock})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {manualOrderItems.length > 0 && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-white/60">
                  Productos Seleccionados
                </label>
                <div className="space-y-2">
                  {manualOrderItems.map((item) => {
                    const p = availableProducts.find((prod) => prod.id === item.id_producto);
                    return (
                      <div
                        key={item.id_producto}
                        className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-2"
                      >
                        <div className="flex-1">
                          <p className="text-sm font-semibold">{p?.name}</p>
                          <p className="text-xs text-white/60">
                            ${item.price.toLocaleString('es-AR')} c/u (Max: {item.max})
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min={1}
                            max={item.max}
                            value={item.cantidad}
                            onChange={(e) =>
                              updateManualItemQuantity(item.id_producto, Number(e.target.value))
                            }
                            className="h-8 w-20 border-white/10 bg-white/5 text-center"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-400 hover:bg-red-500/20 hover:text-red-300"
                            onClick={() => removeManualItem(item.id_producto)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-end pt-2 text-lg font-bold">
                  Total: $
                  {manualOrderItems
                    .reduce((acc, item) => acc + item.cantidad * item.price, 0)
                    .toLocaleString('es-AR')}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="border-white/10 text-white hover:bg-white/10"
              onClick={() => setCreateLocalModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              className="bg-green-600 text-white hover:bg-green-500"
              disabled={
                submittingStatus || manualOrderItems.length === 0 || !localNombre || !localEmail
              }
              onClick={handleCreateLocalOrder}
            >
              {submittingStatus ? 'Registrando...' : 'Registrar Venta'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

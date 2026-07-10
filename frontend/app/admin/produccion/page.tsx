'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Barrel,
  Plus,
  AlertTriangle,
  Beaker,
  ArrowDownToLine,
  StickyNote,
  Trash2,
  Pencil,
  RefreshCw,
  Search,
  Timer,
  ChevronRight,
  Lock,
  X,
  Check,
  ChevronsUpDown,
  Eye,
  Package,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────────────

type BarrilEstado = 'vacio' | 'en_proceso' | 'listo';
type RegistroTipo = 'ingrediente' | 'mezcla' | 'extraccion' | 'nota';

interface Barril {
  id: number;
  identificador: string;
  nombre: string | null;
  capacidad_litros: number;
  litros_actuales: number;
  estado: BarrilEstado;
  ultima_mezcla: string | null;
  notas: string | null;
  fecha_creacion: string;
  categoria_id?: number | null;
  categoria_nombre?: string | null;
  proceso_activo_nombre?: string | null;
  proceso_activo_inicio?: string | null;
  necesita_mezcla?: boolean | number;
}

interface Categoria {
  id: number;
  nombre: string;
}

interface BarrilRegistro {
  id: number;
  barril_id: number;
  tipo: RegistroTipo;
  descripcion: string | null;
  ingrediente_id: number | null;
  ingrediente_nombre?: string | null;
  cantidad_litros: number | null;
  cantidad_gramos: number | null;
  fecha: string;
}

interface Ingrediente {
  id: number;
  nombre: string;
  unidad: 'litros' | 'gramos';
  es_fijo: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────

const ESTADO_CONFIG: Record<BarrilEstado, { label: string; color: string; bg: string }> = {
  vacio: { label: 'Vacío', color: 'text-zinc-400', bg: 'bg-zinc-400/15' },
  en_proceso: { label: 'En Proceso', color: 'text-amber-400', bg: 'bg-amber-400/15' },
  listo: { label: 'Listo', color: 'text-emerald-400', bg: 'bg-emerald-400/15' },
};

const TIPO_ICON: Record<RegistroTipo, { icon: React.ElementType; color: string; label: string }> = {
  ingrediente: { icon: Beaker, color: 'text-purple-400', label: 'Ingrediente' },
  mezcla: { icon: RefreshCw, color: 'text-amber-400', label: 'Mezcla' },
  extraccion: { icon: ArrowDownToLine, color: 'text-red-400', label: 'Extracción' },
  nota: { icon: StickyNote, color: 'text-blue-400', label: 'Nota' },
};

function formatDateTime(dateStr: string | null) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Nunca';
  const now = new Date();
  const then = new Date(dateStr);
  const diffMs = now.getTime() - then.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays > 0) return `${diffDays}d ${diffHours % 24}h`;
  if (diffHours > 0) return `${diffHours}h`;
  const diffMin = Math.floor(diffMs / (1000 * 60));
  if (diffMin > 0) return `${diffMin}min`;
  return 'ahora';
}

function getAuthHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
  const h: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

function ProcessTimer({ start, name, className = "" }: { start: string, name: string, className?: string }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000); // update every minute
    return () => clearInterval(interval);
  }, []);
  
  const diffMs = now.getTime() - new Date(start).getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  const remainingHours = diffHours % 24;
  
  let timeStr = '';
  if (diffDays > 0) timeStr += `${diffDays}d `;
  timeStr += `${remainingHours}h`;
  if (diffDays === 0 && remainingHours === 0) {
    const diffMin = Math.floor(diffMs / (1000 * 60));
    timeStr = `${diffMin}m`;
  }
  
  return (
    <div className={`flex items-center gap-1.5 text-[10px] text-blue-400 font-medium ${className}`}>
      <Timer size={10} className="animate-pulse" />
      <span>{name}: {timeStr}</span>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────

export default function ProduccionPage() {
  const [barriles, setBarriles] = useState<Barril[]>([]);
  const [ingredientes, setIngredientes] = useState<Ingrediente[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterEstado, setFilterEstado] = useState<string>('all');

  // Modals
  const [showNewBarril, setShowNewBarril] = useState(false);
  const [showIngredientes, setShowIngredientes] = useState(false);
  const [showCategorias, setShowCategorias] = useState(false);
  const [selectedBarril, setSelectedBarril] = useState<Barril | null>(null);
  const [detailRegistros, setDetailRegistros] = useState<BarrilRegistro[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [editingBarril, setEditingBarril] = useState<Barril | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Barril | null>(null);
  const [undoConfirm, setUndoConfirm] = useState<{ barrilId: number; registroId: number } | null>(null);

  // Action modals per barrel
  const [ingredienteModal, setIngredienteModal] = useState<Barril | null>(null);
  const [ingredientePreseleccionado, setIngredientePreseleccionado] = useState<string | null>(null);
  const [extraccionModal, setExtraccionModal] = useState<Barril | null>(null);
  const [notaModal, setNotaModal] = useState<Barril | null>(null);
  const [procesoModal, setProcesoModal] = useState<Barril | null>(null);

  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [filterCategoria, setFilterCategoria] = useState<string>('all');

  const fetchBarriles = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/produccion`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Error');
      setBarriles(await res.json());
    } catch (err) { console.error(err); }
    finally { if (!silent) setLoading(false); }
  }, []);

  const fetchIngredientes = useCallback(async (silent = false) => {
    try {
      const res = await fetch(`${API_BASE_URL}/produccion/ingredientes`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Error');
      setIngredientes(await res.json());
    } catch (err) { console.error(err); }
  }, []);

  const fetchCategorias = useCallback(async (silent = false) => {
    try {
      const res = await fetch(`${API_BASE_URL}/produccion/categorias`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Error');
      setCategorias(await res.json());
    } catch (err) { console.error(err); }
  }, []);

  // Initial fetch and Auto-refresh (polling)
  useEffect(() => { 
    fetchBarriles(); 
    fetchIngredientes(); 
    fetchCategorias();
    
    const interval = setInterval(() => {
      fetchBarriles(true);
      fetchIngredientes(true);
      fetchCategorias(true);
      // We do not auto-refresh selectedBarril detail to avoid un-syncing modal state.
      // E.g., if we fetch and the user is doing something, it might flash. 
      // Actually, if we refresh silently, it's fine.
    }, 10000);
    
    return () => clearInterval(interval);
  }, [fetchBarriles, fetchIngredientes]);

  const [filterNeedsMix, setFilterNeedsMix] = useState(false);

  const refresh = () => { fetchBarriles(true); fetchIngredientes(true); fetchCategorias(true); };

  const refreshDetail = async (barrilId: number, silent = false) => {
    if (!silent) setDetailLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/produccion/${barrilId}`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setSelectedBarril(data.barril);
        setDetailRegistros(data.registros);
      }
    } catch (err) { console.error(err); }
    finally { if (!silent) setDetailLoading(false); }
  };
  
  // Real-time polling for selected barrel detail
  useEffect(() => {
    if (!selectedBarril) return;
    const interval = setInterval(() => {
      refreshDetail(selectedBarril.id, true);
    }, 10000);
    return () => clearInterval(interval);
  }, [selectedBarril]);

  const confirmUndo = (barrilId: number, registroId: number) => {
    setUndoConfirm({ barrilId, registroId });
  };

  const executeUndo = async () => {
    if (!undoConfirm) return;
    try {
      const res = await fetch(`${API_BASE_URL}/produccion/${undoConfirm.barrilId}/registros/${undoConfirm.registroId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al deshacer registro');
      }
      refresh();
      if (selectedBarril?.id === undoConfirm.barrilId) refreshDetail(undoConfirm.barrilId);
      setUndoConfirm(null);
    } catch (error: any) {
      alert(error.message);
    }
  };

  const openBarrilDetail = async (barril: Barril) => {
    setSelectedBarril(barril);
    refreshDetail(barril.id);
  };

  const filtered = barriles.filter((b) => {
    const matchSearch = b.identificador.toLowerCase().includes(search.toLowerCase()) ||
      (b.nombre && b.nombre.toLowerCase().includes(search.toLowerCase()));
    const matchEstado = filterEstado === 'all' || b.estado === filterEstado;
    const matchCategoria = filterCategoria === 'all' || b.categoria_id === Number(filterCategoria);
    const matchNeedsMix = !filterNeedsMix || b.necesita_mezcla;
    return matchSearch && matchEstado && matchCategoria && matchNeedsMix;
  }).sort((a, b) => a.identificador.localeCompare(b.identificador, undefined, { numeric: true }));

  const alertas = barriles.filter((b) => b.necesita_mezcla);

  // Stats calculations
  const totalLitros = barriles.reduce((acc, b) => acc + Number(b.litros_actuales), 0);
  const estimacionBotellas = Math.floor(totalLitros / 0.75);

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-serif text-4xl font-bold text-white flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#AA6F3B]/20">
              <Barrel className="h-5 w-5 text-[#AA6F3B]" />
            </div>
            Producción
          </h1>
          <p className="mt-1 text-sm text-white/45">Gestión de barriles y registro de producción</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowCategorias(true)}
            className="border-white/10 text-white/60 hover:text-white gap-2"
          >
            <Package size={16} />
            Categorías
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowIngredientes(true)}
            className="border-white/10 text-white/60 hover:text-white gap-2"
          >
            <Beaker size={16} />
            Ingredientes
          </Button>
          <Button
            onClick={() => setShowNewBarril(true)}
            className="bg-[#AA6F3B] hover:bg-[#AA6F3B]/80 text-white gap-2"
          >
            <Plus size={16} />
            Nuevo Barril
          </Button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#AA6F3B]/10">
              <Barrel size={14} className="text-[#AA6F3B]" />
            </div>
            <span className="text-xs text-white/40 font-medium">Total Barriles</span>
          </div>
          <p className="text-2xl font-bold text-[#AA6F3B]">{barriles.length}</p>
        </div>
        
        {/* Estimacion de Botellas */}
        <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10">
              <Package size={14} className="text-emerald-400" />
            </div>
            <span className="text-xs text-white/40 font-medium">Est. Botellas (0.75L)</span>
          </div>
          <p className="text-2xl font-bold text-emerald-400">{estimacionBotellas}</p>
        </div>
        <div 
          onClick={() => setFilterNeedsMix(!filterNeedsMix)}
          className={`cursor-pointer rounded-xl border p-4 transition-all ${
            alertas.length > 0
              ? filterNeedsMix 
                ? 'border-amber-500 bg-amber-500/[0.1] shadow-[0_0_15px_rgba(245,158,11,0.15)] ring-1 ring-amber-500/50' 
                : 'border-amber-500/30 bg-amber-500/[0.06] hover:bg-amber-500/[0.08]'
              : filterNeedsMix
                ? 'border-white/20 bg-white/[0.05] ring-1 ring-white/20'
                : 'border-white/8 bg-white/[0.02] hover:bg-white/[0.04]'
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${alertas.length > 0 ? 'bg-amber-500/20' : 'bg-zinc-500/10'}`}>
              <RefreshCw size={14} className={alertas.length > 0 ? 'text-amber-400' : 'text-zinc-500'} />
            </div>
            <span className="text-xs text-white/40 font-medium flex-1">Falta Mezclar</span>
            {filterNeedsMix && (
              <span className="text-[9px] uppercase tracking-wider text-white/50 bg-white/10 px-1.5 py-0.5 rounded">
                Filtrado
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-2">
            <p className={`text-2xl font-bold ${alertas.length > 0 ? 'text-amber-400' : 'text-zinc-500'}`}>{alertas.length}</p>
            {alertas.length > 0 && (
              <span className="text-[10px] text-amber-400/70 font-medium animate-pulse flex items-center gap-1">
                <AlertTriangle size={10} /> +24hs sin mezclar
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Alert Banner ── */}
      <AnimatePresence>
        {alertas.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="rounded-xl border border-amber-500/30 bg-amber-500/8 p-3"
          >
            <div className="flex items-center gap-2 text-xs text-amber-300">
              <AlertTriangle size={14} className="flex-shrink-0" />
              <span className="font-medium">
                {alertas.map((a) => a.identificador).join(', ')} — necesitan mezcla
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Filters ── */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative w-full sm:w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
          <Input
            placeholder="Buscar barril..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white/[0.03] border-white/10 text-white placeholder:text-white/30 h-9"
          />
        </div>
        <Select value={filterEstado} onValueChange={setFilterEstado}>
          <SelectTrigger className="w-full sm:w-36 bg-white/[0.03] border-white/10 text-white h-9">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos (Estado)</SelectItem>
            <SelectItem value="vacio">Vacío</SelectItem>
            <SelectItem value="en_proceso">En Proceso</SelectItem>
            <SelectItem value="listo">Listo</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterCategoria} onValueChange={setFilterCategoria}>
          <SelectTrigger className="w-full sm:w-36 bg-white/[0.03] border-white/10 text-white h-9">
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas (Cat)</SelectItem>
            {categorias.map(c => (
              <SelectItem key={c.id} value={String(c.id)}>{c.nombre}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={() => { setLoading(true); fetchBarriles(); }}
          className="border-white/10 text-white/50 hover:text-white h-9 w-9">
          <RefreshCw size={14} />
        </Button>
      </div>

      {/* ── Barril Grid ── */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#AA6F3B] border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Barrel className="h-12 w-12 text-white/15 mb-4" />
          <p className="text-white/40 text-sm">
            {barriles.length === 0 ? 'No hay barriles. Creá tu primer barril.' : 'Sin resultados.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <AnimatePresence mode="popLayout">
            {filtered.map((barril, i) => (
              <BarrilCard
                key={barril.id}
                barril={barril}
                index={i}
                onDetail={() => openBarrilDetail(barril)}
                onRefresh={fetchBarriles}
                onIngrediente={() => setIngredienteModal(barril)}
                onExtraccion={() => setExtraccionModal(barril)}
                onNota={() => setNotaModal(barril)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* ── Modals ── */}
      <NewBarrilModal open={showNewBarril} onClose={() => setShowNewBarril(false)} onCreated={() => { setShowNewBarril(false); refresh(); }} categorias={categorias} />
      <IngredientesManagerModal open={showIngredientes} onClose={() => setShowIngredientes(false)} ingredientes={ingredientes} onRefresh={fetchIngredientes} />
      <CategoriasManagerModal open={showCategorias} onClose={() => setShowCategorias(false)} categorias={categorias} onRefresh={fetchCategorias} />
      <BarrilDetailPanel barril={selectedBarril} registros={detailRegistros} loading={detailLoading}
        onUndoRegistro={confirmUndo}
        onClose={() => { setSelectedBarril(null); setDetailRegistros([]); }}
        onRefresh={() => refreshDetail(selectedBarril!.id)}
        onRefreshGlobal={refresh}
        onEdit={(b) => setEditingBarril(b)} onDelete={(b) => setDeleteConfirm(b)}
        onIngrediente={(b, initialName) => { setIngredientePreseleccionado(initialName || null); setIngredienteModal(b); }}
        onExtraccion={(b) => setExtraccionModal(b)}
        onNota={(b) => setNotaModal(b)}
        onProceso={(b) => setProcesoModal(b)}
      />
      <IngredienteModal barril={ingredienteModal} ingredientes={ingredientes} 
        initialIngredientName={ingredientePreseleccionado}
        onClose={() => { setIngredienteModal(null); setIngredientePreseleccionado(null); }} 
        onAdded={() => { setIngredienteModal(null); setIngredientePreseleccionado(null); refresh(); if (selectedBarril && ingredienteModal && selectedBarril.id === ingredienteModal.id) refreshDetail(selectedBarril.id); }} />
      <ExtraccionModal barril={extraccionModal} onClose={() => setExtraccionModal(null)} onAdded={() => { setExtraccionModal(null); refresh(); if (selectedBarril && extraccionModal && selectedBarril.id === extraccionModal.id) refreshDetail(selectedBarril.id); }} />
      <NotaModal barril={notaModal} onClose={() => setNotaModal(null)} onAdded={() => { setNotaModal(null); refresh(); if (selectedBarril && notaModal && selectedBarril.id === notaModal.id) refreshDetail(selectedBarril.id); }} />
      <ProcesoModal barril={procesoModal} onClose={() => setProcesoModal(null)} onSaved={() => { setProcesoModal(null); refresh(); if (selectedBarril && procesoModal && selectedBarril.id === procesoModal.id) refreshDetail(selectedBarril.id); }} />
      <EditBarrilModal barril={editingBarril} categorias={categorias} onClose={() => setEditingBarril(null)} onSaved={() => { setEditingBarril(null); if (selectedBarril) refreshDetail(selectedBarril.id); refresh(); }} />
      <DeleteConfirmDialog barril={deleteConfirm} onClose={() => setDeleteConfirm(null)} onDeleted={() => { setDeleteConfirm(null); setSelectedBarril(null); refresh(); }} />
      <UndoConfirmDialog undoData={undoConfirm} onClose={() => setUndoConfirm(null)} onConfirm={executeUndo} />
    </div>
  );
}

// ─── Mix Button with Animation ─────────────────────────────────────

function MixButton({ barril, onRefresh, className, textClass }: { barril: Barril; onRefresh: () => void; className?: string; textClass?: string }) {
  const [status, setStatus] = useState<'idle' | 'mixing' | 'success'>('idle');
  const needsMix = !!barril.necesita_mezcla;

  const handleMix = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (status !== 'idle') return;
    setStatus('mixing');
    try {
      await fetch(`${API_BASE_URL}/produccion/${barril.id}/registros`, {
        method: 'POST', headers: getAuthHeaders(),
        body: JSON.stringify({ tipo: 'mezcla', descripcion: 'Mezcla realizada' }),
      });
      setTimeout(() => {
        setStatus('success');
        onRefresh();
        setTimeout(() => setStatus('idle'), 2000);
      }, 1500); // simulate spinning duration for UX
    } catch (err) {
      console.error(err);
      setStatus('idle');
    }
  };

  return (
    <button
      onClick={handleMix}
      disabled={status !== 'idle'}
      className={`flex flex-col items-center justify-center gap-1 rounded-lg py-2 px-1 text-[9px] font-medium transition-all ${className || ''} ${
        status === 'success'
          ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30'
          : status === 'mixing'
          ? 'bg-[#AA6F3B]/20 text-[#AA6F3B] ring-1 ring-[#AA6F3B]/30'
          : needsMix
          ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 ring-1 ring-amber-500/30'
          : 'bg-white/[0.04] text-white/50 hover:bg-white/8 hover:text-white/70'
      }`}
    >
      <div className="relative h-[14px] w-[14px] flex items-center justify-center">
        <AnimatePresence mode="wait">
          {status === 'idle' && (
            <motion.div key="idle" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="absolute">
              <RefreshCw size={14} />
            </motion.div>
          )}
          {status === 'mixing' && (
            <motion.div key="mixing" initial={{ scale: 0 }} animate={{ scale: 1, rotate: 360 }} transition={{ rotate: { repeat: Infinity, duration: 1, ease: "linear" } }} exit={{ scale: 0 }} className="absolute">
              <RefreshCw size={14} />
            </motion.div>
          )}
          {status === 'success' && (
            <motion.div key="success" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="absolute">
              <Check size={14} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <span className={textClass}>
        {status === 'success' ? '¡Listo!' : status === 'mixing' ? 'Mezclando...' : 'Mezclar'}
      </span>
    </button>
  );
}

// ─── Barril Card ──────────────────────────────────────────────────

function BarrilCard({ barril, index, onDetail, onRefresh, onIngrediente, onExtraccion, onNota }: {
  barril: Barril; index: number;
  onDetail: () => void; onRefresh: () => void; onIngrediente: () => void; onExtraccion: () => void; onNota: () => void;
}) {
  const estado = ESTADO_CONFIG[barril.estado];
  const pct = barril.capacidad_litros > 0 ? Math.min(100, (Number(barril.litros_actuales) / Number(barril.capacidad_litros)) * 100) : 0;
  const needsMix = !!barril.necesita_mezcla;

  let mixTimeText = 'Nunca';
  let mixTimeColor = 'text-white/25';
  let mixAlert = false;
  if (barril.ultima_mezcla) {
    const diffMs = new Date().getTime() - new Date(barril.ultima_mezcla).getTime();
    const diffHs = diffMs / (1000 * 60 * 60);
    const roundedHs = Math.floor(diffHs);
    
    if (diffHs < 16) {
      mixTimeColor = 'text-emerald-400';
      mixTimeText = roundedHs < 1 ? `hace ${Math.floor(diffMs / 60000)} min` : `hace ${roundedHs} hs`;
    } else if (diffHs < 18) {
      mixTimeColor = 'text-amber-400';
      mixTimeText = `hace ${roundedHs} hs`;
    } else {
      mixTimeColor = 'text-red-400';
      mixTimeText = `hace ${roundedHs} hs`;
      mixAlert = true;
    }
  }

  return (
    <motion.div
      layout initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2, delay: index * 0.02 }}
      className={`relative flex flex-col rounded-2xl border p-4 transition-colors ${
        needsMix ? 'border-amber-500/30 bg-amber-500/[0.04]' : 'border-white/8 bg-white/[0.02]'
      }`}
    >
      {/* Alert badge */}
      {needsMix && (
        <div className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 shadow-lg shadow-amber-500/30 animate-pulse">
          <AlertTriangle size={10} className="text-black" />
        </div>
      )}

      {/* Header — clickable for detail */}
      <button onClick={onDetail} className="w-full text-left mb-3 group flex-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#AA6F3B]/15 border border-[#AA6F3B]/20">
              <Barrel size={16} className="text-[#AA6F3B]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-white tracking-tight">{barril.identificador}</p>
                {barril.categoria_nombre && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/10 text-white/70 uppercase tracking-wider">
                    {barril.categoria_nombre}
                  </span>
                )}
              </div>
              {barril.nombre && <p className="text-[11px] text-white/35 mt-0.5">{barril.nombre}</p>}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-2">
              <span className={`rounded-md px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${estado.color} ${estado.bg}`}>
                {estado.label}
              </span>
              <ChevronRight size={14} className="text-white/20 group-hover:text-white/50 transition-colors" />
            </div>
            {barril.proceso_activo_nombre && barril.proceso_activo_inicio && (
              <ProcessTimer start={barril.proceso_activo_inicio} name={barril.proceso_activo_nombre} className="mt-1" />
            )}
          </div>
        </div>

        {/* Litros bar */}
        <div className="mt-3">
          <div className="flex items-baseline justify-between mb-1">
            <span className="text-[10px] text-white/35">Litros</span>
            <span className="text-xs font-semibold text-white">
              {Number(barril.litros_actuales).toFixed(1)}
              <span className="text-white/30 font-normal"> / {Number(barril.capacidad_litros).toFixed(0)}L</span>
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/8">
            <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className={`h-full rounded-full ${pct > 90 ? 'bg-emerald-400' : pct > 50 ? 'bg-[#AA6F3B]' : pct > 20 ? 'bg-amber-400' : 'bg-zinc-500'}`}
            />
          </div>
        </div>

        {/* Mix info */}
        <div className={`flex items-center gap-1.5 text-[10px] mt-3 ${mixTimeColor}`}>
          {mixAlert ? <AlertTriangle size={12} className="text-red-400" /> : <Timer size={10} />}
          <span className="font-medium">Última mezcla: {mixTimeText}</span>
        </div>
      </button>

      {/* Action buttons row */}
      <div className="grid grid-cols-4 gap-1.5 mt-auto pt-1">
        <MixButton barril={barril} onRefresh={onRefresh} />
        <button onClick={(e) => { e.stopPropagation(); onIngrediente(); }}
          className="flex flex-col items-center justify-center gap-1 rounded-lg py-2 px-1 text-[9px] font-medium bg-white/[0.04] text-white/50 hover:bg-purple-500/15 hover:text-purple-300 transition-colors"
        >
          <Beaker size={14} />
          <span>Ingrediente</span>
        </button>
        <button onClick={(e) => { e.stopPropagation(); onExtraccion(); }}
          className="flex flex-col items-center justify-center gap-1 rounded-lg py-2 px-1 text-[9px] font-medium bg-white/[0.04] text-white/50 hover:bg-red-500/15 hover:text-red-300 transition-colors"
        >
          <ArrowDownToLine size={14} />
          <span>Extracción</span>
        </button>
        <button onClick={(e) => { e.stopPropagation(); onNota(); }}
          className="flex flex-col items-center justify-center gap-1 rounded-lg py-2 px-1 text-[9px] font-medium bg-white/[0.04] text-white/50 hover:bg-blue-500/15 hover:text-blue-300 transition-colors"
        >
          <StickyNote size={14} />
          <span>Nota</span>
        </button>
      </div>
    </motion.div>
  );
}

// ─── Barril Detail Panel ──────────────────────────────────────────

function BarrilDetailPanel({ barril, registros, loading, onClose, onRefresh, onRefreshGlobal, onEdit, onDelete, onIngrediente, onExtraccion, onNota, onProceso, onUndoRegistro }: {
  barril: Barril | null; registros: BarrilRegistro[]; loading: boolean;
  onClose: () => void; onRefresh: () => void; onRefreshGlobal: () => void;
  onEdit: (b: Barril) => void; onDelete: (b: Barril) => void;
  onIngrediente: (b: Barril, initialName?: string) => void; onExtraccion: (b: Barril) => void; onNota: (b: Barril) => void;
  onProceso: (b: Barril) => void;
  onUndoRegistro?: (barrilId: number, registroId: number) => void;
}) {
  const [showFullHistory, setShowFullHistory] = useState(false);
  const [showCompositionModal, setShowCompositionModal] = useState(false);
  
  // History Filters
  const [historyFilterType, setHistoryFilterType] = useState<string>('all');
  const [historyFilterDateFrom, setHistoryFilterDateFrom] = useState<string>('');
  const [historyFilterDateTo, setHistoryFilterDateTo] = useState<string>('');
  
  // Reset full history view when barrel changes
  useEffect(() => { 
    setShowFullHistory(false); 
    setShowCompositionModal(false); 
    setHistoryFilterType('all');
    setHistoryFilterDateFrom('');
    setHistoryFilterDateTo('');
  }, [barril]);

  if (!barril) return null;
  const estado = ESTADO_CONFIG[barril.estado];
  const pct = barril.capacidad_litros > 0 ? Math.min(100, (Number(barril.litros_actuales) / Number(barril.capacidad_litros)) * 100) : 0;

  // Filter History
  const filteredHistory = registros.filter(reg => {
    if (historyFilterType !== 'all' && reg.tipo !== historyFilterType) return false;
    
    if (historyFilterDateFrom) {
      const regDate = new Date(reg.fecha);
      const fromDate = new Date(historyFilterDateFrom + 'T00:00:00');
      if (regDate < fromDate) return false;
    }
    
    if (historyFilterDateTo) {
      const regDate = new Date(reg.fecha);
      const toDate = new Date(historyFilterDateTo + 'T23:59:59');
      if (regDate > toDate) return false;
    }
    
    return true;
  });

  // Calculate Composition
  const composicion = registros.reduce((acc, reg) => {
    if (reg.tipo === 'ingrediente' && reg.ingrediente_nombre) {
      if (!acc[reg.ingrediente_nombre]) acc[reg.ingrediente_nombre] = { litros: 0, gramos: 0 };
      if (reg.cantidad_litros) acc[reg.ingrediente_nombre].litros += Number(reg.cantidad_litros);
      if (reg.cantidad_gramos) acc[reg.ingrediente_nombre].gramos += Number(reg.cantidad_gramos);
    }
    return acc;
  }, {} as Record<string, { litros: number; gramos: number }>);

  const displayedRegistros = registros.slice(0, 2);

  // Helper function to render a record line
  const renderRegistro = (reg: BarrilRegistro, i: number) => {
    const conf = TIPO_ICON[reg.tipo];
    const Icon = conf.icon;
    return (
      <motion.div key={reg.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
        transition={{ delay: Math.min(i * 0.02, 0.2) }} className="relative flex gap-3">
        <div className="relative z-10 flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center rounded-md bg-[#0f0d0a] border border-white/10 mt-1">
          <Icon size={12} className={conf.color} />
        </div>
        <div className="flex-1 min-w-0 rounded-lg bg-white/[0.02] border border-white/6 p-3 hover:bg-white/[0.04] transition-colors">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[10px] font-semibold uppercase tracking-wider ${conf.color}`}>{conf.label}</span>
              {reg.ingrediente_nombre && (
                <span className="text-[11px] text-white/50 font-medium">— {reg.ingrediente_nombre}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-white/30 whitespace-nowrap">{formatDateTime(reg.fecha)}</span>
              {onUndoRegistro && (
                <button 
                  onClick={(e) => { e.stopPropagation(); onUndoRegistro(barril.id, reg.id); }}
                  className="text-white/30 hover:text-red-400 transition-colors"
                  title="Deshacer registro"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          </div>
          
          {(reg.cantidad_litros !== null && reg.cantidad_litros !== 0) || (reg.cantidad_gramos !== null && reg.cantidad_gramos > 0) ? (
            <div className="flex flex-wrap gap-2 items-center mt-1.5">
              {reg.cantidad_litros !== null && reg.cantidad_litros !== 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${Number(reg.cantidad_litros) > 0 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                  {Number(reg.cantidad_litros) > 0 ? '+' : ''}{Number(reg.cantidad_litros).toFixed(1)}L
                </span>
              )}
              {reg.cantidad_gramos !== null && reg.cantidad_gramos > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-400">
                  {Number(reg.cantidad_gramos).toFixed(0)}g
                </span>
              )}
            </div>
          ) : null}

          {reg.descripcion && <p className="text-[11px] text-white/50 mt-1.5 leading-relaxed">{reg.descripcion}</p>}
        </div>
      </motion.div>
    );
  };

  return (
    <>
      <Dialog open={!!barril} onOpenChange={() => onClose()}>
        <DialogContent className="max-w-2xl w-[95vw] sm:w-full max-h-[90vh] flex flex-col bg-[#0f0d0a] border-white/10 text-white p-0 overflow-hidden">
          <DialogTitle className="sr-only">Detalles del barril {barril.identificador}</DialogTitle>
          {/* Header - Fixed */}
          <div className="bg-[#0f0d0a] border-b border-white/8 p-4 sm:p-5 pb-4 shrink-0 z-10 shadow-md">
            <div className="flex items-start justify-between pr-6 sm:pr-0">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-[#AA6F3B]/15 border border-[#AA6F3B]/20">
                  <Barrel size={24} className="text-[#AA6F3B]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-bold leading-tight">{barril.identificador}</h2>
                    {barril.categoria_nombre && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/70 uppercase tracking-wider">
                        {barril.categoria_nombre}
                      </span>
                    )}
                  </div>
                  {barril.nombre && <p className="text-[11px] sm:text-xs text-white/40">{barril.nombre}</p>}
                  <div className="mt-1 flex items-center gap-3">
                    <span className={`rounded-md px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${estado.color} ${estado.bg}`}>
                      {estado.label}
                    </span>
                    {barril.proceso_activo_nombre && barril.proceso_activo_inicio && (
                      <ProcessTimer start={barril.proceso_activo_inicio} name={barril.proceso_activo_nombre} className="!mt-0" />
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => onEdit(barril)} className="flex h-7 w-7 items-center justify-center rounded-lg text-white/40 hover:bg-white/8 hover:text-white transition-colors">
                  <Pencil size={14} />
                </button>
                <button onClick={() => onDelete(barril)} className="flex h-7 w-7 items-center justify-center rounded-lg text-white/40 hover:bg-red-500/15 hover:text-red-400 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {/* Litros Bar */}
            <div className="mt-3 rounded-xl bg-white/[0.03] border border-white/6 p-3">
              <div className="flex items-baseline justify-between mb-1.5">
                <span className="text-xs text-white/40">Capacidad</span>
                <span className="text-sm font-bold text-white">{Number(barril.litros_actuales).toFixed(1)}L <span className="text-white/30 font-normal">/ {Number(barril.capacidad_litros).toFixed(0)}L</span> <span className="text-[10px] text-white/25">({pct.toFixed(0)}%)</span></span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/8">
                <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6 }}
                  className={`h-full rounded-full ${pct > 90 ? 'bg-emerald-400' : pct > 50 ? 'bg-[#AA6F3B]' : pct > 20 ? 'bg-amber-400' : 'bg-zinc-500'}`}
                />
              </div>
            </div>

            {/* Actions Row */}
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5 sm:gap-2 mt-3">
              <button onClick={() => onProceso(barril)}
                className={`flex flex-col items-center justify-center gap-1 rounded-lg py-2.5 px-1 text-[10px] font-medium transition-colors ${
                  barril.proceso_activo_nombre 
                    ? 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/30' 
                    : 'bg-white/[0.04] text-white/50 hover:bg-blue-500/15 hover:text-blue-300'
                }`}
              >
                <Timer size={14} />
                <span className="truncate w-full text-center px-0.5">
                  {barril.proceso_activo_nombre ? 'Fin Proceso' : 'Proceso'}
                </span>
              </button>
              <MixButton barril={barril} onRefresh={() => { onRefresh(); onRefreshGlobal(); }} className="py-2.5 text-[10px]" />
              <button onClick={() => onIngrediente(barril)}
                className="flex flex-col items-center justify-center gap-1 rounded-lg py-2.5 px-1 text-[10px] font-medium bg-white/[0.04] text-white/50 hover:bg-purple-500/15 hover:text-purple-300 transition-colors"
              >
                <Beaker size={14} />
                Ingrediente
              </button>
              <button onClick={() => onExtraccion(barril)}
                className="flex flex-col items-center justify-center gap-1 rounded-lg py-2.5 px-1 text-[10px] font-medium bg-white/[0.04] text-white/50 hover:bg-red-500/15 hover:text-red-300 transition-colors"
              >
                <ArrowDownToLine size={14} />
                Extracción
              </button>
              <button onClick={() => onNota(barril)}
                className="flex flex-col items-center justify-center gap-1 rounded-lg py-2.5 px-1 text-[10px] font-medium bg-white/[0.04] text-white/50 hover:bg-blue-500/15 hover:text-blue-300 transition-colors"
              >
                <StickyNote size={14} />
                Nota
              </button>
            </div>
          </div>

          {/* Body Content (Fixed Size) */}
          <div className="flex-1 p-4 sm:p-5 space-y-4 sm:space-y-5 overflow-y-auto">
            {/* Info Section */}
            <div className="flex flex-col gap-3">
              <div className="flex flex-row items-stretch gap-3">
                <div className="flex-1 rounded-xl bg-white/[0.03] border border-white/6 p-3 flex flex-col justify-center">
                  <span className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Última mezcla</span>
                  <span className="text-white/70 font-medium whitespace-nowrap text-xs sm:text-sm">{barril.ultima_mezcla ? formatDateTime(barril.ultima_mezcla) : '-'}</span>
                </div>
                <div 
                  onClick={() => setShowCompositionModal(true)}
                  className="flex-1 rounded-xl bg-white/[0.03] border border-white/6 p-3 flex items-center justify-between cursor-pointer hover:bg-white/[0.05] transition-colors group"
                >
                  <span className="text-[10px] text-white/30 uppercase tracking-wider group-hover:text-[#AA6F3B] transition-colors">Composición Actual</span>
                  <Eye size={14} className="text-white/50 group-hover:text-[#AA6F3B] transition-colors" />
                </div>
              </div>

              {barril.notas && (
                <div className="rounded-xl bg-white/[0.03] border border-white/6 p-3">
                  <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Notas del barril</p>
                  <p className="text-xs text-white/60 leading-relaxed">{barril.notas}</p>
                </div>
              )}
            </div>

            {/* Timeline Snippet */}
            <div>
              {loading ? (
                <div className="flex justify-center py-6">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#AA6F3B] border-t-transparent" />
                </div>
              ) : registros.length === 0 ? (
                <div className="text-center">
                  <h3 className="text-xs font-semibold text-white/50 mb-2">Registro de Actividad</h3>
                  <p className="text-xs text-white/25 py-4">Sin registros</p>
                </div>
              ) : (
                <div 
                  onClick={() => setShowFullHistory(true)}
                  className="cursor-pointer group relative rounded-xl hover:bg-white/[0.02] p-2 -mx-2 transition-colors border border-transparent hover:border-white/5"
                >
                  <div className="flex items-center justify-between mb-3 px-1">
                    <h3 className="text-xs font-semibold text-white/50">Registro de Actividad</h3>
                    {registros.length > 2 && (
                      <span className="text-[10px] text-white/30 group-hover:text-[#AA6F3B] transition-colors flex items-center gap-1">
                        Ver historial completo ({registros.length}) <ChevronRight size={12} />
                      </span>
                    )}
                  </div>
                  
                  <div className="relative pl-2">
                    <div className="absolute left-[17px] top-2 bottom-2 w-px bg-white/8" />
                    <div className="space-y-3">
                      {displayedRegistros.map((reg, i) => renderRegistro(reg, i))}
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>
        </DialogContent>
      </Dialog>

      {/* Full History Modal */}
      <Dialog open={showFullHistory} onOpenChange={setShowFullHistory}>
        <DialogContent className="max-w-2xl w-[95vw] sm:w-full h-[85vh] sm:h-[90vh] flex flex-col bg-[#0f0d0a] border-white/10 text-white p-0 overflow-hidden">
          <DialogHeader className="p-4 sm:p-5 border-b border-white/8 shrink-0 pr-8 sm:pr-5">
            <DialogTitle className="flex items-center gap-2 text-white text-base">
              <Timer size={16} className="text-[#AA6F3B]" />
              Historial Completo
            </DialogTitle>
            <p className="text-xs text-white/40">{barril.identificador}</p>

            {/* Filters */}
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-white/5">
              <Select value={historyFilterType} onValueChange={setHistoryFilterType}>
                <SelectTrigger className="w-[120px] h-8 bg-white/[0.03] border-white/10 text-white text-[10px]">
                  <SelectValue placeholder="Tipo Acción" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="nota">Nota</SelectItem>
                  <SelectItem value="extraccion">Extracción</SelectItem>
                  <SelectItem value="ingrediente">Ingrediente</SelectItem>
                  <SelectItem value="mezcla">Mezcla</SelectItem>
                </SelectContent>
              </Select>
              
              <div className="flex items-center gap-2">
                <Input 
                  type="date" 
                  value={historyFilterDateFrom} 
                  onChange={(e) => setHistoryFilterDateFrom(e.target.value)}
                  className="w-[110px] h-8 bg-white/[0.03] border-white/10 text-white text-[10px]"
                />
                <span className="text-white/30 text-xs">-</span>
                <Input 
                  type="date" 
                  value={historyFilterDateTo} 
                  onChange={(e) => setHistoryFilterDateTo(e.target.value)}
                  className="w-[110px] h-8 bg-white/[0.03] border-white/10 text-white text-[10px]"
                />
              </div>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-4 sm:p-5">
            {filteredHistory.length === 0 ? (
              <p className="text-center text-xs text-white/30 py-8">No hay registros que coincidan con los filtros.</p>
            ) : (
              <div className="relative pl-1">
                <div className="absolute left-[13px] top-2 bottom-2 w-px bg-white/8" />
                <div className="space-y-3">
                  {filteredHistory.map((reg, i) => renderRegistro(reg, i))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Composition Modal */}
      <Dialog open={showCompositionModal} onOpenChange={setShowCompositionModal}>
        <DialogContent className="max-w-2xl w-[95vw] sm:w-full h-[85vh] sm:h-[90vh] flex flex-col bg-[#0f0d0a] border-white/10 text-white p-0 overflow-hidden">
          <DialogHeader className="p-4 sm:p-5 border-b border-white/8 shrink-0 pr-8 sm:pr-5">
            <DialogTitle className="flex items-center gap-2 text-white text-base">
              <Beaker size={16} className="text-[#AA6F3B]" />
              Composición del Barril
            </DialogTitle>
            <p className="text-xs text-white/40">{barril.identificador}</p>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2">
            {Object.keys(composicion).length === 0 ? (
              <p className="text-center text-xs text-white/25 py-8">Sin ingredientes</p>
            ) : (
              Object.entries(composicion).map(([nombre, cant]) => (
                <div key={nombre} className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/6 hover:bg-white/[0.04] transition-colors">
                  <span className="text-sm font-medium text-white/80">{nombre}</span>
                  <div className="flex items-center gap-4">
                    <span className="font-semibold text-white/90">
                      {cant.litros > 0 && <span className="text-emerald-400">{cant.litros.toFixed(1)}L</span>}
                      {cant.litros > 0 && cant.gramos > 0 && <span className="text-white/20 mx-1">+</span>}
                      {cant.gramos > 0 && <span className="text-purple-400">{cant.gramos.toFixed(0)}g</span>}
                    </span>
                    <button 
                      onClick={() => {
                        setShowCompositionModal(false);
                        onIngrediente(barril, nombre);
                      }}
                      className="h-8 w-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-purple-500/20 text-white/50 hover:text-purple-300 transition-colors"
                      title="Agregar más de este ingrediente"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Ingrediente Modal (add to barrel) ────────────────────────────

function IngredienteModal({ barril, ingredientes, initialIngredientName, onClose, onAdded }: {
  barril: Barril | null; ingredientes: Ingrediente[]; initialIngredientName?: string | null; onClose: () => void; onAdded: () => void;
}) {
  const [selectedId, setSelectedId] = useState<string>('');
  const [openCombobox, setOpenCombobox] = useState(false);
  const [cantidad, setCantidad] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [registros, setRegistros] = useState<BarrilRegistro[]>([]);
  const [loadingRegistros, setLoadingRegistros] = useState(false);

  const selectedIng = ingredientes.find((i) => i.id === Number(selectedId));

  // Compute composition
  const composicion = registros.reduce((acc, reg) => {
    if (reg.tipo === 'ingrediente' && reg.ingrediente_nombre) {
      if (!acc[reg.ingrediente_nombre]) acc[reg.ingrediente_nombre] = { litros: 0, gramos: 0 };
      if (reg.cantidad_litros) acc[reg.ingrediente_nombre].litros += Number(reg.cantidad_litros);
      if (reg.cantidad_gramos) acc[reg.ingrediente_nombre].gramos += Number(reg.cantidad_gramos);
    }
    return acc;
  }, {} as Record<string, { litros: number; gramos: number }>);

  useEffect(() => { 
    if (!barril) { 
      setSelectedId(''); setCantidad(''); setDescripcion(''); setError(''); setOpenCombobox(false);
      setRegistros([]);
    } else {
      if (initialIngredientName) {
        const found = ingredientes.find(i => i.nombre === initialIngredientName);
        if (found) setSelectedId(String(found.id));
      } else {
        setSelectedId('');
      }
      
      // Fetch registros to show current composition
      setLoadingRegistros(true);
      fetch(`${API_BASE_URL}/produccion/${barril.id}`, { headers: getAuthHeaders() })
        .then(res => res.json())
        .then(data => setRegistros(data.registros || []))
        .catch(err => console.error(err))
        .finally(() => setLoadingRegistros(false));
    }
  }, [barril, initialIngredientName, ingredientes]);

  const handleSubmit = async () => {
    if (!selectedId || !selectedIng) { setError('Seleccioná un ingrediente'); return; }
    if (!cantidad || Number(cantidad) <= 0) { setError('Indicá una cantidad mayor a 0'); return; }
    setSaving(true); setError('');
    try {
      const body: any = { tipo: 'ingrediente', ingrediente_id: Number(selectedId), descripcion: descripcion.trim() || undefined };
      if (selectedIng.unidad === 'litros') {
        body.cantidad_litros = parseFloat(cantidad);
      } else {
        body.cantidad_gramos = parseFloat(cantidad);
      }
      const res = await fetch(`${API_BASE_URL}/produccion/${barril!.id}/registros`, {
        method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(body),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Error'); }
      onAdded();
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={!!barril} onOpenChange={() => onClose()}>
      <DialogContent className="bg-[#0f0d0a] border-white/10 text-white w-[95vw] sm:max-w-sm max-h-[90vh] overflow-y-auto pr-8 sm:pr-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white text-base">
            <Beaker size={16} className="text-purple-400" />
            Agregar Ingrediente
          </DialogTitle>
          <p className="text-xs text-white/40">{barril?.identificador}</p>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <label className="text-[11px] font-medium text-white/50 mb-1.5 block">Ingrediente *</label>
            <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openCombobox}
                  className="w-full justify-between bg-white/[0.03] border-white/10 text-white hover:bg-white/[0.05] hover:text-white h-10 font-normal"
                >
                  {selectedId && selectedIng ? selectedIng.nombre : "Buscar ingrediente..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[330px] p-0 bg-[#0f0d0a] border-white/10">
                <Command className="bg-transparent text-white">
                  <CommandInput placeholder="Buscar ingrediente..." className="h-9" />
                  <CommandList>
                    <CommandEmpty>No se encontró el ingrediente.</CommandEmpty>
                    <CommandGroup>
                      {ingredientes.map((ing) => {
                        const cant = composicion[ing.nombre];
                        return (
                          <CommandItem
                            key={ing.id}
                            value={ing.nombre}
                            onSelect={() => {
                              setSelectedId(String(ing.id));
                              setOpenCombobox(false);
                            }}
                            className="text-white data-[selected=true]:bg-white/10 data-[selected=true]:text-white cursor-pointer flex items-center justify-between"
                          >
                            <div className="flex flex-col w-full gap-0.5">
                              <div className="flex items-center justify-between w-full pr-2">
                                <span>{ing.nombre}</span>
                                <span className="text-[9px] text-white/30 uppercase tracking-wider">{ing.unidad}</span>
                              </div>
                              {!loadingRegistros && cant && (
                                <span className="text-[10px] text-[#AA6F3B] font-medium">
                                  En barril: {cant[ing.unidad]} {ing.unidad === 'litros' ? 'L' : 'g'}
                                </span>
                              )}
                            </div>
                            <Check
                              className={cn(
                                "ml-2 h-4 w-4 shrink-0",
                                selectedId === String(ing.id) ? "opacity-100 text-[#AA6F3B]" : "opacity-0"
                              )}
                            />
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          
          {selectedId && selectedIng && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-medium text-white/50 block">
                  Cantidad ({selectedIng.unidad === 'litros' ? 'Litros' : 'Gramos'}) *
                </label>
                {!loadingRegistros && composicion[selectedIng.nombre] && (
                  <span className="text-[10px] text-[#AA6F3B] font-medium">
                    Ya contiene: {composicion[selectedIng.nombre][selectedIng.unidad]} {selectedIng.unidad === 'litros' ? 'L' : 'g'}
                  </span>
                )}
              </div>
              <Input type="number" step="0.1" placeholder={selectedIng.unidad === 'litros' ? 'Ej: 50L' : 'Ej: 200g'}
                value={cantidad} onChange={(e) => setCantidad(e.target.value)}
                className="bg-white/[0.03] border-white/10 text-white placeholder:text-white/25 h-10 text-base"
              />
            </div>
          )}

          <div>
            <label className="text-[11px] font-medium text-white/50 mb-1.5 block">Descripción <span className="text-white/25">(opcional)</span></label>
            <Input placeholder="Ej: Hierbas aromáticas del proveedor X"
              value={descripcion} onChange={(e) => setDescripcion(e.target.value)}
              className="bg-white/[0.03] border-white/10 text-white placeholder:text-white/25 h-9"
            />
          </div>
          {error && (
            <div className="flex gap-2 items-start text-xs text-red-400 bg-red-400/10 rounded-lg px-3 py-2 border border-red-500/20">
              <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}
        </div>
        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={onClose} className="border-white/10 text-white/60 hover:text-white h-9 text-xs">Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving} className="bg-purple-600 hover:bg-purple-700 text-white gap-1.5 h-9 text-xs">
            {saving && <RefreshCw size={12} className="animate-spin" />} Agregar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Extracción Modal ─────────────────────────────────────────────

function ExtraccionModal({ barril, onClose, onAdded }: {
  barril: Barril | null; onClose: () => void; onAdded: () => void;
}) {
  const [mode, setMode] = useState<'botellas' | 'litros'>('botellas');
  const [cantidad, setCantidad] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { if (!barril) { setMode('botellas'); setCantidad(''); setDescripcion(''); setError(''); } }, [barril]);

  const litrosToExtract = mode === 'botellas' ? Number(cantidad) * 0.75 : Number(cantidad);

  const handleSubmit = async () => {
    if (!cantidad || Number(cantidad) <= 0) { setError('Indicá una cantidad válida'); return; }
    setSaving(true); setError('');
    try {
      const desc = mode === 'botellas'
        ? `Extracción de ${cantidad} botellas (${litrosToExtract.toFixed(1)}L)${descripcion.trim() ? ' — ' + descripcion.trim() : ''}`
        : `Extracción de ${Number(cantidad).toFixed(1)}L${descripcion.trim() ? ' — ' + descripcion.trim() : ''}`;

      const res = await fetch(`${API_BASE_URL}/produccion/${barril!.id}/registros`, {
        method: 'POST', headers: getAuthHeaders(),
        body: JSON.stringify({ tipo: 'extraccion', descripcion: desc, cantidad_litros: -litrosToExtract }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Error'); }
      onAdded();
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={!!barril} onOpenChange={() => onClose()}>
      <DialogContent className="bg-[#0f0d0a] border-white/10 text-white w-[95vw] sm:max-w-sm max-h-[90vh] overflow-y-auto pr-8 sm:pr-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white text-base">
            <ArrowDownToLine size={16} className="text-red-400" />
            Extracción
          </DialogTitle>
          <p className="text-xs text-white/40">{barril?.identificador}</p>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          {/* Toggle botellas / litros */}
          <div className="flex rounded-lg bg-white/[0.04] border border-white/8 p-0.5">
            <button onClick={() => { setMode('botellas'); setCantidad(''); }}
              className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-colors ${mode === 'botellas' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white/60'}`}>
              Botellas (750ml)
            </button>
            <button onClick={() => { setMode('litros'); setCantidad(''); }}
              className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-colors ${mode === 'litros' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white/60'}`}>
              Litros
            </button>
          </div>
          <div>
            <label className="text-[11px] font-medium text-white/50 mb-1.5 block">
              {mode === 'botellas' ? 'Cantidad de botellas *' : 'Litros a extraer *'}
            </label>
            <Input type="number" step={mode === 'botellas' ? '1' : '0.1'}
              placeholder={mode === 'botellas' ? 'Ej: 10' : 'Ej: 7.5'}
              value={cantidad} onChange={(e) => setCantidad(e.target.value)}
              className="bg-white/[0.03] border-white/10 text-white placeholder:text-white/25 h-10 text-base"
            />
            {mode === 'botellas' && cantidad && Number(cantidad) > 0 && (
              <p className="text-[10px] text-white/30 mt-1.5 flex items-center gap-1">
                <ArrowDownToLine size={10} />
                Equivale a {(Number(cantidad) * 0.75).toFixed(1)} litros extraídos
              </p>
            )}
          </div>
          <div>
            <label className="text-[11px] font-medium text-white/50 mb-1.5 block">Descripción <span className="text-white/25">(opcional)</span></label>
            <Input placeholder="Ej: Para lote 2, embotellado especial"
              value={descripcion} onChange={(e) => setDescripcion(e.target.value)}
              className="bg-white/[0.03] border-white/10 text-white placeholder:text-white/25 h-9"
            />
          </div>
          {error && (
            <div className="flex gap-2 items-start text-xs text-red-400 bg-red-400/10 rounded-lg px-3 py-2 border border-red-500/20">
              <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}
        </div>
        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={onClose} className="border-white/10 text-white/60 hover:text-white h-9 text-xs">Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving} className="bg-red-600 hover:bg-red-700 text-white gap-1.5 h-9 text-xs">
            {saving && <RefreshCw size={12} className="animate-spin" />} Extraer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Nota Modal ───────────────────────────────────────────────────

function NotaModal({ barril, onClose, onAdded }: {
  barril: Barril | null; onClose: () => void; onAdded: () => void;
}) {
  const [texto, setTexto] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (!barril) setTexto(''); }, [barril]);

  const handleSubmit = async () => {
    if (!texto.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/produccion/${barril!.id}/registros`, {
        method: 'POST', headers: getAuthHeaders(),
        body: JSON.stringify({ tipo: 'nota', descripcion: texto.trim() }),
      });
      if (!res.ok) throw new Error('Error');
      onAdded();
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={!!barril} onOpenChange={() => onClose()}>
      <DialogContent className="bg-[#0f0d0a] border-white/10 text-white w-[95vw] sm:max-w-sm max-h-[90vh] overflow-y-auto pr-8 sm:pr-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white text-base">
            <StickyNote size={16} className="text-blue-400" />
            Agregar Nota
          </DialogTitle>
          <p className="text-xs text-white/40">{barril?.identificador}</p>
        </DialogHeader>
        <div className="mt-2">
          <textarea
            placeholder="Escribí tu nota de cata, observaciones de color, etc..."
            value={texto} onChange={(e) => setTexto(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-white/25 outline-none focus:border-[#AA6F3B]/50 resize-none"
            autoFocus
          />
        </div>
        <DialogFooter className="mt-1">
          <Button variant="outline" onClick={onClose} className="border-white/10 text-white/60 hover:text-white h-9 text-xs">Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving || !texto.trim()} className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5 h-9 text-xs">
            {saving && <RefreshCw size={12} className="animate-spin" />} Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Ingredientes Manager Modal ───────────────────────────────────

function IngredientesManagerModal({ open, onClose, ingredientes, onRefresh }: {
  open: boolean; onClose: () => void; ingredientes: Ingrediente[]; onRefresh: () => void;
}) {
  const [nombre, setNombre] = useState('');
  const [unidad, setUnidad] = useState<'litros' | 'gramos'>('gramos');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingNombre, setEditingNombre] = useState('');
  const [editingUnidad, setEditingUnidad] = useState<'litros' | 'gramos'>('gramos');

  const handleCreate = async () => {
    if (!nombre.trim()) return;
    setSaving(true); setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/produccion/ingredientes`, {
        method: 'POST', headers: getAuthHeaders(),
        body: JSON.stringify({ nombre: nombre.trim(), unidad }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Error'); }
      setNombre('');
      setUnidad('gramos');
      onRefresh();
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  };

  const handleUpdate = async (id: number) => {
    if (!editingNombre.trim()) return;
    try {
      const res = await fetch(`${API_BASE_URL}/produccion/ingredientes/${id}`, {
        method: 'PUT', headers: getAuthHeaders(),
        body: JSON.stringify({ nombre: editingNombre.trim(), unidad: editingUnidad }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Error'); }
      setEditingId(null);
      onRefresh();
    } catch (err: any) { setError(err.message); }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`${API_BASE_URL}/produccion/ingredientes/${id}`, {
        method: 'DELETE', headers: getAuthHeaders(),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Error'); }
      onRefresh();
    } catch (err: any) { setError(err.message); }
  };

  return (
    <Dialog open={open} onOpenChange={() => { onClose(); setError(''); setEditingId(null); }}>
      <DialogContent className="bg-[#0f0d0a] border-white/10 text-white w-[95vw] sm:max-w-sm max-h-[90vh] overflow-y-auto pr-8 sm:pr-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white text-base">
            <Beaker size={16} className="text-purple-400" />
            Ingredientes (Catálogo)
          </DialogTitle>
        </DialogHeader>

        {/* Create new */}
        <div className="flex gap-2 mt-2">
          <Input placeholder="Nuevo ingrediente..." value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            className="bg-white/[0.03] border-white/10 text-white placeholder:text-white/25 h-9 text-sm flex-1"
          />
          <Select value={unidad} onValueChange={(v) => setUnidad(v as 'litros' | 'gramos')}>
            <SelectTrigger className="bg-white/[0.03] border-white/10 text-white h-9 w-[100px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gramos">Gramos</SelectItem>
              <SelectItem value="litros">Litros</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleCreate} disabled={saving || !nombre.trim()} size="sm"
            className="bg-[#AA6F3B] hover:bg-[#AA6F3B]/80 text-white h-9 px-3">
            <Plus size={16} />
          </Button>
        </div>

        {error && <p className="text-xs text-red-400 bg-red-400/10 rounded-lg px-3 py-2 border border-red-500/20">{error}</p>}

        {/* List */}
        <div className="space-y-1.5 max-h-60 overflow-y-auto mt-2 pr-1">
          {ingredientes.length === 0 ? (
            <p className="text-xs text-white/30 text-center py-4">No hay ingredientes</p>
          ) : ingredientes.map((ing) => (
            <div key={ing.id} className="flex items-center gap-2 rounded-lg bg-white/[0.02] border border-white/6 px-3 py-2">
              {editingId === ing.id ? (
                <>
                  <Input value={editingNombre} onChange={(e) => setEditingNombre(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleUpdate(ing.id)}
                    className="bg-white/[0.03] border-white/10 text-white h-8 text-xs flex-1"
                    autoFocus
                  />
                  <Select value={editingUnidad} onValueChange={(v) => setEditingUnidad(v as 'litros' | 'gramos')}>
                    <SelectTrigger className="bg-white/[0.03] border-white/10 text-white h-8 w-[80px] text-[10px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gramos">Gramos</SelectItem>
                      <SelectItem value="litros">Litros</SelectItem>
                    </SelectContent>
                  </Select>
                  <button onClick={() => handleUpdate(ing.id)} className="text-emerald-400 hover:text-emerald-300">
                    <RefreshCw size={14} />
                  </button>
                  <button onClick={() => setEditingId(null)} className="text-white/30 hover:text-white/50">
                    <X size={14} />
                  </button>
                </>
              ) : (
                <>
                  <div className="flex-1 flex flex-col">
                    <span className="text-sm text-white/80">{ing.nombre}</span>
                    <span className="text-[9px] text-white/40 uppercase tracking-wider">{ing.unidad}</span>
                  </div>
                  {ing.es_fijo ? (
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/5 border border-white/5">
                      <Lock size={10} className="text-white/30" />
                      <span className="text-[9px] text-white/30 uppercase tracking-wider font-semibold">Fijo</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <button onClick={() => { setEditingId(ing.id); setEditingNombre(ing.nombre); setEditingUnidad(ing.unidad); }}
                        className="text-white/30 hover:text-white/70 p-1 rounded hover:bg-white/5 transition-colors"><Pencil size={14} /></button>
                      <button onClick={() => handleDelete(ing.id)}
                        className="text-white/30 hover:text-red-400 p-1 rounded hover:bg-red-500/10 transition-colors"><Trash2 size={14} /></button>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── New Barril Modal ─────────────────────────────────────────────

function NewBarrilModal({ open, onClose, onCreated, categorias }: {
  open: boolean; onClose: () => void; onCreated: () => void; categorias: Categoria[];
}) {
  const [form, setForm] = useState({ identificador: '', nombre: '', capacidad_litros: '', notas: '', categoria_id: 'all' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!form.identificador.trim() || !form.capacidad_litros) { setError('Identificador y capacidad son requeridos'); return; }
    setSaving(true); setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/produccion`, {
        method: 'POST', headers: getAuthHeaders(),
        body: JSON.stringify({
          identificador: form.identificador.trim(),
          nombre: form.nombre.trim() || undefined,
          capacidad_litros: parseFloat(form.capacidad_litros),
          notas: form.notas.trim() || undefined,
          categoria_id: form.categoria_id !== 'all' ? Number(form.categoria_id) : null,
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Error'); }
      setForm({ identificador: '', nombre: '', capacidad_litros: '', notas: '', categoria_id: 'all' });
      onCreated();
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={() => { onClose(); setError(''); }}>
      <DialogContent className="bg-[#0f0d0a] border-white/10 text-white w-[95vw] sm:max-w-sm max-h-[90vh] overflow-y-auto pr-8 sm:pr-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white text-base">
            <Barrel size={16} className="text-[#AA6F3B]" />
            Nuevo Barril
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <div>
            <label className="text-[11px] font-medium text-white/50 mb-1.5 block">Identificador *</label>
            <Input placeholder="Ej: B-001" value={form.identificador} onChange={(e) => setForm({ ...form, identificador: e.target.value })}
              className="bg-white/[0.03] border-white/10 text-white placeholder:text-white/25 h-9" />
          </div>
          <div>
            <label className="text-[11px] font-medium text-white/50 mb-1.5 block">Nombre <span className="text-white/25">(opcional)</span></label>
            <Input placeholder="Ej: Barril Roble Grande" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              className="bg-white/[0.03] border-white/10 text-white placeholder:text-white/25 h-9" />
          </div>
          <div>
            <label className="text-[11px] font-medium text-white/50 mb-1.5 block">Categoría <span className="text-white/25">(opcional)</span></label>
            <Select value={form.categoria_id} onValueChange={(v) => setForm({ ...form, categoria_id: v })}>
              <SelectTrigger className="bg-white/[0.03] border-white/10 text-white h-9">
                <SelectValue placeholder="Seleccionar..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Sin categoría</SelectItem>
                {categorias.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-[11px] font-medium text-white/50 mb-1.5 block">Capacidad (litros) *</label>
            <Input type="number" placeholder="Ej: 200" value={form.capacidad_litros} onChange={(e) => setForm({ ...form, capacidad_litros: e.target.value })}
              className="bg-white/[0.03] border-white/10 text-white placeholder:text-white/25 h-9" />
          </div>
          <div>
            <label className="text-[11px] font-medium text-white/50 mb-1.5 block">Notas <span className="text-white/25">(opcional)</span></label>
            <textarea placeholder="Notas..." value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })}
              rows={2} className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-white/25 outline-none focus:border-[#AA6F3B]/50 resize-none" />
          </div>
          {error && <p className="text-xs text-red-400 bg-red-400/10 rounded-lg px-3 py-2 border border-red-500/20">{error}</p>}
        </div>
        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={onClose} className="border-white/10 text-white/60 hover:text-white h-9 text-xs">Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving} className="bg-[#AA6F3B] hover:bg-[#AA6F3B]/80 text-white gap-1.5 h-9 text-xs">
            {saving && <RefreshCw size={12} className="animate-spin" />} Crear
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit Barril Modal ────────────────────────────────────────────

function EditBarrilModal({ barril, categorias, onClose, onSaved }: {
  barril: Barril | null; categorias: Categoria[]; onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm] = useState({ identificador: '', nombre: '', capacidad_litros: '', estado: 'vacio' as BarrilEstado, notas: '', categoria_id: 'all' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (barril) setForm({
      identificador: barril.identificador, nombre: barril.nombre || '',
      capacidad_litros: String(barril.capacidad_litros), estado: barril.estado, notas: barril.notas || '',
      categoria_id: barril.categoria_id ? String(barril.categoria_id) : 'all',
    });
  }, [barril]);

  const handleSubmit = async () => {
    if (!barril) return;
    setSaving(true); setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/produccion/${barril.id}`, {
        method: 'PUT', headers: getAuthHeaders(),
        body: JSON.stringify({
          identificador: form.identificador.trim(), nombre: form.nombre.trim(),
          capacidad_litros: parseFloat(form.capacidad_litros), estado: form.estado, notas: form.notas.trim(),
          categoria_id: form.categoria_id !== 'all' ? Number(form.categoria_id) : null,
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Error'); }
      onSaved();
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={!!barril} onOpenChange={() => { onClose(); setError(''); }}>
      <DialogContent className="bg-[#0f0d0a] border-white/10 text-white max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white text-base">
            <Pencil size={16} className="text-[#AA6F3B]" /> Editar Barril
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <div>
            <label className="text-[11px] font-medium text-white/50 mb-1.5 block">Identificador</label>
            <Input value={form.identificador} onChange={(e) => setForm({ ...form, identificador: e.target.value })}
              className="bg-white/[0.03] border-white/10 text-white h-9" />
          </div>
          <div>
            <label className="text-[11px] font-medium text-white/50 mb-1.5 block">Nombre</label>
            <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              className="bg-white/[0.03] border-white/10 text-white h-9" />
          </div>
          <div>
            <label className="text-[11px] font-medium text-white/50 mb-1.5 block">Categoría</label>
            <Select value={form.categoria_id} onValueChange={(v) => setForm({ ...form, categoria_id: v })}>
              <SelectTrigger className="bg-white/[0.03] border-white/10 text-white h-9">
                <SelectValue placeholder="Seleccionar..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Sin categoría</SelectItem>
                {categorias.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-[11px] font-medium text-white/50 mb-1.5 block">Capacidad (litros)</label>
            <Input type="number" value={form.capacidad_litros} onChange={(e) => setForm({ ...form, capacidad_litros: e.target.value })}
              className="bg-white/[0.03] border-white/10 text-white h-9" />
          </div>
          <div>
            <label className="text-[11px] font-medium text-white/50 mb-1.5 block">Estado</label>
            <Select value={form.estado} onValueChange={(v) => setForm({ ...form, estado: v as BarrilEstado })}>
              <SelectTrigger className="bg-white/[0.03] border-white/10 text-white h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ESTADO_CONFIG).map(([key, conf]) => (
                  <SelectItem key={key} value={key}><span className={conf.color}>{conf.label}</span></SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-[11px] font-medium text-white/50 mb-1.5 block">Notas</label>
            <textarea value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })}
              rows={2} className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none focus:border-[#AA6F3B]/50 resize-none" />
          </div>
          {error && <p className="text-xs text-red-400 bg-red-400/10 rounded-lg px-3 py-2 border border-red-500/20">{error}</p>}
        </div>
        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={onClose} className="border-white/10 text-white/60 hover:text-white h-9 text-xs">Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving} className="bg-[#AA6F3B] hover:bg-[#AA6F3B]/80 text-white gap-1.5 h-9 text-xs">
            {saving && <RefreshCw size={12} className="animate-spin" />} Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Delete Confirm ───────────────────────────────────────────────

function DeleteConfirmDialog({ barril, onClose, onDeleted }: {
  barril: Barril | null; onClose: () => void; onDeleted: () => void;
}) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!barril) return;
    setDeleting(true);
    try {
      await fetch(`${API_BASE_URL}/produccion/${barril.id}`, { method: 'DELETE', headers: getAuthHeaders() });
      onDeleted();
    } catch (err) { console.error(err); }
    finally { setDeleting(false); }
  };

  return (
    <Dialog open={!!barril} onOpenChange={() => onClose()}>
      <DialogContent className="bg-[#0f0d0a] border-white/10 text-white max-w-xs">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-400 text-base">
            <Trash2 size={16} /> Eliminar Barril
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-white/60">
          ¿Eliminar <span className="font-bold text-white">{barril?.identificador}</span>? Se borrarán todos sus registros.
        </p>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose} className="border-white/10 text-white/60 hover:text-white h-9 text-xs">Cancelar</Button>
          <Button onClick={handleDelete} disabled={deleting} className="bg-red-600 hover:bg-red-700 text-white gap-1.5 h-9 text-xs">
            {deleting && <RefreshCw size={12} className="animate-spin" />} Eliminar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Undo Confirm ─────────────────────────────────────────────────

function UndoConfirmDialog({ undoData, onClose, onConfirm }: {
  undoData: { barrilId: number; registroId: number } | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [undoing, setUndoing] = useState(false);

  const handleUndo = async () => {
    setUndoing(true);
    await onConfirm();
    setUndoing(false);
  };

  return (
    <Dialog open={!!undoData} onOpenChange={() => onClose()}>
      <DialogContent className="bg-[#0f0d0a] border-white/10 text-white max-w-xs">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-400 text-base">
            <Trash2 size={16} /> Deshacer Acción
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-white/60">
          ¿Seguro que querés deshacer esta acción? Esto revertirá los litros del barril a como estaban antes.
        </p>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose} className="border-white/10 text-white/60 hover:text-white h-9 text-xs">Cancelar</Button>
          <Button onClick={handleUndo} disabled={undoing} className="bg-red-600 hover:bg-red-700 text-white gap-1.5 h-9 text-xs">
            {undoing && <RefreshCw size={12} className="animate-spin" />} Deshacer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Categorías Manager Modal ─────────────────────────────────────

function CategoriasManagerModal({ open, onClose, categorias, onRefresh }: {
  open: boolean; onClose: () => void; categorias: Categoria[]; onRefresh: () => void;
}) {
  const [nombre, setNombre] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingNombre, setEditingNombre] = useState('');

  const handleCreate = async () => {
    if (!nombre.trim()) return;
    setSaving(true); setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/produccion/categorias`, {
        method: 'POST', headers: getAuthHeaders(),
        body: JSON.stringify({ nombre: nombre.trim() }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Error'); }
      setNombre('');
      onRefresh();
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  };

  const handleUpdate = async (id: number) => {
    if (!editingNombre.trim()) return;
    try {
      const res = await fetch(`${API_BASE_URL}/produccion/categorias/${id}`, {
        method: 'PUT', headers: getAuthHeaders(),
        body: JSON.stringify({ nombre: editingNombre.trim() }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Error'); }
      setEditingId(null);
      onRefresh();
    } catch (err: any) { setError(err.message); }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`${API_BASE_URL}/produccion/categorias/${id}`, {
        method: 'DELETE', headers: getAuthHeaders(),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Error'); }
      onRefresh();
    } catch (err: any) { setError(err.message); }
  };

  return (
    <Dialog open={open} onOpenChange={() => { onClose(); setError(''); setEditingId(null); }}>
      <DialogContent className="bg-[#0f0d0a] border-white/10 text-white w-[95vw] sm:max-w-sm max-h-[90vh] overflow-y-auto pr-8 sm:pr-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white text-base">
            <Package size={16} className="text-[#AA6F3B]" />
            Categorías de Barriles
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 mt-2">
          <Input placeholder="Nueva categoría..." value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            className="bg-white/[0.03] border-white/10 text-white placeholder:text-white/25 h-9 text-sm flex-1"
          />
          <Button onClick={handleCreate} disabled={saving || !nombre.trim()} size="sm"
            className="bg-[#AA6F3B] hover:bg-[#AA6F3B]/80 text-white h-9 px-3">
            <Plus size={16} />
          </Button>
        </div>

        {error && <p className="text-xs text-red-400 bg-red-400/10 rounded-lg px-3 py-2 border border-red-500/20">{error}</p>}

        <div className="space-y-1.5 max-h-60 overflow-y-auto mt-2 pr-1">
          {categorias.length === 0 ? (
            <p className="text-xs text-white/30 text-center py-4">No hay categorías</p>
          ) : categorias.map((cat) => (
            <div key={cat.id} className="flex items-center gap-2 rounded-lg bg-white/[0.02] border border-white/6 px-3 py-2">
              {editingId === cat.id ? (
                <>
                  <Input value={editingNombre} onChange={(e) => setEditingNombre(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleUpdate(cat.id)}
                    className="bg-white/[0.03] border-white/10 text-white h-8 text-xs flex-1"
                    autoFocus
                  />
                  <button onClick={() => handleUpdate(cat.id)} className="text-emerald-400 hover:text-emerald-300">
                    <RefreshCw size={14} />
                  </button>
                  <button onClick={() => setEditingId(null)} className="text-white/30 hover:text-white/50">
                    <X size={14} />
                  </button>
                </>
              ) : (
                <>
                  <div className="flex-1 text-sm text-white/80">{cat.nombre}</div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => { setEditingId(cat.id); setEditingNombre(cat.nombre); }}
                      className="text-white/30 hover:text-white/70 p-1 rounded hover:bg-white/5 transition-colors"><Pencil size={14} /></button>
                    <button onClick={() => handleDelete(cat.id)}
                      className="text-white/30 hover:text-red-400 p-1 rounded hover:bg-red-500/10 transition-colors"><Trash2 size={14} /></button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Proceso Modal ────────────────────────────────────────────────

function ProcesoModal({ barril, onClose, onSaved }: {
  barril: Barril | null; onClose: () => void; onSaved: () => void;
}) {
  const isEnding = barril && barril.proceso_activo_nombre;
  const [form, setForm] = useState({ nombre: '', inicio: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (barril && !isEnding) {
      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      setForm({ nombre: '', inicio: now.toISOString().slice(0, 16) });
    }
  }, [barril, isEnding]);

  const handleSubmit = async () => {
    if (!barril) return;
    if (!isEnding && !form.nombre.trim()) { setError('El nombre del proceso es requerido'); return; }
    
    setSaving(true); setError('');
    try {
      const payload = isEnding ? {
        proceso_activo_nombre: null,
        proceso_activo_inicio: null
      } : {
        proceso_activo_nombre: form.nombre.trim(),
        proceso_activo_inicio: new Date(form.inicio).toISOString()
      };

      const res = await fetch(`${API_BASE_URL}/produccion/${barril.id}`, {
        method: 'PUT', headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Error'); }
      onSaved();
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={!!barril} onOpenChange={() => { onClose(); setError(''); }}>
      <DialogContent className="bg-[#0f0d0a] border-white/10 text-white max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white text-base">
            <Timer size={16} className={isEnding ? "text-red-400" : "text-blue-400"} /> 
            {isEnding ? 'Finalizar Proceso' : 'Iniciar Proceso'}
          </DialogTitle>
          <p className="text-xs text-white/40">{barril?.identificador}</p>
        </DialogHeader>
        
        <div className="space-y-3 mt-2">
          {isEnding ? (
            <p className="text-sm text-white/60">
              Vas a finalizar el proceso <strong className="text-white">{barril?.proceso_activo_nombre}</strong>.
            </p>
          ) : (
            <>
              <div>
                <label className="text-[11px] font-medium text-white/50 mb-1.5 block">Nombre del Proceso *</label>
                <Input placeholder="Ej: Maceración, Maduración..." value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  className="bg-white/[0.03] border-white/10 text-white h-9" />
              </div>
              <div>
                <label className="text-[11px] font-medium text-white/50 mb-1.5 block">Fecha de Inicio *</label>
                <Input type="datetime-local" value={form.inicio} onChange={(e) => setForm({ ...form, inicio: e.target.value })}
                  className="bg-white/[0.03] border-white/10 text-white h-9" />
              </div>
            </>
          )}
          {error && <p className="text-xs text-red-400 bg-red-400/10 rounded-lg px-3 py-2 border border-red-500/20">{error}</p>}
        </div>

        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={onClose} className="border-white/10 text-white/60 hover:text-white h-9 text-xs">Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving} className={`${isEnding ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'} text-white gap-1.5 h-9 text-xs`}>
            {saving && <RefreshCw size={12} className="animate-spin" />} {isEnding ? 'Finalizar' : 'Iniciar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

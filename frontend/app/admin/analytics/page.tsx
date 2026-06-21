'use client';

import { useEffect, useState, useMemo } from 'react';
import { format, parseISO, startOfWeek, startOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { API_BASE_URL } from '@/lib/api';
import {
  TrendingUp,
  DollarSign,
  Package,
  CheckCircle,
  XCircle,
  RefreshCw,
  MapPin,
  Calendar,
  CreditCard,
  Truck,
  Users,
  AlertTriangle,
  ChevronDown,
  Info,
} from 'lucide-react';

// Gráficos Recharts
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

// Mapa
import ArgentinaMap from '@/components/ArgentinaMap';

type BIStats = {
  revenue: any[];
  funnel: any[];
  avgTicket: number;
  topProducts: any[];
  stockAlerts: any[];
  payments: {
    status: any[];
    methods: any[];
  };
  shipping: {
    geoDistribution: any[];
    methods: any[];
    avgShippingCost: number;
    funnel: any[];
  };
  clients: {
    top: any[];
    waitlistConversion: any[];
    waitlistGeoDistribution: any[];
    waitlistEvolution: any[];
  };
};

const PAYMENT_METHODS_MAP: Record<string, string> = {
  account_money: 'Saldo MP',
  visa: 'Visa',
  naranja: 'Naranja',
  debvisa: 'Visa Débito',
  debmaster: 'Master Débito',
  master: 'Mastercard',
  consumer_credits: 'Mercado Crédito',
  amex: 'Amex',
  manual_efectivo: 'Efectivo',
};

export default function AnalyticsPage() {
  const [stats, setStats] = useState<BIStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [hoveredProvincia, setHoveredProvincia] = useState<string | null>(null);
  const [hoveredWaitlistProv, setHoveredWaitlistProv] = useState<string | null>(null);

  // Filtros Globales
  const [lotes, setLotes] = useState<any[]>([]);
  const [filterLote, setFilterLote] = useState<string>('all');

  // Filtros Locales
  const [revenueGroup, setRevenueGroup] = useState('day');

  // Filtros Lista de Espera
  const [waitlistGroup, setWaitlistGroup] = useState('day');
  const [waitlistStart, setWaitlistStart] = useState('');
  const [waitlistEnd, setWaitlistEnd] = useState('');

  const load = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    const token = localStorage.getItem('admin_token');

    // Calcular fechas
    const end = new Date();
    const start = new Date();
    start.setFullYear(2023); // histórico completo siempre

    try {
      // Cargar lotes si no están
      let activeLoteId = null;
      if (lotes.length === 0) {
        try {
          const lRes = await fetch(`${API_BASE_URL}/lotes`);
          if (lRes.ok) {
            const data = await lRes.json();
            setLotes(data);
            const active = data.find((l: any) => l.activo);
            if (active) {
               activeLoteId = active.id.toString();
               if (filterLote === 'all') {
                 setFilterLote(activeLoteId);
               }
            }
          }
        } catch (e) {
          console.error('Error fetching lotes', e);
        }
      }

      // Si recién cargamos los lotes y había uno activo, usamos ese para la query actual.
      // Si no, usamos filterLote normal.
      const currentLote = filterLote === 'all' && activeLoteId ? activeLoteId : filterLote;

      let url = `${API_BASE_URL}/admin/analytics-bi?startDate=${start.toISOString()}&endDate=${end.toISOString()}`;
      if (currentLote !== 'all') {
        url += `&lote_id=${currentLote}`;
      }

      const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!res.ok) throw new Error('Error fetching BI Analytics');
      const data = await res.json();
      setStats(data);
    } catch (e: any) {
      setError(e.message || 'No se pudieron cargar las estadísticas');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(() => load(false), 5000);
    return () => clearInterval(interval);
  }, [filterLote]);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Agrupación local para el gráfico de evolución (Debe ir antes de los early returns por Reglas de Hooks)
  const groupedRevenue = useMemo(() => {
    if (!stats || !stats.revenue) return [];
    if (revenueGroup === 'day') return stats.revenue;

    const groups: Record<string, { date: string; revenue: number; orders: number }> = {};

    stats.revenue.forEach((item) => {
      const parsedDate = parseISO(item.date);
      let key = '';
      let displayDate = '';

      if (revenueGroup === 'week') {
        const start = startOfWeek(parsedDate, { weekStartsOn: 1 }); // Lunes
        key = format(start, 'yyyy-MM-dd');
        displayDate = `Semana ${format(start, 'dd MMM', { locale: es })}`;
      } else {
        const start = startOfMonth(parsedDate);
        key = format(start, 'yyyy-MM');
        displayDate = format(start, 'MMMM yyyy', { locale: es });
      }

      if (!groups[key]) {
        groups[key] = { date: displayDate, revenue: 0, orders: 0 };
      }
      groups[key].revenue += Number(item.revenue);
      groups[key].orders += Number(item.orders);
    });

    return Object.values(groups);
  }, [stats?.revenue, revenueGroup]);

  const groupedWaitlist = useMemo(() => {
    if (!stats || !stats.clients?.waitlistEvolution) return [];

    // Filtrado por fecha
    let filtered = stats.clients.waitlistEvolution;
    if (waitlistStart) {
      filtered = filtered.filter((item: any) => item.date >= waitlistStart);
    }
    if (waitlistEnd) {
      filtered = filtered.filter((item: any) => item.date <= waitlistEnd);
    }

    if (waitlistGroup === 'day') return filtered;

    const groups: Record<string, { date: string; signups: number }> = {};

    filtered.forEach((item: any) => {
      const parsedDate = parseISO(item.date);
      let key = '';
      let displayDate = '';

      if (waitlistGroup === 'week') {
        const start = startOfWeek(parsedDate, { weekStartsOn: 1 }); // Lunes
        key = format(start, 'yyyy-MM-dd');
        displayDate = `Semana ${format(start, 'dd MMM', { locale: es })}`;
      } else {
        const start = startOfMonth(parsedDate);
        key = format(start, 'yyyy-MM');
        displayDate = format(start, 'MMMM yyyy', { locale: es });
      }

      if (!groups[key]) {
        groups[key] = { date: displayDate, signups: 0 };
      }
      groups[key].signups += Number(item.signups);
    });

    return Object.values(groups);
  }, [stats?.clients?.waitlistEvolution, waitlistGroup, waitlistStart, waitlistEnd]);

  if (loading && !stats) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#AA6F3B] border-t-transparent" />
          <p className="text-sm text-white/40">Analizando el negocio...</p>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-white/40">{error}</p>
        <button
          onClick={() => load()}
          className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white/60 hover:text-white"
        >
          Reintentar
        </button>
      </div>
    );
  }

  // --- Procesamiento extra para gráficos ---
  // Ventas globales
  const totalRevenue = stats.revenue.reduce((acc, curr) => acc + Number(curr.revenue || 0), 0);
  const totalOrders = stats.revenue.reduce((acc, curr) => acc + Number(curr.orders || 0), 0);

  // Funnel
  const funnelColors: Record<string, string> = {
    paid: '#22c55e',
    pending: '#eab308',
    failed: '#ef4444',
    cancelled: '#64748b',
  };

  // Mapas - datos para ArgentinaMap
  const mapData = stats.shipping.geoDistribution
    .filter((p: any) => p.provincia && p.provincia.trim() !== '')
    .map((p: any) => ({ name: p.provincia.trim(), value: Number(p.count) }));

  const waitlistMapData = (stats.clients?.waitlistGeoDistribution || [])
    .filter((p: any) => p.provincia && p.provincia.trim() !== '')
    .map((p: any) => ({ name: p.provincia.trim(), value: Number(p.count) }));

  // Conversión
  const waitData = Array.isArray(stats.clients?.waitlistConversion)
    ? stats.clients.waitlistConversion[0]
    : stats.clients?.waitlistConversion || { total_anotados: 0, total_compraron: 0 };
  const anotados = Number(waitData.total_anotados) || 0;
  const compraron = Number(waitData.total_compraron) || 0;
  const conversionRate = anotados > 0 ? ((compraron / anotados) * 100).toFixed(1) : '0';
  const pendingToPrepare =
    stats.shipping.funnel.find((f) => f.status === 'para_despachar')?.count || 0;

  // Custom YAxis Tick for Top Products
  const CustomYAxisTick = (props: any) => {
    const { x, y, payload } = props;
    const product = stats.topProducts.find((p) => p.title === payload.value);
    return (
      <g transform={`translate(${x},${y})`}>
        {product?.image && (
          <image
            href={product.image.startsWith('/') ? product.image : `/${product.image}`}
            x={-140}
            y={-16}
            height="32"
            width="32"
            className="rounded-md object-cover"
          />
        )}
        <text x={-100} y={4} dy={0} textAnchor="start" fill="#ffffff80" fontSize={11}>
          {payload.value.length > 20 ? payload.value.substring(0, 18) + '...' : payload.value}
        </text>
      </g>
    );
  };

  return (
    <div className="pb-20">
      {/* HEADER & STICKY NAVBAR */}
      <div className="sticky top-16 z-20 -mx-4 -mt-4 mb-8 flex flex-col justify-between gap-4 border-b border-white/5 bg-[#0b0a07]/95 px-4 py-4 shadow-2xl backdrop-blur-xl sm:-mx-6 sm:-mt-6 sm:px-6 lg:-mx-8 lg:-mt-8 lg:px-8 xl:flex-row xl:items-center">
        <div>
          <h1 className="font-serif text-3xl font-bold text-white">BI Dashboard</h1>
        </div>

        <div className="flex flex-col items-center gap-4 sm:flex-row">
          {/* Scrollspy Menu */}
          <div className="hide-scrollbar flex items-center gap-1 overflow-x-auto rounded-xl bg-white/5 p-1">
            <button
              onClick={() => scrollTo('ventas')}
              className="rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap text-white/60 transition-colors hover:text-white"
            >
              Ventas
            </button>
            <button
              onClick={() => scrollTo('productos')}
              className="rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap text-white/60 transition-colors hover:text-white"
            >
              Productos
            </button>
            <button
              onClick={() => scrollTo('pagos')}
              className="rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap text-white/60 transition-colors hover:text-white"
            >
              Pagos
            </button>
            <button
              onClick={() => scrollTo('logistica')}
              className="rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap text-white/60 transition-colors hover:text-white"
            >
              Logística
            </button>
            <button
              onClick={() => scrollTo('clientes')}
              className="rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap text-white/60 transition-colors hover:text-white"
            >
              Clientes
            </button>
          </div>

          <div className="hidden h-6 w-px bg-white/10 sm:block" />

          {/* Filtros Globales */}
          <div className="flex items-center gap-2">
            <Select
              value={filterLote}
              onValueChange={(val) => {
                setFilterLote(val);
                // The useEffect will trigger load()
              }}
            >
              <SelectTrigger className="h-8 w-40 border-white/10 bg-white/5 text-white focus:border-[#AA6F3B]/50">
                <SelectValue placeholder="Todos los lotes" />
              </SelectTrigger>
              <SelectContent className="border border-white/10 bg-[#0b0a07] text-white">
                <SelectItem value="all">Todos los lotes</SelectItem>
                {lotes.map((l) => (
                  <SelectItem key={l.id} value={String(l.id)}>
                    {l.nombre} {l.activo ? '(Actual)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <button
              onClick={() => load(true)}
              disabled={refreshing}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#AA6F3B]/20 text-[#AA6F3B] transition-colors hover:bg-[#AA6F3B]/30"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-10">
        {/* SECCIÓN 1: VENTAS E INGRESOS */}
        <section id="ventas" className="scroll-mt-36 space-y-6">
          <div className="flex items-center gap-3 border-b border-white/10 pb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/20">
              <TrendingUp size={16} className="text-green-400" />
            </div>
            <h2 className="font-serif text-2xl font-bold text-white">Ventas e Ingresos</h2>
          </div>

          {/* KPIs Core */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            <div className="rounded-2xl border border-white/8 bg-[#0b0a07]/40 p-7 shadow-lg backdrop-blur-sm">
              <p className="mb-2 text-[10px] font-semibold tracking-[0.2em] text-white/40 uppercase">
                Facturación
              </p>
              <p className="font-mono text-3xl font-bold text-[#AA6F3B]">
                ${totalRevenue.toLocaleString('es-AR')}
              </p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-[#0b0a07]/40 p-7 shadow-lg backdrop-blur-sm">
              <p className="mb-2 text-[10px] font-semibold tracking-[0.2em] text-white/40 uppercase">
                Pedidos Totales
              </p>
              <p className="font-mono text-3xl font-bold text-white">{totalOrders}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-[#0b0a07]/40 p-7 shadow-lg backdrop-blur-sm">
              <div className="group relative mb-2 flex items-center gap-2">
                <p className="text-[10px] font-semibold tracking-[0.2em] text-white/40 uppercase">
                  Para Despachar
                </p>
                <Info size={12} className="cursor-help text-white/30" />
                <div className="absolute bottom-full left-0 z-50 mb-2 hidden w-48 rounded-md border border-[#AA6F3B]/20 bg-[#1a1511] p-2 text-xs text-white/80 shadow-xl group-hover:block">
                  Pedidos pagados que aún no tienen un código de seguimiento de Correo Argentino
                  cargado.
                </div>
              </div>
              <p className="font-mono text-3xl font-bold text-yellow-500">{pendingToPrepare}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-[#0b0a07]/40 p-7 shadow-lg backdrop-blur-sm">
              <p className="mb-2 text-[10px] font-semibold tracking-[0.2em] text-white/40 uppercase">
                Ticket Promedio
              </p>
              <p className="font-mono text-3xl font-bold text-white">
                ${stats.avgTicket.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
              </p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-[#0b0a07]/40 p-7 shadow-lg backdrop-blur-sm">
              <div className="group relative mb-2 flex items-center gap-2">
                <p className="text-[10px] font-semibold tracking-[0.2em] text-white/40 uppercase">
                  Tasa de Cierre
                </p>
                <Info size={12} className="cursor-help text-white/30" />
                <div className="absolute right-0 bottom-full z-50 mb-2 hidden w-48 rounded-md border border-[#AA6F3B]/20 bg-[#1a1511] p-2 text-xs text-white/80 shadow-xl group-hover:block">
                  Porcentaje de carritos que llegaron a pagarse exitosamente vs los que fueron
                  abandonados o fallaron.
                </div>
              </div>
              <p className="font-mono text-3xl font-bold text-green-500">
                {stats.funnel.length > 0
                  ? (
                      (Number(stats.funnel.find((f) => f.status === 'paid')?.count || 0) /
                        stats.funnel.reduce((a, c) => a + Number(c.count), 0)) *
                      100
                    ).toFixed(1)
                  : '0'}
                %
              </p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Gráfico de Evolución */}
            <div className="rounded-2xl border border-white/8 bg-[#0b0a07]/40 p-7 shadow-lg backdrop-blur-sm lg:col-span-2">
              <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                <p className="font-serif text-lg font-bold text-white">Evolución de Ingresos</p>
                <div className="inline-flex w-full rounded-xl bg-[#1a1511] p-1 sm:w-auto">
                  <button
                    onClick={() => setRevenueGroup('day')}
                    className={`flex-1 rounded-lg px-4 py-1.5 text-xs font-semibold transition-all sm:flex-none ${revenueGroup === 'day' ? 'bg-[#AA6F3B] text-white shadow-md' : 'text-white/40 hover:text-white'}`}
                  >
                    Días
                  </button>
                  <button
                    onClick={() => setRevenueGroup('week')}
                    className={`flex-1 rounded-lg px-4 py-1.5 text-xs font-semibold transition-all sm:flex-none ${revenueGroup === 'week' ? 'bg-[#AA6F3B] text-white shadow-md' : 'text-white/40 hover:text-white'}`}
                  >
                    Semanas
                  </button>
                  <button
                    onClick={() => setRevenueGroup('month')}
                    className={`flex-1 rounded-lg px-4 py-1.5 text-xs font-semibold transition-all sm:flex-none ${revenueGroup === 'month' ? 'bg-[#AA6F3B] text-white shadow-md' : 'text-white/40 hover:text-white'}`}
                  >
                    Meses
                  </button>
                </div>
              </div>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={groupedRevenue}
                    margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#AA6F3B" stopOpacity={0.6} />
                        <stop offset="95%" stopColor="#AA6F3B" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0a" vertical={false} />
                    <XAxis
                      dataKey="date"
                      stroke="#ffffff30"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      dy={10}
                    />
                    <YAxis
                      yAxisId="left"
                      domain={[0, (dataMax: number) => Math.floor(dataMax * 1.15)]}
                      stroke="#ffffff30"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `$${v.toLocaleString()}`}
                      width={80}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      stroke="#ffffff30"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: '#120e0b',
                        borderColor: '#AA6F3B30',
                        borderRadius: '12px',
                        boxShadow: '0 10px 30px -10px rgba(0,0,0,0.5)',
                      }}
                      itemStyle={{ color: '#AA6F3B', fontWeight: 'bold' }}
                      labelStyle={{ color: '#ffffff80', marginBottom: '4px' }}
                    />
                    <Area
                      yAxisId="left"
                      type="monotoneX"
                      dataKey="revenue"
                      name="Ingresos"
                      stroke="#AA6F3B"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorRev)"
                    />
                    <Area
                      yAxisId="right"
                      type="step"
                      dataKey="orders"
                      name="Pedidos"
                      stroke="#ffffff20"
                      strokeWidth={2}
                      fillOpacity={0}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Funnel Pedidos (Custom HTML Waterfall) */}
            <div className="rounded-2xl border border-white/8 bg-[#0b0a07]/40 p-7 shadow-lg backdrop-blur-sm">
              <div className="group relative mb-8 flex items-center gap-2">
                <p className="font-serif text-lg font-bold text-white">Embudo de Carritos</p>
                <Info size={16} className="cursor-help text-white/30" />
                <div className="absolute bottom-full left-0 z-50 mb-2 hidden w-64 rounded-md border border-[#AA6F3B]/20 bg-[#1a1511] p-3 text-xs text-white/80 shadow-xl group-hover:block">
                  Muestra gráficamente el porcentaje de usuarios que llegan a pagar vs los que
                  abandonan.
                </div>
              </div>

              <div className="mt-2 flex flex-col gap-6">
                <div className="space-y-2">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-sm font-bold text-white">Iniciados (Total)</p>
                      <p className="text-xs text-white/40">
                        100% del tráfico que agregó al carrito
                      </p>
                    </div>
                    <span className="font-mono text-xl font-bold text-white">
                      {stats.funnel.reduce((a, c) => a + Number(c.count), 0)}
                    </span>
                  </div>
                  <div className="h-4 w-full overflow-hidden rounded-full border border-white/5 bg-[#120e0b]">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: '100%' }}
                      className="h-full bg-white/20"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-sm font-bold text-green-400">Pagados Exitosamente</p>
                      <p className="text-xs text-green-400/50">Cobros aprobados en MP</p>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-xl font-bold text-green-400">
                        {Number(stats.funnel.find((f) => f.status === 'paid')?.count || 0)}
                      </span>
                      <span className="ml-2 rounded-full bg-green-400/10 px-2 py-0.5 text-xs font-bold text-green-400/60">
                        {stats.funnel.reduce((a, c) => a + Number(c.count), 0) > 0
                          ? (
                              (Number(stats.funnel.find((f) => f.status === 'paid')?.count || 0) /
                                stats.funnel.reduce((a, c) => a + Number(c.count), 0)) *
                              100
                            ).toFixed(1)
                          : '0'}
                        %
                      </span>
                    </div>
                  </div>
                  <div className="h-4 w-full overflow-hidden rounded-full border border-white/5 bg-[#120e0b]">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{
                        width: `${stats.funnel.reduce((a, c) => a + Number(c.count), 0) > 0 ? (Number(stats.funnel.find((f) => f.status === 'paid')?.count || 0) / stats.funnel.reduce((a, c) => a + Number(c.count), 0)) * 100 : 0}%`,
                      }}
                      className="h-full bg-green-500"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-sm font-bold text-red-400">Abandonados / Rechazados</p>
                      <p className="text-xs text-red-400/50">Tarjetas fallidas o sin pagar</p>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-xl font-bold text-red-400">
                        {stats.funnel.reduce((a, c) => a + Number(c.count), 0) -
                          Number(stats.funnel.find((f) => f.status === 'paid')?.count || 0)}
                      </span>
                      <span className="ml-2 rounded-full bg-red-400/10 px-2 py-0.5 text-xs font-bold text-red-400/60">
                        {stats.funnel.reduce((a, c) => a + Number(c.count), 0) > 0
                          ? (
                              ((stats.funnel.reduce((a, c) => a + Number(c.count), 0) -
                                Number(stats.funnel.find((f) => f.status === 'paid')?.count || 0)) /
                                stats.funnel.reduce((a, c) => a + Number(c.count), 0)) *
                              100
                            ).toFixed(1)
                          : '0'}
                        %
                      </span>
                    </div>
                  </div>
                  <div className="flex h-4 w-full justify-end overflow-hidden rounded-full border border-white/5 bg-[#120e0b]">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{
                        width: `${stats.funnel.reduce((a, c) => a + Number(c.count), 0) > 0 ? ((stats.funnel.reduce((a, c) => a + Number(c.count), 0) - Number(stats.funnel.find((f) => f.status === 'paid')?.count || 0)) / stats.funnel.reduce((a, c) => a + Number(c.count), 0)) * 100 : 0}%`,
                      }}
                      className="h-full bg-red-500/80"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECCIÓN 2: PRODUCTOS E INVENTARIO */}
        <section id="productos" className="scroll-mt-36 space-y-6">
          <div className="flex items-center gap-3 border-b border-white/10 pb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#AA6F3B]/20">
              <Package size={16} className="text-[#AA6F3B]" />
            </div>
            <h2 className="font-serif text-2xl font-bold text-white">
              Rendimiento de Productos e Inventario
            </h2>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Top Sellers */}
            <div className="rounded-2xl border border-white/8 bg-[#0b0a07]/40 p-7 shadow-lg backdrop-blur-sm">
              <p className="mb-6 font-serif text-lg font-bold text-white">Top Productos Vendidos</p>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={stats.topProducts}
                    layout="vertical"
                    margin={{ top: 0, right: 20, left: 140, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#ffffff0a"
                      horizontal={true}
                      vertical={false}
                    />
                    <XAxis
                      type="number"
                      stroke="#ffffff40"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      dataKey="title"
                      type="category"
                      stroke="#ffffff80"
                      fontSize={11}
                      width={10}
                      tick={<CustomYAxisTick />}
                      tickLine={false}
                      axisLine={false}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: '#120e0b',
                        borderColor: '#AA6F3B30',
                        borderRadius: '12px',
                        boxShadow: '0 10px 30px -10px rgba(0,0,0,0.5)',
                      }}
                      itemStyle={{ color: '#AA6F3B', fontWeight: 'bold' }}
                    />
                    <Bar
                      dataKey="total_sold"
                      name="Cantidad de productos vendidos"
                      fill="#AA6F3B"
                      radius={[0, 8, 8, 0]}
                      barSize={24}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Stock Monitor */}
            <div className="flex h-[390px] flex-col rounded-2xl border border-white/8 bg-[#0b0a07]/40 p-7 shadow-lg backdrop-blur-sm">
              <div className="mb-6 flex items-center justify-between">
                <p className="font-serif text-lg font-bold text-white">Monitor de Stock Crítico</p>
                <AlertTriangle size={20} className="text-[#AA6F3B]" />
              </div>
              <div className="custom-scrollbar flex-1 space-y-3 overflow-y-auto pr-2">
                {stats.stockAlerts.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-white/30">
                    <CheckCircle size={32} className="mb-3 text-green-500/50" />
                    <p className="text-sm font-semibold tracking-wider uppercase">
                      Inventario Saludable
                    </p>
                  </div>
                ) : (
                  stats.stockAlerts.map((p) => {
                    const isAgotado = p.status === 'agotado' || Number(p.stock) <= 0;
                    const isLow = Number(p.stock) > 0 && Number(p.stock) <= Number(p.limite) + 5;
                    const badgeClass = isAgotado
                      ? 'bg-red-500/10 text-red-400 border-red-500/20'
                      : isLow
                        ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                        : 'bg-green-500/10 text-green-400 border-green-500/20';
                    const badgeText = isAgotado ? 'Agotado' : isLow ? 'Bajo' : 'Disponible';

                    return (
                      <div
                        key={p.id}
                        className="group relative flex items-center justify-between rounded-2xl border border-white/5 bg-[#120e0b]/50 p-4 transition-all hover:bg-[#1a1511]/80"
                      >
                        <div>
                          <p className="text-sm font-bold text-white">{p.name}</p>
                          <div
                            className={`mt-2 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase ${badgeClass}`}
                          >
                            {badgeText}
                          </div>
                        </div>
                        <div className="text-right">
                          <p
                            className={`font-mono text-2xl font-bold ${isAgotado ? 'text-red-400' : 'text-yellow-400'}`}
                          >
                            {p.stock}
                          </p>
                          <p className="mt-1 text-[10px] font-semibold tracking-wider text-white/30 uppercase">
                            Límite: {p.limite}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </section>

        {/* SECCIÓN 3: RENDIMIENTO PASARELA */}
        <section id="pagos" className="scroll-mt-36 space-y-6">
          <div className="flex items-center gap-3 border-b border-white/10 pb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/20">
              <CreditCard size={16} className="text-blue-400" />
            </div>
            <h2 className="font-serif text-2xl font-bold text-white">Rendimiento MercadoPago</h2>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Tasa de Aprobación */}
            <div className="relative flex flex-col items-center rounded-2xl border border-white/8 bg-[#0b0a07]/40 p-7 shadow-lg backdrop-blur-sm">
              <div className="group relative mb-2 flex items-center gap-2 self-start">
                <p className="font-serif text-lg font-bold text-white">
                  Tasa de Aprobación / Rechazo
                </p>
                <Info size={16} className="cursor-help text-white/30" />
                <div className="absolute bottom-full left-0 z-50 mb-2 hidden w-64 rounded-md border border-[#AA6F3B]/20 bg-[#1a1511] p-3 text-xs text-white/80 shadow-xl group-hover:block">
                  Muestra qué porcentaje de los intentos de pago en MercadoPago pasan limpio
                  (Approved) frente a los que son rebotados por falta de fondos o seguridad
                  (Rejected).
                </div>
              </div>

              <div className="relative flex h-[280px] w-full items-center justify-center">
                {stats.payments.status.length > 0 && (
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pb-6">
                    <span className="text-4xl font-bold text-white">
                      {(() => {
                        const approved = Number(
                          stats.payments.status.find((s) => s.status === 'approved')?.count || 0
                        );
                        const total = stats.payments.status.reduce(
                          (a, c) => a + Number(c.count),
                          0
                        );
                        return total > 0 ? Math.round((approved / total) * 100) : 0;
                      })()}
                      %
                    </span>
                    <span className="mt-1 text-[10px] font-semibold tracking-widest text-white/40 uppercase">
                      Aprobado
                    </span>
                  </div>
                )}
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.payments.status}
                      dataKey="count"
                      nameKey="status"
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={110}
                      paddingAngle={5}
                    >
                      {stats.payments.status.map((entry, index) => {
                        const c =
                          entry.status === 'approved'
                            ? '#22c55e'
                            : entry.status === 'rejected'
                              ? '#ef4444'
                              : '#eab308';
                        return <Cell key={`cell-${index}`} fill={c} />;
                      })}
                    </Pie>
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: '#120e0b',
                        borderColor: '#AA6F3B30',
                        borderRadius: '12px',
                        boxShadow: '0 10px 30px -10px rgba(0,0,0,0.5)',
                      }}
                      itemStyle={{ fontWeight: 'bold' }}
                    />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Mix de Medios */}
            <div className="rounded-2xl border border-white/8 bg-[#0b0a07]/40 p-7 shadow-lg backdrop-blur-sm">
              <div className="group relative mb-6 flex items-center gap-2">
                <p className="font-serif text-lg font-bold text-white">Mix de Medios de Pago</p>
                <Info size={16} className="cursor-help text-white/30" />
                <div className="absolute bottom-full left-0 z-50 mb-2 hidden w-64 rounded-md border border-[#AA6F3B]/20 bg-[#1a1511] p-3 text-xs text-white/80 shadow-xl group-hover:block">
                  Desglosa cómo prefiere pagar tu clientela (por ejemplo, saldo en cuenta, tarjeta
                  de crédito, débito, etc.). Útil para planificar promociones bancarias.
                </div>
              </div>
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={stats.payments.methods}
                    margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0a" vertical={false} />
                    <XAxis
                      dataKey="payment_method"
                      stroke="#ffffff30"
                      fontSize={10}
                      interval={0}
                      tickLine={false}
                      axisLine={false}
                      dy={10}
                      tickFormatter={(val) => PAYMENT_METHODS_MAP[val] || val}
                    />
                    <YAxis stroke="#ffffff30" fontSize={11} tickLine={false} axisLine={false} />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: '#120e0b',
                        borderColor: '#AA6F3B30',
                        borderRadius: '12px',
                        boxShadow: '0 10px 30px -10px rgba(0,0,0,0.5)',
                      }}
                      itemStyle={{ color: '#3b82f6', fontWeight: 'bold' }}
                      cursor={{ fill: 'transparent' }}
                      labelFormatter={(label: any) => PAYMENT_METHODS_MAP[label] || label}
                    />
                    <Bar
                      dataKey="count"
                      name="Uso"
                      fill="#3b82f6"
                      radius={[8, 8, 0, 0]}
                      barSize={40}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </section>

        {/* SECCIÓN 4: LOGÍSTICA Y ENVÍOS */}
        <section id="logistica" className="scroll-mt-36 space-y-6">
          <div className="flex items-center gap-3 border-b border-white/10 pb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/20">
              <Truck size={16} className="text-indigo-400" />
            </div>
            <h2 className="font-serif text-2xl font-bold text-white">Logística y Envíos</h2>
          </div>

          {/* Info Extra: Costos */}
          <div className="flex items-center justify-between rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-4">
            <div>
              <p className="text-xs font-semibold tracking-widest text-indigo-200/60 uppercase">
                Costo Promedio Envío
              </p>
              <p className="text-2xl font-bold text-white">
                $
                {stats.shipping.avgShippingCost.toLocaleString('es-AR', {
                  maximumFractionDigits: 0,
                })}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold tracking-widest text-indigo-200/60 uppercase">
                Proporción vs Ticket
              </p>
              <p className="text-2xl font-bold text-indigo-400">
                {stats.avgTicket > 0
                  ? ((stats.shipping.avgShippingCost / stats.avgTicket) * 100).toFixed(1)
                  : 0}
                %
              </p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Lista Scrolleable de Provincias */}
            <div className="flex h-[500px] flex-col rounded-2xl border border-white/8 bg-[#0b0a07]/40 p-7 shadow-lg backdrop-blur-sm lg:col-span-1">
              <div className="mb-6">
                <p className="font-serif text-lg font-bold text-white">Ranking por Provincia</p>
                <p className="mt-1 text-xs text-white/40">Listado exacto de demanda</p>
              </div>

              <div className="custom-scrollbar flex-1 overflow-y-auto pr-2">
                {stats.shipping.geoDistribution.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-white/30">
                    <MapPin size={32} className="mb-2 text-white/20" />
                    <p className="text-sm font-semibold tracking-wider uppercase">Sin datos</p>
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {stats.shipping.geoDistribution.map((prov, i) => (
                      <li
                        key={i}
                        onMouseEnter={() => setHoveredProvincia(prov.provincia)}
                        onMouseLeave={() => setHoveredProvincia(null)}
                        className="flex cursor-default items-center justify-between rounded-xl border border-white/5 bg-white/5 px-4 py-3 transition-all hover:border-[#AA6F3B]/30 hover:bg-white/10"
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#AA6F3B]/20 text-[10px] font-bold text-[#AA6F3B]">
                            {i + 1}
                          </span>
                          <span className="text-sm font-medium text-white">
                            {prov.provincia || 'Desconocida'}
                          </span>
                        </div>
                        <span className="font-mono text-sm font-bold text-white/80">
                          {prov.count}{' '}
                          <span className="ml-1 text-[10px] font-normal text-white/40 uppercase">
                            envíos
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Mapa de Envíos */}
            <div className="relative flex h-[520px] flex-col overflow-hidden rounded-2xl border border-white/8 bg-[#0b0a07]/40 p-7 shadow-lg backdrop-blur-sm lg:col-span-1">
              <div className="z-10 mb-3">
                <p className="font-serif text-lg font-bold text-white">Mapa de Envíos</p>
                <p className="text-xs text-white/40">Concentración geográfica de envíos pagados</p>
              </div>
              <div className="min-h-0 flex-1 overflow-hidden rounded-xl bg-[#1a1713]">
                <ArgentinaMap
                  data={mapData}
                  colorRange={['#5a4a35', '#d4a052']}
                  emptyColor="#2a2420"
                  tooltipLabel="envíos"
                  hoveredFromOutside={hoveredProvincia}
                  onHoverChange={(n) => setHoveredProvincia(n)}
                />
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Funnel Logistico */}
            <div className="rounded-2xl border border-white/8 bg-[#0b0a07]/40 p-7 shadow-lg backdrop-blur-sm lg:col-span-2">
              <div className="mb-8 flex items-center justify-between">
                <div className="group relative flex items-center gap-2">
                  <p className="font-serif text-lg font-bold text-white">
                    Estado del Embudo de Envíos y Ventas
                  </p>
                  <Info size={16} className="cursor-help text-white/30" />
                  <div className="absolute bottom-full left-0 z-50 mb-2 hidden w-64 rounded-md border border-[#AA6F3B]/20 bg-[#1a1511] p-3 text-xs text-white/80 shadow-xl group-hover:block">
                    Visualización del estado de los envíos para órdenes pagadas y ventas en local.
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-end">
                    <p className="mb-1 text-[10px] font-bold tracking-widest text-white/40 uppercase">
                      Total Confirmados
                    </p>
                    <p className="font-mono text-2xl font-black text-white">
                      {(() => {
                        const enviados = Number(
                          stats.shipping.funnel.find((f) => f.status === 'enviado')?.count || 0
                        );
                        const ventasLocal = Number(
                          stats.shipping.funnel.find((f) => f.status === 'venta_local')?.count || 0
                        );
                        return enviados + ventasLocal;
                      })()}
                    </p>
                    <p className="text-[10px] text-white/30">Enviados + En Local</p>
                  </div>
                </div>
              </div>

              <div className="relative mt-12 mb-4 flex w-full items-start justify-between px-2">
                {/* Línea de conexión base */}
                <div className="absolute top-5 right-8 left-8 -z-10 h-1 bg-[#120e0b]" />
                {/* Renderizamos pasos lógicos del funnel */}
                {[
                  {
                    id: 'pendiente',
                    label: 'Pendiente de Pago',
                    color: 'text-orange-400',
                    bg: 'bg-orange-500/10',
                    border: 'border-orange-500/30',
                  },
                  {
                    id: 'para_despachar',
                    label: 'Pendiente de Despacho',
                    color: 'text-yellow-500',
                    bg: 'bg-yellow-500/10',
                    border: 'border-yellow-500/30',
                  },
                  {
                    id: 'enviado',
                    label: 'Enviado (Tracking)',
                    color: 'text-green-500',
                    bg: 'bg-green-500/10',
                    border: 'border-green-500/30',
                  },
                  {
                    id: 'venta_local',
                    label: 'Venta en Local',
                    color: 'text-emerald-400',
                    bg: 'bg-emerald-500/10',
                    border: 'border-emerald-500/30',
                  },
                  {
                    id: 'cancelado',
                    label: 'Anulado',
                    color: 'text-gray-500',
                    bg: 'bg-gray-500/10',
                    border: 'border-gray-500/30',
                  },
                ].map((step) => {
                  const count = Number(
                    stats.shipping.funnel.find((f) => f.status === step.id)?.count || 0
                  );
                  const total = stats.shipping.funnel.reduce((a, c) => a + Number(c.count), 0);
                  const percent = total > 0 ? ((count / total) * 100).toFixed(0) : '0';

                  return (
                    <div
                      key={step.id}
                      className="relative z-10 flex w-1/5 flex-col items-center px-2 text-center"
                    >
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-full border-2 ${step.bg} ${step.border} ${step.color} shadow-lg backdrop-blur-md`}
                      >
                        <span className="font-mono text-sm font-bold">{count}</span>
                      </div>
                      <p className="mt-3 text-[10px] leading-tight font-bold tracking-widest text-white/70 uppercase">
                        {step.label}
                      </p>
                      <p className="mt-1 font-mono text-[10px] text-white/30">
                        {percent}% del total
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* SECCIÓN 5: CLIENTES Y AUDIENCIA */}
        <section id="clientes" className="scroll-mt-36 space-y-6">
          <div className="flex items-center gap-3 border-b border-white/10 pb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-pink-500/20">
              <Users size={16} className="text-pink-400" />
            </div>
            <h2 className="font-serif text-2xl font-bold text-white">Clientes y Audiencia</h2>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Conversion Waitlist KPI */}
            <div className="flex flex-col justify-center rounded-2xl border border-white/8 bg-gradient-to-br from-[#AA6F3B]/15 to-[#0b0a07]/50 p-8 shadow-lg lg:col-span-1">
              <p className="mb-3 text-[10px] font-bold tracking-[0.2em] text-[#AA6F3B] uppercase">
                Hype vs Realidad
              </p>
              <h3 className="mb-8 font-serif text-2xl font-bold text-white">
                Conversión de
                <br />
                Lista de Espera
              </h3>

              <div className="space-y-5">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <span className="text-sm font-medium text-white/60">Total Anotados</span>
                  <span className="font-mono text-lg font-bold text-white">{anotados}</span>
                </div>
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <span className="text-sm font-medium text-white/60">Convirtieron a Venta</span>
                  <span className="font-mono text-lg font-bold text-green-400">{compraron}</span>
                </div>
                <div className="pt-6 text-center">
                  <span className="bg-gradient-to-br from-[#AA6F3B] to-[#e4ac7a] bg-clip-text font-mono text-6xl font-black text-transparent drop-shadow-lg">
                    {conversionRate}%
                  </span>
                  <p className="mt-4 text-xs font-medium tracking-widest text-white/50 uppercase">
                    Tasa Real de Compra
                  </p>
                </div>
              </div>
            </div>

            {/* Top Clientes Recurrentes */}
            <div className="flex h-[480px] flex-col rounded-2xl border border-white/8 bg-[#0b0a07]/40 p-7 shadow-lg backdrop-blur-sm lg:col-span-2">
              <div className="mb-6">
                <p className="mb-1 text-[10px] font-semibold tracking-[0.2em] text-[#AA6F3B] uppercase">
                  Fidelización
                </p>
                <p className="font-serif text-lg font-bold text-white">Top Clientes Recurrentes</p>
              </div>

              <div className="custom-scrollbar flex-1 overflow-y-auto pr-2">
                <table className="w-full text-left text-sm text-white/80">
                  <thead className="sticky top-0 z-10 border-b border-white/10 bg-[#0d0a08]/95 text-[10px] tracking-widest text-[#AA6F3B] uppercase backdrop-blur-md">
                    <tr>
                      <th className="px-5 py-4 font-bold">Cliente</th>
                      <th className="hidden px-5 py-4 font-bold sm:table-cell">Email</th>
                      <th className="px-5 py-4 text-center font-bold">Pedidos</th>
                      <th className="px-5 py-4 text-right font-bold">LTV (Gastado)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.clients.top.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-10 text-center text-white/30">
                          <Users size={32} className="mx-auto mb-3 opacity-50" />
                          Sin historial suficiente
                        </td>
                      </tr>
                    ) : (
                      stats.clients.top.map((client, i) => (
                        <tr
                          key={i}
                          className="border-b border-white/5 transition-colors odd:bg-white/[0.02] hover:bg-white/10"
                        >
                          <td className="flex items-center gap-4 px-5 py-4 font-medium text-white">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#AA6F3B]/30 bg-[#AA6F3B]/10 text-xs font-bold text-[#AA6F3B] uppercase">
                              {client.nombre_cliente.charAt(0)}
                            </div>
                            <span>{client.nombre_cliente}</span>
                          </td>
                          <td className="hidden px-5 py-4 text-white/40 sm:table-cell">
                            {client.email_cliente}
                          </td>
                          <td className="px-5 py-4 text-center font-mono font-bold text-white/60">
                            {client.orders_count}
                          </td>
                          <td className="px-5 py-4 text-right font-mono font-bold text-green-400">
                            ${Number(client.total_spent).toLocaleString('es-AR')}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Gráfico de Evolución de Lista de Espera */}
          <div className="rounded-2xl border border-white/8 bg-[#0b0a07]/40 p-7 shadow-lg backdrop-blur-sm">
            <div className="mb-6 flex flex-col items-start justify-between gap-4 border-b border-white/10 pb-4 sm:flex-row sm:items-center">
              <div>
                <p className="font-serif text-lg font-bold text-white">Evolución de Anotados</p>
                <p className="mt-1 text-xs text-white/40">
                  Crecimiento histórico de la lista de espera.
                </p>
              </div>

              <div className="flex w-full flex-col items-center gap-4 sm:w-auto sm:flex-row">
                <div className="flex w-full items-center gap-2 sm:w-auto">
                  <input
                    type="date"
                    value={waitlistStart}
                    onChange={(e) => setWaitlistStart(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/80 focus:border-[#AA6F3B] focus:outline-none sm:w-auto"
                  />
                  <span className="text-xs text-white/40">hasta</span>
                  <input
                    type="date"
                    value={waitlistEnd}
                    onChange={(e) => setWaitlistEnd(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/80 focus:border-[#AA6F3B] focus:outline-none sm:w-auto"
                  />
                  {(waitlistStart || waitlistEnd) && (
                    <button
                      onClick={() => {
                        setWaitlistStart('');
                        setWaitlistEnd('');
                      }}
                      className="px-2 text-xs text-[#AA6F3B] hover:text-white"
                    >
                      Limpiar
                    </button>
                  )}
                </div>
                <div className="inline-flex w-full rounded-xl bg-[#1a1511] p-1 sm:w-auto">
                  <button
                    onClick={() => setWaitlistGroup('day')}
                    className={`flex-1 rounded-lg px-4 py-1.5 text-xs font-semibold transition-all sm:flex-none ${waitlistGroup === 'day' ? 'bg-[#AA6F3B] text-white shadow-md' : 'text-white/40 hover:text-white'}`}
                  >
                    Días
                  </button>
                  <button
                    onClick={() => setWaitlistGroup('week')}
                    className={`flex-1 rounded-lg px-4 py-1.5 text-xs font-semibold transition-all sm:flex-none ${waitlistGroup === 'week' ? 'bg-[#AA6F3B] text-white shadow-md' : 'text-white/40 hover:text-white'}`}
                  >
                    Semanas
                  </button>
                  <button
                    onClick={() => setWaitlistGroup('month')}
                    className={`flex-1 rounded-lg px-4 py-1.5 text-xs font-semibold transition-all sm:flex-none ${waitlistGroup === 'month' ? 'bg-[#AA6F3B] text-white shadow-md' : 'text-white/40 hover:text-white'}`}
                  >
                    Meses
                  </button>
                </div>
              </div>
            </div>

            <div className="mb-8 h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={groupedWaitlist}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorWait" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#AA6F3B" stopOpacity={0.6} />
                      <stop offset="95%" stopColor="#AA6F3B" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0a" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="#ffffff30"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    dy={10}
                  />
                  <YAxis stroke="#ffffff30" fontSize={11} tickLine={false} axisLine={false} />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: '#120e0b',
                      borderColor: '#AA6F3B30',
                      borderRadius: '12px',
                      boxShadow: '0 10px 30px -10px rgba(0,0,0,0.5)',
                    }}
                    itemStyle={{ color: '#AA6F3B', fontWeight: 'bold' }}
                    labelStyle={{ color: '#ffffff80', marginBottom: '4px' }}
                  />
                  <Area
                    type="monotoneX"
                    dataKey="signups"
                    name="Nuevos Anotados"
                    stroke="#AA6F3B"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorWait)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Mapa de Hype - Lista de Espera */}
            <div className="mt-8 border-t border-white/10 pt-8">
              <div className="mb-4">
                <p className="font-serif text-lg font-bold text-white">
                  Mapa de Hype — Distribución Geográfica
                </p>
                <p className="mt-1 text-xs text-white/40">
                  Dónde está la demanda latente. Zonas con más interesados anotados.
                </p>
              </div>
              <div className="grid gap-6 lg:grid-cols-3">
                {/* Ranking waitlist */}
                <div className="custom-scrollbar flex max-h-[420px] flex-col gap-2 overflow-y-auto pr-2 lg:col-span-1">
                  {waitlistMapData.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center py-10 text-white/30">
                      <Users size={28} className="mb-2 opacity-40" />
                      <p className="text-sm">Sin datos de provincia</p>
                    </div>
                  ) : (
                    waitlistMapData.map((prov: any, i: number) => (
                      <div
                        key={i}
                        onMouseEnter={() => setHoveredWaitlistProv(prov.name)}
                        onMouseLeave={() => setHoveredWaitlistProv(null)}
                        className="flex cursor-default items-center justify-between rounded-xl border border-white/5 bg-white/5 px-4 py-3 transition-all hover:border-[#AA6F3B]/30 hover:bg-white/10"
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#AA6F3B]/20 text-[10px] font-bold text-[#AA6F3B]">
                            {i + 1}
                          </span>
                          <span className="text-sm font-medium text-white capitalize">
                            {prov.name}
                          </span>
                        </div>
                        <span className="font-mono text-sm font-bold text-white/80">
                          {prov.value}{' '}
                          <span className="text-[10px] font-normal text-white/40 uppercase">
                            anotados
                          </span>
                        </span>
                      </div>
                    ))
                  )}
                </div>

                {/* Mapa waitlist */}
                <div className="h-[420px] overflow-hidden rounded-2xl bg-[#1a1713] lg:col-span-1">
                  <ArgentinaMap
                    data={waitlistMapData}
                    colorRange={['#5a4a35', '#d4a052']}
                    emptyColor="#2a2420"
                    tooltipLabel="anotados"
                    hoveredFromOutside={hoveredWaitlistProv}
                    onHoverChange={(n) => setHoveredWaitlistProv(n)}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

"use client"

import { useEffect, useState, useMemo } from "react"
import { format, parseISO, startOfWeek, startOfMonth } from "date-fns"
import { es } from "date-fns/locale"
import { motion } from "framer-motion"
import { API_BASE_URL } from "@/lib/api"
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
  Info
} from "lucide-react"

// Gráficos Recharts
import {
  AreaChart, Area,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer,
  Legend
} from "recharts"

// Mapas
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps"
import { scaleLinear } from "d3-scale"

type BIStats = {
  revenue: any[]
  funnel: any[]
  avgTicket: number
  topProducts: any[]
  stockAlerts: any[]
  payments: {
    status: any[]
    methods: any[]
  }
  shipping: {
    geoDistribution: any[]
    methods: any[]
    avgShippingCost: number
    funnel: any[]
  }
  clients: {
    top: any[]
    waitlistConversion: any[]
  }
}

const geoUrl = "https://apis.datos.gob.ar/georef/api/v2.0/provincias.geojson"

export default function AnalyticsPage() {
  const [stats, setStats] = useState<BIStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [mapTooltip, setMapTooltip] = useState<string | null>(null)

  // Filtros Globales
  const [dateRange, setDateRange] = useState("all") // histórico completo por defecto
  
  // Filtros Locales
  const [revenueGroup, setRevenueGroup] = useState("day")

  const load = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true)
    else setLoading(true)
    setError(null)

    const token = localStorage.getItem("admin_token")
    
    // Calcular fechas
    const end = new Date()
    const start = new Date()
    if (dateRange !== "all") {
        start.setDate(end.getDate() - parseInt(dateRange))
    } else {
        start.setFullYear(2023) // histórico
    }

    try {
      const res = await fetch(`${API_BASE_URL}/admin/analytics-bi?startDate=${start.toISOString()}&endDate=${end.toISOString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error("Error fetching BI Analytics")
      const data = await res.json()
      setStats(data)
    } catch (e: any) {
      setError(e.message || "No se pudieron cargar las estadísticas")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    load()
  }, [dateRange])

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  // Agrupación local para el gráfico de evolución (Debe ir antes de los early returns por Reglas de Hooks)
  const groupedRevenue = useMemo(() => {
    if (!stats || !stats.revenue) return []
    if (revenueGroup === "day") return stats.revenue

    const groups: Record<string, { date: string, revenue: number, orders: number }> = {}

    stats.revenue.forEach((item) => {
      const parsedDate = parseISO(item.date)
      let key = ""
      let displayDate = ""

      if (revenueGroup === "week") {
        const start = startOfWeek(parsedDate, { weekStartsOn: 1 }) // Lunes
        key = format(start, "yyyy-MM-dd")
        displayDate = `Semana ${format(start, "dd MMM", { locale: es })}`
      } else {
        const start = startOfMonth(parsedDate)
        key = format(start, "yyyy-MM")
        displayDate = format(start, "MMMM yyyy", { locale: es })
      }

      if (!groups[key]) {
        groups[key] = { date: displayDate, revenue: 0, orders: 0 }
      }
      groups[key].revenue += Number(item.revenue)
      groups[key].orders += Number(item.orders)
    })

    return Object.values(groups)
  }, [stats?.revenue, revenueGroup])

  if (loading && !stats) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#AA6F3B] border-t-transparent" />
          <p className="text-sm text-white/40">Analizando el negocio...</p>
        </div>
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-white/40">{error}</p>
        <button onClick={() => load()} className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white/60 hover:text-white">
          Reintentar
        </button>
      </div>
    )
  }

  // --- Procesamiento extra para gráficos ---
  // Ventas globales
  const totalRevenue = stats.revenue.reduce((acc, curr) => acc + Number(curr.revenue || 0), 0)
  const totalOrders = stats.revenue.reduce((acc, curr) => acc + Number(curr.orders || 0), 0)

  // Funnel
  const funnelColors: Record<string, string> = { paid: "#22c55e", pending: "#eab308", failed: "#ef4444", cancelled: "#64748b" }
  
  // Mapa
  const mapData = stats.shipping.geoDistribution.map((p: any) => ({ name: p.provincia.toLowerCase(), value: Number(p.count) }))
  const maxGeo = Math.max(...mapData.map(p => p.value), 1)
  const colorScaleFn = scaleLinear<string>().domain([0, maxGeo]).range(["#1a1511", "#AA6F3B"])

  // Conversión
  const waitData = Array.isArray(stats.clients?.waitlistConversion) ? stats.clients.waitlistConversion[0] : (stats.clients?.waitlistConversion || { total_anotados: 0, total_compraron: 0 })
  const anotados = Number(waitData.total_anotados) || 0
  const compraron = Number(waitData.total_compraron) || 0
  const conversionRate = anotados > 0 ? ((compraron / anotados) * 100).toFixed(1) : "0"
  const pendingToPrepare = stats.shipping.funnel.find(f => f.status === 'pending' || f.status === 'created')?.count || 0

  return (
    <div className="space-y-10 pb-20">
      
      {/* HEADER & STICKY NAVBAR */}
      <div className="sticky top-16 z-20 -mx-4 mb-8 bg-[#0b0a07]/95 px-4 py-4 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 border-b border-white/5 shadow-2xl flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-white">BI Dashboard</h1>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4">
          {/* Scrollspy Menu */}
          <div className="flex items-center gap-1 overflow-x-auto hide-scrollbar bg-white/5 p-1 rounded-xl">
            <button onClick={() => scrollTo("ventas")} className="whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium text-white/60 hover:text-white transition-colors">Ventas</button>
            <button onClick={() => scrollTo("productos")} className="whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium text-white/60 hover:text-white transition-colors">Productos</button>
            <button onClick={() => scrollTo("pagos")} className="whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium text-white/60 hover:text-white transition-colors">Pagos</button>
            <button onClick={() => scrollTo("logistica")} className="whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium text-white/60 hover:text-white transition-colors">Logística</button>
            <button onClick={() => scrollTo("clientes")} className="whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium text-white/60 hover:text-white transition-colors">Clientes</button>
          </div>

          <div className="w-px h-6 bg-white/10 hidden sm:block" />

          {/* Filtros Globales */}
          <div className="flex items-center gap-2">
            <select 
              value={dateRange} 
              onChange={e => setDateRange(e.target.value)}
              className="bg-[#0b0a07] border border-white/10 text-white/80 text-xs rounded-lg px-3 py-2 outline-none focus:border-[#AA6F3B]/50 cursor-pointer"
            >
              <option value="7">Últimos 7 días</option>
              <option value="30">Últimos 30 días</option>
              <option value="90">Últimos 90 días</option>
              <option value="365">Último Año</option>
              <option value="all">Histórico Completo</option>
            </select>

            <button onClick={() => load(true)} disabled={refreshing} className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#AA6F3B]/20 text-[#AA6F3B] hover:bg-[#AA6F3B]/30 transition-colors">
              <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            </button>
          </div>
        </div>
      </div>

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
          <div className="rounded-2xl border border-white/8 bg-white/4 p-5">
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.15em] text-white/40">Facturación</p>
            <p className="font-serif text-3xl font-bold text-green-400">${totalRevenue.toLocaleString("es-AR")}</p>
          </div>
          <div className="rounded-2xl border border-white/8 bg-white/4 p-5">
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.15em] text-white/40">Pedidos Totales</p>
            <p className="font-serif text-3xl font-bold text-white">{totalOrders}</p>
          </div>
          <div className="rounded-2xl border border-white/8 bg-white/4 p-5">
            <div className="flex items-center gap-2 mb-1 group relative">
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-white/40">A Preparar</p>
                <Info size={12} className="text-white/30 cursor-help" />
                <div className="absolute bottom-full mb-2 left-0 hidden w-48 rounded-md bg-[#1a1a1a] p-2 text-xs text-white/80 shadow-xl group-hover:block border border-white/10 z-50">
                    Pedidos que ya fueron pagados y están a la espera de ser armados o despachados.
                </div>
            </div>
            <p className="font-serif text-3xl font-bold text-indigo-400">{pendingToPrepare}</p>
          </div>
          <div className="rounded-2xl border border-white/8 bg-white/4 p-5">
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.15em] text-white/40">Ticket Promedio</p>
            <p className="font-serif text-3xl font-bold text-[#AA6F3B]">${stats.avgTicket.toLocaleString("es-AR", {maximumFractionDigits:0})}</p>
          </div>
          <div className="rounded-2xl border border-white/8 bg-white/4 p-5">
            <div className="flex items-center gap-2 mb-1 group relative">
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-white/40">Tasa de Cierre</p>
                <Info size={12} className="text-white/30 cursor-help" />
                <div className="absolute bottom-full right-0 mb-2 hidden w-48 rounded-md bg-[#1a1a1a] p-2 text-xs text-white/80 shadow-xl group-hover:block border border-white/10 z-50">
                    Porcentaje de carritos que llegaron a pagarse exitosamente vs los que fueron abandonados o fallaron.
                </div>
            </div>
            <p className="font-serif text-3xl font-bold text-blue-400">
              {stats.funnel.length > 0 
                ? ((Number(stats.funnel.find(f => f.status === 'paid')?.count || 0) / stats.funnel.reduce((a,c) => a + Number(c.count), 0)) * 100).toFixed(1)
                : "0"}%
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Gráfico de Evolución */}
          <div className="rounded-2xl border border-white/8 bg-white/4 p-5 lg:col-span-2">
            <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <p className="font-serif text-lg font-bold text-white">Evolución de Ingresos</p>
              <div className="flex w-full sm:w-auto bg-[#0b0a07] border border-white/10 rounded-lg overflow-hidden">
                <button onClick={() => setRevenueGroup("day")} className={`flex-1 sm:flex-none px-3 py-1.5 text-xs font-medium transition-colors ${revenueGroup === "day" ? "bg-[#AA6F3B] text-white" : "text-white/40 hover:text-white"}`}>Días</button>
                <button onClick={() => setRevenueGroup("week")} className={`flex-1 sm:flex-none px-3 py-1.5 text-xs font-medium transition-colors border-l border-white/5 ${revenueGroup === "week" ? "bg-[#AA6F3B] text-white" : "text-white/40 hover:text-white"}`}>Semanas</button>
                <button onClick={() => setRevenueGroup("month")} className={`flex-1 sm:flex-none px-3 py-1.5 text-xs font-medium transition-colors border-l border-white/5 ${revenueGroup === "month" ? "bg-[#AA6F3B] text-white" : "text-white/40 hover:text-white"}`}>Meses</button>
              </div>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={groupedRevenue} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0a" vertical={false} />
                  <XAxis dataKey="date" stroke="#ffffff40" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="left" stroke="#ffffff40" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v.toLocaleString()}`} width={80} />
                  <YAxis yAxisId="right" orientation="right" stroke="#ffffff40" fontSize={12} tickLine={false} axisLine={false} />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: "#0b0a07", borderColor: "#ffffff20", borderRadius: "8px" }}
                    itemStyle={{ color: "#22c55e" }}
                  />
                  <Area yAxisId="left" type="monotone" dataKey="revenue" name="Ingresos" stroke="#22c55e" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                  <Area yAxisId="right" type="step" dataKey="orders" name="Pedidos" stroke="#ffffff40" strokeWidth={2} fillOpacity={0} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Funnel Pedidos */}
          <div className="rounded-2xl border border-white/8 bg-white/4 p-5">
            <div className="flex items-center gap-2 mb-6 group relative">
                <p className="font-serif text-lg font-bold text-white">Embudo de Carritos</p>
                <Info size={16} className="text-white/30 cursor-help" />
                <div className="absolute bottom-full mb-2 left-0 hidden w-56 rounded-md bg-[#1a1a1a] p-3 text-xs text-white/80 shadow-xl group-hover:block border border-white/10 z-50">
                    Compara visualmente la cantidad de carritos iniciados ("pending"), pagados con éxito ("paid") y los que tuvieron errores de tarjeta ("failed").
                </div>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.funnel} layout="vertical" margin={{ top: 0, right: 0, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0a" horizontal={true} vertical={false} />
                  <XAxis type="number" stroke="#ffffff40" fontSize={12} />
                  <YAxis dataKey="status" type="category" stroke="#ffffff40" fontSize={12} width={60} />
                  <RechartsTooltip contentStyle={{ backgroundColor: "#0b0a07", borderColor: "#ffffff20", borderRadius: "8px" }} />
                  <Bar dataKey="count" name="Cantidad" radius={[0, 4, 4, 0]}>
                    {stats.funnel.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={funnelColors[entry.status] || "#AA6F3B"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
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
          <h2 className="font-serif text-2xl font-bold text-white">Rendimiento de Productos e Inventario</h2>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Top Sellers */}
          <div className="rounded-2xl border border-white/8 bg-white/4 p-5">
            <p className="mb-6 font-serif text-lg font-bold text-white">Top Productos Vendidos</p>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.topProducts} layout="vertical" margin={{ top: 0, right: 20, left: 40, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0a" horizontal={true} vertical={false} />
                  <XAxis type="number" stroke="#ffffff40" fontSize={12} />
                  <YAxis dataKey="title" type="category" stroke="#ffffff80" fontSize={11} width={120} />
                  <RechartsTooltip contentStyle={{ backgroundColor: "#0b0a07", borderColor: "#ffffff20", borderRadius: "8px" }} />
                  <Bar dataKey="total_sold" name="Unidades Vendidas" fill="#AA6F3B" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Stock Monitor */}
          <div className="rounded-2xl border border-white/8 bg-white/4 p-5 flex flex-col h-[390px]">
            <div className="flex items-center justify-between mb-4">
              <p className="font-serif text-lg font-bold text-white">Monitor de Stock Crítico</p>
              <AlertTriangle size={18} className="text-yellow-500" />
            </div>
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-2">
              {stats.stockAlerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-white/30">
                  <CheckCircle size={32} className="mb-2 text-green-500/50" />
                  <p>Stock saludable</p>
                </div>
              ) : (
                stats.stockAlerts.map(p => {
                  const isAgotado = p.status === 'agotado' || Number(p.stock) <= 0;
                  const isLow = Number(p.stock) > 0 && Number(p.stock) <= Number(p.limite) + 5;
                  
                  return (
                    <div key={p.id} className={`flex items-center justify-between gap-2 rounded-xl border px-4 py-3 ${isAgotado ? 'border-red-500/20 bg-red-500/5' : isLow ? 'border-yellow-500/20 bg-yellow-500/5' : 'border-white/5 bg-white/5'}`}>
                      <div>
                        <p className="text-sm font-bold text-white">{p.name}</p>
                        <p className="text-xs text-white/40">Status: {p.status}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-lg font-bold ${isAgotado ? 'text-red-400' : 'text-yellow-400'}`}>{p.stock} <span className="text-xs font-normal text-white/40">ud</span></p>
                        <p className="text-xs text-white/30">Límite: {p.limite}</p>
                      </div>
                    </div>
                  )
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
          <div className="rounded-2xl border border-white/8 bg-white/4 p-5 flex flex-col items-center">
            <div className="flex items-center gap-2 mb-2 self-start group relative">
                <p className="font-serif text-lg font-bold text-white">Tasa de Aprobación / Rechazo</p>
                <Info size={16} className="text-white/30 cursor-help" />
                <div className="absolute bottom-full mb-2 left-0 hidden w-64 rounded-md bg-[#1a1a1a] p-3 text-xs text-white/80 shadow-xl group-hover:block border border-white/10 z-50">
                    Muestra qué porcentaje de los intentos de pago en MercadoPago pasan limpio (Approved) frente a los que son rebotados por falta de fondos o seguridad (Rejected).
                </div>
            </div>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.payments.status}
                    dataKey="count"
                    nameKey="status"
                    cx="50%" cy="50%"
                    innerRadius={60} outerRadius={100}
                    paddingAngle={5}
                  >
                    {stats.payments.status.map((entry, index) => {
                      const c = entry.status === 'approved' ? '#22c55e' : entry.status === 'rejected' ? '#ef4444' : '#eab308'
                      return <Cell key={`cell-${index}`} fill={c} />
                    })}
                  </Pie>
                  <RechartsTooltip contentStyle={{ backgroundColor: "#0b0a07", borderColor: "#ffffff20", borderRadius: "8px" }} />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Mix de Medios */}
          <div className="rounded-2xl border border-white/8 bg-white/4 p-5">
            <div className="flex items-center gap-2 mb-6 group relative">
                <p className="font-serif text-lg font-bold text-white">Mix de Medios de Pago</p>
                <Info size={16} className="text-white/30 cursor-help" />
                <div className="absolute bottom-full mb-2 left-0 hidden w-64 rounded-md bg-[#1a1a1a] p-3 text-xs text-white/80 shadow-xl group-hover:block border border-white/10 z-50">
                    Desglosa cómo prefiere pagar tu clientela (por ejemplo, saldo en cuenta, tarjeta de crédito, débito, etc.). Útil para planificar promociones bancarias.
                </div>
            </div>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.payments.methods} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0a" vertical={false} />
                  <XAxis dataKey="payment_method" stroke="#ffffff40" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#ffffff40" fontSize={12} tickLine={false} axisLine={false} />
                  <RechartsTooltip contentStyle={{ backgroundColor: "#0b0a07", borderColor: "#ffffff20", borderRadius: "8px" }} />
                  <Bar dataKey="count" name="Uso" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
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
        <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-4 flex items-center justify-between">
            <div>
                <p className="text-xs text-indigo-200/60 uppercase tracking-widest font-semibold">Costo Promedio Envío</p>
                <p className="text-2xl font-bold text-white">${stats.shipping.avgShippingCost.toLocaleString('es-AR', {maximumFractionDigits: 0})}</p>
            </div>
            <div className="text-right">
                <p className="text-xs text-indigo-200/60 uppercase tracking-widest font-semibold">Proporción vs Ticket</p>
                <p className="text-2xl font-bold text-indigo-400">
                    {stats.avgTicket > 0 ? ((stats.shipping.avgShippingCost / stats.avgTicket) * 100).toFixed(1) : 0}%
                </p>
            </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
            
            {/* Mapa de Calor */}
            <div className="rounded-2xl border border-white/8 bg-white/4 p-5 flex flex-col h-[500px] relative overflow-hidden lg:col-span-2">
                <div className="z-10 mb-2">
                    <p className="font-serif text-lg font-bold text-white">Demanda Logística por Provincia</p>
                    <p className="text-xs text-white/40">Zonas de mayor concentración de envíos (pagados)</p>
                </div>
                
                <div className="relative flex-1 -mx-5 bg-[#080705]">
                    {mapTooltip && (
                    <div className="absolute top-4 right-4 z-20 rounded-lg border border-white/10 bg-[#0b0a07]/90 px-4 py-2 backdrop-blur-md shadow-xl pointer-events-none">
                        <p className="text-sm font-bold text-white">{mapTooltip}</p>
                    </div>
                    )}
                    <ComposableMap projection="geoMercator" projectionConfig={{ scale: 850, center: [-65, -38] }} className="w-full h-full outline-none">
                        <ZoomableGroup center={[-65, -38]} zoom={1} minZoom={1} maxZoom={4}>
                            <Geographies geography={geoUrl}>
                                {({ geographies }) =>
                                    geographies.map((geo) => {
                                        const geoName = geo.properties.nombre ? geo.properties.nombre.toLowerCase() : ""
                                        const d = mapData.find((s) => s.name.includes(geoName) || geoName.includes(s.name))
                                        return (
                                            <Geography
                                                key={geo.rsmKey}
                                                geography={geo}
                                                fill={d ? colorScaleFn(d.value) : "#ffffff0a"}
                                                stroke="#1a1a1a"
                                                strokeWidth={0.5}
                                                onMouseEnter={() => {
                                                    setMapTooltip(`${geo.properties.nombre}: ${d ? d.value : 0} pedidos`)
                                                }}
                                                onMouseLeave={() => setMapTooltip(null)}
                                                style={{
                                                    default: { outline: "none", transition: "all 250ms" },
                                                    hover: { fill: "#AA6F3B", outline: "none", cursor: "pointer", transition: "all 250ms" },
                                                    pressed: { outline: "none" },
                                                }}
                                            />
                                        )
                                    })
                                }
                            </Geographies>
                        </ZoomableGroup>
                    </ComposableMap>
                </div>
            </div>

            {/* Lista Scrolleable de Provincias */}
            <div className="rounded-2xl border border-white/8 bg-white/4 p-5 flex flex-col h-[500px] lg:col-span-1">
                <div className="mb-4">
                  <p className="font-serif text-lg font-bold text-white">Ranking por Provincia</p>
                  <p className="text-xs text-white/40">Listado exacto de demanda</p>
                </div>
                
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    {stats.shipping.geoDistribution.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-white/30">
                            <MapPin size={32} className="mb-2 text-white/20" />
                            <p className="text-sm">Sin datos para este rango</p>
                        </div>
                    ) : (
                        <ul className="space-y-2">
                            {stats.shipping.geoDistribution.map((prov, i) => (
                                <li key={i} className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3 border border-white/5 hover:bg-white/10 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#AA6F3B]/20 text-xs font-bold text-[#AA6F3B]">
                                            {i + 1}
                                        </span>
                                        <span className="text-sm font-medium text-white">{prov.provincia || "Desconocida"}</span>
                                    </div>
                                    <span className="text-sm font-bold text-white/80">{prov.count} <span className="text-xs font-normal text-white/40">envíos</span></span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

        </div>

        <div className="grid gap-6 lg:grid-cols-2">
            
            {/* Funnel Logistico */}
            <div className="rounded-2xl border border-white/8 bg-white/4 p-5">
                <div className="flex items-center gap-2 mb-4 group relative">
                    <p className="font-serif text-lg font-bold text-white">Estado del Embudo de Envíos</p>
                    <Info size={16} className="text-white/30 cursor-help" />
                    <div className="absolute bottom-full mb-2 left-0 hidden w-64 rounded-md bg-[#1a1a1a] p-3 text-xs text-white/80 shadow-xl group-hover:block border border-white/10 z-50">
                        Te permite detectar cuellos de botella logísticos mostrando cuántos pedidos siguen pendientes de armar, cuántos tienen etiqueta creada y cuántos están ya en tránsito.
                    </div>
                </div>
                <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.shipping.funnel} layout="vertical" margin={{ top: 0, right: 20, left: 20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0a" horizontal={true} vertical={false} />
                                <XAxis type="number" stroke="#ffffff40" fontSize={12} />
                                <YAxis dataKey="status" type="category" stroke="#ffffff80" fontSize={11} width={80} />
                                <RechartsTooltip contentStyle={{ backgroundColor: "#0b0a07", borderColor: "#ffffff20", borderRadius: "8px" }} />
                                <Bar dataKey="count" name="Paquetes" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={24} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

            {/* Proporción de Entrega */}
            <div className="rounded-2xl border border-white/8 bg-white/4 p-5">
                <div className="flex items-center gap-2 mb-4 group relative">
                    <p className="font-serif text-lg font-bold text-white">Proporción de Entrega</p>
                    <Info size={16} className="text-white/30 cursor-help" />
                    <div className="absolute bottom-full mb-2 left-0 hidden w-64 rounded-md bg-[#1a1a1a] p-3 text-xs text-white/80 shadow-xl group-hover:block border border-white/10 z-50">
                        Compara la cantidad de gente que prefiere retirar en un punto logístico o sucursal vs los que prefieren el envío a domicilio.
                    </div>
                </div>
                <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={stats.shipping.methods} dataKey="count" nameKey="service_type" cx="50%" cy="50%" outerRadius={90} paddingAngle={2}>
                                {stats.shipping.methods.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#6366f1' : '#8b5cf6'} />
                                ))}
                            </Pie>
                            <RechartsTooltip contentStyle={{ backgroundColor: "#0b0a07", borderColor: "#ffffff20", borderRadius: "8px" }} />
                            <Legend verticalAlign="bottom" height={36} />
                        </PieChart>
                    </ResponsiveContainer>
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
            <div className="rounded-2xl border border-white/8 bg-gradient-to-br from-[#AA6F3B]/10 to-transparent p-6 lg:col-span-1 flex flex-col justify-center">
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#AA6F3B] mb-2">Hype vs Realidad</p>
                <h3 className="font-serif text-xl font-bold text-white mb-6">Conversión de Lista de Espera</h3>
                
                <div className="space-y-4">
                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                        <span className="text-white/60 text-sm">Total Anotados</span>
                        <span className="text-white font-bold">{anotados}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                        <span className="text-white/60 text-sm">Convirtieron a Venta</span>
                        <span className="text-green-400 font-bold">{compraron}</span>
                    </div>
                    <div className="pt-4 text-center">
                        <span className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#AA6F3B] to-[#d98c4a]">
                            {conversionRate}%
                        </span>
                        <p className="text-xs text-white/40 mt-2">de los inscritos abrieron la billetera</p>
                    </div>
                </div>
            </div>

            {/* Top Clientes Recurrentes */}
            <div className="rounded-2xl border border-white/8 bg-white/4 p-5 lg:col-span-2 flex flex-col h-[400px]">
                <div className="mb-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-white/40">Fidelización</p>
                  <p className="font-serif text-lg font-bold text-white">Top Clientes Recurrentes</p>
                </div>
                
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    <table className="w-full text-left text-sm text-white/80">
                        <thead className="sticky top-0 bg-[#12100d] text-xs uppercase text-white/40 border-b border-white/10 z-10">
                            <tr>
                                <th className="px-4 py-3">Nombre</th>
                                <th className="px-4 py-3 hidden sm:table-cell">Email</th>
                                <th className="px-4 py-3 text-center">Pedidos</th>
                                <th className="px-4 py-3 text-right">LTV (Gastado)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.clients.top.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="text-center py-10 text-white/30">Sin clientes suficientes</td>
                                </tr>
                            ) : (
                                stats.clients.top.map((client, i) => (
                                    <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                        <td className="px-4 py-3 font-medium text-white">{client.nombre_cliente}</td>
                                        <td className="px-4 py-3 hidden sm:table-cell text-white/40">{client.email_cliente}</td>
                                        <td className="px-4 py-3 text-center text-[#AA6F3B] font-bold">{client.orders_count}</td>
                                        <td className="px-4 py-3 text-right text-green-400">${Number(client.total_spent).toLocaleString('es-AR')}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>

      </section>

    </div>
  )
}

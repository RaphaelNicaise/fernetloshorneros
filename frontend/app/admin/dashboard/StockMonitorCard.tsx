"use client"

import { useEffect, useState, useMemo } from "react"
import { API_BASE_URL } from "@/lib/api"
import { Package, Layers } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type Product = {
  id: string
  name: string
  description?: string
  price: number
  image?: string
  stock: number
  status: "disponible" | "proximamente" | "agotado"
}

function getImageSrc(src?: string) {
  if (!src) return ""
  if (src.startsWith("http://") || src.startsWith("https://")) return src
  if (src.startsWith("/uploads/")) return src
  return src
}

export function StockMonitorCard() {
  const [products, setProducts] = useState<Product[]>([])
  const [reservedStock, setReservedStock] = useState<Record<string, number>>({})
  const [selectedProductId, setSelectedProductId] = useState<string>("all")
  const [loading, setLoading] = useState(true)

  const loadStockData = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null
      const [resProd, resReserved] = await Promise.all([
        fetch(`${API_BASE_URL}/products`, { cache: 'no-store' }),
        fetch(`${API_BASE_URL}/products/reserved-stock`, {
          cache: 'no-store',
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        }).catch(() => null),
      ])

      if (resProd.ok) {
        const prodData: Product[] = await resProd.json()
        setProducts(prodData)
      }

      if (resReserved && resReserved.ok) {
        const reservedData = await resReserved.json()
        setReservedStock(reservedData)
      } else {
        setReservedStock({})
      }
    } catch {
      // Ignorar errores transitorios
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStockData()
    const interval = setInterval(loadStockData, 5000)
    return () => clearInterval(interval)
  }, [])

  const selectedProduct = useMemo(() => {
    if (selectedProductId === "all") return null
    return products.find((p) => p.id === selectedProductId) || null
  }, [products, selectedProductId])

  return (
    <div className="flex flex-col rounded-2xl border border-white/8 bg-[#14120e] p-5 shadow-xl min-w-0">
      {/* Header */}
      <div className="mb-4 flex flex-col gap-3 border-b border-white/6 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#AA6F3B]/15 text-[#AA6F3B]">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-serif text-lg font-bold text-white">Control de Stock</h2>
            <p className="text-xs text-white/40">Total físico, reservado y disponible</p>
          </div>
        </div>

        {/* Dropdown Selector */}
        <div className="w-full sm:w-56">
          <Select value={selectedProductId} onValueChange={setSelectedProductId}>
            <SelectTrigger className="w-full border-white/10 bg-white/5 text-xs text-white focus:ring-[#AA6F3B]/50">
              <SelectValue placeholder="Seleccionar producto" />
            </SelectTrigger>
            <SelectContent className="border-white/10 bg-[#0f0d0a] text-white">
              <SelectItem value="all" className="text-xs font-medium text-white hover:bg-white/10">
                📦 Todos los productos
              </SelectItem>
              {products.map((p) => (
                <SelectItem key={p.id} value={p.id} className="text-xs text-white/90 hover:bg-white/10">
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Content Area */}
      <div className="h-[520px] overflow-y-auto pr-1">
        {loading ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-white/40">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#AA6F3B] border-t-transparent" />
            <span className="text-xs">Cargando stock...</span>
          </div>
        ) : selectedProduct ? (
          /* Single Product View */
          <div className="space-y-4">
            {/* Product card info */}
            <div className="flex items-center gap-3.5 rounded-xl border border-white/5 bg-white/[0.02] p-4">
              {selectedProduct.image ? (
                <img
                  src={getImageSrc(selectedProduct.image)}
                  alt={selectedProduct.name}
                  className="h-14 w-14 rounded-lg object-cover border border-white/10"
                />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-white/5 bg-white/5 text-white/30">
                  <Package className="h-6 w-6" />
                </div>
              )}
              <div className="min-w-0">
                <span className="font-mono text-[11px] text-white/40">{selectedProduct.id}</span>
                <h3 className="truncate text-base font-semibold text-white">{selectedProduct.name}</h3>
                <p className="text-xs text-[#AA6F3B] font-mono">
                  {selectedProduct.price.toLocaleString("es-AR", { style: "currency", currency: "ARS" })}
                </p>
              </div>
            </div>

            {/* 3 Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Total */}
              <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4 text-center">
                <span className="text-xs font-medium uppercase tracking-wider text-white/50">Total</span>
                <div className="my-1.5 font-mono text-3xl font-bold text-white">
                  {selectedProduct.stock + (reservedStock[selectedProduct.id] || 0)}
                </div>
                <span className="text-[11px] text-white/40">Físico en depósito</span>
              </div>

              {/* Reservado */}
              <div className="rounded-xl border border-[#AA6F3B]/30 bg-[#AA6F3B]/10 p-4 text-center">
                <span className="text-xs font-medium uppercase tracking-wider text-[#AA6F3B]">Reservado</span>
                <div className="my-1.5 font-mono text-3xl font-bold text-[#AA6F3B]">
                  {reservedStock[selectedProduct.id] || 0}
                </div>
                <span className="text-[11px] text-white/40">Carritos pendientes</span>
              </div>

              {/* Disponible */}
              <div className={`rounded-xl border p-4 text-center ${
                selectedProduct.stock > 0
                  ? 'border-emerald-500/30 bg-emerald-500/10'
                  : 'border-red-500/30 bg-red-500/10'
              }`}>
                <span className={`text-xs font-medium uppercase tracking-wider ${
                  selectedProduct.stock > 0 ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  Disponible
                </span>
                <div className={`my-1.5 font-mono text-3xl font-bold ${
                  selectedProduct.stock > 0 ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {selectedProduct.stock}
                </div>
                <span className="text-[11px] text-white/40">Listo para vender</span>
              </div>
            </div>
          </div>
        ) : (
          /* All Products List View */
          <div className="space-y-2">
            <div className="flex items-center justify-between px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/40 border-b border-white/5">
              <span>Producto</span>
              <span>Total / Res / Disp</span>
            </div>

            {products.map((p) => {
              const res = reservedStock[p.id] || 0
              const disp = p.stock
              const total = disp + res

              return (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] p-3 transition-colors hover:bg-white/[0.04]"
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    {p.image ? (
                      <img
                        src={getImageSrc(p.image)}
                        alt={p.name}
                        className="h-10 w-10 rounded-lg object-cover border border-white/10 shrink-0"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/5 bg-white/5 text-white/30 shrink-0">
                        <Package className="h-4 w-4" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white/90">{p.name}</p>
                      <p className="font-mono text-[11px] text-white/40">{p.id}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 font-mono text-sm shrink-0">
                    <span className="font-semibold text-white" title="Total">{total}</span>
                    <span className="text-white/20">|</span>
                    <span className="font-semibold text-[#AA6F3B]" title="Reservado">{res}</span>
                    <span className="text-white/20">|</span>
                    <span
                      className={`font-semibold ${disp > 0 ? 'text-emerald-400' : 'text-red-400'}`}
                      title="Disponible"
                    >
                      {disp}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

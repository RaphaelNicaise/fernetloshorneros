'use client';

import { useEffect, useState } from 'react';
import { API_BASE_URL } from '@/lib/api';
import { Layers, Package, AlertTriangle } from 'lucide-react';

type Product = {
  id: string;
  name: string;
  price: number;
  image?: string;
  stock: number;
  status: 'disponible' | 'proximamente' | 'agotado';
};

function getImageSrc(src?: string) {
  if (!src) return '';
  return src;
}

export function StockMonitorCard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [reservedStock, setReservedStock] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const loadStockData = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
      const [resProd, resReserved] = await Promise.all([
        fetch(`${API_BASE_URL}/products`, { cache: 'no-store' }),
        fetch(`${API_BASE_URL}/products/reserved-stock`, {
          cache: 'no-store',
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        }).catch(() => null),
      ]);

      if (resProd.ok) {
        const prodData: Product[] = await resProd.json();
        setProducts(prodData);
      }

      if (resReserved && resReserved.ok) {
        const reservedData = await resReserved.json();
        setReservedStock(reservedData);
      } else {
        setReservedStock({});
      }
    } catch {
      // Ignorar errores transitorios
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStockData();

    let interval = setInterval(loadStockData, 5000);

    const handleVisibilityChange = () => {
      if (document.hidden) {
        clearInterval(interval);
      } else {
        loadStockData();
        interval = setInterval(loadStockData, 5000);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return (
    <div className="flex flex-col rounded-2xl border border-white/8 bg-[#14120e] p-5 shadow-xl min-w-0">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between border-b border-white/6 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#AA6F3B]/15 text-[#AA6F3B]">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-serif text-lg font-bold text-white">Control de Stock</h2>
            <p className="text-xs text-white/40">Físico, reservado y disponible</p>
          </div>
        </div>
        <span className="rounded-full bg-white/5 px-2.5 py-1 font-mono text-[11px] text-white/50">
          {products.length} {products.length === 1 ? 'producto' : 'productos'}
        </span>
      </div>

      {/* Content Area */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex h-44 flex-col items-center justify-center gap-2 text-white/40">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#AA6F3B] border-t-transparent" />
            <span className="text-xs">Cargando inventario...</span>
          </div>
        ) : products.length === 0 ? (
          <div className="flex h-36 flex-col items-center justify-center text-center text-white/40">
            <Package className="mb-1 h-6 w-6 text-white/20" />
            <p className="text-xs">No hay productos registrados</p>
          </div>
        ) : (
          products.map((p) => {
            const res = reservedStock[p.id] || 0;
            const disp = p.stock;
            const total = disp + res;
            const isCritical = disp <= 0;

            return (
              <div
                key={p.id}
                className={`rounded-xl border p-3.5 transition-colors ${
                  isCritical ? 'border-red-500/30 bg-red-500/5' : 'border-white/5 bg-white/[0.02]'
                }`}
              >
                {/* Product Title and Price */}
                <div className="mb-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {p.image ? (
                      <img
                        src={getImageSrc(p.image)}
                        alt={p.name}
                        className="h-9 w-9 rounded-lg border border-white/10 object-cover shrink-0"
                      />
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/5 bg-white/5 text-white/30 shrink-0">
                        <Package className="h-4 w-4" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-white/95">{p.name}</p>
                      <p className="font-mono text-[10px] text-white/40">{p.id}</p>
                    </div>
                  </div>

                  {isCritical && (
                    <span className="flex items-center gap-1 rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-red-400">
                      <AlertTriangle className="h-3 w-3" /> Agotado
                    </span>
                  )}
                </div>

                {/* 3 Metric Pills */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg border border-white/5 bg-white/[0.02] p-1.5">
                    <span className="text-[10px] uppercase text-white/40">Total</span>
                    <div className="font-mono text-sm font-bold text-white">{total}</div>
                  </div>

                  <div className="rounded-lg border border-[#AA6F3B]/20 bg-[#AA6F3B]/10 p-1.5">
                    <span className="text-[10px] uppercase text-[#AA6F3B]/80">Reservado</span>
                    <div className="font-mono text-sm font-bold text-[#AA6F3B]">{res}</div>
                  </div>

                  <div
                    className={`rounded-lg border p-1.5 ${
                      disp > 0
                        ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                        : 'border-red-500/20 bg-red-500/10 text-red-400'
                    }`}
                  >
                    <span className="text-[10px] uppercase opacity-75">Disponible</span>
                    <div className="font-mono text-sm font-bold">{disp}</div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

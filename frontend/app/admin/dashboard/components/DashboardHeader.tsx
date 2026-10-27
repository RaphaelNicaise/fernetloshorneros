'use client';

import React from 'react';
import { ScopeType, ActiveLoteInfo } from '../types';
import { RotateCw, MapPin, Tag } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface DashboardHeaderProps {
  scope: ScopeType;
  onScopeChange: (scope: ScopeType) => void;
  activeLote: ActiveLoteInfo | null;
  onOpenMap: () => void;
  onRefresh: () => void;
  loading: boolean;
  lastUpdated: Date | null;
}

export function DashboardHeader({
  scope,
  onScopeChange,
  activeLote,
  onOpenMap,
  onRefresh,
  loading,
  lastUpdated,
}: DashboardHeaderProps) {
  const formatLastUpdated = (d: Date | null) => {
    if (!d) return '';
    return new Intl.DateTimeFormat('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(d);
  };

  return (
    <div className="flex flex-col gap-4 border-b border-white/8 pb-5 lg:flex-row lg:items-center lg:justify-between">
      {/* Title & Lote Info */}
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-serif text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Dashboard
          </h1>
          {activeLote ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#AA6F3B]/30 bg-[#AA6F3B]/10 px-3 py-0.5 text-xs font-medium text-[#AA6F3B]">
              <Tag className="h-3.5 w-3.5" />
              {activeLote.nombre}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-0.5 text-xs font-medium text-white/50">
              Sin lote activo
            </span>
          )}
        </div>
        <p className="text-xs text-white/50">
          Monitoreo operativo y métricas consolidadas en tiempo real
        </p>
      </div>

      {/* Controls & Actions */}
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Scope Selector */}
        <div className="w-48">
          <Select value={scope} onValueChange={(val) => onScopeChange(val as ScopeType)}>
            <SelectTrigger className="h-9 border-white/10 bg-[#14120e] text-xs text-white focus:ring-[#AA6F3B]/50">
              <SelectValue placeholder="Alcance temporal" />
            </SelectTrigger>
            <SelectContent className="border-white/10 bg-[#0f0d0a] text-white">
              <SelectItem value="lote" className="text-xs text-white/90 hover:bg-white/10">
                Lote Actual (Lanzamiento)
              </SelectItem>
              <SelectItem value="today" className="text-xs text-white/90 hover:bg-white/10">
                Hoy (Últimas 24 hs)
              </SelectItem>
              <SelectItem value="all" className="text-xs text-white/90 hover:bg-white/10">
                Histórico Completo
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Open Map Button */}
        <button
          type="button"
          onClick={onOpenMap}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 text-xs font-medium text-white/90 transition-colors hover:border-white/20 hover:bg-white/10"
        >
          <MapPin className="h-3.5 w-3.5 text-[#AA6F3B]" />
          Mapa de Envíos
        </button>

        {/* Sync Status & Refresh */}
        <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#14120e] px-2.5 py-1">
          <span className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            En vivo
          </span>
          {lastUpdated && (
            <span className="font-mono text-[10px] text-white/40">
              {formatLastUpdated(lastUpdated)}
            </span>
          )}
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            title="Refrescar datos"
            className="rounded p-1 text-white/50 transition-colors hover:text-white disabled:opacity-40"
          >
            <RotateCw className={`h-3 w-3 ${loading ? 'animate-spin text-[#AA6F3B]' : ''}`} />
          </button>
        </div>
      </div>
    </div>
  );
}

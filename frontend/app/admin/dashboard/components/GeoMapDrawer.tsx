'use client';

import React, { useMemo, useState } from 'react';
import { GeoDistributionItem } from '../types';
import ArgentinaMap from '@/components/ArgentinaMap';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { MapPin } from 'lucide-react';

interface GeoMapDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  geoDistribution: GeoDistributionItem[];
}

export function GeoMapDrawer({ open, onOpenChange, geoDistribution }: GeoMapDrawerProps) {
  const [hoveredProvincia, setHoveredProvincia] = useState<string | null>(null);

  const mapData = useMemo(() => {
    return geoDistribution.map((item) => ({
      name: item.provincia,
      value: item.bottles,
    }));
  }, [geoDistribution]);

  const totalBottles = useMemo(
    () => geoDistribution.reduce((acc, curr) => acc + curr.bottles, 0),
    [geoDistribution]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl border-white/10 bg-[#14120e] text-white">
        <DialogHeader className="border-b border-white/8 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#AA6F3B]/15 text-[#AA6F3B]">
              <MapPin className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="font-serif text-lg font-bold text-white">
                Distribución Geográfica de Envíos
              </DialogTitle>
              <DialogDescription className="text-xs text-white/50">
                Concentración de pedidos y botellas enviadas por provincia
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-6 pt-2 md:grid-cols-12">
          {/* Map Column */}
          <div className="flex h-[380px] w-full flex-col items-center justify-center rounded-xl border border-white/5 bg-black/20 p-2 md:col-span-5">
            {mapData.length > 0 ? (
              <ArgentinaMap
                data={mapData}
                colorRange={['#c8a97a', '#7a3e0f']}
                emptyColor="#221e1a"
                tooltipLabel="botellas"
                hoveredFromOutside={hoveredProvincia}
                onHoverChange={setHoveredProvincia}
              />
            ) : (
              <p className="text-xs text-white/40">Sin datos de envíos para este período</p>
            )}
          </div>

          {/* Ranking Column */}
          <div className="flex flex-col md:col-span-7">
            <div className="mb-2 flex items-center justify-between border-b border-white/5 pb-2 text-xs font-semibold uppercase tracking-wider text-white/40">
              <span>Provincia</span>
              <span>Pedidos | Botellas</span>
            </div>

            <div className="max-h-[340px] space-y-1.5 overflow-y-auto pr-1">
              {geoDistribution.length === 0 ? (
                <div className="flex h-32 items-center justify-center text-xs text-white/40">
                  No se registraron envíos en este período
                </div>
              ) : (
                geoDistribution.map((item, idx) => {
                  const percentage =
                    totalBottles > 0 ? Math.round((item.bottles / totalBottles) * 100) : 0;
                  const isHovered =
                    hoveredProvincia !== null &&
                    hoveredProvincia.toLowerCase().trim() === item.provincia.toLowerCase().trim();

                  return (
                    <div
                      key={item.provincia}
                      onMouseEnter={() => setHoveredProvincia(item.provincia)}
                      onMouseLeave={() => setHoveredProvincia(null)}
                      className={`flex items-center justify-between rounded-lg border p-2.5 transition-colors ${
                        isHovered
                          ? 'border-[#AA6F3B]/50 bg-white/[0.06]'
                          : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.04]'
                      }`}
                    >
                      <div className="min-w-0 flex-1 pr-3">
                        <div className="flex items-center gap-2">
                          <span className="shrink-0 font-mono text-xs text-white/40">#{idx + 1}</span>
                          <span className="text-xs font-medium text-white/95 leading-tight whitespace-normal">
                            {item.provincia}
                          </span>
                        </div>
                        <div className="mt-1 h-1 w-24 overflow-hidden rounded-full bg-white/5">
                          <div
                            className="h-full bg-[#AA6F3B]"
                            style={{ width: `${Math.min(percentage, 100)}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-2 font-mono text-xs">
                        <span className="text-white/60">{item.count} ped.</span>
                        <span className="text-white/20">|</span>
                        <span className="font-semibold text-white">{item.bottles} bot.</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default GeoMapDrawer;

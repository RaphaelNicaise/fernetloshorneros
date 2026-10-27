"use client"

import React, { useState, useEffect } from "react"
import { campaignsApi, Campaign } from "@/lib/campaigns-api"
import { Button } from "@/components/ui/button"
import { Eye, RefreshCw } from "lucide-react"

interface CampaignsListProps {
  onSelectCampaign: (id: number) => void
}

export function CampaignsList({ onSelectCampaign }: CampaignsListProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    setLoading(true)
    try {
      const data = await campaignsApi.getCampaigns(1, 50)
      setCampaigns(data.campaigns)
    } catch (e) {
      console.error("Error loading campaigns", e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const getStatusBadge = (estado: Campaign['estado']) => {
    switch (estado) {
      case 'procesando':
        return <span className="px-2 py-0.5 rounded text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20">En curso</span>
      case 'completada':
        return <span className="px-2 py-0.5 rounded text-xs bg-green-500/10 text-green-400 border border-green-500/20">Completada</span>
      case 'pausada':
        return <span className="px-2 py-0.5 rounded text-xs bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">Pausada</span>
      case 'cancelada':
        return <span className="px-2 py-0.5 rounded text-xs bg-red-500/10 text-red-400 border border-red-500/20">Cancelada</span>
      default:
        return <span className="px-2 py-0.5 rounded text-xs bg-white/10 text-white/60">En cola</span>
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-white">Historial de Campañas</h2>
          <p className="text-xs text-white/50">Registro completo de todos los envíos masivos y su estado</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData} className="border-white/10 text-white hover:bg-white/10">
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      <div className="bg-[#14120f] border border-white/10 rounded-xl overflow-hidden">
        {loading && campaigns.length === 0 ? (
          <div className="p-8 text-center text-white/40">Cargando campañas...</div>
        ) : campaigns.length === 0 ? (
          <div className="p-8 text-center text-white/40">No hay campañas registradas todavía.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-[#0b0a07] text-white/50 text-xs">
                  <th className="p-4">Campaña</th>
                  <th className="p-4">Plantilla / Asunto</th>
                  <th className="p-4">Estado</th>
                  <th className="p-4">Progreso</th>
                  <th className="p-4">Fecha</th>
                  <th className="p-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {campaigns.map((c) => {
                  const sent = c.enviados_count || 0
                  const failed = c.fallidos_count || 0
                  const total = c.total_destinatarios || 0
                  const percent = total > 0 ? Math.round(((sent + failed) / total) * 100) : 0

                  return (
                    <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-4 font-medium text-white">
                        <div>#{c.id} {c.nombre}</div>
                        <div className="text-xs text-white/40">{c.creado_por}</div>
                      </td>
                      <td className="p-4">
                        <div className="text-white/80">{c.asunto}</div>
                        <div className="text-xs text-[#AA6F3B]">{c.template_key}</div>
                      </td>
                      <td className="p-4">{getStatusBadge(c.estado)}</td>
                      <td className="p-4">
                        <div className="text-xs text-white/70 mb-1">
                          {sent} / {total} {failed > 0 && <span className="text-red-400">({failed} fallidos)</span>}
                        </div>
                        <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-[#AA6F3B]" style={{ width: `${percent}%` }} />
                        </div>
                      </td>
                      <td className="p-4 text-xs text-white/50">
                        {new Date(c.created_at).toLocaleDateString('es-AR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="p-4 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onSelectCampaign(c.id)}
                          className="border-white/10 text-white hover:bg-white/10 hover:border-[#AA6F3B]/50"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          Monitoreo
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

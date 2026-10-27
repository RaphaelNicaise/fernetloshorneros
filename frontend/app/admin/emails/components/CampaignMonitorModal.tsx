"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import { campaignsApi, Campaign, CampaignRecipientLog } from "@/lib/campaigns-api"
import { Button } from "@/components/ui/button"
import { Play, Pause, XCircle, RefreshCw } from "lucide-react"

interface CampaignMonitorModalProps {
  campaignId: number
  onClose: () => void
}

export function CampaignMonitorModal({ campaignId, onClose }: CampaignMonitorModalProps) {
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [logs, setLogs] = useState<CampaignRecipientLog[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [autoScroll, setAutoScroll] = useState(true)
  const logsContainerRef = useRef<HTMLDivElement>(null)

  const fetchStatus = useCallback(async () => {
    try {
      const data = await campaignsApi.getCampaignById(campaignId)
      setCampaign(data)
      const logsData = await campaignsApi.getCampaignLogs(campaignId, 1, 60)
      setLogs(logsData.logs)
    } catch (e) {
      console.error("Error fetching campaign monitor data", e)
    } finally {
      setLoading(false)
    }
  }, [campaignId])

  useEffect(() => {
    fetchStatus()
    const pollRate = campaign && ['completada', 'cancelada'].includes(campaign.estado) ? 10000 : 2500
    const interval = setInterval(() => {
      fetchStatus()
    }, pollRate)
    return () => clearInterval(interval)
  }, [fetchStatus, campaign?.estado])

  useEffect(() => {
    if (autoScroll && logsContainerRef.current) {
      logsContainerRef.current.scrollTop = 0
    }
  }, [logs, autoScroll])

  const handlePause = async () => {
    setActionLoading(true)
    try {
      await campaignsApi.pauseCampaign(campaignId)
      await fetchStatus()
    } finally {
      setActionLoading(false)
    }
  }

  const handleResume = async () => {
    setActionLoading(true)
    try {
      await campaignsApi.resumeCampaign(campaignId)
      await fetchStatus()
    } finally {
      setActionLoading(false)
    }
  }

  const handleCancel = async () => {
    if (!confirm("¿Seguro que deseas cancelar los envíos pendientes restantes?")) return
    setActionLoading(true)
    try {
      await campaignsApi.cancelCampaign(campaignId)
      await fetchStatus()
    } finally {
      setActionLoading(false)
    }
  }

  const handleRetryFailed = async () => {
    setActionLoading(true)
    try {
      await campaignsApi.retryFailed(campaignId)
      await fetchStatus()
    } finally {
      setActionLoading(false)
    }
  }

  if (loading && !campaign) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
        <div className="bg-[#14120f] border border-white/10 rounded-xl p-8 text-white flex items-center gap-3">
          <RefreshCw className="w-5 h-5 animate-spin text-[#AA6F3B]" />
          <span>Cargando monitor de campaña...</span>
        </div>
      </div>
    )
  }

  const total = campaign?.total_destinatarios || 0
  const enviados = campaign?.enviados_count || 0
  const fallidos = campaign?.fallidos_count || 0
  const pendientes = Math.max(0, total - enviados - fallidos)
  const percent = total > 0 ? Math.min(100, Math.round(((enviados + fallidos) / total) * 100)) : 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="bg-[#14120f] border border-white/10 rounded-xl max-w-4xl w-full flex flex-col max-h-[90vh] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-[#0b0a07]">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-0.5 rounded uppercase font-semibold tracking-wider bg-[#AA6F3B]/20 text-[#AA6F3B] border border-[#AA6F3B]/30">
                {campaign?.estado}
              </span>
              <h2 className="text-lg font-bold text-white">{campaign?.nombre}</h2>
            </div>
            <p className="text-xs text-white/50 mt-1">Asunto: {campaign?.asunto}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="text-white/60 hover:text-white">
            ✕
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-white/70">
              <span>Progreso general</span>
              <span className="font-semibold text-white">{percent}% ({enviados + fallidos} de {total})</span>
            </div>
            <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden border border-white/10">
              <div 
                className="h-full bg-gradient-to-r from-[#AA6F3B] to-[#dfa84a] transition-all duration-500" 
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>

          {/* Metric KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white/5 border border-white/10 rounded-lg p-3 text-center">
              <span className="text-xs text-white/50 block">Total</span>
              <span className="text-xl font-bold text-white">{total}</span>
            </div>
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-center">
              <span className="text-xs text-green-400 block">Enviados</span>
              <span className="text-xl font-bold text-green-400">{enviados}</span>
            </div>
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-center">
              <span className="text-xs text-yellow-400 block">Pendientes</span>
              <span className="text-xl font-bold text-yellow-400">{pendientes}</span>
            </div>
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-center">
              <span className="text-xs text-red-400 block">Fallidos</span>
              <span className="text-xl font-bold text-red-400">{fallidos}</span>
            </div>
          </div>

          {/* Action Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0b0a07] p-3 rounded-lg border border-white/5">
            <div className="flex items-center gap-2">
              {campaign?.estado === 'procesando' && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={handlePause} 
                  disabled={actionLoading}
                  className="border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10"
                >
                  <Pause className="w-4 h-4 mr-1.5" /> Pausar
                </Button>
              )}
              {campaign?.estado === 'pausada' && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={handleResume} 
                  disabled={actionLoading}
                  className="border-green-500/30 text-green-400 hover:bg-green-500/10"
                >
                  <Play className="w-4 h-4 mr-1.5" /> Reanudar
                </Button>
              )}
              {['en_cola', 'procesando', 'pausada'].includes(campaign?.estado || '') && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={handleCancel} 
                  disabled={actionLoading}
                  className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                >
                  <XCircle className="w-4 h-4 mr-1.5" /> Cancelar Restantes
                </Button>
              )}
              {fallidos > 0 && (
                <Button 
                  size="sm" 
                  onClick={handleRetryFailed} 
                  disabled={actionLoading}
                  className="bg-[#AA6F3B] hover:bg-[#AA6F3B]/90 text-white"
                >
                  <RefreshCw className="w-4 h-4 mr-1.5" /> Reintentar {fallidos} Fallidos
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-white/50">
              <RefreshCw className={`w-3.5 h-3.5 ${campaign?.estado === 'procesando' ? 'animate-spin text-[#AA6F3B]' : ''}`} />
              <span>Actualización en vivo cada 2.5s</span>
            </div>
          </div>

          {/* Live Logs Console */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h3 className="text-xs uppercase tracking-wider font-semibold text-white/60">
                Logs de Envíos en Vivo (Últimos 60)
              </h3>
              <label className="flex items-center gap-1.5 text-xs text-white/50 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={autoScroll} 
                  onChange={(e) => setAutoScroll(e.target.checked)} 
                  className="rounded border-white/20 bg-black/40 text-[#AA6F3B]"
                />
                Auto-scroll arriba
              </label>
            </div>

            <div 
              ref={logsContainerRef}
              className="bg-black/60 border border-white/10 rounded-lg p-3 max-h-56 overflow-y-auto font-mono text-xs space-y-1.5 custom-scrollbar"
            >
              {logs.length === 0 ? (
                <div className="text-white/30 text-center py-6">Esperando primeros envíos de la cola...</div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between py-1 border-b border-white/5 last:border-none">
                    <div className="flex items-center gap-2 truncate pr-2">
                      <span className="text-white/40 text-[10px]">
                        {log.enviado_at ? new Date(log.enviado_at).toLocaleTimeString() : new Date(log.created_at).toLocaleTimeString()}
                      </span>
                      <span className="text-white/90 truncate">{log.email}</span>
                      {log.nombre && <span className="text-white/40 text-[11px]">({log.nombre})</span>}
                    </div>

                    <div className="flex-shrink-0">
                      {log.estado === 'enviado' && (
                        <span className="px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20 text-[10px]">
                          ✓ Enviado
                        </span>
                      )}
                      {log.estado === 'pendiente' && (
                        <span className="px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 text-[10px]">
                          En cola
                        </span>
                      )}
                      {log.estado === 'enviando' && (
                        <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] animate-pulse">
                          Enviando...
                        </span>
                      )}
                      {log.estado === 'fallido' && (
                        <span 
                          title={log.error_mensaje || 'Error'} 
                          className="px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] cursor-help"
                        >
                          ✕ Error
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-[#0b0a07] flex justify-end">
          <Button variant="outline" onClick={onClose} className="border-white/10 text-white hover:bg-white/10">
            Cerrar Monitor
          </Button>
        </div>
      </div>
    </div>
  )
}

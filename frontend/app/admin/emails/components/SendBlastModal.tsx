"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { API_BASE_URL } from "@/lib/api"
import { Users, Loader2, Check } from "lucide-react"

interface SendBlastModalProps {
  templateKey: string
  onClose: () => void
}

export function SendBlastModal({ templateKey, onClose }: SendBlastModalProps) {
  const [audiences, setAudiences] = useState<string[]>([])
  const [provinces, setProvinces] = useState<string[]>([])
  const [selectedProvinces, setSelectedProvinces] = useState<string[]>([])
  const [manualList, setManualList] = useState("")
  const [recipientCount, setRecipientCount] = useState<number | null>(null)
  const [loadingProvinces, setLoadingProvinces] = useState(true)
  const [calculating, setCalculating] = useState(false)
  const [sending, setSending] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  useEffect(() => {
    const fetchProvinces = async () => {
      try {
        const token = localStorage.getItem("admin_token")
        const res = await fetch(`${API_BASE_URL}/audiences/provinces`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        })
        if (res.ok) {
          const data = await res.json()
          setProvinces(data)
        }
      } catch (e) {
        console.error("Failed to fetch provinces", e)
      } finally {
        setLoadingProvinces(false)
      }
    }
    fetchProvinces()
  }, [])

  useEffect(() => {
    const calculateCount = async () => {
      if (audiences.length === 0 && !manualList.trim()) {
        setRecipientCount(0)
        return
      }
      setCalculating(true)
      try {
        const token = localStorage.getItem("admin_token")
        const res = await fetch(`${API_BASE_URL}/audiences/count`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ audiences, provinces: selectedProvinces, manualList })
        })
        if (res.ok) {
          const data = await res.json()
          setRecipientCount(data.count)
        }
      } catch (e) {
        console.error("Failed to count audience", e)
      } finally {
        setCalculating(false)
      }
    }
    
    const timer = setTimeout(() => {
      calculateCount()
    }, 500)
    
    return () => clearTimeout(timer)
  }, [audiences, selectedProvinces, manualList])

  const handleAudienceToggle = (val: string) => {
    setAudiences(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val])
  }

  const handleProvinceToggle = (val: string) => {
    setSelectedProvinces(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val])
  }

  const handleSendRequest = () => {
    if ((audiences.length === 0 && !manualList.trim()) || recipientCount === 0) return
    setShowConfirmModal(true)
  }

  const executeSend = async () => {
    setShowConfirmModal(false)
    setSending(true)
    setError(null)
    try {
      const token = localStorage.getItem("admin_token")
      const res = await fetch(`${API_BASE_URL}/email-templates/${templateKey}/send-blast`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ audiences, provinces: selectedProvinces, manualList })
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Error al enviar mails")
      }
      setSuccess(true)
    } catch (e: any) {
      setError(e.message)
      setSending(false)
    }
  }

  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
        <div className="bg-[#14120f] border border-white/10 rounded-xl p-8 max-w-md w-full flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mb-4">
            <Check className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">¡Envíos Iniciados!</h2>
          <p className="text-white/60 mb-6">Los correos están siendo enviados en segundo plano. Esto puede tomar unos minutos dependiendo de la cantidad.</p>
          <Button onClick={onClose} className="w-full bg-white text-black hover:bg-white/90">Cerrar</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-[#14120f] border border-white/10 rounded-xl max-w-lg w-full flex flex-col max-h-[90vh]">
        
        <div className="p-6 border-b border-white/10 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-[#AA6F3B]" />
            Enviar Mail Masivo
          </h2>
          <button onClick={onClose} className="text-white/60 hover:text-white">&times;</button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          {error && <div className="p-3 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}
          
          <div className="space-y-3">
            <h3 className="font-medium text-white/90">1. Seleccionar Audiencia</h3>
            <label className="flex items-center gap-3 p-3 rounded-lg border border-white/10 hover:bg-white/5 cursor-pointer">
              <Checkbox checked={audiences.includes("buyers")} onCheckedChange={() => handleAudienceToggle("buyers")} />
              <div>
                <div className="text-white">Compradores</div>
                <div className="text-xs text-white/50">Clientes que tienen un pedido pagado o completado.</div>
              </div>
            </label>
            <label className="flex items-center gap-3 p-3 rounded-lg border border-white/10 hover:bg-white/5 cursor-pointer">
              <Checkbox checked={audiences.includes("waitlist")} onCheckedChange={() => handleAudienceToggle("waitlist")} />
              <div>
                <div className="text-white">Lista de Espera</div>
                <div className="text-xs text-white/50">Personas anotadas en la lista de espera (early access).</div>
              </div>
            </label>
            <label className="flex items-center gap-3 p-3 rounded-lg border border-white/10 hover:bg-white/5 cursor-pointer">
              <Checkbox checked={audiences.includes("manual")} onCheckedChange={() => handleAudienceToggle("manual")} />
              <div>
                <div className="text-white">Lista Manual (Pegar Mails)</div>
                <div className="text-xs text-white/50">Ingresar correos manualmente.</div>
              </div>
            </label>
            
            {audiences.includes("manual") && (
              <div className="mt-2 pl-8">
                <textarea 
                  className="w-full bg-black/50 border border-white/10 rounded-md p-3 text-sm text-white placeholder-white/30 min-h-[100px] focus:outline-none focus:border-[#AA6F3B] transition-colors"
                  placeholder="pepito@mail.com, Pepito&#10;juan@empresa.com, Juan&#10;solomail@gmail.com"
                  value={manualList}
                  onChange={(e) => setManualList(e.target.value)}
                />
                <p className="text-xs text-white/40 mt-1">Formato: email, nombre (opcional). Uno por línea.</p>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <h3 className="font-medium text-white/90">2. Filtrar por Provincia (Opcional)</h3>
            <p className="text-xs text-white/50">Si no seleccionas ninguna, se enviará a todas las provincias.</p>
            {loadingProvinces ? (
              <div className="text-sm text-white/40">Cargando provincias...</div>
            ) : (
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 border border-white/5 rounded bg-black/20 custom-scrollbar">
                {provinces.map(prov => (
                  <label key={prov} className="flex items-center gap-2 text-sm text-white/80 cursor-pointer">
                    <Checkbox checked={selectedProvinces.includes(prov)} onCheckedChange={() => handleProvinceToggle(prov)} />
                    {prov}
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-white/10 bg-[#0b0a07] rounded-b-xl flex flex-col gap-4">
          <div className="flex justify-between items-center bg-[#AA6F3B]/10 p-4 rounded-lg border border-[#AA6F3B]/30">
            <span className="text-white/80">Total de destinatarios únicos:</span>
            {calculating ? (
              <Loader2 className="w-5 h-5 animate-spin text-[#AA6F3B]" />
            ) : (
              <span className="text-2xl font-bold text-[#AA6F3B]">{recipientCount ?? 0}</span>
            )}
          </div>
          
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={onClose} disabled={sending} className="border-white/10 text-white hover:bg-white/10">Cancelar</Button>
            <Button 
              className="bg-[#AA6F3B] hover:bg-[#AA6F3B]/90 text-white" 
              onClick={handleSendRequest}
              disabled={sending || (audiences.length === 0 && !manualList.trim()) || recipientCount === 0}
            >
              {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Revisar Envío
            </Button>
          </div>
        </div>
      </div>

      {showConfirmModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <div className="bg-[#14120f] border border-white/10 rounded-xl max-w-sm w-full p-6 text-center shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2">Confirmar Envío Masivo</h3>
            <p className="text-white/60 mb-6 text-sm">
              ¿Estás seguro que quieres enviar este correo a <strong>{recipientCount}</strong> personas? Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <Button onClick={() => setShowConfirmModal(false)} variant="outline" className="flex-1 border-white/10 text-white hover:bg-white/10">Cancelar</Button>
              <Button onClick={executeSend} disabled={sending} className="flex-1 bg-[#AA6F3B] hover:bg-[#AA6F3B]/90 text-white border-none">
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sí, Enviar"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

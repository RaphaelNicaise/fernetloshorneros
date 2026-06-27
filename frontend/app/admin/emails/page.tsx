"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { API_BASE_URL } from "@/lib/api"
import { Mail, Send, RotateCcw, Save, Copy, Check, Eye, Plus, Trash2, Monitor, Smartphone } from "lucide-react"
import { SendBlastModal } from "./components/SendBlastModal"

type EmailTemplateType = string

interface EmailTemplate {
  key: string
  subject: string
  html_content: string
  isCustom: boolean
  updated_at?: string
}

const TEMPLATE_NAMES: Record<string, string> = {
  compra_confirmacion: "Confirmación de Compra",
  envio_tracking: "Notificación de Envío",
  notif_vendedor: "Notificación al Vendedor",
}

const DEFAULT_TEMPLATE_VARS: Record<string, string[]> = {
  compra_confirmacion: ["nombre", "pedidoId", "items", "total", "costoEnvio"],
  envio_tracking: ["nombre", "pedidoId", "trackingCode", "trackingUrl"],
  notif_vendedor: ["pedidoId", "detalles"],
}

const DUMMY_DATA: Record<string, string> = {
  nombre: 'Juan Pérez',
  email: 'juan@gmail.com',
  pedidoId: '12345',
  total: '$ 15,000',
  items: `
    <table class="order-table" cellspacing="0" cellpadding="0" style="width: 100%; margin: 30px 0; border-top: 1px solid #ffffff15; border-bottom: 1px solid #ffffff15;">
      <thead>
        <tr>
          <th style="width: 60%; text-align: left; padding: 15px 8px; color: #AA6F3B; font-size: 12px; text-transform: uppercase;">Producto</th>
          <th style="width: 15%; text-align: center; padding: 15px 8px; color: #AA6F3B; font-size: 12px; text-transform: uppercase;">Cant.</th>
          <th style="width: 25%; text-align: right; padding: 15px 8px; color: #AA6F3B; font-size: 12px; text-transform: uppercase;">Subtotal</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="padding: 15px 8px; border-bottom: 1px solid #ffffff0a; color: #eeeeee; font-size: 14px;">Fernet de Autor</td>
          <td style="padding: 15px 8px; text-align: center; border-bottom: 1px solid #ffffff0a; color: #eeeeee; font-size: 14px;">2</td>
          <td style="padding: 15px 8px; text-align: right; border-bottom: 1px solid #ffffff0a; color: #eeeeee; font-size: 14px; font-weight: 500;">$15000.00</td>
        </tr>
        <tr class="summary-row" style="border-top: 1px solid #3d2f29;">
          <td colspan="2" class="label" style="text-align: right; color: #f5f0eb; padding: 15px 8px; font-size: 18px; font-weight: bold;">Total:</td>
          <td class="value" style="text-align: right; color: #dfa84a; padding: 15px 8px; font-size: 18px; font-weight: bold;">$15000.00</td>
        </tr>
      </tbody>
    </table>
  `,
  costoEnvio: '$ 2,500',
  trackingCode: 'TN123456789AR',
  trackingUrl: '#',
  detalles: 'Pedido de prueba.\nCliente: Juan Pérez\nEmail: juan@gmail.com'
};

export default function AdminEmailsPage() {
  const [activeTab, setActiveTab] = useState<EmailTemplateType>("compra_confirmacion")
  const [templates, setTemplates] = useState<Record<string, EmailTemplate>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [copiedVar, setCopiedVar] = useState<string | null>(null)
  const [showSendModal, setShowSendModal] = useState(false)
  const [isCreatingNew, setIsCreatingNew] = useState(false)
  const [newTemplateName, setNewTemplateName] = useState("")
  
  // Test email state
  const [testEmail, setTestEmail] = useState("")
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop')

  const loadTemplates = async () => {
    setLoading(true)
    setError(null)
    try {
      const token = localStorage.getItem("admin_token")
      const res = await fetch(`${API_BASE_URL}/email-templates`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })
      if (!res.ok) throw new Error("Error al cargar plantillas")
      const data: EmailTemplate[] = await res.json()
      
      const newTemplates: Record<string, EmailTemplate> = {}
      data.forEach(t => {
        newTemplates[t.key] = t
      })
      setTemplates(newTemplates)
      
      // If the currently active tab was deleted, fallback to the first one
      if (!newTemplates[activeTab]) {
        setActiveTab("compra_confirmacion")
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTemplates()
  }, [])

  const currentTemplate = templates[activeTab]

  const previewHtml = useMemo(() => {
    if (!currentTemplate) return '<div style="color: white; font-family: sans-serif; padding: 20px;">Sin contenido HTML</div>';
    let html = currentTemplate.html_content || '<div style="color: white; font-family: sans-serif; padding: 20px;">Sin contenido HTML</div>';
    
    // Replace variables with dummy data for preview
    Object.entries(DUMMY_DATA).forEach(([key, value]) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      html = html.replace(regex, value);
    });
    return html;
  }, [currentTemplate?.html_content]);

  const handleCopyVar = (v: string) => {
    navigator.clipboard.writeText(`{{${v}}}`)
    setCopiedVar(v)
    setTimeout(() => setCopiedVar(null), 2000)
  }

  const handleChange = (field: "subject" | "html_content", value: string) => {
    setTemplates(prev => ({
      ...prev,
      [activeTab]: {
        ...prev[activeTab],
        [field]: value
      }
    }))
  }

  const handleSave = async (isNew = false, keyToSave = activeTab, subject = currentTemplate?.subject, html = currentTemplate?.html_content) => {
    setSaving(true)
    setError(null)
    setSuccessMsg(null)
    try {
      const token = localStorage.getItem("admin_token")
      const res = await fetch(`${API_BASE_URL}/email-templates/${keyToSave}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ subject, html_content: html })
      })
      if (!res.ok) throw new Error("Error al guardar plantilla")
      setSuccessMsg("Plantilla guardada correctamente")
      setTimeout(() => setSuccessMsg(null), 3000)
      await loadTemplates()
      if (isNew) {
        setIsCreatingNew(false)
        setNewTemplateName("")
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleCreateNew = () => {
    if (!newTemplateName.trim()) return
    const key = `custom_${newTemplateName.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_${Date.now()}`
    setActiveTab(key)
    handleSave(true, key, newTemplateName, '<html><body>\n  <h1>Hola {{nombre}}</h1>\n  <p>Escribe tu mensaje aquí...</p>\n</body></html>')
  }

  const handleRestore = async () => {
    if (!confirm("¿Seguro que querés restaurar o eliminar esta plantilla?")) return
    
    setSaving(true)
    setError(null)
    setSuccessMsg(null)
    try {
      const token = localStorage.getItem("admin_token")
      const res = await fetch(`${API_BASE_URL}/email-templates/${activeTab}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })
      if (!res.ok) throw new Error("Error al eliminar plantilla")
      setSuccessMsg("Plantilla eliminada/restaurada")
      setTimeout(() => setSuccessMsg(null), 3000)
      await loadTemplates()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleSendTest = async () => {
    if (!testEmail) {
      setError("Por favor ingresá un email para la prueba")
      return
    }
    setSaving(true)
    setError(null)
    setSuccessMsg(null)
    try {
      const token = localStorage.getItem("admin_token")
      const res = await fetch(`${API_BASE_URL}/email-templates/${activeTab}/preview`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          subject: currentTemplate.subject,
          html_content: currentTemplate.html_content,
          test_email: testEmail
        })
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Error al enviar prueba")
      }
      setSuccessMsg(`Correo de prueba enviado a ${testEmail}`)
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading && Object.keys(templates).length === 0) return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <div className="flex flex-col items-center justify-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#AA6F3B] border-t-transparent" />
        <span className="text-sm text-white/40">Cargando plantillas...</span>
      </div>
    </div>
  );

  const availableVars = DEFAULT_TEMPLATE_VARS[activeTab] || ["nombre", "email"];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="font-serif text-3xl font-bold text-white flex items-center gap-2">
          <Mail className="w-8 h-8 text-[#AA6F3B]" />
          Personalización de Emails
        </h1>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-md mb-6">{error}</div>}
      {successMsg && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-[#0b0a07] border border-emerald-500/30 text-emerald-400 px-6 py-4 rounded-xl shadow-[0_10px_40px_rgba(16,185,129,0.2)] animate-in slide-in-from-bottom-5">
          <Check className="w-5 h-5 text-emerald-400" />
          <span className="font-medium text-sm">{successMsg}</span>
        </div>
      )}

      <div className="grid lg:grid-cols-[250px_1fr] gap-6">
        {/* Tabs Sidebar */}
        <div className="flex flex-col gap-2">
          {Object.keys(templates).map(key => (
            <button
              key={key}
              onClick={() => { setActiveTab(key); setError(null); setSuccessMsg(null); setIsCreatingNew(false); }}
              className={`p-4 rounded-xl text-left transition-all border ${
                activeTab === key && !isCreatingNew
                  ? "bg-[#AA6F3B]/10 border-[#AA6F3B] text-white" 
                  : "bg-[#0b0a07] border-white/5 text-white/60 hover:bg-white/5 hover:text-white"
              }`}
            >
              <div className="font-medium truncate">{TEMPLATE_NAMES[key] || templates[key].subject || key}</div>
              {templates[key]?.isCustom ? (
                <span className="text-xs text-[#AA6F3B] mt-1 block">Personalizado</span>
              ) : (
                <span className="text-xs text-white/40 mt-1 block">Default</span>
              )}
            </button>
          ))}

          {/* Create New Button */}
          {isCreatingNew ? (
            <div className="p-4 rounded-xl border border-[#AA6F3B] bg-[#AA6F3B]/5 space-y-3">
              <Input 
                autoFocus
                placeholder="Nombre del mail..." 
                value={newTemplateName}
                onChange={e => setNewTemplateName(e.target.value)}
                className="bg-white/5 border-white/10 text-white h-8 text-sm"
              />
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => setIsCreatingNew(false)} className="text-white/60 flex-1 h-8">Cancelar</Button>
                <Button size="sm" onClick={handleCreateNew} className="bg-[#AA6F3B] text-white hover:bg-[#AA6F3B]/90 flex-1 h-8">Crear</Button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsCreatingNew(true)}
              className="p-4 rounded-xl text-left transition-all border border-dashed border-white/20 bg-transparent text-white/60 hover:bg-white/5 hover:text-white hover:border-white/40 flex items-center justify-center gap-2 mt-2"
            >
              <Plus className="w-4 h-4" />
              <span>Nueva Plantilla</span>
            </button>
          )}
        </div>

        {/* Editor Area */}
        <div className="bg-[#0b0a07] border border-white/8 rounded-xl p-6">
          {currentTemplate && !isCreatingNew && (
            <div className="space-y-6">
              
              {/* Header Actions */}
              <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 pb-4 border-b border-white/10">
                <h2 className="text-xl font-serif text-white truncate max-w-md">
                  {TEMPLATE_NAMES[activeTab] || 'Plantilla Personalizada'}
                </h2>
                <div className="flex flex-wrap gap-2 w-full xl:w-auto">
                  {!TEMPLATE_NAMES[activeTab] && (
                    <Button className="bg-emerald-600 hover:bg-emerald-500 text-white border-0 flex-1 xl:flex-none" onClick={() => setShowSendModal(true)}>
                      <Send className="w-4 h-4 mr-2" />
                      Enviar Mails
                    </Button>
                  )}
                  <Button variant="outline" className="border-white/10 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 text-white flex-1 xl:flex-none" onClick={handleRestore} disabled={saving || !currentTemplate.isCustom}>
                    {TEMPLATE_NAMES[activeTab] ? <RotateCcw className="w-4 h-4 mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
                    {TEMPLATE_NAMES[activeTab] ? 'Restaurar Default' : 'Eliminar Plantilla'}
                  </Button>
                  <Button className="bg-[#AA6F3B] hover:bg-[#AA6F3B]/90 text-white border-0 flex-1 xl:flex-none" onClick={() => handleSave(false, activeTab, currentTemplate.subject, currentTemplate.html_content)} disabled={saving}>
                    <Save className="w-4 h-4 mr-2" />
                    Guardar Cambios
                  </Button>
                </div>
              </div>

              {/* Layout dividido (Editor / Preview) */}
              <div className="grid lg:grid-cols-2 gap-6">
                
                {/* Lado Izquierdo: Editor */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm text-white/60 font-medium">Asunto del correo</label>
                    <Input 
                      value={currentTemplate.subject} 
                      onChange={e => handleChange("subject", e.target.value)}
                      className="bg-white/5 border-white/10 text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm text-white/60 font-medium">Contenido HTML</label>
                    <Textarea 
                      value={currentTemplate.html_content} 
                      onChange={e => handleChange("html_content", e.target.value)}
                      className="font-mono text-sm bg-[#14120f] border-white/10 text-white/90 h-[500px] overflow-y-auto"
                      style={{ fieldSizing: 'fixed' }}
                      placeholder="Ingresa el HTML de la plantilla aquí..."
                    />
                  </div>

                  <div className="bg-[#14120f] border border-white/10 rounded-lg p-4">
                    <p className="text-sm text-white/60 mb-2 font-medium">Variables disponibles (Click para copiar)</p>
                    <div className="flex flex-wrap gap-2">
                      {availableVars.map(v => (
                        <button
                          key={v}
                          onClick={() => handleCopyVar(v)}
                          className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#AA6F3B]/20 text-[#AA6F3B] hover:bg-[#AA6F3B]/30 text-xs font-mono transition-colors border border-[#AA6F3B]/30"
                        >
                          {copiedVar === v ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          {`{{${v}}}`}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Lado Derecho: Preview */}
                <div className="space-y-4 flex flex-col">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-[#AA6F3B]" />
                      <label className="text-sm text-white/60 font-medium">Vista Previa en Vivo</label>
                    </div>
                    <div className="flex bg-white/5 rounded-lg p-1">
                      <button 
                        onClick={() => setPreviewMode('desktop')}
                        className={`p-1.5 rounded-md transition-colors ${previewMode === 'desktop' ? 'bg-[#AA6F3B]/20 text-[#AA6F3B]' : 'text-white/40 hover:text-white/80'}`}
                        title="Vista Desktop"
                      >
                        <Monitor className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => setPreviewMode('mobile')}
                        className={`p-1.5 rounded-md transition-colors ${previewMode === 'mobile' ? 'bg-[#AA6F3B]/20 text-[#AA6F3B]' : 'text-white/40 hover:text-white/80'}`}
                        title="Vista Mobile"
                      >
                        <Smartphone className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex-1 bg-white/5 rounded-lg overflow-hidden border border-white/10 relative min-h-[500px] flex justify-center items-start">
                    <iframe
                      srcDoc={previewHtml}
                      className={`h-[600px] border-0 bg-white transition-all duration-300 shadow-2xl ${previewMode === 'mobile' ? 'w-[375px] rounded-[2rem] border-8 border-gray-900 mt-4' : 'w-full'}`}
                      title="Vista previa"
                    />
                  </div>

                  {/* Send Test Tool */}
                  <div className="bg-[#14120f] border border-white/10 rounded-lg p-4 mt-auto">
                    <label className="text-sm text-white/60 mb-2 block font-medium">Enviar prueba a correo</label>
                    <div className="flex gap-2">
                      <Input 
                        placeholder="tu@email.com" 
                        value={testEmail}
                        onChange={e => setTestEmail(e.target.value)}
                        className="bg-white/5 border-white/10 text-white flex-1"
                      />
                      <Button variant="outline" className="border-white/10 hover:bg-white/10 text-white" onClick={handleSendTest} disabled={saving}>
                        <Send className="w-4 h-4 mr-2" />
                        Enviar Prueba
                      </Button>
                    </div>
                  </div>

                </div>

              </div>
              
            </div>
          )}
        </div>
      </div>
      
      {showSendModal && (
        <SendBlastModal templateKey={activeTab} onClose={() => setShowSendModal(false)} />
      )}
    </div>
  )
}

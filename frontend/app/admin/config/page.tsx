'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { api, API_BASE_URL } from '@/lib/api';
import { Download, Loader2 } from 'lucide-react';

export default function ConfigPage() {
  const [minPurchaseAmount, setMinPurchaseAmount] = useState('');
  const [fixedShippingCost, setFixedShippingCost] = useState('');
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceSaving, setMaintenanceSaving] = useState(false);
  
  const [lotes, setLotes] = useState<any[]>([]);
  const [newLoteName, setNewLoteName] = useState('');
  
  const [isManualBackupLoading, setIsManualBackupLoading] = useState(false);
  const [isAutoBackupLoading, setIsAutoBackupLoading] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const fetchSetting = async (key: string) => {
          try {
            const res = await api.get(`/settings/${key}`);
            return res.data.value;
          } catch {
            return null;
          }
        };

        const [min, shipping, maint] = await Promise.all([
          fetchSetting('min_purchase_amount'),
          fetchSetting('fixed_shipping_cost'),
          fetchSetting('maintenance_mode'),
        ]);
        
        setMinPurchaseAmount(min || '');
        setFixedShippingCost(shipping || '5000');
        setMaintenanceMode(maint === 'true');
      } catch {
        toast({
          title: 'Error',
          description: 'No se pudieron obtener las configuraciones.',
          variant: 'destructive',
        });
      }
    };

    const fetchLotes = async () => {
      try {
        const res = await api.get('/lotes');
        setLotes(res.data);
      } catch {
        toast({ title: 'Error', description: 'No se pudieron obtener los lotes.', variant: 'destructive' });
      }
    };

    fetchSettings();
    fetchLotes();
  }, [toast]);

  const handleSave = async (key: string, value: string, name: string) => {
    try {
      await api.put(`/settings/${key}`, { value });
      toast({ title: 'Éxito', description: `${name} actualizado.` });
    } catch {
      toast({ title: 'Error', description: `No se pudo actualizar ${name}.`, variant: 'destructive' });
    }
  };

  const handleToggleMaintenance = async () => {
    const newValue = !maintenanceMode;
    setMaintenanceSaving(true);
    try {
      await api.put('/settings/maintenance_mode', { value: String(newValue) });
      setMaintenanceMode(newValue);
      toast({
        title: newValue ? '🔧 Mantenimiento activado' : '✅ Mantenimiento desactivado',
        description: newValue
          ? 'Solo las IPs autorizadas pueden acceder al sitio.'
          : 'El sitio está accesible para todos.',
      });
    } catch {
      toast({ title: 'Error', description: 'No se pudo cambiar el modo mantenimiento.', variant: 'destructive' });
    } finally {
      setMaintenanceSaving(false);
    }
  };

  const handleCreateLote = async () => {
    if (!newLoteName.trim()) return;
    try {
      await api.post('/lotes', { nombre: newLoteName, setAsActive: lotes.length === 0 });
      setNewLoteName('');
      toast({ title: 'Éxito', description: 'Lote creado.' });
      const res = await api.get('/lotes');
      setLotes(res.data);
    } catch {
      toast({ title: 'Error', description: 'No se pudo crear el lote.', variant: 'destructive' });
    }
  };

  const handleSetLoteActivo = async (id: number) => {
    try {
      await api.put(`/lotes/${id}/set-active`);
      toast({ title: 'Éxito', description: 'Lote actual actualizado.' });
      const res = await api.get('/lotes');
      setLotes(res.data);
    } catch {
      toast({ title: 'Error', description: 'No se pudo actualizar el lote actual.', variant: 'destructive' });
    }
  };

  const handleDeleteLote = async (id: number) => {
    try {
      await api.delete(`/lotes/${id}`);
      toast({ title: 'Éxito', description: 'Lote eliminado.' });
      const res = await api.get('/lotes');
      setLotes(res.data);
    } catch (error: any) {
      toast({ title: 'Error', description: error.response?.data?.error || 'No se pudo eliminar el lote.', variant: 'destructive' });
    }
  };

  const handleDownloadManualBackup = async () => {
    setIsManualBackupLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      const baseURL = API_BASE_URL || 'http://localhost:3001';
      const res = await fetch(`${baseURL}/backups/manual`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Error al generar backup');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_manual_${new Date().toISOString().split('T')[0]}.sql`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast({ title: 'Error', description: 'No se pudo generar el backup manual.', variant: 'destructive' });
    } finally {
      setIsManualBackupLoading(false);
    }
  };

  const handleDownloadAutoBackup = async () => {
    setIsAutoBackupLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      const baseURL = API_BASE_URL || 'http://localhost:3001';
      const res = await fetch(`${baseURL}/backups/auto`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        if (res.status === 404) throw new Error('No hay backup automático disponible aún');
        throw new Error('Error al descargar backup automático');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'daily_backup.sql';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setIsAutoBackupLoading(false);
    }
  };


  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6 text-white">Configuración</h1>
      <div className="space-y-6">

        {/* Lotes */}
        <div className="bg-white/10 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-3">Gestión de Lotes de Producción</h2>
          <div className="flex items-center gap-4 mb-6">
            <Input
              placeholder="Ej: Lote 2 - 17.500 Botellas"
              value={newLoteName}
              onChange={(e) => setNewLoteName(e.target.value)}
              className="w-64"
            />
            <Button onClick={handleCreateLote}>Crear Nuevo Lote</Button>
          </div>
          
          <div className="space-y-3">
            {lotes.map((lote) => (
              <div key={lote.id} className="flex items-center justify-between bg-black/20 p-3 rounded-lg border border-white/5">
                <div className="flex items-center gap-3">
                  <span className="text-white font-medium">{lote.nombre}</span>
                  {lote.activo ? (
                    <span className="bg-[#AA6F3B]/20 text-[#AA6F3B] text-xs px-2 py-1 rounded-full font-semibold">LOTE ACTUAL</span>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  {!lote.activo && (
                    <Button size="sm" variant="outline" className="border-white/20 hover:bg-white/10 text-white" onClick={() => handleSetLoteActivo(lote.id)}>
                      Fijar como Actual
                    </Button>
                  )}
                  <Button size="sm" variant="destructive" className="bg-red-500/20 text-white hover:bg-red-500" onClick={() => handleDeleteLote(lote.id)}>
                    Eliminar
                  </Button>
                </div>
              </div>
            ))}
            {lotes.length === 0 && <p className="text-white/40 text-sm">No hay lotes creados.</p>}
          </div>
        </div>

        {/* Monto mínimo */}
        <div className="bg-white/10 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-3">Monto mínimo de compra</h2>
          <div className="flex items-center gap-4">
            <Input
              id="min-purchase"
              type="number"
              value={minPurchaseAmount}
              onChange={(e) => setMinPurchaseAmount(e.target.value)}
              className="w-48"
            />
            <Button onClick={() => handleSave('min_purchase_amount', minPurchaseAmount, 'Monto mínimo de compra')}>Guardar</Button>
          </div>
        </div>

        {/* Costo de Envío Fijo */}
        <div className="bg-white/10 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-3">Costo de envío fijo (Correo Argentino)</h2>
          <div className="flex items-center gap-4">
            <Input
              id="fixed-shipping"
              type="number"
              value={fixedShippingCost}
              onChange={(e) => setFixedShippingCost(e.target.value)}
              className="w-48"
            />
            <Button onClick={() => handleSave('fixed_shipping_cost', fixedShippingCost, 'Costo de envío')}>Guardar</Button>
          </div>
        </div>

        {/* Modo mantenimiento */}
        <div className="bg-white/10 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-1">Modo mantenimiento</h2>
          <p className="text-white/60 text-sm mb-4">
            Cuando está activo, solo las IPs definidas en <code className="text-white/80">MAINTENANCE_ALLOWED_IPS</code> pueden acceder al sitio. El resto ve la página de mantenimiento.
          </p>
          <div className="flex items-center gap-4">
            <button
              onClick={handleToggleMaintenance}
              disabled={maintenanceSaving}
              className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-50 ${
                maintenanceMode ? 'bg-red-500' : 'bg-white/30'
              }`}
              role="switch"
              aria-checked={maintenanceMode}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                  maintenanceMode ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
            <span className={`text-sm font-medium ${maintenanceMode ? 'text-red-300' : 'text-white/70'}`}>
              {maintenanceMode ? 'Activo — sitio en mantenimiento' : 'Desactivado — sitio normal'}
            </span>
          </div>
        </div>

        {/* Backups de Base de Datos */}
        <div className="bg-white/10 rounded-xl p-5">
          <div className="flex flex-col gap-2 mb-4">
            <h2 className="text-white font-semibold">Copias de Seguridad (Base de Datos)</h2>
            <p className="text-white/60 text-sm">
              Descarga una copia completa de la base de datos. El sistema genera un backup automático todos los días a las 3:00 AM.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <Button onClick={handleDownloadManualBackup} disabled={isManualBackupLoading} variant="secondary" className="bg-[#AA6F3B] hover:bg-[#8a5a2f] text-white border-none flex items-center justify-center gap-2">
              {isManualBackupLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              Generar y Descargar Backup Manual
            </Button>
            <Button onClick={handleDownloadAutoBackup} disabled={isAutoBackupLoading} variant="secondary" className="bg-[#AA6F3B] hover:bg-[#8a5a2f] text-white border-none flex items-center justify-center gap-2">
              {isAutoBackupLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              Descargar Último Backup Automático
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
}


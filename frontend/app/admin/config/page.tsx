'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { api, API_BASE_URL } from '@/lib/api';
import { Download, Loader2, MapPin, Plus, Trash2 } from 'lucide-react';

export default function ConfigPage() {
  const [minPurchaseAmount, setMinPurchaseAmount] = useState('');
  const [fixedShippingCost, setFixedShippingCost] = useState('');
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceSaving, setMaintenanceSaving] = useState(false);
  
  const [lotes, setLotes] = useState<any[]>([]);
  const [newLoteName, setNewLoteName] = useState('');
  
  const [isManualBackupLoading, setIsManualBackupLoading] = useState(false);
  const [isAutoBackupLoading, setIsAutoBackupLoading] = useState(false);

  const [provinceCosts, setProvinceCosts] = useState<Record<string, string>>({});
  const [selectedNewProv, setSelectedNewProv] = useState<string>('');
  const [newProvCost, setNewProvCost] = useState<string>('');
  const [isSavingProvinceCosts, setIsSavingProvinceCosts] = useState(false);

  const PROVINCIAS = [
    "Buenos Aires", "Capital Federal", "Catamarca", "Chaco", "Chubut", "Córdoba", "Corrientes",
    "Entre Ríos", "Formosa", "Jujuy", "La Pampa", "La Rioja", "Mendoza", "Misiones", "Neuquén",
    "Río Negro", "Salta", "San Juan", "San Luis", "Santa Cruz", "Santa Fe", "Santiago del Estero",
    "Tierra del Fuego", "Tucumán", "Uruguay"
  ];

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

        const [min, shipping, maint, provCosts] = await Promise.all([
          fetchSetting('min_purchase_amount'),
          fetchSetting('fixed_shipping_cost'),
          fetchSetting('maintenance_mode'),
          fetchSetting('province_shipping_costs'),
        ]);
        
        setMinPurchaseAmount(min || '');
        setFixedShippingCost(shipping || '5000');
        setMaintenanceMode(maint === 'true');
        if (provCosts) {
          try {
            const parsed = JSON.parse(provCosts);
            const cleaned: Record<string, string> = {};
            Object.entries(parsed).forEach(([k, v]) => {
              if (v !== undefined && v !== null && String(v).trim() !== '') {
                cleaned[k] = String(v).trim();
              }
            });
            setProvinceCosts(cleaned);
          } catch (e) {
            console.error(e);
          }
        }
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

  const handleAddProvinceCost = async () => {
    if (!selectedNewProv) {
      toast({ title: 'Atención', description: 'Seleccioná una provincia.', variant: 'destructive' });
      return;
    }
    if (!newProvCost || isNaN(Number(newProvCost)) || Number(newProvCost) < 0) {
      toast({ title: 'Atención', description: 'Ingresá un costo de envío válido.', variant: 'destructive' });
      return;
    }

    const updated = { ...provinceCosts, [selectedNewProv]: newProvCost.trim() };
    setProvinceCosts(updated);
    const addedProv = selectedNewProv;
    setSelectedNewProv('');
    setNewProvCost('');

    try {
      setIsSavingProvinceCosts(true);
      await api.put('/settings/province_shipping_costs', { value: JSON.stringify(updated) });
      toast({ title: 'Éxito', description: `Tarifa especial agregada para ${addedProv}.` });
    } catch {
      toast({ title: 'Error', description: 'No se pudo guardar la tarifa especial.', variant: 'destructive' });
    } finally {
      setIsSavingProvinceCosts(false);
    }
  };

  const handleDeleteProvinceCost = async (prov: string) => {
    const updated = { ...provinceCosts };
    delete updated[prov];
    setProvinceCosts(updated);

    try {
      setIsSavingProvinceCosts(true);
      await api.put('/settings/province_shipping_costs', { value: JSON.stringify(updated) });
      toast({ title: 'Éxito', description: `Se eliminó la tarifa especial de ${prov}. Ahora usará el costo general.` });
    } catch {
      toast({ title: 'Error', description: 'No se pudo actualizar los costos.', variant: 'destructive' });
    } finally {
      setIsSavingProvinceCosts(false);
    }
  };

  const handleProvinceCostChange = (prov: string, val: string) => {
    setProvinceCosts(prev => ({ ...prev, [prov]: val }));
  };

  const handleSaveProvinceCosts = async () => {
    try {
      setIsSavingProvinceCosts(true);
      const cleaned: Record<string, string> = {};
      Object.entries(provinceCosts).forEach(([k, v]) => {
        if (v !== undefined && v !== null && String(v).trim() !== '') {
          cleaned[k] = String(v).trim();
        }
      });
      setProvinceCosts(cleaned);
      await api.put('/settings/province_shipping_costs', { value: JSON.stringify(cleaned) });
      toast({ title: 'Éxito', description: 'Costos por provincia actualizados correctamente.' });
    } catch {
      toast({ title: 'Error', description: 'No se pudieron actualizar los costos por provincia.', variant: 'destructive' });
    } finally {
      setIsSavingProvinceCosts(false);
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

        {/* Costo de Envío General */}
        <div className="bg-white/10 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-1">Costo de envío general (Por defecto)</h2>
          <p className="text-white/60 text-sm mb-4">
            Este valor se cobrará por defecto en todas las provincias que no tengan una tarifa especial configurada abajo.
          </p>
          <div className="flex items-center gap-4">
            <div className="relative w-48">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 text-sm">$</span>
              <Input
                id="fixed-shipping"
                type="number"
                value={fixedShippingCost}
                onChange={(e) => setFixedShippingCost(e.target.value)}
                className="pl-7 bg-black/20 border-white/10 text-white"
                placeholder="5000"
              />
            </div>
            <Button onClick={() => handleSave('fixed_shipping_cost', fixedShippingCost, 'Costo de envío')}>
              Guardar Costo General
            </Button>
          </div>
        </div>

        {/* Tarifas Especiales por Provincia */}
        <div className="bg-white/10 rounded-xl p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-white font-semibold mb-1">Tarifas especiales por Provincia (Opcional)</h2>
              <p className="text-white/60 text-sm">
                Agregá un precio específico solo para las provincias que requieran un valor diferente. Las no listadas usarán el costo general (${fixedShippingCost || '5000'}).
              </p>
            </div>
            {Object.keys(provinceCosts).length > 0 && (
              <Button 
                onClick={handleSaveProvinceCosts}
                disabled={isSavingProvinceCosts}
                variant="outline"
                className="border-white/20 hover:bg-white/10 text-white self-start sm:self-auto"
              >
                {isSavingProvinceCosts ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Guardar Cambios
              </Button>
            )}
          </div>

          {/* Formulario para agregar tarifa especial */}
          <div className="bg-black/20 p-4 rounded-lg border border-white/10 mb-6">
            <h3 className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-3">
              + Agregar tarifa especial
            </h3>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <select
                value={selectedNewProv}
                onChange={(e) => setSelectedNewProv(e.target.value)}
                className="bg-black/40 border border-white/10 text-white text-sm rounded-md px-3 py-2 flex-1 focus:outline-none focus:ring-1 focus:ring-[#AA6F3B]"
              >
                <option value="" disabled className="bg-neutral-900 text-white/40">
                  Seleccionar provincia...
                </option>
                {PROVINCIAS.filter(p => !Object.prototype.hasOwnProperty.call(provinceCosts, p)).map(prov => (
                  <option key={prov} value={prov} className="bg-neutral-900 text-white">
                    {prov}
                  </option>
                ))}
              </select>

              <div className="relative w-full sm:w-44">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 text-sm">$</span>
                <Input
                  type="number"
                  placeholder="Ej: 7500"
                  value={newProvCost}
                  onChange={(e) => setNewProvCost(e.target.value)}
                  className="pl-7 bg-black/40 border-white/10 text-white"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddProvinceCost();
                    }
                  }}
                />
              </div>

              <Button
                onClick={handleAddProvinceCost}
                disabled={isSavingProvinceCosts || !selectedNewProv || !newProvCost}
                className="bg-[#AA6F3B] hover:bg-[#8a5a2f] text-white flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Agregar Tarifa
              </Button>
            </div>
            {PROVINCIAS.filter(p => !Object.prototype.hasOwnProperty.call(provinceCosts, p)).length === 0 && (
              <p className="text-xs text-amber-400/80 mt-2">
                Todas las provincias ya tienen una tarifa especial asignada.
              </p>
            )}
          </div>

          {/* Lista de tarifas especiales configuradas */}
          {Object.keys(provinceCosts).length === 0 ? (
            <div className="text-center py-6 px-4 bg-black/10 rounded-lg border border-dashed border-white/10">
              <p className="text-sm text-white/60">
                No hay tarifas especiales configuradas.
              </p>
              <p className="text-xs text-white/40 mt-1">
                Todas las provincias se cobrarán al costo general (${fixedShippingCost || '5000'}).
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.entries(provinceCosts).map(([prov, cost]) => (
                <div
                  key={prov}
                  className="flex items-center justify-between gap-3 bg-black/20 p-3 rounded-lg border border-white/10"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <MapPin className="w-4 h-4 text-[#AA6F3B] shrink-0" />
                    <span className="text-sm text-white font-medium truncate" title={prov}>
                      {prov}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="relative w-28">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/50 text-xs">$</span>
                      <Input
                        type="number"
                        value={cost}
                        onChange={(e) => handleProvinceCostChange(prov, e.target.value)}
                        className="pl-6 h-8 text-xs bg-black/40 border-white/10 text-white"
                      />
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDeleteProvinceCost(prov)}
                      className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      title="Eliminar tarifa especial (usar costo general)"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modo mantenimiento */}
        <div className="bg-white/10 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-1">Modo mantenimiento</h2>
          <p className="text-white/60 text-sm mb-4">
            Cuando está activo, los visitantes verán la página de mantenimiento. Los administradores con sesión iniciada pueden navegar y probar toda la tienda con normalidad.
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


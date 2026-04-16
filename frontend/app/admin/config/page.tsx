'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';

export default function ConfigPage() {
  const [minPurchaseAmount, setMinPurchaseAmount] = useState('');
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceSaving, setMaintenanceSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const [minRes, maintRes] = await Promise.all([
          api.get('/settings/min_purchase_amount'),
          api.get('/settings/maintenance_mode'),
        ]);
        setMinPurchaseAmount(minRes.data.value);
        setMaintenanceMode(maintRes.data.value === 'true');
      } catch {
        toast({
          title: 'Error',
          description: 'No se pudieron obtener las configuraciones.',
          variant: 'destructive',
        });
      }
    };

    fetchSettings();
  }, [toast]);

  const handleSave = async () => {
    try {
      await api.put('/settings/min_purchase_amount', { value: minPurchaseAmount });
      toast({ title: 'Éxito', description: 'Monto mínimo de compra actualizado.' });
    } catch {
      toast({ title: 'Error', description: 'No se pudo actualizar el monto mínimo de compra.', variant: 'destructive' });
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

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6 text-white">Configuración</h1>
      <div className="space-y-6">

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
            <Button onClick={handleSave}>Guardar</Button>
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

      </div>
    </div>
  );
}


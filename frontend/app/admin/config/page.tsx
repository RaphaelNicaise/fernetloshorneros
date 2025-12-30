'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';

export default function ConfigPage() {
  const [minPurchaseAmount, setMinPurchaseAmount] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    const fetchMinPurchaseAmount = async () => {
      try {
        const response = await api.get('/settings/min_purchase_amount');
        setMinPurchaseAmount(response.data.value);
      } catch (error) {
        toast({
          title: 'Error',
          description: 'No se pudo obtener el monto mínimo de compra.',
          variant: 'destructive',
        });
      }
    };

    fetchMinPurchaseAmount();
  }, [toast]);

  const handleSave = async () => {
    try {
      await api.put('/settings/min_purchase_amount', { value: minPurchaseAmount });
      toast({
        title: 'Éxito',
        description: 'Monto mínimo de compra actualizado.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el monto mínimo de compra.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4 text-white">Configuración</h1>
      <div className="space-y-4">
        <div className="flex items-center space-x-4">
          <label htmlFor="min-purchase" className="font-medium text-white">
            Monto mínimo de compra
          </label>
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
    </div>
  );
}

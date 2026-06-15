"use client";

import { useState, useEffect } from "react";
import { API_BASE_URL } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { 
    Ticket, 
    Plus, 
    Trash2, 
    Pencil, 
    Check, 
    X,
    Percent,
    DollarSign,
    Truck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";

type Coupon = {
    id: number;
    codigo: string;
    tipo_descuento: 'porcentaje' | 'fijo' | 'envio_gratis';
    valor: number;
    limite_usos: number | null;
    usos_actuales: number;
    fecha_expiracion: string | null;
    activo: boolean;
};

export default function CuponesAdmin() {
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    
    const [formData, setFormData] = useState<{
        id?: number;
        codigo: string;
        tipo_descuento: 'porcentaje' | 'fijo' | 'envio_gratis';
        valor: number;
        limite_usos: number | null;
        fecha_expiracion: string | null;
        activo: boolean;
    }>({
        codigo: '',
        tipo_descuento: 'porcentaje',
        valor: 0,
        limite_usos: null,
        fecha_expiracion: null,
        activo: true
    });

    useEffect(() => {
        fetchCoupons();
    }, []);

    const fetchCoupons = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem("adminToken");
            const res = await fetch(`${API_BASE_URL}/coupons`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            if (res.ok) {
                const data = await res.json();
                setCoupons(data);
            } else {
                throw new Error("No se pudieron cargar los cupones");
            }
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "No se pudieron cargar los cupones", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e?: React.FormEvent) => {
        if(e) e.preventDefault();
        
        try {
            const token = localStorage.getItem("adminToken");
            const url = formData.id ? `${API_BASE_URL}/coupons/${formData.id}` : `${API_BASE_URL}/coupons`;
            const method = formData.id ? 'PUT' : 'POST';

            const payload = { ...formData };
            if (payload.tipo_descuento === 'envio_gratis') {
                payload.valor = 0;
            }

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || "Error guardando cupón");
            }

            toast({ title: "Cupón guardado", description: "El cupón se ha guardado correctamente" });
            setIsDialogOpen(false);
            fetchCoupons();
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    };

    // Al presionar Enter en inputs que no sean textareas ni botones, guardamos si el form es válido
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (formData.codigo) {
                handleSave();
            }
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("¿Estás seguro de eliminar este cupón?")) return;
        
        try {
            const token = localStorage.getItem("adminToken");
            const res = await fetch(`${API_BASE_URL}/coupons/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                toast({ title: "Cupón eliminado" });
                fetchCoupons();
            } else {
                throw new Error("Error al eliminar");
            }
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "No se pudo eliminar el cupón", variant: "destructive" });
        }
    };

    const openCreateDialog = () => {
        setFormData({
            codigo: '',
            tipo_descuento: 'porcentaje',
            valor: 0,
            limite_usos: null,
            fecha_expiracion: null,
            activo: true
        });
        setIsDialogOpen(true);
    };

    const openEditDialog = (coupon: Coupon) => {
        setFormData({
            id: coupon.id,
            codigo: coupon.codigo,
            tipo_descuento: coupon.tipo_descuento,
            valor: coupon.valor,
            limite_usos: coupon.limite_usos,
            fecha_expiracion: coupon.fecha_expiracion ? new Date(coupon.fecha_expiracion).toISOString().split('T')[0] : null,
            activo: coupon.activo
        });
        setIsDialogOpen(true);
    };

    const getIconForType = (type: string) => {
        if (type === 'porcentaje') return <Percent className="w-4 h-4" />;
        if (type === 'fijo') return <DollarSign className="w-4 h-4" />;
        return <Truck className="w-4 h-4" />;
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-3xl font-serif text-[#AA6F3B] flex items-center gap-3">
                    <Ticket className="w-8 h-8" />
                    Cupones de Descuento
                </h1>
                
                <Button 
                    onClick={openCreateDialog}
                    className="bg-[#AA6F3B] hover:bg-[#8A5A2F] text-white"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Nuevo Cupón
                </Button>
            </div>

            <div className="bg-[#111111] rounded-xl border border-white/10 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-white/80">
                        <thead className="text-xs uppercase bg-[#0b0a07] text-[#AA6F3B]">
                            <tr>
                                <th className="px-6 py-4">Código</th>
                                <th className="px-6 py-4">Tipo</th>
                                <th className="px-6 py-4">Valor</th>
                                <th className="px-6 py-4">Usos</th>
                                <th className="px-6 py-4">Vencimiento</th>
                                <th className="px-6 py-4">Estado</th>
                                <th className="px-6 py-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-8 text-center text-white/50">Cargando cupones...</td>
                                </tr>
                            ) : coupons.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-8 text-center text-white/50">No hay cupones creados</td>
                                </tr>
                            ) : (
                                coupons.map((c) => (
                                    <tr key={c.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4 font-mono font-medium text-white">
                                            {c.codigo}
                                        </td>
                                        <td className="px-6 py-4 capitalize flex items-center gap-2">
                                            {getIconForType(c.tipo_descuento)}
                                            {c.tipo_descuento.replace('_', ' ')}
                                        </td>
                                        <td className="px-6 py-4 font-semibold">
                                            {c.tipo_descuento === 'envio_gratis' ? 'Envío Gratis' : 
                                             c.tipo_descuento === 'porcentaje' ? `${c.valor}%` : 
                                             `$${Number(c.valor).toLocaleString('es-AR')}`}
                                        </td>
                                        <td className="px-6 py-4">
                                            {c.usos_actuales} / {c.limite_usos ? c.limite_usos : '∞'}
                                        </td>
                                        <td className="px-6 py-4">
                                            {c.fecha_expiracion ? format(new Date(c.fecha_expiracion), 'dd/MM/yyyy') : 'Nunca'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center w-fit gap-1 ${c.activo ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                                {c.activo ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                                                {c.activo ? 'Activo' : 'Inactivo'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="icon" onClick={() => openEditDialog(c)}>
                                                    <Pencil className="w-4 h-4 text-white/70 hover:text-white" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)}>
                                                    <Trash2 className="w-4 h-4 text-red-400 hover:text-red-300" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="bg-[#111111] text-white border-white/10 sm:max-w-[425px]" onKeyDown={handleKeyDown}>
                    <DialogHeader>
                        <DialogTitle className="text-[#AA6F3B] font-serif text-2xl">
                            {formData.id ? 'Editar Cupón' : 'Nuevo Cupón'}
                        </DialogTitle>
                        <DialogDescription className="text-white/60">
                            Configura los detalles del código promocional. Los cambios aplican inmediatamente.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="codigo">Código del Cupón</Label>
                            <Input 
                                id="codigo" 
                                value={formData.codigo}
                                onChange={e => setFormData({...formData, codigo: e.target.value.toUpperCase()})}
                                className="bg-[#1a1a1a] border-white/10 uppercase"
                                placeholder="EJ: FERNET2026"
                                autoFocus
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>Tipo de Descuento</Label>
                                <Select 
                                    value={formData.tipo_descuento} 
                                    onValueChange={(val: any) => setFormData({...formData, tipo_descuento: val})}
                                >
                                    <SelectTrigger className="bg-[#1a1a1a] border-white/10">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#1a1a1a] border-white/10 text-white">
                                        <SelectItem value="porcentaje">Porcentaje (%)</SelectItem>
                                        <SelectItem value="fijo">Monto Fijo ($)</SelectItem>
                                        <SelectItem value="envio_gratis">Envío Gratis</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="valor">Valor</Label>
                                <Input 
                                    id="valor" 
                                    type="number" 
                                    disabled={formData.tipo_descuento === 'envio_gratis'}
                                    value={formData.valor}
                                    onChange={e => setFormData({...formData, valor: Number(e.target.value)})}
                                    className="bg-[#1a1a1a] border-white/10"
                                    min="0"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="limite">Límite de Usos</Label>
                                <Input 
                                    id="limite" 
                                    type="number" 
                                    value={formData.limite_usos || ''}
                                    onChange={e => setFormData({...formData, limite_usos: e.target.value ? Number(e.target.value) : null})}
                                    className="bg-[#1a1a1a] border-white/10"
                                    placeholder="Dejar vacío para ∞"
                                    min="1"
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="expiracion">Expiración (Opcional)</Label>
                                <Input 
                                    id="expiracion" 
                                    type="date" 
                                    value={formData.fecha_expiracion || ''}
                                    onChange={e => setFormData({...formData, fecha_expiracion: e.target.value || null})}
                                    className="bg-[#1a1a1a] border-white/10 [color-scheme:dark]"
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between mt-2 p-3 bg-[#1a1a1a] rounded-lg border border-white/5">
                            <div className="space-y-0.5">
                                <Label className="text-base">Cupón Activo</Label>
                                <p className="text-xs text-white/50">Permite que los clientes lo utilicen</p>
                            </div>
                            <Switch 
                                checked={formData.activo}
                                onCheckedChange={c => setFormData({...formData, activo: c})}
                            />
                        </div>
                    </div>
                    
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                        <Button 
                            onClick={handleSave} 
                            disabled={!formData.codigo}
                            className="bg-[#AA6F3B] hover:bg-[#8A5A2F] text-white"
                        >
                            Guardar Cupón
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

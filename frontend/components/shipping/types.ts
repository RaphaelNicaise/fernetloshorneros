import { ShippingOption, PickupPoint, Provincia, Localidad } from "@/lib/api";

export interface CustomerAddress {
  provincia: string;
  ciudad: string;
  codigoPostal: string;
  direccion: string;
  numero: string;
  extra: string;
}

export interface CustomerContact {
  email: string;
  dni: string;
  telefono: string;
  nombre: string;
}

export interface ShippingSelection {
  rate_id: string;
  service_type: 'standard_delivery' | 'pickup_point';
  logistic_type?: string | null;
  carrier_id?: number | null;
  point_id?: string | null;
  shipping_cost: number;
  carrier_name: string;
  address?: CustomerAddress;
  contact: CustomerContact;
}

export interface ShippingSelectorProps {
  items: Array<{ id: string; quantity: number }>;
  productsTotal: number;
  onSelectionComplete: (selection: ShippingSelection) => void;
  onTotalChange: (total: number) => void;
}

export function formatDeliveryDate(minDays: number, maxDays: number): string {
  const today = new Date();
  const minDate = new Date(today);
  minDate.setDate(today.getDate() + minDays);
  const maxDate = new Date(today);
  maxDate.setDate(today.getDate() + maxDays);
  
  const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' };
  const minStr = minDate.toLocaleDateString('es-AR', options);
  const maxStr = maxDate.toLocaleDateString('es-AR', options);
  
  if (minDays === maxDays) {
    return `Llega el ${minStr}`;
  }
  return `Llega entre el ${minStr} y el ${maxStr}`;
}

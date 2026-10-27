export type CampaignStatus = 'en_cola' | 'procesando' | 'pausada' | 'completada' | 'cancelada';
export type RecipientStatus = 'pendiente' | 'enviando' | 'enviado' | 'fallido';

export interface Campaign {
  id: number;
  nombre: string;
  template_key: string;
  asunto: string;
  estado: CampaignStatus;
  total_destinatarios: number;
  enviados_count: number;
  fallidos_count: number;
  creado_por: string;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  created_at: string;
  updated_at: string;
}

export interface CampaignRecipient {
  id: number;
  campania_id: number;
  email: string;
  nombre: string | null;
  estado: RecipientStatus;
  error_mensaje: string | null;
  intentos: number;
  enviado_at: string | null;
  created_at: string;
}

export interface CreateCampaignDTO {
  nombre: string;
  template_key: string;
  asunto: string;
  recipients: Array<{ email: string; nombre?: string }>;
  creado_por?: string;
}

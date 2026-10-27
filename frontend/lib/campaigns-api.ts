import { API_BASE_URL } from '@/lib/api';

export interface Campaign {
  id: number;
  nombre: string;
  template_key: string;
  asunto: string;
  estado: 'en_cola' | 'procesando' | 'pausada' | 'completada' | 'cancelada';
  total_destinatarios: number;
  enviados_count: number;
  fallidos_count: number;
  creado_por: string;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  created_at: string;
  updated_at: string;
}

export interface CampaignRecipientLog {
  id: number;
  campania_id: number;
  email: string;
  nombre: string | null;
  estado: 'pendiente' | 'enviando' | 'enviado' | 'fallido';
  error_mensaje: string | null;
  intentos: number;
  enviado_at: string | null;
  created_at: string;
}

const getHeaders = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const campaignsApi = {
  async getCampaigns(
    page: number = 1,
    limit: number = 20,
    estado?: string
  ): Promise<{ campaigns: Campaign[]; total: number }> {
    const estadoQuery = estado ? `&estado=${encodeURIComponent(estado)}` : '';
    const res = await fetch(`${API_BASE_URL}/campaigns?page=${page}&limit=${limit}${estadoQuery}`, {
      headers: getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.error || err?.message || 'Error al obtener campañas');
    }
    return res.json();
  },

  async getCampaignById(id: number): Promise<Campaign> {
    const res = await fetch(`${API_BASE_URL}/campaigns/${id}`, {
      headers: getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.error || err?.message || 'Error al obtener detalle de campaña');
    }
    return res.json();
  },

  async getCampaignLogs(
    id: number,
    page: number = 1,
    limit: number = 50,
    estado?: string
  ): Promise<{ logs: CampaignRecipientLog[]; total: number }> {
    const estadoQuery = estado ? `&estado=${encodeURIComponent(estado)}` : '';
    const res = await fetch(`${API_BASE_URL}/campaigns/${id}/logs?page=${page}&limit=${limit}${estadoQuery}`, {
      headers: getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.error || err?.message || 'Error al obtener logs de campaña');
    }
    return res.json();
  },

  async pauseCampaign(id: number): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/campaigns/${id}/pause`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.error || err?.message || 'Error al pausar campaña');
    }
  },

  async resumeCampaign(id: number): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/campaigns/${id}/resume`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.error || err?.message || 'Error al reanudar campaña');
    }
  },

  async cancelCampaign(id: number): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/campaigns/${id}/cancel`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.error || err?.message || 'Error al cancelar campaña');
    }
  },

  async retryFailed(id: number): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/campaigns/${id}/retry-failed`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.error || err?.message || 'Error al reintentar envíos fallidos');
    }
  },
};

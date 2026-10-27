import request from 'supertest';
import express from 'express';
import campaignsRouter from '../campaigns';
import emailTemplatesRouter from '../emailTemplates';
import { campaignService } from '@/services/campaignService';
import { campaignWorker } from '@/services/campaignWorker';
import { audiencesService } from '@/services/audiencesService';
import { emailTemplateService } from '@/services/emailTemplateService';

// Mock dependencies
jest.mock('@/middleware/adminAuth', () => ({
  adminAuth: (req: any, _res: any, next: any) => {
    req.adminUser = { email: 'admin@fernetloshorneros.com' };
    next();
  },
}));

jest.mock('@/services/campaignService', () => ({
  campaignService: {
    getCampaigns: jest.fn(),
    getCampaignById: jest.fn(),
    getCampaignLogs: jest.fn(),
    createCampaignWithRecipients: jest.fn(),
  },
}));

jest.mock('@/services/campaignWorker', () => ({
  campaignWorker: {
    startCampaignWorker: jest.fn(),
    pauseCampaign: jest.fn(),
    resumeCampaign: jest.fn(),
    cancelCampaign: jest.fn(),
    retryFailed: jest.fn(),
  },
}));

jest.mock('@/services/audiencesService', () => ({
  audiencesService: {
    getRecipients: jest.fn(),
  },
}));

jest.mock('@/services/emailTemplateService', () => ({
  emailTemplateService: {
    getTemplate: jest.fn(),
    getAllTemplates: jest.fn(),
  },
}));

jest.mock('@/services/mailService', () => ({
  getDefaultTemplate: jest.fn().mockReturnValue({ subject: 'Asunto Default', html: '<p>Default</p>' }),
  getEmailWrapper: jest.fn().mockReturnValue('wrapper'),
}));

const app = express();
app.use(express.json());
app.use('/campaigns', campaignsRouter);
app.use('/email-templates', emailTemplatesRouter);

describe('Campaigns Routes (/campaigns)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /campaigns', () => {
    it('should return list of campaigns with pagination', async () => {
      const mockResult = {
        campaigns: [
          { id: 1, nombre: 'Test Campaign', estado: 'en_cola', total_destinatarios: 10 },
        ],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      };
      (campaignService.getCampaigns as jest.Mock).mockResolvedValue(mockResult);

      const res = await request(app).get('/campaigns?page=1&limit=20&estado=en_cola');

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockResult);
      expect(campaignService.getCampaigns).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        estado: 'en_cola',
      });
    });

    it('should return 500 when campaignService.getCampaigns fails', async () => {
      (campaignService.getCampaigns as jest.Mock).mockRejectedValue(new Error('DB Error'));

      const res = await request(app).get('/campaigns');

      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: 'DB Error' });
    });
  });

  describe('GET /campaigns/:id', () => {
    it('should return campaign details when campaign exists', async () => {
      const mockCampaign = {
        id: 42,
        nombre: 'Campaña Lanzamiento',
        estado: 'procesando',
        total_destinatarios: 150,
      };
      (campaignService.getCampaignById as jest.Mock).mockResolvedValue(mockCampaign);

      const res = await request(app).get('/campaigns/42');

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockCampaign);
      expect(campaignService.getCampaignById).toHaveBeenCalledWith(42);
    });

    it('should return 404 when campaign is not found', async () => {
      (campaignService.getCampaignById as jest.Mock).mockResolvedValue(null);

      const res = await request(app).get('/campaigns/999');

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Campaña no encontrada' });
    });

    it('should return 500 when service fails', async () => {
      (campaignService.getCampaignById as jest.Mock).mockRejectedValue(new Error('Connection timeout'));

      const res = await request(app).get('/campaigns/42');

      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: 'Connection timeout' });
    });
  });

  describe('GET /campaigns/:id/logs', () => {
    it('should return recipient logs with pagination', async () => {
      const mockLogs = {
        recipients: [
          { id: 101, campania_id: 5, email: 'user@test.com', estado: 'enviado' },
        ],
        pagination: { page: 2, limit: 10, total: 25, totalPages: 3 },
      };
      (campaignService.getCampaignLogs as jest.Mock).mockResolvedValue(mockLogs);

      const res = await request(app).get('/campaigns/5/logs?page=2&limit=10&estado=enviado');

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockLogs);
      expect(campaignService.getCampaignLogs).toHaveBeenCalledWith(5, {
        page: 2,
        limit: 10,
        estado: 'enviado',
      });
    });

    it('should return 500 when log retrieval fails', async () => {
      (campaignService.getCampaignLogs as jest.Mock).mockRejectedValue(new Error('DB Failed'));

      const res = await request(app).get('/campaigns/5/logs');

      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: 'DB Failed' });
    });
  });

  describe('POST /campaigns/:id/pause', () => {
    it('should pause campaign successfully', async () => {
      (campaignWorker.pauseCampaign as jest.Mock).mockResolvedValue(undefined);

      const res = await request(app).post('/campaigns/10/pause');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: 'Campaña pausada con éxito' });
      expect(campaignWorker.pauseCampaign).toHaveBeenCalledWith(10);
    });

    it('should return 500 if worker fails', async () => {
      (campaignWorker.pauseCampaign as jest.Mock).mockRejectedValue(new Error('Pause failed'));

      const res = await request(app).post('/campaigns/10/pause');

      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: 'Pause failed' });
    });
  });

  describe('POST /campaigns/:id/resume', () => {
    it('should resume campaign successfully', async () => {
      (campaignWorker.resumeCampaign as jest.Mock).mockResolvedValue(undefined);

      const res = await request(app).post('/campaigns/10/resume');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: 'Campaña reanudada con éxito' });
      expect(campaignWorker.resumeCampaign).toHaveBeenCalledWith(10);
    });

    it('should return 500 if resume fails', async () => {
      (campaignWorker.resumeCampaign as jest.Mock).mockRejectedValue(new Error('Resume failed'));

      const res = await request(app).post('/campaigns/10/resume');

      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: 'Resume failed' });
    });
  });

  describe('POST /campaigns/:id/cancel', () => {
    it('should cancel campaign successfully', async () => {
      (campaignWorker.cancelCampaign as jest.Mock).mockResolvedValue(undefined);

      const res = await request(app).post('/campaigns/10/cancel');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: 'Campaña cancelada con éxito' });
      expect(campaignWorker.cancelCampaign).toHaveBeenCalledWith(10);
    });

    it('should return 500 if cancel fails', async () => {
      (campaignWorker.cancelCampaign as jest.Mock).mockRejectedValue(new Error('Cancel failed'));

      const res = await request(app).post('/campaigns/10/cancel');

      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: 'Cancel failed' });
    });
  });

  describe('POST /campaigns/:id/retry-failed', () => {
    it('should retry failed recipients successfully', async () => {
      (campaignWorker.retryFailed as jest.Mock).mockResolvedValue(undefined);

      const res = await request(app).post('/campaigns/10/retry-failed');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: 'Reintento de fallidos iniciado con éxito' });
      expect(campaignWorker.retryFailed).toHaveBeenCalledWith(10);
    });

    it('should return 500 if retry fails', async () => {
      (campaignWorker.retryFailed as jest.Mock).mockRejectedValue(new Error('Retry failed'));

      const res = await request(app).post('/campaigns/10/retry-failed');

      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: 'Retry failed' });
    });
  });
});

describe('Email Templates Send-Blast Route (/email-templates/:key/send-blast)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 400 if no audiences and no manualList provided', async () => {
    const res = await request(app)
      .post('/email-templates/compra_confirmacion/send-blast')
      .send({ audiences: [] });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Debes seleccionar al menos una audiencia');
  });

  it('should return 400 if audience service returns 0 recipients', async () => {
    (audiencesService.getRecipients as jest.Mock).mockResolvedValue([]);

    const res = await request(app)
      .post('/email-templates/compra_confirmacion/send-blast')
      .send({ audiences: ['newsletter'] });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('No hay destinatarios');
  });

  it('should create campaign and trigger worker when valid recipients found', async () => {
    const mockRecipients = [
      { email: 'user1@test.com', nombre: 'User 1' },
      { email: 'user2@test.com', nombre: 'User 2' },
    ];
    (emailTemplateService.getTemplate as jest.Mock).mockResolvedValue({
      subject: 'Gran Lanzamiento',
    });
    (audiencesService.getRecipients as jest.Mock).mockResolvedValue(mockRecipients);
    (campaignService.createCampaignWithRecipients as jest.Mock).mockResolvedValue({
      id: 77,
      nombre: 'Blast Noviembre',
      total_destinatarios: 2,
    });

    const res = await request(app)
      .post('/email-templates/compra_confirmacion/send-blast')
      .send({
        audiences: ['compradores'],
        nombreCampania: 'Blast Noviembre',
      });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      message: 'Campaña creada y encolada con éxito.',
      campaignId: 77,
      total: 2,
    });

    expect(campaignService.createCampaignWithRecipients).toHaveBeenCalledWith({
      nombre: 'Blast Noviembre',
      template_key: 'compra_confirmacion',
      asunto: 'Gran Lanzamiento',
      recipients: mockRecipients,
      creado_por: 'admin@fernetloshorneros.com',
    });
    expect(campaignWorker.startCampaignWorker).toHaveBeenCalledWith(77);
  });

  it('should generate default campaign title if not provided', async () => {
    const mockRecipients = [{ email: 'user@test.com' }];
    (emailTemplateService.getTemplate as jest.Mock).mockResolvedValue(null);
    (audiencesService.getRecipients as jest.Mock).mockResolvedValue(mockRecipients);
    (campaignService.createCampaignWithRecipients as jest.Mock).mockResolvedValue({
      id: 88,
      nombre: 'Envío novedad - 27/10/2026',
      total_destinatarios: 1,
    });

    const res = await request(app)
      .post('/email-templates/novedad/send-blast')
      .send({
        manualList: 'user@test.com',
      });

    expect(res.status).toBe(200);
    expect(campaignService.createCampaignWithRecipients).toHaveBeenCalledWith(
      expect.objectContaining({
        nombre: expect.stringMatching(/^Envío novedad - /),
        template_key: 'novedad',
        asunto: 'Asunto Default',
      })
    );
  });
});

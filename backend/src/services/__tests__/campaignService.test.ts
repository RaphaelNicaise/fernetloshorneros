import { campaignService } from '../campaignService';
import sequelize from '@/config/database';
import { Campaign } from '@/types/campaigns';

jest.mock('@/config/database', () => {
  const mockDb = {
    query: jest.fn(),
    transaction: jest.fn(),
  };
  return {
    __esModule: true,
    default: mockDb,
    ...mockDb,
  };
});

describe('campaignService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createCampaignWithRecipients', () => {
    it('creates a campaign with recipients in transaction', async () => {
      const mockTx = {
        commit: jest.fn(),
        rollback: jest.fn(),
      };
      (sequelize.transaction as jest.Mock).mockResolvedValue(mockTx);
      (sequelize.query as jest.Mock)
        .mockResolvedValueOnce([1]) // INSERT INTO email_campanias
        .mockResolvedValueOnce([]) // INSERT INTO email_campania_destinatarios
        .mockResolvedValueOnce([{ id: 1, nombre: 'Test Campaign', total_destinatarios: 2 }]); // getCampaignById

      const result = await campaignService.createCampaignWithRecipients({
        nombre: 'Test Campaign',
        template_key: 'compra_confirmacion',
        asunto: 'Asunto Test',
        recipients: [
          { email: 'test1@horneros.com', nombre: 'Test 1' },
          { email: 'test2@horneros.com', nombre: 'Test 2' },
        ],
      });

      expect(result.id).toBe(1);
      expect(result.total_destinatarios).toBe(2);
      expect(mockTx.commit).toHaveBeenCalled();
      expect(mockTx.rollback).not.toHaveBeenCalled();
    });

    it('chunks recipients into batches of 500', async () => {
      const mockTx = {
        commit: jest.fn(),
        rollback: jest.fn(),
      };
      (sequelize.transaction as jest.Mock).mockResolvedValue(mockTx);
      (sequelize.query as jest.Mock)
        .mockResolvedValueOnce([42]) // INSERT INTO email_campanias
        .mockResolvedValueOnce([]) // chunk 1 (0..500)
        .mockResolvedValueOnce([]) // chunk 2 (500..550)
        .mockResolvedValueOnce([{ id: 42, nombre: 'Large Campaign', total_destinatarios: 550 }]);

      const recipients = Array.from({ length: 550 }, (_, i) => ({
        email: `user${i}@example.com`,
        nombre: `User ${i}`,
      }));

      const result = await campaignService.createCampaignWithRecipients({
        nombre: 'Large Campaign',
        template_key: 'novedades',
        asunto: 'Gran Noticia',
        recipients,
      });

      expect(result.id).toBe(42);
      // 1 insert for campaign + 2 insert chunks for recipients + 1 select getCampaignById
      expect(sequelize.query).toHaveBeenCalledTimes(4);
      expect(mockTx.commit).toHaveBeenCalled();
    });

    it('rolls back transaction on query error', async () => {
      const mockTx = {
        commit: jest.fn(),
        rollback: jest.fn(),
      };
      (sequelize.transaction as jest.Mock).mockResolvedValue(mockTx);
      (sequelize.query as jest.Mock).mockRejectedValueOnce(new Error('DB Error'));

      await expect(
        campaignService.createCampaignWithRecipients({
          nombre: 'Fail Campaign',
          template_key: 'test',
          asunto: 'Fail',
          recipients: [{ email: 'fail@test.com' }],
        })
      ).rejects.toThrow('DB Error');

      expect(mockTx.rollback).toHaveBeenCalled();
      expect(mockTx.commit).not.toHaveBeenCalled();
    });

    it('throws error and rolls back if created campaign cannot be retrieved', async () => {
      const mockTx = {
        commit: jest.fn(),
        rollback: jest.fn(),
      };
      (sequelize.transaction as jest.Mock).mockResolvedValue(mockTx);
      (sequelize.query as jest.Mock)
        .mockResolvedValueOnce([1]) // INSERT campaign
        .mockResolvedValueOnce([]) // INSERT recipients
        .mockResolvedValueOnce([]); // getCampaignById returning empty array

      await expect(
        campaignService.createCampaignWithRecipients({
          nombre: 'Ghost Campaign',
          template_key: 'test',
          asunto: 'Ghost',
          recipients: [{ email: 'ghost@test.com' }],
        })
      ).rejects.toThrow('Error al recuperar campaña creada');

      expect(mockTx.rollback).toHaveBeenCalled();
    });
  });

  describe('getCampaigns', () => {
    it('returns campaigns and total count', async () => {
      const mockCampaigns: Campaign[] = [
        {
          id: 1,
          nombre: 'Campaign 1',
          template_key: 'tpl',
          asunto: 'Asunto 1',
          estado: 'en_cola',
          total_destinatarios: 10,
          enviados_count: 0,
          fallidos_count: 0,
          creado_por: 'admin',
          fecha_inicio: null,
          fecha_fin: null,
          created_at: '2026-10-27 10:00:00',
          updated_at: '2026-10-27 10:00:00',
        },
      ];

      (sequelize.query as jest.Mock)
        .mockResolvedValueOnce([{ count: 1 }]) // COUNT
        .mockResolvedValueOnce(mockCampaigns); // SELECT

      const result = await campaignService.getCampaigns({ page: 1, limit: 10 });
      expect(result.total).toBe(1);
      expect(result.campaigns).toEqual(mockCampaigns);
    });

    it('filters campaigns by estado', async () => {
      (sequelize.query as jest.Mock)
        .mockResolvedValueOnce([{ count: 0 }])
        .mockResolvedValueOnce([]);

      await campaignService.getCampaigns({ estado: 'procesando' });

      const countCall = (sequelize.query as jest.Mock).mock.calls[0];
      const selectCall = (sequelize.query as jest.Mock).mock.calls[1];

      expect(countCall[0]).toContain('WHERE estado = :estado');
      expect(countCall[1].replacements.estado).toBe('procesando');
      expect(selectCall[0]).toContain('WHERE estado = :estado');
    });
  });

  describe('getCampaignById', () => {
    it('returns campaign if found', async () => {
      const mockCampaign = { id: 5, nombre: 'Found Campaign' };
      (sequelize.query as jest.Mock).mockResolvedValueOnce([mockCampaign]);

      const result = await campaignService.getCampaignById(5);
      expect(result).toEqual(mockCampaign);
    });

    it('returns null if campaign not found', async () => {
      (sequelize.query as jest.Mock).mockResolvedValueOnce([]);

      const result = await campaignService.getCampaignById(999);
      expect(result).toBeNull();
    });
  });

  describe('getCampaignLogs', () => {
    it('returns logs and total count with default pagination', async () => {
      const mockLogs = [
        {
          id: 1,
          campania_id: 10,
          email: 'test@example.com',
          nombre: 'Test',
          estado: 'enviado',
          error_mensaje: null,
          intentos: 1,
          enviado_at: '2026-10-27 12:00:00',
          created_at: '2026-10-27 11:59:00',
        },
      ];

      (sequelize.query as jest.Mock)
        .mockResolvedValueOnce([{ count: 1 }]) // COUNT
        .mockResolvedValueOnce(mockLogs); // SELECT

      const result = await campaignService.getCampaignLogs(10);
      expect(result.total).toBe(1);
      expect(result.logs).toEqual(mockLogs);
    });

    it('filters logs by estado', async () => {
      (sequelize.query as jest.Mock)
        .mockResolvedValueOnce([{ count: 0 }])
        .mockResolvedValueOnce([]);

      await campaignService.getCampaignLogs(10, { estado: 'fallido' });

      const countCall = (sequelize.query as jest.Mock).mock.calls[0];
      expect(countCall[0]).toContain('campania_id = :id AND estado = :estado');
      expect(countCall[1].replacements.estado).toBe('fallido');
    });
  });

  describe('updateCampaignStatus', () => {
    it('updates status and sets fecha_inicio when procesando', async () => {
      (sequelize.query as jest.Mock).mockResolvedValueOnce([]);

      await campaignService.updateCampaignStatus(1, 'procesando');

      const queryCall = (sequelize.query as jest.Mock).mock.calls[0];
      expect(queryCall[0]).toContain('fecha_inicio = COALESCE(fecha_inicio, NOW())');
      expect(queryCall[1].replacements).toEqual({ id: 1, estado: 'procesando' });
    });

    it('updates status and sets fecha_fin when completada', async () => {
      (sequelize.query as jest.Mock).mockResolvedValueOnce([]);

      await campaignService.updateCampaignStatus(1, 'completada');

      const queryCall = (sequelize.query as jest.Mock).mock.calls[0];
      expect(queryCall[0]).toContain('fecha_fin = NOW()');
      expect(queryCall[1].replacements).toEqual({ id: 1, estado: 'completada' });
    });

    it('updates status and sets fecha_fin when cancelada', async () => {
      (sequelize.query as jest.Mock).mockResolvedValueOnce([]);

      await campaignService.updateCampaignStatus(1, 'cancelada');

      const queryCall = (sequelize.query as jest.Mock).mock.calls[0];
      expect(queryCall[0]).toContain('fecha_fin = NOW()');
      expect(queryCall[1].replacements).toEqual({ id: 1, estado: 'cancelada' });
    });

    it('updates status without timestamp when pausada', async () => {
      (sequelize.query as jest.Mock).mockResolvedValueOnce([]);

      await campaignService.updateCampaignStatus(1, 'pausada');

      const queryCall = (sequelize.query as jest.Mock).mock.calls[0];
      expect(queryCall[0]).not.toContain('fecha_inicio');
      expect(queryCall[0]).not.toContain('fecha_fin');
      expect(queryCall[1].replacements).toEqual({ id: 1, estado: 'pausada' });
    });
  });

  describe('retryFailedRecipients', () => {
    it('resets failed recipients and updates campaign status', async () => {
      (sequelize.query as jest.Mock)
        .mockResolvedValueOnce([{ affectedRows: 3 }]) // update recipients
        .mockResolvedValueOnce([]); // update campaign

      const affected = await campaignService.retryFailedRecipients(7);
      expect(affected).toBe(3);

      expect(sequelize.query).toHaveBeenCalledTimes(2);

      const updateRecipientsCall = (sequelize.query as jest.Mock).mock.calls[0];
      expect(updateRecipientsCall[0]).toContain("estado = 'pendiente'");
      expect(updateRecipientsCall[0]).toContain('intentos = intentos + 1');
      expect(updateRecipientsCall[0]).toContain("estado = 'fallido'");

      const updateCampaignCall = (sequelize.query as jest.Mock).mock.calls[1];
      expect(updateCampaignCall[0]).toContain("fallidos_count = 0, estado = 'procesando', fecha_fin = NULL");
    });
  });
});

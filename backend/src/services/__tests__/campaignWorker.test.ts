import { campaignWorker } from '../campaignWorker';
import { campaignService } from '../campaignService';
import { emailTemplateService } from '../emailTemplateService';
import { getDefaultTemplate } from '../mailService';
import { transporter } from '@/config/mail';
import sequelize from '@/config/database';
import { logger } from '@/utils/logger';

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

jest.mock('../campaignService', () => ({
  campaignService: {
    getCampaignById: jest.fn(),
    updateCampaignStatus: jest.fn(),
    retryFailedRecipients: jest.fn(),
  },
}));

jest.mock('../emailTemplateService', () => ({
  emailTemplateService: {
    getTemplate: jest.fn(),
  },
}));

jest.mock('../mailService', () => ({
  getDefaultTemplate: jest.fn(),
}));

jest.mock('@/config/mail', () => ({
  transporter: {
    sendMail: jest.fn(),
  },
}));

jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('campaignWorker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    campaignWorker._resetStateForTesting();
  });

  describe('initCampaignWorker', () => {
    it('resets stuck sending states and resumes in-progress campaigns', async () => {
      const startSpy = jest.spyOn(campaignWorker, 'startCampaignWorker').mockImplementation(async () => {});

      (sequelize.query as jest.Mock)
        .mockResolvedValueOnce([]) // UPDATE sending -> pendiente
        .mockResolvedValueOnce([{ id: 10 }, { id: 20 }]); // SELECT campaigns in 'procesando' or 'en_cola'

      await campaignWorker.initCampaignWorker();

      expect(sequelize.query).toHaveBeenCalledWith(
        expect.stringContaining("estado = 'pendiente'"),
        expect.any(Object)
      );
      expect(sequelize.query).toHaveBeenCalledWith(
        expect.stringContaining("WHERE estado IN ('procesando', 'en_cola')"),
        expect.any(Object)
      );
      expect(startSpy).toHaveBeenCalledWith(10);
      expect(startSpy).toHaveBeenCalledWith(20);

      startSpy.mockRestore();
    });

    it('does not resume anything if no interrupted campaigns exist', async () => {
      const startSpy = jest.spyOn(campaignWorker, 'startCampaignWorker').mockImplementation(async () => {});

      (sequelize.query as jest.Mock)
        .mockResolvedValueOnce([]) // UPDATE
        .mockResolvedValueOnce([]); // SELECT empty

      await campaignWorker.initCampaignWorker();

      expect(startSpy).not.toHaveBeenCalled();

      startSpy.mockRestore();
    });

    it('handles database errors gracefully during initialization', async () => {
      (sequelize.query as jest.Mock).mockRejectedValueOnce(new Error('DB Connection Failed'));

      await expect(campaignWorker.initCampaignWorker()).resolves.not.toThrow();
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('[Crash-Recovery]'),
        expect.any(Error)
      );
    });
  });

  describe('startCampaignWorker and runLoop', () => {
    it('does not start duplicate worker if campaign is already running', async () => {
      const runLoopSpy = jest.spyOn(campaignWorker, 'runLoop').mockReturnValue(new Promise(() => {}));

      await campaignWorker.startCampaignWorker(1);
      await campaignWorker.startCampaignWorker(1);

      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('ya se encuentra en ejecución'));
      expect(runLoopSpy).toHaveBeenCalledTimes(1);

      runLoopSpy.mockRestore();
    });

    it('logs error and returns if campaign is not found', async () => {
      (campaignService.getCampaignById as jest.Mock).mockResolvedValueOnce(null);

      await campaignWorker.runLoop(999);

      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('no encontrada para procesar'));
      expect(campaignService.updateCampaignStatus).not.toHaveBeenCalled();
    });

    it('processes pending recipients, sends emails, updates counts, and completes campaign', async () => {
      const mockCampaign = {
        id: 1,
        nombre: 'Campaña Primavera',
        template_key: 'custom_key',
        asunto: 'Hola {{nombre}}',
        estado: 'en_cola',
      };

      (campaignService.getCampaignById as jest.Mock).mockResolvedValueOnce(mockCampaign);
      (emailTemplateService.getTemplate as jest.Mock).mockResolvedValueOnce({
        subject: 'Oferta especial {{nombre}}',
        html_content: '<p>Hola {{nombre}}, tu correo es {{email}}</p>',
      });

      const recipient1 = { id: 101, campania_id: 1, email: 'juan@test.com', nombre: 'Juan', estado: 'pendiente' };
      const recipient2 = { id: 102, campania_id: 1, email: 'maria@test.com', nombre: null, estado: 'pendiente' };

      (sequelize.query as jest.Mock)
        .mockResolvedValueOnce([recipient1, recipient2]) // Batch 1
        .mockResolvedValueOnce([]) // UPDATE recipient 101 -> enviando
        .mockResolvedValueOnce([]) // UPDATE recipient 101 -> enviado
        .mockResolvedValueOnce([]) // UPDATE campaign -> increment enviados_count
        .mockResolvedValueOnce([]) // UPDATE recipient 102 -> enviando
        .mockResolvedValueOnce([]) // UPDATE recipient 102 -> enviado
        .mockResolvedValueOnce([]) // UPDATE campaign -> increment enviados_count
        .mockResolvedValueOnce([]); // Batch 2 (empty -> complete)

      (transporter.sendMail as jest.Mock).mockResolvedValue({ messageId: 'msg-123' });

      await campaignWorker.runLoop(1);

      expect(campaignService.updateCampaignStatus).toHaveBeenCalledWith(1, 'procesando');
      expect(transporter.sendMail).toHaveBeenCalledTimes(2);

      // Verify recipient 1 personalized values
      expect(transporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'juan@test.com',
          subject: 'Oferta especial Juan',
          html: '<p>Hola Juan, tu correo es juan@test.com</p>',
        })
      );

      // Verify recipient 2 fallback to 'Cliente' for null name
      expect(transporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'maria@test.com',
          subject: 'Oferta especial Cliente',
          html: '<p>Hola Cliente, tu correo es maria@test.com</p>',
        })
      );

      // Verify campaign completed
      expect(campaignService.updateCampaignStatus).toHaveBeenCalledWith(1, 'completada');
    });

    it('falls back to getDefaultTemplate if template html_content is missing', async () => {
      const mockCampaign = {
        id: 2,
        nombre: 'Campaña Fallback',
        template_key: 'compra_confirmacion',
        asunto: '',
        estado: 'en_cola',
      };

      (campaignService.getCampaignById as jest.Mock).mockResolvedValueOnce(mockCampaign);
      (emailTemplateService.getTemplate as jest.Mock).mockResolvedValueOnce(null);
      (getDefaultTemplate as jest.Mock).mockReturnValueOnce({
        subject: 'Default Subject',
        html: '<p>Default HTML {{nombre}}</p>',
      });

      const recipient = { id: 201, campania_id: 2, email: 'test@test.com', nombre: 'Carlos', estado: 'pendiente' };

      (sequelize.query as jest.Mock)
        .mockResolvedValueOnce([recipient]) // Batch 1
        .mockResolvedValueOnce([]) // enviando
        .mockResolvedValueOnce([]) // enviado
        .mockResolvedValueOnce([]) // enviados_count
        .mockResolvedValueOnce([]); // Batch 2 (empty)

      (transporter.sendMail as jest.Mock).mockResolvedValue({ messageId: 'msg-456' });

      await campaignWorker.runLoop(2);

      expect(getDefaultTemplate).toHaveBeenCalledWith('compra_confirmacion');
      expect(transporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'Default Subject',
          html: '<p>Default HTML Carlos</p>',
        })
      );
      expect(campaignService.updateCampaignStatus).toHaveBeenCalledWith(2, 'completada');
    });

    it('handles email sending failure by updating recipient to fallido and incrementing fallidos_count', async () => {
      const mockCampaign = {
        id: 3,
        nombre: 'Campaña Error',
        template_key: 'compra_confirmacion',
        asunto: 'Asunto',
        estado: 'en_cola',
      };

      (campaignService.getCampaignById as jest.Mock).mockResolvedValueOnce(mockCampaign);
      (emailTemplateService.getTemplate as jest.Mock).mockResolvedValueOnce({
        subject: 'Asunto',
        html_content: '<p>Test</p>',
      });

      const recipient = { id: 301, campania_id: 3, email: 'invalido@test.com', nombre: 'Test', estado: 'pendiente' };

      (sequelize.query as jest.Mock)
        .mockResolvedValueOnce([recipient]) // Batch 1
        .mockResolvedValueOnce([]) // enviando
        .mockResolvedValueOnce([]) // UPDATE recipient -> fallido
        .mockResolvedValueOnce([]) // UPDATE campaign -> increment fallidos_count
        .mockResolvedValueOnce([]); // Batch 2 (empty)

      (transporter.sendMail as jest.Mock).mockRejectedValueOnce(new Error('SMTP Timeout'));

      await campaignWorker.runLoop(3);

      expect(sequelize.query).toHaveBeenCalledWith(
        expect.stringContaining("estado = 'fallido'"),
        expect.objectContaining({
          replacements: expect.objectContaining({ id: 301, errorMsg: 'SMTP Timeout' }),
        })
      );
      expect(sequelize.query).toHaveBeenCalledWith(
        expect.stringContaining('fallidos_count = fallidos_count + 1'),
        expect.objectContaining({
          replacements: expect.objectContaining({ campaignId: 3 }),
        })
      );
      expect(campaignService.updateCampaignStatus).toHaveBeenCalledWith(3, 'completada');
    });
  });

  describe('pause, resume, and cancel', () => {
    it('pauses campaign and stops loop execution', async () => {
      const mockCampaign = {
        id: 4,
        nombre: 'Campaña Pausable',
        template_key: 'test',
        asunto: 'Test',
      };

      (campaignService.getCampaignById as jest.Mock).mockResolvedValueOnce(mockCampaign);
      (emailTemplateService.getTemplate as jest.Mock).mockResolvedValueOnce({
        subject: 'S',
        html_content: '<p>H</p>',
      });

      // Pause before loop processes batch
      await campaignWorker.pauseCampaign(4);
      await campaignWorker.runLoop(4);

      expect(campaignService.updateCampaignStatus).toHaveBeenCalledWith(4, 'pausada');
      // Should not query recipients because it exited at the top of the loop
      expect(sequelize.query).not.toHaveBeenCalled();
    });

    it('cancels campaign and stops loop execution', async () => {
      const mockCampaign = {
        id: 5,
        nombre: 'Campaña Cancelable',
        template_key: 'test',
        asunto: 'Test',
      };

      (campaignService.getCampaignById as jest.Mock).mockResolvedValueOnce(mockCampaign);
      (emailTemplateService.getTemplate as jest.Mock).mockResolvedValueOnce({
        subject: 'S',
        html_content: '<p>H</p>',
      });

      await campaignWorker.cancelCampaign(5);
      await campaignWorker.runLoop(5);

      expect(campaignService.updateCampaignStatus).toHaveBeenCalledWith(5, 'cancelada');
      expect(sequelize.query).not.toHaveBeenCalled();
    });

    it('resumes campaign by calling startCampaignWorker', async () => {
      const startSpy = jest.spyOn(campaignWorker, 'startCampaignWorker').mockImplementation(async () => {});

      await campaignWorker.resumeCampaign(6);

      expect(startSpy).toHaveBeenCalledWith(6);
      startSpy.mockRestore();
    });

    it('retries failed recipients and restarts worker', async () => {
      const startSpy = jest.spyOn(campaignWorker, 'startCampaignWorker').mockImplementation(async () => {});

      await campaignWorker.retryFailed(7);

      expect(campaignService.retryFailedRecipients).toHaveBeenCalledWith(7);
      expect(startSpy).toHaveBeenCalledWith(7);

      startSpy.mockRestore();
    });
  });
});

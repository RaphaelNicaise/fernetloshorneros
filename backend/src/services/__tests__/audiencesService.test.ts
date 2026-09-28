import { audiencesService, AudienceFilterOptions, AudienceRecipient } from '../audiencesService';
import sequelize from '@/config/database';

jest.mock('@/config/database', () => ({
  __esModule: true,
  default: {
    query: jest.fn(),
  },
}));

describe('audiencesService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('parseManualList', () => {
    it('should parse comma-separated emails and names correctly', () => {
      const input = `
        juan@gmail.com, Juan Perez
        pedro@hotmail.com , Pedro Gomez
        solo@email.com
        invalido
      `;
      const result = audiencesService.parseManualList(input);
      expect(result).toEqual([
        { email: 'juan@gmail.com', nombre: 'Juan Perez' },
        { email: 'pedro@hotmail.com', nombre: 'Pedro Gomez' },
        { email: 'solo@email.com', nombre: 'Amigo/a' },
      ]);
    });

    it('should return empty array for empty or undefined input', () => {
      expect(audiencesService.parseManualList('')).toEqual([]);
      expect(audiencesService.parseManualList(undefined)).toEqual([]);
    });
  });

  describe('getRecipients and countRecipients', () => {
    it('should build query with buyers lote and status filters', async () => {
      const mockDbRecipients = [
        { email: 'buyer1@test.com', nombre: 'Buyer One' },
        { email: 'buyer2@test.com', nombre: 'Buyer Two' },
      ];
      (sequelize.query as jest.Mock).mockResolvedValueOnce(mockDbRecipients);

      const options: AudienceFilterOptions = {
        audiences: ['buyers'],
        buyerLoteId: 2,
        buyerStatuses: ['para_despachar', 'enviado'],
        provinces: ['Córdoba'],
      };

      const recipients = await audiencesService.getRecipients(options);
      expect(recipients).toHaveLength(2);
      expect(recipients[0].email).toBe('buyer1@test.com');

      expect(sequelize.query).toHaveBeenCalledTimes(1);
      const queryCall = (sequelize.query as jest.Mock).mock.calls[0];
      const sql = queryCall[0];
      const config = queryCall[1];

      // Verificar que une pedidos y envíos
      expect(sql).toContain('FROM pedidos p');
      expect(sql).toContain('JOIN envios e ON p.id = e.id_pedido');
      // Verificar filtro de lote
      expect(sql).toContain('p.lote_id = :buyerLoteId');
      expect(config.replacements.buyerLoteId).toBe(2);
      // Verificar filtro de estados (para_despachar y enviado)
      expect(sql).toContain("e.status = 'shipped'");
      expect(sql).toContain("e.status = 'pending'");
      // Verificar filtro de provincia
      expect(sql).toContain('e.provincia IN (:provinces)');
      expect(config.replacements.provinces).toEqual(['Córdoba']);
    });

    it('should handle all lotes when buyerLoteId is "all" or null', async () => {
      (sequelize.query as jest.Mock).mockResolvedValueOnce([
        { email: 'buyer@test.com', nombre: 'Buyer' },
      ]);

      const options: AudienceFilterOptions = {
        audiences: ['buyers'],
        buyerLoteId: 'all',
        buyerStatuses: ['para_despachar'],
      };

      const recipients = await audiencesService.getRecipients(options);
      expect(recipients).toHaveLength(1);

      const queryCall = (sequelize.query as jest.Mock).mock.calls[0];
      const sql = queryCall[0];
      expect(sql).not.toContain('p.lote_id = :buyerLoteId');
    });

    it('should deduplicate recipients between DB and manual list', async () => {
      (sequelize.query as jest.Mock).mockResolvedValue([
        { email: 'test@example.com', nombre: 'Test DB' },
      ]);

      const options: AudienceFilterOptions = {
        audiences: ['buyers'],
        manualList: 'TEST@EXAMPLE.COM, Test Manual\notro@example.com, Otro',
      };

      const recipients = await audiencesService.getRecipients(options);
      expect(recipients).toHaveLength(2);
      expect(recipients.map((r: AudienceRecipient) => r.email)).toEqual(['test@example.com', 'otro@example.com']);

      const count = await audiencesService.countRecipients(options);
      expect(count).toBe(2);
    });

    it('should query waitlist when waitlist audience is requested', async () => {
      (sequelize.query as jest.Mock).mockResolvedValueOnce([
        { email: 'wait@test.com', nombre: 'Waitlist User' },
      ]);

      const options: AudienceFilterOptions = {
        audiences: ['waitlist'],
        provinces: ['Santa Fe'],
      };

      const recipients = await audiencesService.getRecipients(options);
      expect(recipients).toHaveLength(1);

      const sql = (sequelize.query as jest.Mock).mock.calls[0][0];
      expect(sql).toContain('FROM usuario_lista_espera');
      expect(sql).toContain('AND provincia IN (:provinces)');
    });
  });
});

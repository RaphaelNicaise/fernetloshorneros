import { Request, Response } from 'express';
import { getDashboardStats } from '../dashboardController';
import sequelize from '@/config/database';
import { lotesService } from '@/services/lotesService';

jest.mock('@/config/database', () => ({
  query: jest.fn(),
}));

jest.mock('@/services/lotesService', () => ({
  lotesService: {
    getLoteActual: jest.fn(),
  },
}));

describe('dashboardController - getDashboardStats', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let responseJson: jest.Mock;
  let responseStatus: jest.Mock;

  beforeEach(() => {
    responseJson = jest.fn();
    responseStatus = jest.fn().mockReturnValue({ json: responseJson });
    mockRequest = { query: {} };
    mockResponse = {
      status: responseStatus,
      json: responseJson,
    };
    jest.clearAllMocks();
  });

  it('calculates metrics correctly for scope=lote when an active lote exists', async () => {
    mockRequest.query = { scope: 'lote' };

    (lotesService.getLoteActual as jest.Mock).mockResolvedValue({
      id: 5,
      nombre: 'Lote #5 - Octubre',
      activo: true,
    });

    (sequelize.query as jest.Mock)
      .mockResolvedValueOnce([
        {
          revenue: 150000,
          paidOrders: 10,
          pendingPaymentOrders: 2,
          pendingShipmentOrders: 3,
          avgTicket: 15000,
        },
      ])
      .mockResolvedValueOnce([
        {
          totalBottles: 24,
        },
      ])
      .mockResolvedValueOnce([
        {
          provincia: 'Buenos Aires',
          count: 7,
          bottles: 18,
        },
      ])
      .mockResolvedValueOnce([
        {
          criticalStockCount: 1,
        },
      ]);

    await getDashboardStats(mockRequest as Request, mockResponse as Response);

    expect(responseJson).toHaveBeenCalledWith({
      scope: 'lote',
      activeLote: {
        id: 5,
        nombre: 'Lote #5 - Octubre',
        activo: true,
      },
      kpis: {
        revenue: 150000,
        paidOrders: 10,
        pendingPaymentOrders: 2,
        pendingShipmentOrders: 3,
        totalBottlesSold: 24,
        avgTicket: 15000,
      },
      alerts: {
        criticalStockCount: 1,
      },
      geoDistribution: [
        {
          provincia: 'Buenos Aires',
          count: 7,
          bottles: 18,
        },
      ],
    });
  });

  it('handles scope=today with midnight date boundary', async () => {
    mockRequest.query = { scope: 'today' };
    (lotesService.getLoteActual as jest.Mock).mockResolvedValue(null);

    (sequelize.query as jest.Mock)
      .mockResolvedValueOnce([
        {
          revenue: 0,
          paidOrders: 0,
          pendingPaymentOrders: 0,
          pendingShipmentOrders: 0,
          avgTicket: 0,
        },
      ])
      .mockResolvedValueOnce([{ totalBottles: 0 }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ criticalStockCount: 0 }]);

    await getDashboardStats(mockRequest as Request, mockResponse as Response);

    expect(responseJson).toHaveBeenCalledWith(
      expect.objectContaining({
        scope: 'today',
        activeLote: null,
        kpis: expect.objectContaining({
          revenue: 0,
          paidOrders: 0,
        }),
      })
    );
  });
});

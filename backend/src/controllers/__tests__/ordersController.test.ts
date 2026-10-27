import { Request, Response } from 'express';
import { listOrders } from '../ordersController';
import * as ordersService from '@/services/ordersService';

jest.mock('@/services/ordersService', () => ({
  getAllOrders: jest.fn(),
}));

describe('ordersController - listOrders', () => {
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

  it('passes limit and lote_id to getAllOrders when provided', async () => {
    mockRequest.query = { limit: '50', lote_id: '3' };
    const mockOrders = [
      {
        id: 1,
        total: 25000,
        status: 'paid',
        items_summary: '2x Fernet 750ml',
        provincia: 'Buenos Aires',
        ciudad: 'Bahía Blanca',
      },
    ];
    (ordersService.getAllOrders as jest.Mock).mockResolvedValue(mockOrders);

    await listOrders(mockRequest as Request, mockResponse as Response);

    expect(ordersService.getAllOrders).toHaveBeenCalledWith(3, 50);
    expect(responseJson).toHaveBeenCalledWith(mockOrders);
  });
});

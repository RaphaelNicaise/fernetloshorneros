import { Request, Response } from "express";
import { cancelOrderManually } from "../paymentsController";
import * as ordersService from "@/services/ordersService";
import * as productService from "@/services/productService";

jest.mock("@/services/ordersService");
jest.mock("@/services/productService");

describe("paymentsController", () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let responseJson: jest.Mock;
    let responseStatus: jest.Mock;

    beforeEach(() => {
        responseJson = jest.fn();
        responseStatus = jest.fn().mockReturnValue({ json: responseJson });
        mockRequest = {};
        mockResponse = {
            status: responseStatus,
            json: responseJson,
        };
        jest.clearAllMocks();
    });

    describe("cancelOrderManually", () => {
        it("should return 404 if order is not found", async () => {
            mockRequest.params = { reference: "non-existent-ref" };
            (ordersService.getOrderByReference as jest.Mock).mockResolvedValue(null);

            await cancelOrderManually(mockRequest as Request, mockResponse as Response);

            expect(responseStatus).toHaveBeenCalledWith(404);
            expect(responseJson).toHaveBeenCalledWith({ error: "Orden no encontrada" });
        });

        it("should return 400 if order is not pending", async () => {
            mockRequest.params = { reference: "paid-ref" };
            (ordersService.getOrderByReference as jest.Mock).mockResolvedValue({ id: 1, status: "paid" });

            await cancelOrderManually(mockRequest as Request, mockResponse as Response);

            expect(responseStatus).toHaveBeenCalledWith(400);
            expect(responseJson).toHaveBeenCalledWith({ error: "La orden no se puede cancelar porque su estado es: paid" });
        });

        it("should cancel order and release stock if stock was reserved", async () => {
            mockRequest.params = { reference: "pending-ref" };
            const mockOrder = { id: 1, status: "pending" };
            
            (ordersService.getOrderByReference as jest.Mock).mockResolvedValue(mockOrder);
            (ordersService.isOrderStockReserved as jest.Mock).mockResolvedValue(true);
            (ordersService.getOrderItems as jest.Mock).mockResolvedValue([
                { id_producto: 10, cantidad: 2 }
            ]);

            await cancelOrderManually(mockRequest as Request, mockResponse as Response);

            expect(productService.increaseStock).toHaveBeenCalledWith(10, 2);
            expect(ordersService.markOrderStockReleased).toHaveBeenCalledWith(1);
            expect(ordersService.updateOrderStatus).toHaveBeenCalledWith(1, "cancelled");
            expect(responseJson).toHaveBeenCalledWith({ message: "Orden cancelada exitosamente" });
        });
    });
});

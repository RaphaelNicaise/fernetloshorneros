import { Router } from 'express';
import { adminAuth } from '@/middleware/adminAuth';
import { listOrders, listOrderItems, cancelOrderShipment } from '@/controllers/ordersController';

const ordersRouter = Router();

ordersRouter.get('/', adminAuth, listOrders);
ordersRouter.get('/:id/items', adminAuth, listOrderItems);
ordersRouter.post('/:id/cancel-shipment', adminAuth, cancelOrderShipment);

export default ordersRouter;

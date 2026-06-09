import { Router } from 'express';
import { adminAuth } from '@/middleware/adminAuth';
import { listOrders, listOrderItems, cancelOrderShipment, setOrderTracking } from '@/controllers/ordersController';

const ordersRouter = Router();

ordersRouter.get('/', adminAuth, listOrders);
ordersRouter.get('/:id/items', adminAuth, listOrderItems);
ordersRouter.post('/:id/cancel-shipment', adminAuth, cancelOrderShipment);
ordersRouter.post('/:id/set-tracking', adminAuth, setOrderTracking);

export default ordersRouter;

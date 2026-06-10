import { Router } from 'express';
import { adminAuth } from '@/middleware/adminAuth';
import { 
  listOrders, 
  listOrderItems, 
  cancelOrderShipment, 
  setOrderTracking, 
  updateOrderStatusHandler, 
  bulkUpdateOrderStatusHandler 
} from '@/controllers/ordersController';

const ordersRouter = Router();

ordersRouter.get('/', adminAuth, listOrders);
ordersRouter.get('/:id/items', adminAuth, listOrderItems);
ordersRouter.post('/bulk-update-status', adminAuth, bulkUpdateOrderStatusHandler);
ordersRouter.post('/:id/update-status', adminAuth, updateOrderStatusHandler);
ordersRouter.post('/:id/cancel-shipment', adminAuth, cancelOrderShipment);
ordersRouter.post('/:id/set-tracking', adminAuth, setOrderTracking);

export default ordersRouter;

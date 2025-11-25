import { logger } from '../config/logger.js';

export const publishEvent = (eventType, data) => {
  const event = {
    type: eventType,
    timestamp: new Date().toISOString(),
    data
  };

  logger.info({ event }, `Event published: ${eventType}`);
};

export const publishOrderCreated = (order) => {
  publishEvent('ORDER_CREATED', {
    orderId: order.id,
    userId: order.user_id,
    totalAmount: order.total_amount,
    status: order.status
  });
};

export const publishOrderStatusUpdated = (order, previousStatus) => {
  publishEvent('ORDER_STATUS_UPDATED', {
    orderId: order.id,
    userId: order.user_id,
    previousStatus,
    newStatus: order.status,
    updatedAt: order.updated_at
  });
};

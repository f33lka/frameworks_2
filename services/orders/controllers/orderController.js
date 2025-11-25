import { supabase } from '../config/supabase.js';
import { logger } from '../config/logger.js';
import { createOrderSchema, updateOrderStatusSchema, listOrdersSchema } from '../validators/orderSchemas.js';
import { publishOrderCreated, publishOrderStatusUpdated } from '../events/orderEvents.js';

export const createOrder = async (req, res) => {
  try {
    const validatedData = createOrderSchema.parse(req.body);
    const { items } = validatedData;

    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('id', req.user.id)
      .maybeSingle();

    if (!user) {
      logger.warn({ requestId: req.id, userId: req.user.id }, 'User not found');
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      });
    }

    const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const { data: newOrder, error } = await supabase
      .from('orders')
      .insert({
        user_id: req.user.id,
        items,
        total_amount: totalAmount,
        status: 'created'
      })
      .select()
      .single();

    if (error) {
      logger.error({ requestId: req.id, error }, 'Failed to create order');
      return res.status(500).json({
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to create order'
        }
      });
    }

    publishOrderCreated(newOrder);

    logger.info({ requestId: req.id, orderId: newOrder.id }, 'Order created successfully');

    res.status(201).json({
      success: true,
      data: {
        id: newOrder.id,
        userId: newOrder.user_id,
        items: newOrder.items,
        totalAmount: newOrder.total_amount,
        status: newOrder.status,
        createdAt: newOrder.created_at
      }
    });
  } catch (error) {
    if (error.name === 'ZodError') {
      logger.warn({ requestId: req.id, errors: error.errors }, 'Validation failed');
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.errors[0].message
        }
      });
    }

    logger.error({ requestId: req.id, error: error.message }, 'Create order error');
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    });
  }
};

export const getOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: order, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !order) {
      logger.warn({ requestId: req.id, orderId: id }, 'Order not found');
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Order not found'
        }
      });
    }

    const isManager = req.user.roles.includes('manager') || req.user.roles.includes('admin');

    if (order.user_id !== req.user.id && !isManager) {
      logger.warn({ requestId: req.id, userId: req.user.id, orderId: id }, 'Unauthorized access attempt');
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to access this order'
        }
      });
    }

    logger.info({ requestId: req.id, orderId: order.id }, 'Order fetched successfully');

    res.json({
      success: true,
      data: {
        id: order.id,
        userId: order.user_id,
        items: order.items,
        totalAmount: order.total_amount,
        status: order.status,
        createdAt: order.created_at,
        updatedAt: order.updated_at
      }
    });
  } catch (error) {
    logger.error({ requestId: req.id, error: error.message }, 'Get order error');
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    });
  }
};

export const listOrders = async (req, res) => {
  try {
    const validatedQuery = listOrdersSchema.parse(req.query);
    const { page, limit, status, sortBy, sortOrder } = validatedQuery;

    const offset = (page - 1) * limit;

    let query = supabase
      .from('orders')
      .select('*', { count: 'exact' });

    const isManager = req.user.roles.includes('manager') || req.user.roles.includes('admin');

    if (!isManager) {
      query = query.eq('user_id', req.user.id);
    }

    if (status) {
      query = query.eq('status', status);
    }

    query = query
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(offset, offset + limit - 1);

    const { data: orders, error, count } = await query;

    if (error) {
      logger.error({ requestId: req.id, error }, 'Failed to fetch orders');
      return res.status(500).json({
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to fetch orders'
        }
      });
    }

    const totalPages = Math.ceil(count / limit);

    logger.info({ requestId: req.id, page, limit, total: count }, 'Orders list fetched');

    res.json({
      success: true,
      data: {
        orders: orders.map(order => ({
          id: order.id,
          userId: order.user_id,
          items: order.items,
          totalAmount: order.total_amount,
          status: order.status,
          createdAt: order.created_at,
          updatedAt: order.updated_at
        })),
        pagination: {
          page,
          limit,
          total: count,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    if (error.name === 'ZodError') {
      logger.warn({ requestId: req.id, errors: error.errors }, 'Validation failed');
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.errors[0].message
        }
      });
    }

    logger.error({ requestId: req.id, error: error.message }, 'List orders error');
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    });
  }
};

export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const validatedData = updateOrderStatusSchema.parse(req.body);
    const { status } = validatedData;

    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (fetchError || !order) {
      logger.warn({ requestId: req.id, orderId: id }, 'Order not found');
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Order not found'
        }
      });
    }

    const isManager = req.user.roles.includes('manager') || req.user.roles.includes('admin');

    if (order.user_id !== req.user.id && !isManager) {
      logger.warn({ requestId: req.id, userId: req.user.id, orderId: id }, 'Unauthorized update attempt');
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to update this order'
        }
      });
    }

    const previousStatus = order.status;

    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      logger.error({ requestId: req.id, orderId: id, error: updateError }, 'Failed to update order status');
      return res.status(500).json({
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to update order status'
        }
      });
    }

    publishOrderStatusUpdated(updatedOrder, previousStatus);

    logger.info({ requestId: req.id, orderId: updatedOrder.id, previousStatus, newStatus: status }, 'Order status updated');

    res.json({
      success: true,
      data: {
        id: updatedOrder.id,
        userId: updatedOrder.user_id,
        items: updatedOrder.items,
        totalAmount: updatedOrder.total_amount,
        status: updatedOrder.status,
        updatedAt: updatedOrder.updated_at
      }
    });
  } catch (error) {
    if (error.name === 'ZodError') {
      logger.warn({ requestId: req.id, errors: error.errors }, 'Validation failed');
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.errors[0].message
        }
      });
    }

    logger.error({ requestId: req.id, error: error.message }, 'Update order status error');
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    });
  }
};

export const cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (fetchError || !order) {
      logger.warn({ requestId: req.id, orderId: id }, 'Order not found');
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Order not found'
        }
      });
    }

    if (order.user_id !== req.user.id) {
      logger.warn({ requestId: req.id, userId: req.user.id, orderId: id }, 'Unauthorized cancel attempt');
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You can only cancel your own orders'
        }
      });
    }

    if (order.status === 'completed' || order.status === 'cancelled') {
      logger.warn({ requestId: req.id, orderId: id, status: order.status }, 'Cannot cancel order in current status');
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_STATUS',
          message: `Cannot cancel order with status: ${order.status}`
        }
      });
    }

    const previousStatus = order.status;

    const { data: cancelledOrder, error: updateError } = await supabase
      .from('orders')
      .update({ status: 'cancelled' })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      logger.error({ requestId: req.id, orderId: id, error: updateError }, 'Failed to cancel order');
      return res.status(500).json({
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to cancel order'
        }
      });
    }

    publishOrderStatusUpdated(cancelledOrder, previousStatus);

    logger.info({ requestId: req.id, orderId: cancelledOrder.id }, 'Order cancelled successfully');

    res.json({
      success: true,
      data: {
        id: cancelledOrder.id,
        userId: cancelledOrder.user_id,
        items: cancelledOrder.items,
        totalAmount: cancelledOrder.total_amount,
        status: cancelledOrder.status,
        updatedAt: cancelledOrder.updated_at
      }
    });
  } catch (error) {
    logger.error({ requestId: req.id, error: error.message }, 'Cancel order error');
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    });
  }
};

import { z } from 'zod';

const orderItemSchema = z.object({
  productName: z.string().min(1, 'Product name is required'),
  quantity: z.number().int().positive('Quantity must be positive'),
  price: z.number().positive('Price must be positive')
});

export const createOrderSchema = z.object({
  items: z.array(orderItemSchema).min(1, 'At least one item is required')
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(['created', 'in_progress', 'completed', 'cancelled'], {
    errorMap: () => ({ message: 'Invalid status' })
  })
});

export const listOrdersSchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).default('10'),
  status: z.enum(['created', 'in_progress', 'completed', 'cancelled']).optional(),
  sortBy: z.enum(['created_at', 'total_amount', 'status']).default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

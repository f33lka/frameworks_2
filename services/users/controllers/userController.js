import { supabase } from '../config/supabase.js';
import { logger } from '../config/logger.js';
import { updateProfileSchema, listUsersSchema } from '../validators/userSchemas.js';

export const getProfile = async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, name, roles, created_at, updated_at')
      .eq('id', req.user.id)
      .maybeSingle();

    if (error || !user) {
      logger.error({ requestId: req.id, userId: req.user.id, error }, 'Failed to fetch profile');
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'User not found'
        }
      });
    }

    logger.info({ requestId: req.id, userId: user.id }, 'Profile fetched successfully');

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        roles: user.roles,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      }
    });
  } catch (error) {
    logger.error({ requestId: req.id, error: error.message }, 'Get profile error');
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const validatedData = updateProfileSchema.parse(req.body);

    const updates = {};
    if (validatedData.name) updates.name = validatedData.name;
    if (validatedData.email) updates.email = validatedData.email;

    if (validatedData.email) {
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', validatedData.email)
        .neq('id', req.user.id)
        .maybeSingle();

      if (existingUser) {
        logger.warn({ requestId: req.id, email: validatedData.email }, 'Email already in use');
        return res.status(400).json({
          success: false,
          error: {
            code: 'EMAIL_EXISTS',
            message: 'Email already in use'
          }
        });
      }
    }

    const { data: updatedUser, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', req.user.id)
      .select('id, email, name, roles, updated_at')
      .single();

    if (error) {
      logger.error({ requestId: req.id, userId: req.user.id, error }, 'Failed to update profile');
      return res.status(500).json({
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to update profile'
        }
      });
    }

    logger.info({ requestId: req.id, userId: updatedUser.id }, 'Profile updated successfully');

    res.json({
      success: true,
      data: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        roles: updatedUser.roles,
        updatedAt: updatedUser.updated_at
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

    logger.error({ requestId: req.id, error: error.message }, 'Update profile error');
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    });
  }
};

export const listUsers = async (req, res) => {
  try {
    const validatedQuery = listUsersSchema.parse(req.query);
    const { page, limit, role } = validatedQuery;

    const offset = (page - 1) * limit;

    let query = supabase
      .from('users')
      .select('id, email, name, roles, created_at', { count: 'exact' });

    if (role) {
      query = query.contains('roles', [role]);
    }

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: users, error, count } = await query;

    if (error) {
      logger.error({ requestId: req.id, error }, 'Failed to fetch users');
      return res.status(500).json({
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to fetch users'
        }
      });
    }

    const totalPages = Math.ceil(count / limit);

    logger.info({ requestId: req.id, page, limit, total: count }, 'Users list fetched');

    res.json({
      success: true,
      data: {
        users: users.map(user => ({
          id: user.id,
          email: user.email,
          name: user.name,
          roles: user.roles,
          createdAt: user.created_at
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

    logger.error({ requestId: req.id, error: error.message }, 'List users error');
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    });
  }
};

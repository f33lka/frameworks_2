import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabase } from '../config/supabase.js';
import { logger } from '../config/logger.js';
import { registerSchema, loginSchema } from '../validators/userSchemas.js';

export const register = async (req, res) => {
  try {
    const validatedData = registerSchema.parse(req.body);
    const { email, password, name } = validatedData;

    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existingUser) {
      logger.warn({ requestId: req.id, email }, 'Registration attempt with existing email');
      return res.status(400).json({
        success: false,
        error: {
          code: 'EMAIL_EXISTS',
          message: 'User with this email already exists'
        }
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const { data: newUser, error } = await supabase
      .from('users')
      .insert({
        email,
        password_hash: passwordHash,
        name,
        roles: ['user']
      })
      .select('id, email, name, roles, created_at')
      .single();

    if (error) {
      logger.error({ requestId: req.id, error }, 'Failed to create user');
      return res.status(500).json({
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to create user'
        }
      });
    }

    logger.info({ requestId: req.id, userId: newUser.id }, 'User registered successfully');

    res.status(201).json({
      success: true,
      data: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        roles: newUser.roles,
        createdAt: newUser.created_at
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

    logger.error({ requestId: req.id, error: error.message }, 'Registration error');
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    });
  }
};

export const login = async (req, res) => {
  try {
    const validatedData = loginSchema.parse(req.body);
    const { email, password } = validatedData;

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (error || !user) {
      logger.warn({ requestId: req.id, email }, 'Login attempt with non-existent email');
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password'
        }
      });
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      logger.warn({ requestId: req.id, email }, 'Login attempt with invalid password');
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password'
        }
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        roles: user.roles
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    logger.info({ requestId: req.id, userId: user.id }, 'User logged in successfully');

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          roles: user.roles
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

    logger.error({ requestId: req.id, error: error.message }, 'Login error');
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    });
  }
};

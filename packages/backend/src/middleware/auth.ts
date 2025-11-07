import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { CustomError } from './errorHandler';
import { User } from '../models/User';
import { AuthenticatedRequest } from '../types/express';

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return next(new CustomError('Access token required', 401));
    }

    const decoded = jwt.verify(token, config.jwt.secret) as any;

    // Get user from database to ensure they still exist and are active
    const user = await User.findById(decoded.userId);

    if (!user || !user.is_active) {
      return next(new CustomError('Invalid or expired token', 401));
    }

    req.user = {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name
    };

    return next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return next(new CustomError('Invalid token', 401));
    } else if (error instanceof jwt.TokenExpiredError) {
      return next(new CustomError('Token expired', 401));
    }
    return next(error as any);
  }
};

export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, config.jwt.secret) as any;
      const user = await User.findById(decoded.userId);

      if (user && user.is_active) {
        req.user = {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name
        };
      }
    }

    next();
  } catch (error) {
    // For optional auth, we don't throw errors, just continue without user
    next();
  }
};


// Backwards-compatible alias expected by some routes
export const authMiddleware = authenticateToken;

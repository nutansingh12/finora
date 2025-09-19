import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { CustomError } from './errorHandler';

export const validateRequest = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => error.msg);
    throw new CustomError(errorMessages.join(', '), 400);
  }
  
  next();
};

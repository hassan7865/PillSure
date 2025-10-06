import { Request, Response, NextFunction } from "express";
import { createErrorResponse } from "../core/api-response";

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
  code?: string;
  keyValue?: any;
  errors?: any;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let error = { ...err };
  error.message = err.message;

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = createError(message, 404);
  }

  // Mongoose duplicate key
  if (err.code === '11000') {
    const message = 'Duplicate field value entered';
    error = createError(message, 400);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map((val: any) => val.message).join(', ');
    error = createError(message, 400);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = createError(message, 401);
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = createError(message, 401);
  }

  // Database connection errors
  if (err.name === 'DatabaseError' || err.message?.includes('database')) {
    const message = 'Database connection error';
    error = createError(message, 500);
  }

  const statusCode = error.statusCode || 500;
  const message = error.message || "Internal Server Error";

  res.status(statusCode).json(createErrorResponse(
    message,
    process.env.NODE_ENV === "development" ? err.stack : undefined
  ));
};

export const createError = (message: string, statusCode: number = 500): AppError => {
  const error = new Error(message) as AppError;
  error.statusCode = statusCode;
  error.isOperational = true;
  return error;
};

export const notFound = (req: Request, res: Response, next: NextFunction) => {
  const error = createError(`Route ${req.originalUrl} not found`, 404);
  next(error);
};

// Common error types
export const BadRequestError = (message: string = "Bad Request") => 
  createError(message, 400);

export const UnauthorizedError = (message: string = "Unauthorized") => 
  createError(message, 401);

export const ForbiddenError = (message: string = "Forbidden") => 
  createError(message, 403);

export const NotFoundError = (message: string = "Not Found") => 
  createError(message, 404);

export const ConflictError = (message: string = "Conflict") => 
  createError(message, 409);

export const ValidationError = (message: string = "Validation Error") => 
  createError(message, 422);

export const InternalServerError = (message: string = "Internal Server Error") => 
  createError(message, 500);



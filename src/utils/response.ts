import { Response } from 'express';

/**
 * Standard API response utility functions
 */

export interface ApiResponse<T = any> {
  success: boolean;
  code?: string;
  message?: string;
  data?: T;
  errors?: Array<{ field: string; message: string }>;
}

/**
 * Send success response
 */
export const sendSuccess = <T>(
  res: Response,
  data?: T,
  message: string = 'Success',
  statusCode: number = 200,
): void => {
  const response: ApiResponse<T> = {
    success: true,
    message,
    data,
  };
  res.status(statusCode).json(response);
};

/**
 * Send error response
 */
export const sendError = (
  res: Response,
  message: string = 'An error occurred',
  statusCodeOrCode: number | string = 500,
  statusCode?: number,
  errors?: Array<{ field: string; message: string }>,
): void => {
  // Handle both signatures: sendError(res, message, statusCode) and sendError(res, message, code, statusCode)
  let code: string;
  let finalStatusCode: number;
  
  if (typeof statusCodeOrCode === 'string') {
    code = statusCodeOrCode;
    finalStatusCode = statusCode || 500;
  } else {
    code = 'Error';
    finalStatusCode = statusCodeOrCode;
  }
  
  const response: ApiResponse = {
    success: false,
    code,
    message,
    errors,
  };
  res.status(finalStatusCode).json(response);
};

/**
 * Send validation error response
 */
export const sendValidationError = (
  res: Response,
  errors: Array<{ field: string; message: string }>,
  message: string = 'Validation error',
): void => {
  sendError(res, message, 'Validation Error', 400, errors);
};

/**
 * Send unauthorized error response
 */
export const sendUnauthorized = (
  res: Response,
  message: string = 'Unauthorized',
): void => {
  sendError(res, message, 'Unauthorized', 401);
};

/**
 * Send forbidden error response
 */
export const sendForbidden = (
  res: Response,
  message: string = 'Forbidden',
): void => {
  sendError(res, message, 'Forbidden', 403);
};

/**
 * Send not found error response
 */
export const sendNotFound = (
  res: Response,
  message: string = 'Resource not found',
): void => {
  sendError(res, message, 'Not Found', 404);
};



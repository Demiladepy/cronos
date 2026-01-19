import { Request, Response, NextFunction } from 'express';
import { APIError } from '../types/index.js';

export function errorHandler(
    err: any,
    req: Request,
    res: Response,
    next: NextFunction
) {
    console.error('❌ Error:', err);

    // Default error
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Internal server error';

    // Handle specific error types
    if (err.name === 'ValidationError') {
        statusCode = 400;
        message = 'Validation error: ' + err.message;
    } else if (err.name === 'UnauthorizedError') {
        statusCode = 401;
        message = 'Unauthorized';
    } else if (err.code === '23505') {
        // PostgreSQL unique violation
        statusCode = 409;
        message = 'Resource already exists';
    }

    const errorResponse: APIError = {
        error: err.name || 'Error',
        message,
        statusCode,
        details: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    };

    res.status(statusCode).json(errorResponse);
}

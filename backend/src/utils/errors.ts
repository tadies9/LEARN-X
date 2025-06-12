export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const handleError = (error: Error | AppError) => {
  if (error instanceof AppError) {
    return {
      status: error.statusCode,
      message: error.message,
    };
  }

  // Unexpected errors
  return {
    status: 500,
    message: 'Internal server error',
  };
};

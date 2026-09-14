function errorHandler(err, req, res, next) {
  // Log error details for server logs
  console.error(`[API Error] [${req.method}] ${req.originalUrl}:`, err.message || err);

  // Prisma Client Known Request Errors
  if (err.code === 'P2002') {
    const fields = err.meta?.target ? (Array.isArray(err.meta.target) ? err.meta.target.join(', ') : err.meta.target) : 'field';
    return res.status(409).json({
      success: false,
      message: `A record with this ${fields} already exists.`,
    });
  }

  if (err.code === 'P2025') {
    return res.status(404).json({
      success: false,
      message: err.meta?.cause || 'The requested record was not found.',
    });
  }

  if (err.code === 'P2003') {
    return res.status(400).json({
      success: false,
      message: 'Referenced relational record does not exist or cannot be deleted.',
    });
  }

  // Validation Errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  // JWT Errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid authentication token.',
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Authentication session expired. Please log in again.',
    });
  }

  // Determine status code
  const statusCode = err.status || err.statusCode || 500;

  // In production, mask internal 500 server error details
  let responseMessage = err.message || 'An unexpected server error occurred.';
  if (statusCode >= 500 && process.env.NODE_ENV === 'production') {
    responseMessage = 'An internal server error occurred. Please try again later.';
  }

  return res.status(statusCode).json({
    success: false,
    message: responseMessage,
  });
}

module.exports = errorHandler;

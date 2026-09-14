function errorHandler(err, req, res, next) {
  console.error('[API Error]:', err);

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  return res.status(err.status || 500).json({
    success: false,
    message: err.message || 'An unexpected server error occurred. Please try again later.',
  });
}

module.exports = errorHandler;

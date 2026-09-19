/**
 * Global error-handling middleware.
 * Catches unhandled errors from route handlers and returns
 * a consistent JSON response.
 */
function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal server error";

  console.error(`[ERROR] ${req.method} ${req.originalUrl} → ${status}: ${message}`);

  if (process.env.NODE_ENV !== "production") {
    console.error(err.stack);
  }

  res.status(status).json({
    success: false,
    message,
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack })
  });
}

module.exports = errorHandler;

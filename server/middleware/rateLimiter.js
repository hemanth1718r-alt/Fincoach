const rateLimit = require("express-rate-limit");

/**
 * General API rate limiter.
 * Allows 100 requests per 15 minutes per IP address.
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please try again later."
  }
});

module.exports = { apiLimiter };

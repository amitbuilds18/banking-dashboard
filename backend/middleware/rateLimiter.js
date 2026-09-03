import rateLimit from 'express-rate-limit';

// Rate limiter for login/register endpoints (5 attempts per 15 minutes)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 5 : 1000, // Lenient in development
  message: 'Too many authentication attempts, please try again later',
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  skip: (req) => {
    // Skip rate limiting for read operations
    return req.method === 'GET';
  },
});

// Rate limiter for transaction endpoints (50 requests per 15 minutes)
export const transactionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 50 : 1000, // Lenient in development
  message: 'Too many transaction requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Only apply to POST requests for transactions
    return req.method !== 'POST';
  },
});

// General API rate limiter (100 requests per 15 minutes)
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // Lenient in development
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

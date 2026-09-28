/**
 * Calculates exponential backoff delay in milliseconds.
 * Formula: delay = baseDelay * (2 ^ (attempt - 1))
 * Example with baseDelay = 5000ms (5s):
 * Attempt 1: 5000 * 2^0 = 5,000ms (5s)
 * Attempt 2: 5000 * 2^1 = 10,000ms (10s)
 * Attempt 3: 5000 * 2^2 = 20,000ms (20s)
 */
const calculateExponentialBackoff = (attempt, baseDelayMs = 5000, maxDelayMs = 300000) => {
  if (attempt <= 0) return 0;
  const delay = baseDelayMs * Math.pow(2, attempt - 1);
  return Math.min(delay, maxDelayMs);
};

module.exports = { calculateExponentialBackoff };

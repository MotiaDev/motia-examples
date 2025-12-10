/**
 * Token bucket rate limiter for Motia Uptime Monitor
 * Implements per-site rate limiting with automatic token replenishment
 */

/**
 * Creates a rate limiter using the token bucket algorithm
 * @param {Object} options - Rate limiter configuration
 * @param {number} options.burst - Maximum number of tokens (burst capacity)
 * @param {number} options.windowSec - Time window in seconds for token replenishment
 * @returns {Object} - Rate limiter instance with methods
 */
export function createRateLimiter({ burst, windowSec }) {
  if (!burst || typeof burst !== 'number' || burst <= 0) {
    throw new Error('burst must be a positive number');
  }

  if (!windowSec || typeof windowSec !== 'number' || windowSec <= 0) {
    throw new Error('windowSec must be a positive number');
  }

  // Storage for per-site token buckets
  // Key: site URL, Value: { tokens, lastRefill }
  const buckets = new Map();

  // Calculate token replenishment rate (tokens per millisecond)
  const refillRate = burst / (windowSec * 1000);

  /**
   * Gets or creates a token bucket for a site
   * @param {string} siteUrl - Site URL
   * @returns {Object} - Bucket object with tokens and lastRefill
   */
  function getBucket(siteUrl) {
    if (!buckets.has(siteUrl)) {
      buckets.set(siteUrl, {
        tokens: burst, // Start with full bucket
        lastRefill: Date.now()
      });
    }
    return buckets.get(siteUrl);
  }

  /**
   * Refills tokens in a bucket based on elapsed time
   * @param {Object} bucket - Bucket object to refill
   */
  function refillBucket(bucket) {
    const now = Date.now();
    const timePassed = now - bucket.lastRefill;
    
    if (timePassed > 0) {
      const tokensToAdd = timePassed * refillRate;
      bucket.tokens = Math.min(burst, bucket.tokens + tokensToAdd);
      bucket.lastRefill = now;
    }
  }

  /**
   * Checks if an action is allowed for a site (without consuming tokens)
   * @param {string} siteUrl - Site URL to check
   * @returns {boolean} - True if action is allowed
   */
  function isAllowed(siteUrl) {
    if (!siteUrl || typeof siteUrl !== 'string') {
      throw new Error('siteUrl must be a valid string');
    }

    const bucket = getBucket(siteUrl);
    refillBucket(bucket);
    
    return bucket.tokens >= 1;
  }

  /**
   * Attempts to consume a token for a site
   * @param {string} siteUrl - Site URL
   * @returns {boolean} - True if token was consumed (action allowed)
   */
  function consume(siteUrl) {
    if (!siteUrl || typeof siteUrl !== 'string') {
      throw new Error('siteUrl must be a valid string');
    }

    const bucket = getBucket(siteUrl);
    refillBucket(bucket);
    
    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      return true;
    }
    
    return false;
  }

  /**
   * Gets the current token count for a site (for debugging/monitoring)
   * @param {string} siteUrl - Site URL
   * @returns {number} - Current token count
   */
  function getTokenCount(siteUrl) {
    if (!siteUrl || typeof siteUrl !== 'string') {
      throw new Error('siteUrl must be a valid string');
    }

    const bucket = getBucket(siteUrl);
    refillBucket(bucket);
    
    return Math.floor(bucket.tokens);
  }

  /**
   * Resets the rate limiter (clears all buckets)
   */
  function reset() {
    buckets.clear();
  }

  /**
   * Gets the time until next token is available for a site
   * @param {string} siteUrl - Site URL
   * @returns {number} - Milliseconds until next token (0 if tokens available)
   */
  function getTimeUntilNextToken(siteUrl) {
    if (!siteUrl || typeof siteUrl !== 'string') {
      throw new Error('siteUrl must be a valid string');
    }

    const bucket = getBucket(siteUrl);
    refillBucket(bucket);
    
    if (bucket.tokens >= 1) {
      return 0;
    }
    
    // Calculate time needed to get 1 token
    const tokensNeeded = 1 - bucket.tokens;
    return Math.ceil(tokensNeeded / refillRate);
  }

  return {
    isAllowed,
    consume,
    getTokenCount,
    getTimeUntilNextToken,
    reset,
    // Expose configuration for debugging
    config: { burst, windowSec, refillRate }
  };
}
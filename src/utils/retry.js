/**
 * Lumively API Retry & Circuit Breaker Utility
 * 
 * Provides resilient HTTP fetch with:
 * - Configurable exponential backoff with jitter
 * - Circuit breaker pattern to prevent cascading failures
 * - Per-service timeout configuration
 * - Request abort controller integration
 */

import { createLogger } from './logger.js';

const logger = createLogger('RetryEngine');

/**
 * Default configuration per service
 */
const SERVICE_CONFIGS = {
  cj: {
    maxRetries: 3,
    baseDelayMs: 1000,
    maxDelayMs: 15000,
    timeoutMs: 15000,
    backoffMultiplier: 2,
    retryableStatuses: [408, 429, 500, 502, 503, 504],
  },
  gemini: {
    maxRetries: 4,
    baseDelayMs: 2000,
    maxDelayMs: 30000,
    timeoutMs: 30000,
    backoffMultiplier: 2.5,
    retryableStatuses: [429, 500, 502, 503, 504],
  },
  paypal: {
    maxRetries: 2,
    baseDelayMs: 500,
    maxDelayMs: 5000,
    timeoutMs: 10000,
    backoffMultiplier: 2,
    retryableStatuses: [408, 429, 500, 502, 503],
  },
  default: {
    maxRetries: 3,
    baseDelayMs: 1000,
    maxDelayMs: 10000,
    timeoutMs: 15000,
    backoffMultiplier: 2,
    retryableStatuses: [408, 429, 500, 502, 503, 504],
  },
};

/**
 * Circuit Breaker State Machine
 * States: CLOSED (normal) → OPEN (failing) → HALF_OPEN (testing recovery)
 */
class CircuitBreaker {
  constructor(serviceName, options = {}) {
    this.serviceName = serviceName;
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeoutMs = options.resetTimeoutMs || 60000;
    this.halfOpenMaxAttempts = options.halfOpenMaxAttempts || 1;

    this.state = 'CLOSED';
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.halfOpenAttempts = 0;
  }

  canExecute() {
    if (this.state === 'CLOSED') return true;

    if (this.state === 'OPEN') {
      // Check if reset timeout has elapsed
      if (Date.now() - this.lastFailureTime >= this.resetTimeoutMs) {
        this.state = 'HALF_OPEN';
        this.halfOpenAttempts = 0;
        logger.info(`Circuit breaker HALF_OPEN for ${this.serviceName} — testing recovery`);
        return true;
      }
      return false;
    }

    // HALF_OPEN: allow limited attempts
    return this.halfOpenAttempts < this.halfOpenMaxAttempts;
  }

  recordSuccess() {
    if (this.state === 'HALF_OPEN') {
      logger.info(`Circuit breaker CLOSED for ${this.serviceName} — service recovered`);
    }
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.halfOpenAttempts = 0;
  }

  recordFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === 'HALF_OPEN') {
      this.halfOpenAttempts++;
      if (this.halfOpenAttempts >= this.halfOpenMaxAttempts) {
        this.state = 'OPEN';
        logger.warn(`Circuit breaker re-OPENED for ${this.serviceName} — recovery failed`);
      }
      return;
    }

    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      logger.warn(`Circuit breaker OPENED for ${this.serviceName} after ${this.failureCount} consecutive failures`, {
        threshold: this.failureThreshold,
        resetTimeoutMs: this.resetTimeoutMs,
      });
    }
  }

  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
    };
  }

  reset() {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.halfOpenAttempts = 0;
  }
}

// Per-service circuit breakers
const circuitBreakers = new Map();

const getCircuitBreaker = (serviceName) => {
  if (!circuitBreakers.has(serviceName)) {
    circuitBreakers.set(serviceName, new CircuitBreaker(serviceName));
  }
  return circuitBreakers.get(serviceName);
};

/**
 * Calculate delay with exponential backoff + jitter
 */
const calculateDelay = (attempt, config) => {
  const exponentialDelay = config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt);
  const cappedDelay = Math.min(exponentialDelay, config.maxDelayMs);
  // Add jitter: random value between 0 and 30% of the delay
  const jitter = Math.random() * cappedDelay * 0.3;
  return Math.floor(cappedDelay + jitter);
};

/**
 * Fetch with retry, exponential backoff, jitter, circuit breaker, and timeout
 * 
 * @param {string} url - Request URL
 * @param {RequestInit} options - Fetch options
 * @param {Object} retryOptions - Retry configuration
 * @param {string} retryOptions.service - Service name ('cj', 'gemini', 'paypal')
 * @param {string} retryOptions.operation - Operation name for logging
 * @param {Object} retryOptions.overrides - Override default config values
 * @returns {Promise<Response>}
 */
export const fetchWithRetry = async (url, options = {}, retryOptions = {}) => {
  const serviceName = retryOptions.service || 'default';
  const operation = retryOptions.operation || 'fetch';
  const config = {
    ...SERVICE_CONFIGS[serviceName] || SERVICE_CONFIGS.default,
    ...retryOptions.overrides,
  };

  const breaker = getCircuitBreaker(serviceName);

  // Circuit breaker check
  if (!breaker.canExecute()) {
    const err = new Error(
      `Circuit breaker OPEN for ${serviceName} — service temporarily unavailable. ` +
      `Will retry after ${Math.ceil(breaker.resetTimeoutMs / 1000)}s cooldown.`
    );
    err.code = 'CIRCUIT_BREAKER_OPEN';
    logger.error(`${operation}: Circuit breaker blocked request`, {
      service: serviceName,
      breakerState: breaker.getState(),
    });
    throw err;
  }

  let lastError = null;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs);

    try {
      const startTime = performance.now();

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const latencyMs = Math.round(performance.now() - startTime);

      // Check for retryable HTTP status
      if (config.retryableStatuses.includes(response.status)) {
        const retryAfter = response.headers.get('Retry-After');
        const delay = retryAfter
          ? parseInt(retryAfter, 10) * 1000
          : calculateDelay(attempt, config);

        if (attempt < config.maxRetries) {
          logger.warn(`${operation}: HTTP ${response.status}, retrying in ${delay}ms`, {
            attempt: attempt + 1,
            maxRetries: config.maxRetries,
            latencyMs,
            service: serviceName,
          });
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
      }

      // Non-retryable response — record success/failure and return
      if (response.ok) {
        breaker.recordSuccess();
        if (attempt > 0) {
          logger.info(`${operation}: Succeeded after ${attempt} retries`, {
            latencyMs,
            service: serviceName,
          });
        }
      }

      return response;
    } catch (err) {
      clearTimeout(timeoutId);
      lastError = err;

      // Don't retry on abort (user cancelled) or non-network errors
      if (err.name === 'AbortError') {
        lastError = new Error(`${operation}: Request timed out after ${config.timeoutMs}ms`);
        lastError.code = 'TIMEOUT';
      }

      if (attempt < config.maxRetries) {
        const delay = calculateDelay(attempt, config);
        logger.warn(`${operation}: Network error, retrying in ${delay}ms`, {
          attempt: attempt + 1,
          maxRetries: config.maxRetries,
          error: err.message,
          service: serviceName,
        });
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  // All retries exhausted
  breaker.recordFailure();
  logger.error(`${operation}: All ${config.maxRetries + 1} attempts failed`, {
    service: serviceName,
    error: lastError?.message,
    breakerState: breaker.getState(),
  });

  throw lastError || new Error(`${operation}: Request failed after ${config.maxRetries + 1} attempts`);
};

/**
 * Simple rate limiter using token bucket algorithm
 */
export class RateLimiter {
  constructor(tokensPerSecond = 1, bucketSize = 1) {
    this.tokensPerSecond = tokensPerSecond;
    this.bucketSize = bucketSize;
    this.tokens = bucketSize;
    this.lastRefill = Date.now();
    this.queue = [];
    this.processing = false;
  }

  async waitForToken() {
    return new Promise((resolve) => {
      this.queue.push(resolve);
      this.processQueue();
    });
  }

  async processQueue() {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0) {
      this.refillTokens();

      if (this.tokens >= 1) {
        this.tokens -= 1;
        const resolve = this.queue.shift();
        resolve();
      } else {
        const waitMs = Math.ceil((1 - this.tokens) / this.tokensPerSecond * 1000);
        await new Promise((resolve) => setTimeout(resolve, waitMs));
      }
    }

    this.processing = false;
  }

  refillTokens() {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.bucketSize, this.tokens + elapsed * this.tokensPerSecond);
    this.lastRefill = now;
  }
}

/**
 * Get circuit breaker state for a service (for admin dashboard)
 */
export const getCircuitBreakerState = (serviceName) => {
  return getCircuitBreaker(serviceName).getState();
};

/**
 * Reset circuit breaker for a service (admin override)
 */
export const resetCircuitBreaker = (serviceName) => {
  getCircuitBreaker(serviceName).reset();
  logger.info(`Circuit breaker manually reset for ${serviceName}`);
};

export { SERVICE_CONFIGS, CircuitBreaker };

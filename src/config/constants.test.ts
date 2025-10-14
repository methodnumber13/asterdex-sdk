/**
 * Tests for configuration constants
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  DEFAULT_ENDPOINTS,
  DEFAULT_CONFIG,
  API_VERSIONS,
  WS_PATHS,
  RATE_LIMITS,
  HTTP_STATUS,
  WS_CONSTANTS,
  ASTER_ERROR_CODES,
  SUPPORTED_ASSETS,
  QUOTE_ASSETS,
  TIME_CONSTANTS,
  WS_CLOSE_CODES,
  VALIDATION_CONSTANTS,
  RETRY_CONSTANTS,
} from './constants';

describe('Configuration Constants', () => {
  beforeEach(() => {
    // Clear any environment variables that might affect tests
    delete process.env.ASTERDEX_SPOT_URL;
    delete process.env.ASTERDEX_FUTURES_URL;
    delete process.env.ASTERDEX_WEBSOCKET_URL;
    delete process.env.ASTERDEX_ENVIRONMENT;
    delete process.env.ASTERDEX_TIMEOUT;
    delete process.env.ASTERDEX_RECV_WINDOW;
    delete process.env.ASTERDEX_ENABLE_RATE_LIMITING;
    delete process.env.ASTERDEX_MAX_RETRIES;
    delete process.env.ASTERDEX_RETRY_DELAY;
    delete process.env.ASTERDEX_BACKOFF_MULTIPLIER;
  });

  describe('DEFAULT_ENDPOINTS', () => {
    it('should provide mainnet endpoints', () => {
      expect(DEFAULT_ENDPOINTS.mainnet.spot).toMatch(/^https:\/\//);
      expect(DEFAULT_ENDPOINTS.mainnet.futures).toMatch(/^https:\/\//);
      expect(DEFAULT_ENDPOINTS.mainnet.websocket).toMatch(/^wss:\/\//);
    });

    it('should use default AsterDEX endpoints', () => {
      expect(DEFAULT_ENDPOINTS.mainnet.spot).toContain('asterdex.com');
      expect(DEFAULT_ENDPOINTS.mainnet.futures).toContain('asterdex.com');
      expect(DEFAULT_ENDPOINTS.mainnet.websocket).toContain('asterdex.com');
    });
  });

  describe('DEFAULT_CONFIG', () => {
    it('should provide default configuration values', () => {
      expect(typeof DEFAULT_CONFIG.environment).toBe('string');
      expect(DEFAULT_CONFIG.timeout).toBeGreaterThan(0);
      expect(DEFAULT_CONFIG.recvWindow).toBeGreaterThan(0);
      expect(typeof DEFAULT_CONFIG.enableRateLimiting).toBe('boolean');
      expect(DEFAULT_CONFIG.retryConfig.maxRetries).toBeGreaterThanOrEqual(0);
      expect(DEFAULT_CONFIG.retryConfig.retryDelay).toBeGreaterThan(0);
      expect(DEFAULT_CONFIG.retryConfig.backoffMultiplier).toBeGreaterThan(0);
    });
  });

  describe('API_VERSIONS', () => {
    it('should have spot API versions', () => {
      expect(API_VERSIONS.spot.v1).toBe('/api/v1');
    });

    it('should have futures API versions', () => {
      expect(API_VERSIONS.futures.v3).toBe('/fapi/v3');
      expect(API_VERSIONS.futures.v1).toBe('/fapi/v1');
    });
  });

  describe('WS_PATHS', () => {
    it('should have WebSocket paths', () => {
      expect(WS_PATHS.stream).toBe('/stream');
      expect(WS_PATHS.ws).toBe('/ws');
    });
  });

  describe('RATE_LIMITS', () => {
    it('should have rate limit constants', () => {
      expect(RATE_LIMITS.DEFAULT_WEIGHT).toBe(1);
      expect(RATE_LIMITS.MAX_REQUESTS_PER_MINUTE).toBeGreaterThan(0);
      expect(RATE_LIMITS.MAX_ORDERS_PER_MINUTE).toBeGreaterThan(0);
      expect(RATE_LIMITS.MAX_ORDERS_PER_10_SECONDS).toBeGreaterThan(0);
    });
  });

  describe('HTTP_STATUS', () => {
    it('should have HTTP status codes', () => {
      expect(HTTP_STATUS.OK).toBe(200);
      expect(HTTP_STATUS.BAD_REQUEST).toBe(400);
      expect(HTTP_STATUS.UNAUTHORIZED).toBe(401);
      expect(HTTP_STATUS.FORBIDDEN).toBe(403);
      expect(HTTP_STATUS.NOT_FOUND).toBe(404);
      expect(HTTP_STATUS.TOO_MANY_REQUESTS).toBe(429);
      expect(HTTP_STATUS.IM_A_TEAPOT).toBe(418);
      expect(HTTP_STATUS.INTERNAL_SERVER_ERROR).toBe(500);
    });
  });

  describe('WS_CONSTANTS', () => {
    it('should have WebSocket constants', () => {
      expect(WS_CONSTANTS.MAX_SUBSCRIPTIONS).toBeGreaterThan(0);
      expect(WS_CONSTANTS.MAX_MESSAGES_PER_SECOND).toBeGreaterThan(0);
      expect(WS_CONSTANTS.PING_INTERVAL).toBeGreaterThan(0);
      expect(WS_CONSTANTS.PONG_TIMEOUT).toBeGreaterThan(0);
      expect(WS_CONSTANTS.RECONNECT_INTERVAL).toBeGreaterThan(0);
      expect(WS_CONSTANTS.MAX_RECONNECT_ATTEMPTS).toBeGreaterThan(0);
    });
  });

  describe('ASTER_ERROR_CODES', () => {
    it('should have general error codes', () => {
      expect(ASTER_ERROR_CODES.UNKNOWN).toBe(-1000);
      expect(ASTER_ERROR_CODES.DISCONNECTED).toBe(-1001);
      expect(ASTER_ERROR_CODES.UNAUTHORIZED).toBe(-1002);
      expect(ASTER_ERROR_CODES.TOO_MANY_REQUESTS).toBe(-1003);
    });

    it('should have request issue error codes', () => {
      expect(ASTER_ERROR_CODES.ILLEGAL_CHARS).toBe(-1100);
      expect(ASTER_ERROR_CODES.MANDATORY_PARAM_EMPTY_OR_MALFORMED).toBe(-1102);
      expect(ASTER_ERROR_CODES.UNKNOWN_PARAM).toBe(-1103);
    });

    it('should have processing issue error codes', () => {
      expect(ASTER_ERROR_CODES.NEW_ORDER_REJECTED).toBe(-2010);
      expect(ASTER_ERROR_CODES.CANCEL_REJECTED).toBe(-2011);
      expect(ASTER_ERROR_CODES.NO_SUCH_ORDER).toBe(-2013);
    });
  });

  describe('SUPPORTED_ASSETS', () => {
    it('should have supported asset list', () => {
      expect(Array.isArray(SUPPORTED_ASSETS)).toBe(true);
      expect(SUPPORTED_ASSETS.length).toBeGreaterThan(0);
      expect(SUPPORTED_ASSETS).toContain('BTC');
      expect(SUPPORTED_ASSETS).toContain('ETH');
      expect(SUPPORTED_ASSETS).toContain('USDT');
    });
  });

  describe('QUOTE_ASSETS', () => {
    it('should have quote asset list', () => {
      expect(Array.isArray(QUOTE_ASSETS)).toBe(true);
      expect(QUOTE_ASSETS.length).toBeGreaterThan(0);
      expect(QUOTE_ASSETS).toContain('USDT');
      expect(QUOTE_ASSETS).toContain('USDC');
    });
  });

  describe('TIME_CONSTANTS', () => {
    it('should have time conversion constants', () => {
      expect(TIME_CONSTANTS.MILLISECONDS_IN_SECOND).toBe(1000);
      expect(TIME_CONSTANTS.SECONDS_IN_MINUTE).toBe(60);
      expect(TIME_CONSTANTS.MINUTES_IN_HOUR).toBe(60);
      expect(TIME_CONSTANTS.MICROSECONDS_IN_MILLISECOND).toBe(1000);
      expect(TIME_CONSTANTS.DEFAULT_REQUEST_TIMEOUT).toBeGreaterThan(0);
      expect(TIME_CONSTANTS.MAX_RECV_WINDOW).toBeGreaterThan(0);
      expect(TIME_CONSTANTS.MIN_RECV_WINDOW).toBeGreaterThan(0);
    });
  });

  describe('WS_CLOSE_CODES', () => {
    it('should have WebSocket close codes', () => {
      expect(WS_CLOSE_CODES.NORMAL_CLOSURE).toBe(1000);
      expect(WS_CLOSE_CODES.POLICY_VIOLATION).toBe(1008);
    });
  });

  describe('VALIDATION_CONSTANTS', () => {
    it('should have validation constants', () => {
      expect(VALIDATION_CONSTANTS.ETHEREUM_ADDRESS_LENGTH).toBe(40);
      expect(VALIDATION_CONSTANTS.PRIVATE_KEY_LENGTH).toBe(64);
      expect(VALIDATION_CONSTANTS.RADIX_DECIMAL).toBe(10);
      expect(VALIDATION_CONSTANTS.RADIX_HEXADECIMAL).toBe(16);
    });
  });

  describe('RETRY_CONSTANTS', () => {
    it('should have retry constants', () => {
      expect(RETRY_CONSTANTS.DEFAULT_MAX_RETRIES).toBeGreaterThanOrEqual(0);
      expect(RETRY_CONSTANTS.DEFAULT_RETRY_DELAY).toBeGreaterThan(0);
      expect(RETRY_CONSTANTS.DEFAULT_BACKOFF_MULTIPLIER).toBeGreaterThan(0);
      expect(RETRY_CONSTANTS.ONE_MINUTE_MS).toBe(60000);
    });
  });
});

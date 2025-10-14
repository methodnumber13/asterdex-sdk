/**
 * Configuration tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Config } from '@/config/config';
import { DEFAULT_CONFIG } from '@/config/constants';

describe('Config', () => {
  beforeEach(() => {
    // Clear all AsterDEX environment variables to ensure clean test state
    delete process.env.ASTERDEX_API_KEY;
    delete process.env.ASTERDEX_API_SECRET;
    delete process.env.ASTERDEX_ENVIRONMENT;
    delete process.env.ASTERDEX_TIMEOUT;
    delete process.env.ASTERDEX_RECV_WINDOW;
    delete process.env.ASTERDEX_ENABLE_RATE_LIMITING;
    delete process.env.ASTERDEX_MAX_RETRIES;
    delete process.env.ASTERDEX_RETRY_DELAY;
    delete process.env.ASTERDEX_BACKOFF_MULTIPLIER;
    delete process.env.ASTERDEX_SPOT_URL;
    delete process.env.ASTERDEX_FUTURES_URL;
    delete process.env.ASTERDEX_WEBSOCKET_URL;
  });

  describe('constructor', () => {
    it('should create config with default values', () => {
      const config = new Config();

      expect(config.getEnvironment()).toBe(DEFAULT_CONFIG.environment);
      expect(config.getTimeout()).toBe(DEFAULT_CONFIG.timeout);
      expect(config.getRecvWindow()).toBe(DEFAULT_CONFIG.recvWindow);
      expect(config.isRateLimitingEnabled()).toBe(DEFAULT_CONFIG.enableRateLimiting);
    });

    it('should merge user config with defaults', () => {
      const userConfig = {
        apiKey: 'test-key',
        apiSecret: 'test-secret',
        environment: 'mainnet' as const,
        timeout: 30000,
      };

      const config = new Config(userConfig);

      expect(config.getApiKey()).toBe('test-key');
      expect(config.getApiSecret()).toBe('test-secret');
      expect(config.getEnvironment()).toBe('mainnet');
      expect(config.getTimeout()).toBe(30000);
    });
  });

  describe('validation', () => {
    it('should throw error for invalid timeout', () => {
      expect(() => new Config({ timeout: 0 })).toThrow('Timeout must be greater than 0');
      expect(() => new Config({ timeout: -1000 })).toThrow('Timeout must be greater than 0');
    });

    it('should throw error for invalid recvWindow', () => {
      expect(() => new Config({ recvWindow: 0 })).toThrow('recvWindow must be between');
      expect(() => new Config({ recvWindow: 70000 })).toThrow('recvWindow must be between');
    });

    it('should throw error for invalid URLs', () => {
      expect(
        () =>
          new Config({
            baseUrl: { spot: 'invalid-url' },
          }),
      ).toThrow('Invalid spot baseUrl');
    });
  });

  describe('fromEnv', () => {
    it('should create config from environment variables', () => {
      process.env.ASTERDEX_API_KEY = 'env-key';
      process.env.ASTERDEX_API_SECRET = 'env-secret';
      process.env.ASTERDEX_ENVIRONMENT = 'mainnet';
      process.env.ASTERDEX_TIMEOUT = '45000';

      const config = Config.fromEnv();

      expect(config.getApiKey()).toBe('env-key');
      expect(config.getApiSecret()).toBe('env-secret');
      expect(config.getEnvironment()).toBe('mainnet');
      expect(config.getTimeout()).toBe(45000);
    });

    it('should create config with custom endpoints from environment', () => {
      process.env.ASTERDEX_SPOT_URL = 'https://custom-spot.example.com';
      process.env.ASTERDEX_FUTURES_URL = 'https://custom-futures.example.com';
      process.env.ASTERDEX_WEBSOCKET_URL = 'wss://custom-ws.example.com';

      const config = Config.fromEnv();

      expect(config.getBaseUrl('spot')).toBe('https://custom-spot.example.com');
      expect(config.getBaseUrl('futures')).toBe('https://custom-futures.example.com');
      expect(config.getBaseUrl('websocket')).toBe('wss://custom-ws.example.com');

      // Clean up
      delete process.env.ASTERDEX_SPOT_URL;
      delete process.env.ASTERDEX_FUTURES_URL;
      delete process.env.ASTERDEX_WEBSOCKET_URL;
    });

    it('should create config with rate limiting settings from environment', () => {
      process.env.ASTERDEX_ENABLE_RATE_LIMITING = 'false';
      process.env.ASTERDEX_MAX_RETRIES = '5';
      process.env.ASTERDEX_RETRY_DELAY = '2000';
      process.env.ASTERDEX_BACKOFF_MULTIPLIER = '3';

      const config = Config.fromEnv();

      expect(config.isRateLimitingEnabled()).toBe(false);
      expect(config.getRetryConfig().maxRetries).toBe(5);
      expect(config.getRetryConfig().retryDelay).toBe(2000);
      expect(config.getRetryConfig().backoffMultiplier).toBe(3);

      // Clean up
      delete process.env.ASTERDEX_ENABLE_RATE_LIMITING;
      delete process.env.ASTERDEX_MAX_RETRIES;
      delete process.env.ASTERDEX_RETRY_DELAY;
      delete process.env.ASTERDEX_BACKOFF_MULTIPLIER;
    });

    it('should use defaults when env vars are not set', () => {
      const config = Config.fromEnv();

      expect(config.getEnvironment()).toBe(DEFAULT_CONFIG.environment);
      expect(config.getTimeout()).toBe(DEFAULT_CONFIG.timeout);
    });
  });

  describe('authentication checks', () => {
    it('should return false for hasAuth when credentials are missing', () => {
      const config = new Config();
      expect(config.hasAuth()).toBe(false);
    });

    it('should return true for hasAuth when credentials are provided', () => {
      const config = new Config({
        apiKey: 'test-key',
        apiSecret: 'test-secret',
      });
      expect(config.hasAuth()).toBe(true);
    });

    it('should return true for hasApiKey when key is provided', () => {
      const config = new Config({ apiKey: 'test-key' });
      expect(config.hasApiKey()).toBe(true);
    });
  });

  describe('updateConfig', () => {
    it('should update configuration', () => {
      const config = new Config();

      config.updateConfig({
        apiKey: 'new-key',
        timeout: 45000,
      });

      expect(config.getApiKey()).toBe('new-key');
      expect(config.getTimeout()).toBe(45000);
    });

    it('should validate updated configuration', () => {
      const config = new Config();

      expect(() => config.updateConfig({ timeout: -1000 })).toThrow(
        'Timeout must be greater than 0',
      );
    });
  });
});

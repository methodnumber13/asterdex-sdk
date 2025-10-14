/**
 * Tests for authentication and signature utilities
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SignatureAuth, AuthManager, ParameterUtils } from './signature';

describe('SignatureAuth', () => {
  const validApiKey = 'test-api-key';
  const validApiSecret = 'test-api-secret';
  let signatureAuth: SignatureAuth;

  beforeEach(() => {
    signatureAuth = new SignatureAuth(validApiKey, validApiSecret);
  });

  describe('constructor', () => {
    it('should create instance with valid credentials', () => {
      expect(signatureAuth).toBeInstanceOf(SignatureAuth);
      expect(signatureAuth.getApiKey()).toBe(validApiKey);
    });

    it('should throw error when API key is missing', () => {
      expect(() => new SignatureAuth('', validApiSecret)).toThrow('API key is required');
    });

    it('should throw error when API secret is missing', () => {
      expect(() => new SignatureAuth(validApiKey, '')).toThrow('API secret is required');
    });

    it('should throw error when both credentials are missing', () => {
      expect(() => new SignatureAuth('', '')).toThrow('API key is required');
    });
  });

  describe('generateSignature', () => {
    it('should generate valid HMAC SHA256 signature', () => {
      const queryString = 'symbol=BTCUSDT&timestamp=1234567890';
      const signature = signatureAuth.generateSignature(queryString);

      expect(signature).toBeDefined();
      expect(typeof signature).toBe('string');
      expect(signature).toHaveLength(64); // SHA256 hex length
      expect(signature).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should generate consistent signatures for same input', () => {
      const queryString = 'symbol=BTCUSDT&timestamp=1234567890';
      const signature1 = signatureAuth.generateSignature(queryString);
      const signature2 = signatureAuth.generateSignature(queryString);

      expect(signature1).toBe(signature2);
    });

    it('should generate different signatures for different inputs', () => {
      const queryString1 = 'symbol=BTCUSDT&timestamp=1234567890';
      const queryString2 = 'symbol=ETHUSDT&timestamp=1234567890';

      const signature1 = signatureAuth.generateSignature(queryString1);
      const signature2 = signatureAuth.generateSignature(queryString2);

      expect(signature1).not.toBe(signature2);
    });

    it('should handle empty query string', () => {
      const signature = signatureAuth.generateSignature('');
      expect(signature).toBeDefined();
      expect(typeof signature).toBe('string');
    });
  });

  describe('signRequest', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2023-01-01T00:00:00.000Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should sign request with timestamp and signature', () => {
      const params = { symbol: 'BTCUSDT', side: 'BUY' };
      const result = signatureAuth.signRequest(params);

      expect(result).toMatchObject({
        symbol: 'BTCUSDT',
        side: 'BUY',
        timestamp: 1672531200000,
        signature: expect.any(String),
      });
    });

    it('should include recvWindow when provided', () => {
      const params = { symbol: 'BTCUSDT' };
      const recvWindow = 5000;
      const result = signatureAuth.signRequest(params, recvWindow);

      expect(result).toMatchObject({
        symbol: 'BTCUSDT',
        timestamp: 1672531200000,
        recvWindow: 5000,
        signature: expect.any(String),
      });
    });

    it('should preserve all original parameters', () => {
      const params = { symbol: 'BTCUSDT', quantity: '1.0', price: '50000' };
      const result = signatureAuth.signRequest(params);

      expect(result.symbol).toBe('BTCUSDT');
      expect(result.quantity).toBe('1.0');
      expect(result.price).toBe('50000');
    });
  });

  describe('createHeaders', () => {
    it('should create default headers', () => {
      const headers = signatureAuth.createHeaders();

      expect(headers).toEqual({
        'Content-Type': 'application/json',
        'X-MBX-APIKEY': validApiKey,
      });
    });

    it('should create headers with custom content type', () => {
      const headers = signatureAuth.createHeaders('application/x-www-form-urlencoded');

      expect(headers).toEqual({
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-MBX-APIKEY': validApiKey,
      });
    });
  });

  describe('createQueryString', () => {
    it('should create sorted query string from parameters', () => {
      const params = { b: '2', a: '1', c: '3' };
      const queryString = signatureAuth.createQueryString(params);

      expect(queryString).toBe('a=1&b=2&c=3');
    });

    it('should filter out undefined, null and empty values', () => {
      const params = {
        valid: 'value',
        undefined: undefined,
        null: null,
        empty: '',
        zero: 0,
        false: false,
      };
      const queryString = signatureAuth.createQueryString(params);

      expect(queryString).toBe('false=false&valid=value&zero=0');
    });

    it('should URL encode parameters', () => {
      const params = { symbol: 'BTC/USDT', special: 'hello world & more' };
      const queryString = signatureAuth.createQueryString(params);

      expect(queryString).toBe('special=hello%20world%20%26%20more&symbol=BTC%2FUSDT');
    });

    it('should handle empty object', () => {
      const queryString = signatureAuth.createQueryString({});
      expect(queryString).toBe('');
    });
  });

  describe('getTimestamp', () => {
    it('should return current timestamp in milliseconds', () => {
      const before = Date.now();
      const timestamp = signatureAuth.getTimestamp();
      const after = Date.now();

      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('validateTimestamp', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2023-01-01T00:00:00.000Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should validate timestamp within default window', () => {
      const currentTime = 1672531200000;
      const validTimestamp = currentTime - 1000; // 1 second ago

      expect(signatureAuth.validateTimestamp(validTimestamp)).toBe(true);
    });

    it('should reject timestamp outside default window', () => {
      const currentTime = 1672531200000;
      const invalidTimestamp = currentTime - 10000; // 10 seconds ago (default window is 5000ms)

      expect(signatureAuth.validateTimestamp(invalidTimestamp)).toBe(false);
    });

    it('should validate timestamp within custom window', () => {
      const currentTime = 1672531200000;
      const timestamp = currentTime - 8000; // 8 seconds ago
      const customWindow = 10000; // 10 seconds

      expect(signatureAuth.validateTimestamp(timestamp, customWindow)).toBe(true);
    });

    it('should validate future timestamps within window', () => {
      const currentTime = 1672531200000;
      const futureTimestamp = currentTime + 1000; // 1 second in future

      expect(signatureAuth.validateTimestamp(futureTimestamp)).toBe(true);
    });
  });
});

describe('AuthManager', () => {
  const validApiKey = 'test-api-key';
  const validApiSecret = 'test-api-secret';

  describe('constructor', () => {
    it('should create instance without credentials', () => {
      const authManager = new AuthManager();
      expect(authManager.hasSignatureAuth()).toBe(false);
      expect(authManager.hasApiKeyAuth()).toBe(false);
    });

    it('should create instance with credentials', () => {
      const authManager = new AuthManager(validApiKey, validApiSecret);
      expect(authManager.hasSignatureAuth()).toBe(true);
      expect(authManager.hasApiKeyAuth()).toBe(true);
    });

    it('should not create signature auth with partial credentials', () => {
      const authManager = new AuthManager(validApiKey);
      expect(authManager.hasSignatureAuth()).toBe(false);
    });
  });

  describe('hasSignatureAuth', () => {
    it('should return true when both credentials provided', () => {
      const authManager = new AuthManager(validApiKey, validApiSecret);
      expect(authManager.hasSignatureAuth()).toBe(true);
    });

    it('should return false when credentials missing', () => {
      const authManager = new AuthManager();
      expect(authManager.hasSignatureAuth()).toBe(false);
    });
  });

  describe('getSignatureAuth', () => {
    it('should return signature auth instance when configured', () => {
      const authManager = new AuthManager(validApiKey, validApiSecret);
      const signatureAuth = authManager.getSignatureAuth();

      expect(signatureAuth).toBeInstanceOf(SignatureAuth);
      expect(signatureAuth.getApiKey()).toBe(validApiKey);
    });

    it('should throw error when not configured', () => {
      const authManager = new AuthManager();
      expect(() => authManager.getSignatureAuth()).toThrow(
        'Signature authentication not configured',
      );
    });
  });

  describe('createHeaders', () => {
    it('should create headers for NONE auth type', () => {
      const authManager = new AuthManager();
      const headers = authManager.createHeaders('NONE');

      expect(headers).toEqual({
        'Content-Type': 'application/json',
        'User-Agent': 'AsterDEX-TypeScript-SDK/1.0.0',
      });
    });

    it('should create headers for MARKET_DATA auth type', () => {
      const authManager = new AuthManager(validApiKey, validApiSecret);
      const headers = authManager.createHeaders('MARKET_DATA');

      expect(headers).toEqual({
        'Content-Type': 'application/json',
        'User-Agent': 'AsterDEX-TypeScript-SDK/1.0.0',
        'X-MBX-APIKEY': validApiKey,
      });
    });

    it('should throw error for MARKET_DATA when API key missing', () => {
      const authManager = new AuthManager();
      expect(() => authManager.createHeaders('MARKET_DATA')).toThrow(
        'API key required for this endpoint',
      );
    });

    it('should create headers for SIGNED auth type', () => {
      const authManager = new AuthManager(validApiKey, validApiSecret);
      const headers = authManager.createHeaders('SIGNED');

      expect(headers).toEqual({
        'Content-Type': 'application/json',
        'User-Agent': 'AsterDEX-TypeScript-SDK/1.0.0',
        'X-MBX-APIKEY': validApiKey,
      });
    });

    it('should throw error for unknown auth type', () => {
      const authManager = new AuthManager();
      expect(() =>
        authManager.createHeaders('UNKNOWN' as 'NONE' | 'USER_STREAM' | 'MARKET_DATA' | 'SIGNED'),
      ).toThrow('Unknown authentication type: UNKNOWN');
    });
  });

  describe('signRequest', () => {
    it('should sign request when configured', () => {
      const authManager = new AuthManager(validApiKey, validApiSecret);
      const params = { symbol: 'BTCUSDT' };
      const result = authManager.signRequest(params);

      expect(result).toMatchObject({
        symbol: 'BTCUSDT',
        timestamp: expect.any(Number),
        signature: expect.any(String),
      });
    });

    it('should throw error when not configured', () => {
      const authManager = new AuthManager();
      const params = { symbol: 'BTCUSDT' };

      expect(() => authManager.signRequest(params)).toThrow(
        'Signature authentication not configured',
      );
    });
  });

  describe('updateCredentials', () => {
    it('should update credentials when provided', () => {
      const authManager = new AuthManager();
      expect(authManager.hasSignatureAuth()).toBe(false);

      authManager.updateCredentials(validApiKey, validApiSecret);
      expect(authManager.hasSignatureAuth()).toBe(true);
    });

    it('should clear credentials when undefined provided', () => {
      const authManager = new AuthManager(validApiKey, validApiSecret);
      expect(authManager.hasSignatureAuth()).toBe(true);

      authManager.updateCredentials();
      expect(authManager.hasSignatureAuth()).toBe(false);
    });
  });
});

describe('ParameterUtils', () => {
  describe('cleanParams', () => {
    it('should remove undefined values', () => {
      const params = { a: 1, b: undefined, c: 3 };
      const cleaned = ParameterUtils.cleanParams(params);

      expect(cleaned).toEqual({ a: 1, c: 3 });
    });

    it('should remove null values', () => {
      const params = { a: 1, b: null, c: 3 };
      const cleaned = ParameterUtils.cleanParams(params);

      expect(cleaned).toEqual({ a: 1, c: 3 });
    });

    it('should remove empty string values', () => {
      const params = { a: 1, b: '', c: 3 };
      const cleaned = ParameterUtils.cleanParams(params);

      expect(cleaned).toEqual({ a: 1, c: 3 });
    });

    it('should keep zero and false values', () => {
      const params = { a: 0, b: false, c: 'valid' };
      const cleaned = ParameterUtils.cleanParams(params);

      expect(cleaned).toEqual({ a: 0, b: false, c: 'valid' });
    });

    it('should handle empty object', () => {
      const cleaned = ParameterUtils.cleanParams({});
      expect(cleaned).toEqual({});
    });
  });

  describe('validateRequired', () => {
    it('should pass when all required parameters present', () => {
      const params = { symbol: 'BTCUSDT', side: 'BUY', type: 'LIMIT' };
      const required = ['symbol', 'side', 'type'];

      expect(() => ParameterUtils.validateRequired(params, required)).not.toThrow();
    });

    it('should throw error when required parameter missing', () => {
      const params = { symbol: 'BTCUSDT', side: 'BUY' };
      const required = ['symbol', 'side', 'type'];

      expect(() => ParameterUtils.validateRequired(params, required)).toThrow(
        'Missing required parameters: type',
      );
    });

    it('should throw error when multiple required parameters missing', () => {
      const params = { symbol: 'BTCUSDT' };
      const required = ['symbol', 'side', 'type'];

      expect(() => ParameterUtils.validateRequired(params, required)).toThrow(
        'Missing required parameters: side, type',
      );
    });

    it('should treat empty string as missing', () => {
      const params = { symbol: '', side: 'BUY' };
      const required = ['symbol', 'side'];

      expect(() => ParameterUtils.validateRequired(params, required)).toThrow(
        'Missing required parameters: symbol',
      );
    });

    it('should treat null as missing', () => {
      const params = { symbol: null, side: 'BUY' };
      const required = ['symbol', 'side'];

      expect(() => ParameterUtils.validateRequired(params, required)).toThrow(
        'Missing required parameters: symbol',
      );
    });
  });

  describe('validateTypes', () => {
    it('should pass when types match schema', () => {
      const params = { symbol: 'BTCUSDT', limit: 100, active: true };
      const schema = { symbol: 'string', limit: 'number', active: 'boolean' };

      expect(() => ParameterUtils.validateTypes(params, schema)).not.toThrow();
    });

    it('should throw error when type does not match', () => {
      const params = { symbol: 'BTCUSDT', limit: '100' };
      const schema = { symbol: 'string', limit: 'number' };

      expect(() => ParameterUtils.validateTypes(params, schema)).toThrow(
        "Parameter 'limit' must be of type number, got string",
      );
    });

    it('should skip validation for undefined parameters', () => {
      const params = { symbol: 'BTCUSDT' };
      const schema = { symbol: 'string', limit: 'number' };

      expect(() => ParameterUtils.validateTypes(params, schema)).not.toThrow();
    });

    it('should handle multiple type mismatches', () => {
      const params = { symbol: 123, limit: '100' };
      const schema = { symbol: 'string', limit: 'number' };

      expect(() => ParameterUtils.validateTypes(params, schema)).toThrow(
        "Parameter 'symbol' must be of type string, got number",
      );
    });
  });

  describe('toUrlEncoded', () => {
    it('should convert parameters to URL encoded string', () => {
      const params = { symbol: 'BTCUSDT', side: 'BUY', quantity: '1.0' };
      const encoded = ParameterUtils.toUrlEncoded(params);

      expect(encoded).toBe('symbol=BTCUSDT&side=BUY&quantity=1.0');
    });

    it('should clean parameters before encoding', () => {
      const params = { symbol: 'BTCUSDT', side: null, quantity: undefined, active: true };
      const encoded = ParameterUtils.toUrlEncoded(params);

      expect(encoded).toBe('symbol=BTCUSDT&active=true');
    });

    it('should URL encode special characters', () => {
      const params = { symbol: 'BTC/USDT', message: 'hello world & more' };
      const encoded = ParameterUtils.toUrlEncoded(params);

      expect(encoded).toBe('symbol=BTC%2FUSDT&message=hello%20world%20%26%20more');
    });

    it('should handle empty object', () => {
      const encoded = ParameterUtils.toUrlEncoded({});
      expect(encoded).toBe('');
    });
  });
});

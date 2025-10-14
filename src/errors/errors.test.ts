/**
 * Error handling tests
 */

import { describe, it, expect } from 'vitest';
import {
  AsterDEXError,
  ConfigError,
  AuthError,
  NetworkError,
  ApiResponseError,
  RateLimitError,
  ValidationError,
  ErrorFactory,
  getErrorMessage,
  isRetryableError,
  getRetryDelay,
} from '@/errors/errors';

describe('Error Classes', () => {
  describe('AsterDEXError', () => {
    it('should create base error with name and timestamp', () => {
      class TestError extends AsterDEXError {}
      const error = new TestError('Test message');

      expect(error.message).toBe('Test message');
      expect(error.name).toBe('TestError');
      expect(error.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('ApiResponseError', () => {
    it('should create API response error with status code', () => {
      const error = new ApiResponseError('Not found', 404, -1121);

      expect(error.message).toBe('Not found');
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe(-1121);
      expect(error.isClientError()).toBe(true);
      expect(error.isServerError()).toBe(false);
    });

    it('should identify server errors correctly', () => {
      const error = new ApiResponseError('Internal error', 500);

      expect(error.isServerError()).toBe(true);
      expect(error.isClientError()).toBe(false);
    });

    it('should identify rate limit errors', () => {
      const error = new ApiResponseError('Too many requests', 429);

      expect(error.isRateLimitError()).toBe(true);
    });

    it('should parse retry-after header', () => {
      const error = new ApiResponseError('Rate limited', 429, undefined, { 'retry-after': '60' });

      expect(error.getRetryAfter()).toBe(60);
    });
  });

  describe('RateLimitError', () => {
    it('should extend ApiResponseError with retry-after', () => {
      const error = new RateLimitError('Rate limited', 429, { 'retry-after': '30' });

      expect(error.retryAfter).toBe(30);
      expect(error.isRateLimitError()).toBe(true);
    });
  });

  describe('ValidationError', () => {
    it('should include field information', () => {
      const error = new ValidationError('Invalid symbol', 'symbol');

      expect(error.message).toBe('Invalid symbol');
      expect(error.field).toBe('symbol');
    });
  });
});

describe('ErrorFactory', () => {
  describe('fromHttpResponse', () => {
    it('should create ApiResponseError from HTTP response', () => {
      const error = ErrorFactory.fromHttpResponse(
        400,
        '{"code": -1121, "msg": "Invalid symbol."}',
        {},
      );

      expect(error).toBeInstanceOf(ApiResponseError);
      expect(error.message).toContain('Invalid symbol');
      expect((error as ApiResponseError).code).toBe(-1121);
    });

    it('should create RateLimitError for rate limit responses', () => {
      const error = ErrorFactory.fromHttpResponse(429, 'Too many requests', {
        'retry-after': '60',
      });

      expect(error).toBeInstanceOf(RateLimitError);
      expect((error as RateLimitError).retryAfter).toBe(60);
    });

    it('should handle malformed JSON response', () => {
      const error = ErrorFactory.fromHttpResponse(500, 'Internal Server Error', {});

      expect(error).toBeInstanceOf(ApiResponseError);
      expect(error.message).toBe('Internal Server Error');
    });
  });

  describe('validation and auth errors', () => {
    it('should create validation error', () => {
      const error = ErrorFactory.validationError('Missing field', 'symbol');

      expect(error).toBeInstanceOf(ValidationError);
      expect(error.field).toBe('symbol');
    });

    it('should create auth error', () => {
      const error = ErrorFactory.authError('Invalid credentials');

      expect(error).toBeInstanceOf(AuthError);
      expect(error.message).toBe('Invalid credentials');
    });

    it('should create config error', () => {
      const error = ErrorFactory.configError('Invalid configuration');

      expect(error).toBeInstanceOf(ConfigError);
    });
  });
});

describe('Error Utilities', () => {
  describe('isRetryableError', () => {
    it('should identify retryable errors', () => {
      const networkError = new NetworkError('Connection failed');
      const serverError = new ApiResponseError('Internal error', 500);
      const rateLimitError = new RateLimitError('Rate limited', 429);

      expect(isRetryableError(networkError)).toBe(true);
      expect(isRetryableError(serverError)).toBe(true);
      expect(isRetryableError(rateLimitError)).toBe(true);
    });

    it('should identify non-retryable errors', () => {
      const clientError = new ApiResponseError('Bad request', 400);
      const authError = new AuthError('Invalid credentials');

      expect(isRetryableError(clientError)).toBe(false);
      expect(isRetryableError(authError)).toBe(false);
    });
  });

  describe('getRetryDelay', () => {
    it('should use retry-after header for rate limit errors', () => {
      const error = new RateLimitError('Rate limited', 429, { 'retry-after': '30' });

      expect(getRetryDelay(error, 1000)).toBe(30000);
    });

    it('should use default delay for other errors', () => {
      const error = new NetworkError('Connection failed');

      expect(getRetryDelay(error, 2000)).toBe(2000);
    });
  });

  describe('getErrorMessage', () => {
    it('should return error name for known codes', () => {
      const message = getErrorMessage(-1121);

      expect(message).toBe('BAD_SYMBOL');
    });

    it('should return unknown message for unknown codes', () => {
      const message = getErrorMessage(-9999);

      expect(message).toBe('Unknown error code: -9999');
    });
  });
});

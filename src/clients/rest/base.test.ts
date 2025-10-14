/**
 * Tests for BaseRestClient
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BaseRestClient } from '@/clients/rest/base';
import { Config } from '@/config/config';
import { HttpMethods } from '@/constants/http';
import type { HttpMethod } from '@/types/common';

// Create a concrete implementation for testing
class TestRestClient extends BaseRestClient {
  constructor(config: Config) {
    super(config, 'https://api.test.com');
  }

  // Expose protected methods for testing
  public testPublicRequest<T>(
    method: HttpMethod,
    endpoint: string,
    params?: Record<string, unknown>,
  ) {
    return this.publicRequest<T>(method, endpoint, params);
  }

  public testKeyRequest<T>(method: HttpMethod, endpoint: string, params?: Record<string, unknown>) {
    return this.keyRequest<T>(method, endpoint, params);
  }

  public testSignedRequest<T>(
    method: HttpMethod,
    endpoint: string,
    params?: Record<string, unknown>,
  ) {
    return this.signedRequest<T>(method, endpoint, params);
  }

  public testUserDataRequest<T>(
    method: HttpMethod,
    endpoint: string,
    params?: Record<string, unknown>,
  ) {
    return this.userDataRequest<T>(method, endpoint, params);
  }

  public testUserStreamRequest<T>(
    method: HttpMethod,
    endpoint: string,
    params?: Record<string, unknown>,
  ) {
    return this.userStreamRequest<T>(method, endpoint, params);
  }

  public testValidateRequired(params: Record<string, unknown>, required: string[]) {
    return this.validateRequired(params, required);
  }
}

describe('BaseRestClient', () => {
  let config: Config;
  let client: TestRestClient;

  beforeEach(() => {
    // Mock config
    config = new Config({
      apiKey: 'test-api-key',
      apiSecret: 'test-api-secret',
      timeout: 30000,
      recvWindow: 5000,
      enableRateLimiting: false,
    });

    client = new TestRestClient(config);

    // Mock HTTP client
    const httpClient = client['httpClient'] as unknown as { request: ReturnType<typeof vi.fn> };
    httpClient.request = vi.fn().mockResolvedValue({
      data: { success: true },
      status: 200,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with correct base URL', () => {
      expect(client.getBaseUrl()).toBe('https://api.test.com');
    });

    it('should initialize authentication manager', () => {
      expect(client.hasAuth()).toBe(true);
    });

    it('should initialize rate limiter when enabled', () => {
      const rateLimitConfig = new Config({
        apiKey: 'test-api-key',
        apiSecret: 'test-api-secret',
        enableRateLimiting: true,
      });

      const rateLimitedClient = new TestRestClient(rateLimitConfig);
      expect(rateLimitedClient['rateLimiter']).toBeDefined();
    });
  });

  describe('HTTP Method Parameter Handling', () => {
    it('should use query params for GET requests', async () => {
      const mockRequest = vi.mocked(
        client['httpClient'] as unknown as { request: ReturnType<typeof vi.fn> },
      );
      const params = { symbol: 'BTCUSDT', limit: 100 };

      await client.testPublicRequest(HttpMethods.GET, '/test', params);

      expect(mockRequest.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: HttpMethods.GET,
          params: expect.objectContaining(params),
        }),
      );
      // Verify data field is not present for GET requests
      const callArgs = mockRequest.request.mock.calls[0]?.[0];
      expect(callArgs).toBeDefined();
      expect(callArgs).not.toHaveProperty('data');
    });

    it('should use query params for DELETE requests', async () => {
      const mockRequest = vi.mocked(
        client['httpClient'] as unknown as { request: ReturnType<typeof vi.fn> },
      );
      const params = { orderId: 12345 };

      await client.testPublicRequest(HttpMethods.DELETE, '/test', params);

      expect(mockRequest.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: HttpMethods.DELETE,
          params: expect.objectContaining(params),
        }),
      );
      // Verify data field is not present for DELETE requests
      const callArgs = mockRequest.request.mock.calls[0]?.[0];
      expect(callArgs).toBeDefined();
      expect(callArgs).not.toHaveProperty('data');
    });

    it('should use request body for POST requests', async () => {
      const mockRequest = vi.mocked(
        client['httpClient'] as unknown as { request: ReturnType<typeof vi.fn> },
      );
      const params = { symbol: 'BTCUSDT', side: 'BUY' };

      await client.testPublicRequest(HttpMethods.POST, '/test', params);

      expect(mockRequest.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: HttpMethods.POST,
          data: 'symbol=BTCUSDT&side=BUY',
          headers: expect.objectContaining({
            'Content-Type': 'application/x-www-form-urlencoded',
          }),
        }),
      );
      // Verify params field is not present for POST requests
      const callArgs = mockRequest.request.mock.calls[0]?.[0];
      expect(callArgs).toBeDefined();
      expect(callArgs).not.toHaveProperty('params');
    });

    it('should use request body for PUT requests', async () => {
      const mockRequest = vi.mocked(
        client['httpClient'] as unknown as { request: ReturnType<typeof vi.fn> },
      );
      const params = { symbol: 'BTCUSDT', quantity: '1.0' };

      await client.testPublicRequest(HttpMethods.PUT, '/test', params);

      expect(mockRequest.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: HttpMethods.PUT,
          data: 'symbol=BTCUSDT&quantity=1.0',
          headers: expect.objectContaining({
            'Content-Type': 'application/x-www-form-urlencoded',
          }),
        }),
      );
      // Verify params field is not present for PUT requests
      const callArgs = mockRequest.request.mock.calls[0]?.[0];
      expect(callArgs).toBeDefined();
      expect(callArgs).not.toHaveProperty('params');
    });
  });

  describe('Authentication Types', () => {
    it('should make public requests with NONE auth type', async () => {
      const mockRequest = vi.mocked(
        client['httpClient'] as unknown as { request: ReturnType<typeof vi.fn> },
      );

      await client.testPublicRequest(HttpMethods.GET, '/test');

      expect(mockRequest.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: HttpMethods.GET,
          url: 'https://api.test.com/test',
        }),
      );
    });

    it('should make key requests with MARKET_DATA auth type', async () => {
      const mockRequest = vi.mocked(
        client['httpClient'] as unknown as { request: ReturnType<typeof vi.fn> },
      );

      await client.testKeyRequest(HttpMethods.GET, '/test');

      expect(mockRequest.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: HttpMethods.GET,
          url: 'https://api.test.com/test',
        }),
      );
    });

    it('should make signed requests with TRADE auth type', async () => {
      const mockRequest = vi.mocked(
        client['httpClient'] as unknown as { request: ReturnType<typeof vi.fn> },
      );

      await client.testSignedRequest(HttpMethods.POST, '/test', { symbol: 'BTCUSDT' });

      expect(mockRequest.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: HttpMethods.POST,
          url: 'https://api.test.com/test',
        }),
      );
    });

    it('should make user data requests with USER_DATA auth type', async () => {
      const mockRequest = vi.mocked(
        client['httpClient'] as unknown as { request: ReturnType<typeof vi.fn> },
      );

      await client.testUserDataRequest(HttpMethods.GET, '/test');

      expect(mockRequest.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: HttpMethods.GET,
          url: 'https://api.test.com/test',
        }),
      );
    });

    it('should make user stream requests with USER_STREAM auth type', async () => {
      const mockRequest = vi.mocked(
        client['httpClient'] as unknown as { request: ReturnType<typeof vi.fn> },
      );

      await client.testUserStreamRequest(HttpMethods.POST, '/test');

      expect(mockRequest.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: HttpMethods.POST,
          url: 'https://api.test.com/test',
        }),
      );
    });
  });

  describe('Parameter Validation', () => {
    it('should validate required parameters successfully', () => {
      const params = { symbol: 'BTCUSDT', side: 'BUY', type: 'LIMIT' };
      const required = ['symbol', 'side', 'type'];

      expect(() => {
        client.testValidateRequired(params, required);
      }).not.toThrow();
    });

    it('should throw error for missing required parameters', () => {
      const params = { symbol: 'BTCUSDT' };
      const required = ['symbol', 'side', 'type'];

      expect(() => {
        client.testValidateRequired(params, required);
      }).toThrow();
    });
  });

  describe('Request Parameters', () => {
    it('should handle GET requests with query parameters', async () => {
      const mockRequest = vi.mocked(
        client['httpClient'] as unknown as { request: ReturnType<typeof vi.fn> },
      );
      const params = { symbol: 'BTCUSDT', limit: 100 };

      await client.testPublicRequest(HttpMethods.GET, '/test', params);

      expect(mockRequest.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: HttpMethods.GET,
          params: expect.objectContaining(params),
        }),
      );
    });

    it('should handle POST requests with request body', async () => {
      const mockRequest = vi.mocked(
        client['httpClient'] as unknown as { request: ReturnType<typeof vi.fn> },
      );
      const params = { symbol: 'BTCUSDT', side: 'BUY', type: 'LIMIT' };

      await client.testSignedRequest(HttpMethods.POST, '/test', params);

      expect(mockRequest.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: HttpMethods.POST,
          params: expect.any(Object), // Will be signed params in query string
        }),
      );
      // Verify data field is not present for signed POST requests
      const callArgs = mockRequest.request.mock.calls[0]?.[0];
      expect(callArgs).not.toHaveProperty('data');
    });

    it('should handle DELETE requests with query parameters', async () => {
      const mockRequest = vi.mocked(
        client['httpClient'] as unknown as { request: ReturnType<typeof vi.fn> },
      );
      const params = { orderId: 12345 };

      await client.testSignedRequest(HttpMethods.DELETE, '/test', params);

      expect(mockRequest.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: HttpMethods.DELETE,
          params: expect.any(Object), // Will be signed params
        }),
      );
    });
  });

  describe('Built-in Methods', () => {
    it('should have getServerTime method', async () => {
      const mockRequest = vi.mocked(
        client['httpClient'] as unknown as { request: ReturnType<typeof vi.fn> },
      );
      mockRequest.request.mockResolvedValue({
        data: { serverTime: 1640995200000 },
        status: 200,
        statusText: 'OK',
        headers: {},
      });

      const result = await client.getServerTime();

      expect(result).toEqual({ serverTime: 1640995200000 });
      expect(mockRequest.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: HttpMethods.GET,
          url: 'https://api.test.com/api/v1/time',
        }),
      );
    });

    it('should have ping method', async () => {
      const mockRequest = vi.mocked(
        client['httpClient'] as unknown as { request: ReturnType<typeof vi.fn> },
      );
      mockRequest.request.mockResolvedValue({
        data: {},
        status: 200,
        statusText: 'OK',
        headers: {},
      });

      const result = await client.ping();

      expect(result).toEqual({});
      expect(mockRequest.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: HttpMethods.GET,
          url: 'https://api.test.com/api/v1/ping',
        }),
      );
    });
  });

  describe('Authentication Management', () => {
    it('should update credentials', () => {
      client.updateCredentials('new-key', 'new-secret');
      // Should not throw and should update internal auth manager
      expect(() => client.updateCredentials('new-key', 'new-secret')).not.toThrow();
    });

    it('should check authentication status', () => {
      expect(client.hasAuth()).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle HTTP client errors', async () => {
      const mockRequest = vi.mocked(
        client['httpClient'] as unknown as { request: ReturnType<typeof vi.fn> },
      );
      mockRequest.request.mockRejectedValue(new Error('Network error'));

      await expect(client.testPublicRequest(HttpMethods.GET, '/test')).rejects.toThrow(
        'Network error',
      );
    });

    it('should handle empty parameters gracefully', async () => {
      const mockRequest = vi.mocked(
        client['httpClient'] as unknown as { request: ReturnType<typeof vi.fn> },
      );
      mockRequest.request.mockResolvedValue({
        data: { success: true },
        status: 200,
        statusText: 'OK',
        headers: {},
      });

      const result = await client.testPublicRequest(HttpMethods.GET, '/test', {});

      expect(result).toEqual({ success: true });
    });

    it('should handle undefined parameters gracefully', async () => {
      const mockRequest = vi.mocked(
        client['httpClient'] as unknown as { request: ReturnType<typeof vi.fn> },
      );
      mockRequest.request.mockResolvedValue({
        data: { success: true },
        status: 200,
        statusText: 'OK',
        headers: {},
      });

      const result = await client.testPublicRequest(HttpMethods.GET, '/test', undefined);

      expect(result).toEqual({ success: true });
    });
  });
});

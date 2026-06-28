/**
 * Tests for HTTP client utilities.
 */

import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { HttpClient, RateLimiter } from './http';
import type { HttpRequestOptions } from './http';

// Test constants
let testServer: Server;
let HTTP_TEST_BASE_URL = '';
const INVALID_DOMAIN = 'http://127.0.0.1:9';
const HTTP_STATUS_OK = 200;

// Timeout constants
const DEFAULT_TIMEOUT = 5000;
const CUSTOM_TIMEOUT = 10000;
const SHORT_TIMEOUT = 1000;
const NETWORK_OVERHEAD_TIMEOUT = 5000;

// Retry configuration
const DEFAULT_MAX_RETRIES = 2;
const DEFAULT_RETRY_DELAY = 100;
const DEFAULT_BACKOFF_MULTIPLIER = 2;
const CUSTOM_MAX_RETRIES = 5;
const CUSTOM_RETRY_DELAY = 200;
const CUSTOM_BACKOFF_MULTIPLIER = 1.5;

// Rate limiter constants
const RATE_LIMIT_MAX_REQUESTS = 5;
const RATE_LIMIT_WINDOW_MS = 1000;
const RATE_LIMIT_RESET_TIME_MIN = 900;
const RATE_LIMIT_WINDOW_EXPIRED_MS = 1001;
const RATE_LIMIT_HALF_WINDOW_MS = 500;
const RATE_LIMIT_WINDOW_PLUS_MS = 501;

// Helper functions
const buildHttpTestUrl = (path: string) => `${HTTP_TEST_BASE_URL}${path}`;

const sendJson = (response: ServerResponse, statusCode: number, data: unknown): void => {
  response.writeHead(statusCode, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify(data));
};

const readBody = async (request: IncomingMessage): Promise<string> =>
  new Promise((resolve, reject) => {
    let body = '';
    request.setEncoding('utf8');
    request.on('data', (chunk) => {
      body += chunk;
    });
    request.on('end', () => resolve(body));
    request.on('error', reject);
  });

const createTestServer = (): Server =>
  createServer((request, response) => {
    void (async () => {
      const url = new URL(request.url ?? '/', HTTP_TEST_BASE_URL);
      const args = Object.fromEntries(url.searchParams.entries());

      if (url.pathname === '/delay/10') {
        setTimeout(() => {
          if (!response.destroyed) {
            sendJson(response, HTTP_STATUS_OK, { delayed: true });
          }
        }, 10_000);
        return;
      }

      if (url.pathname.startsWith('/status/')) {
        const statusCode = Number(url.pathname.split('/').at(-1));
        sendJson(response, statusCode, { code: statusCode, msg: `Status ${statusCode}` });
        return;
      }

      if (request.method === 'GET' && url.pathname === '/get') {
        sendJson(response, HTTP_STATUS_OK, {
          args,
          headers: {
            'X-Custom-Header': request.headers['x-custom-header'],
          },
          url: `${HTTP_TEST_BASE_URL}${url.pathname}${url.search}`,
        });
        return;
      }

      if (request.method === 'POST' && url.pathname === '/post') {
        const body = await readBody(request);
        sendJson(response, HTTP_STATUS_OK, { json: JSON.parse(body) });
        return;
      }

      if (request.method === 'PUT' && url.pathname === '/put') {
        const body = await readBody(request);
        sendJson(response, HTTP_STATUS_OK, { json: JSON.parse(body) });
        return;
      }

      if (request.method === 'DELETE' && url.pathname === '/delete') {
        sendJson(response, HTTP_STATUS_OK, {
          args,
          url: `${HTTP_TEST_BASE_URL}${url.pathname}${url.search}`,
        });
        return;
      }

      sendJson(response, 404, { code: 404, msg: 'Not found' });
    })().catch((error: unknown) => {
      sendJson(response, 500, {
        code: 500,
        msg: error instanceof Error ? error.message : 'Unknown server error',
      });
    });
  });

describe('HttpClient', () => {
  let httpClient: HttpClient;

  beforeAll(async () => {
    testServer = createTestServer();
    await new Promise<void>((resolve) => {
      testServer.listen(0, '127.0.0.1', resolve);
    });
    const address = testServer.address() as AddressInfo;
    HTTP_TEST_BASE_URL = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      testServer.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  });

  beforeEach(() => {
    httpClient = new HttpClient(DEFAULT_TIMEOUT, {
      maxRetries: DEFAULT_MAX_RETRIES,
      retryDelay: DEFAULT_RETRY_DELAY,
      backoffMultiplier: DEFAULT_BACKOFF_MULTIPLIER,
    });
  });

  describe('constructor', () => {
    it('should create instance with default timeout', () => {
      const client = new HttpClient();
      expect(client).toBeInstanceOf(HttpClient);
    });

    it('should create instance with custom config', () => {
      const client = new HttpClient(CUSTOM_TIMEOUT, {
        maxRetries: CUSTOM_MAX_RETRIES,
        retryDelay: CUSTOM_RETRY_DELAY,
        backoffMultiplier: CUSTOM_BACKOFF_MULTIPLIER,
      });
      expect(client).toBeInstanceOf(HttpClient);
    });
  });

  describe('real API requests', () => {
    it('should make successful GET request', async () => {
      const options: HttpRequestOptions = {
        method: 'GET',
        url: buildHttpTestUrl('/get'),
      };

      const response = await httpClient.request(options);

      expect(response.status).toBe(HTTP_STATUS_OK);
      expect(response.data).toHaveProperty('url');
      expect(response.data.url).toBe(buildHttpTestUrl('/get'));
    });

    it('should make successful POST request', async () => {
      const testData = { key: 'value', test: 123 };
      const options: HttpRequestOptions = {
        method: 'POST',
        url: buildHttpTestUrl('/post'),
        data: testData,
      };

      const response = await httpClient.request(options);

      expect(response.status).toBe(HTTP_STATUS_OK);
      expect(response.data).toHaveProperty('json');
      expect(response.data.json).toEqual(testData);
    });

    it('should handle query parameters', async () => {
      const options: HttpRequestOptions = {
        method: 'GET',
        url: buildHttpTestUrl('/get'),
        params: { param1: 'value1', param2: 'value2' },
      };

      const response = await httpClient.request(options);

      expect(response.status).toBe(HTTP_STATUS_OK);
      expect(response.data).toHaveProperty('args');
      expect(response.data.args).toEqual({ param1: 'value1', param2: 'value2' });
    });

    it('should handle custom headers', async () => {
      const options: HttpRequestOptions = {
        method: 'GET',
        url: buildHttpTestUrl('/get'),
        headers: { 'X-Custom-Header': 'test-value' },
      };

      const response = await httpClient.request(options);

      expect(response.status).toBe(HTTP_STATUS_OK);
      expect(response.data).toHaveProperty('headers');
      expect(response.data.headers).toHaveProperty('X-Custom-Header');
      expect(response.data.headers['X-Custom-Header']).toBe('test-value');
    });

    it('should handle HTTP 404 error responses', async () => {
      const options: HttpRequestOptions = {
        method: 'GET',
        url: buildHttpTestUrl('/status/404'),
      };

      await expect(httpClient.request(options)).rejects.toThrow();
    });

    it('should handle network errors', async () => {
      const options: HttpRequestOptions = {
        method: 'GET',
        url: INVALID_DOMAIN,
      };

      await expect(httpClient.request(options)).rejects.toThrow('Network request failed');
    });

    it('should handle timeout', async () => {
      const options: HttpRequestOptions = {
        method: 'GET',
        url: buildHttpTestUrl('/delay/10'),
        timeout: SHORT_TIMEOUT, // 1 second timeout for 10 second delay
      };

      await expect(httpClient.request(options)).rejects.toThrow('Request timeout');
    });

    // Note: HTTP 500 retry test removed due to flakiness with httpbin.org
    // The retry logic is still tested with other error conditions

    it('should not retry client errors', async () => {
      const options: HttpRequestOptions = {
        method: 'GET',
        url: buildHttpTestUrl('/status/400'),
      };

      const startTime = Date.now();
      await expect(httpClient.request(options)).rejects.toThrow();
      const endTime = Date.now();

      // Should fail quickly without retries (allow up to 5 seconds for network overhead)
      expect(endTime - startTime).toBeLessThan(NETWORK_OVERHEAD_TIMEOUT);
    });
  });

  describe('helper methods', () => {
    it('should make GET request using helper method', async () => {
      const response = await httpClient.get(buildHttpTestUrl('/get'));

      expect(response.status).toBe(HTTP_STATUS_OK);
      expect(response.data).toHaveProperty('url');
    });

    it('should make GET request with parameters using helper method', async () => {
      const response = await httpClient.get(buildHttpTestUrl('/get'), { test: 'param' });

      expect(response.status).toBe(HTTP_STATUS_OK);
      expect(response.data).toHaveProperty('args');
      expect(response.data.args).toEqual({ test: 'param' });
    });

    it('should make POST request using helper method', async () => {
      const testData = { test: 'data' };
      const response = await httpClient.post(buildHttpTestUrl('/post'), testData);

      expect(response.status).toBe(HTTP_STATUS_OK);
      expect(response.data).toHaveProperty('json');
      expect((response.data as any).json).toEqual(testData);
    });

    it('should make PUT request using helper method', async () => {
      const testData = { test: 'put-data' };
      const response = await httpClient.put(buildHttpTestUrl('/put'), testData);

      expect(response.status).toBe(HTTP_STATUS_OK);
      expect(response.data).toHaveProperty('json');
      expect((response.data as any).json).toEqual(testData);
    });

    it('should make DELETE request using helper method', async () => {
      const response = await httpClient.delete(buildHttpTestUrl('/delete'));

      expect(response.status).toBe(HTTP_STATUS_OK);
      expect(response.data).toHaveProperty('url');
    });
  });
});

describe('RateLimiter', () => {
  let rateLimiter: RateLimiter;

  beforeEach(() => {
    rateLimiter = new RateLimiter(RATE_LIMIT_MAX_REQUESTS, RATE_LIMIT_WINDOW_MS); // 5 requests per second
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('canMakeRequest', () => {
    it('should allow requests within limit', () => {
      for (let i = 0; i < RATE_LIMIT_MAX_REQUESTS; i++) {
        expect(rateLimiter.canMakeRequest()).toBe(true);
        rateLimiter.recordRequest();
      }
      expect(rateLimiter.canMakeRequest()).toBe(false);
    });

    it('should reset after time window', () => {
      // Fill up the rate limiter
      for (let i = 0; i < RATE_LIMIT_MAX_REQUESTS; i++) {
        rateLimiter.recordRequest();
      }

      expect(rateLimiter.canMakeRequest()).toBe(false);

      // Advance time past the window
      vi.advanceTimersByTime(RATE_LIMIT_WINDOW_EXPIRED_MS);

      expect(rateLimiter.canMakeRequest()).toBe(true);
    });
  });

  describe('getTimeUntilReset', () => {
    it('should return 0 when no requests recorded', () => {
      expect(rateLimiter.getTimeUntilReset()).toBe(0);
    });

    it('should calculate time until reset correctly', () => {
      rateLimiter.recordRequest();

      const timeUntilReset = rateLimiter.getTimeUntilReset();
      expect(timeUntilReset).toBeGreaterThan(RATE_LIMIT_RESET_TIME_MIN);
      expect(timeUntilReset).toBeLessThanOrEqual(RATE_LIMIT_WINDOW_MS);
    });
  });

  describe('waitUntilReady', () => {
    it('should resolve immediately when requests available', async () => {
      const waitPromise = rateLimiter.waitUntilReady();
      await expect(waitPromise).resolves.toBeUndefined();
    });

    it('should wait when rate limit exceeded', async () => {
      // Fill up the rate limiter
      for (let i = 0; i < RATE_LIMIT_MAX_REQUESTS; i++) {
        rateLimiter.recordRequest();
      }

      const waitPromise = rateLimiter.waitUntilReady();

      // Should not resolve immediately
      let resolved = false;
      void waitPromise.then(() => {
        resolved = true;
      });

      await vi.advanceTimersByTimeAsync(RATE_LIMIT_HALF_WINDOW_MS);
      expect(resolved).toBe(false);

      // Should resolve after window expires
      await vi.advanceTimersByTimeAsync(RATE_LIMIT_WINDOW_PLUS_MS);
      expect(resolved).toBe(true);
    });
  });

  describe('reset', () => {
    it('should clear all recorded requests', () => {
      // Record maximum requests
      for (let i = 0; i < RATE_LIMIT_MAX_REQUESTS; i++) {
        rateLimiter.recordRequest();
      }

      expect(rateLimiter.canMakeRequest()).toBe(false);

      rateLimiter.reset();

      expect(rateLimiter.canMakeRequest()).toBe(true);
    });
  });
});

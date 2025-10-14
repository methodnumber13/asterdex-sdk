/**
 * HTTP client utilities with retry logic and rate limiting
 */

import type { HttpMethod, ApiResponse as _ApiResponse } from '@/types/common';
import { ErrorFactory, isRetryableError, getRetryDelay, AsterDEXError } from '@/errors/errors';
import { DEFAULT_CONFIG, RETRY_CONSTANTS } from '@/config/constants';

/**
 * HTTP request options
 */
export interface HttpRequestOptions {
  method: HttpMethod;
  url: string;
  headers?: Record<string, string> | undefined;
  params?: Record<string, unknown> | undefined;
  data?: unknown;
  timeout?: number | undefined;
}

/**
 * HTTP response interface
 */
export interface HttpResponse<T = unknown> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxRetries: number;
  retryDelay: number;
  backoffMultiplier: number;
}

/**
 * HTTP client with built-in retry logic and error handling
 */
export class HttpClient {
  private readonly timeout: number;
  private readonly retryConfig: RetryConfig;

  constructor(
    timeout: number = DEFAULT_CONFIG.timeout,
    retryConfig: RetryConfig = {
      maxRetries: RETRY_CONSTANTS.DEFAULT_MAX_RETRIES,
      retryDelay: RETRY_CONSTANTS.DEFAULT_RETRY_DELAY,
      backoffMultiplier: RETRY_CONSTANTS.DEFAULT_BACKOFF_MULTIPLIER,
    },
  ) {
    this.timeout = timeout;
    this.retryConfig = retryConfig;
  }

  /**
   * Make HTTP request with retry logic
   */
  public async request<T = any>(options: HttpRequestOptions): Promise<HttpResponse<T>> {
    let lastError: Error | null = null;
    let attempt = 0;

    while (attempt <= this.retryConfig.maxRetries) {
      try {
        return await this.executeRequest<T>(options);
      } catch (error) {
        lastError = error as Error;

        // Don't retry if we've exhausted attempts or error is not retryable
        if (attempt === this.retryConfig.maxRetries || !isRetryableError(lastError)) {
          break;
        }

        // Calculate delay with exponential backoff
        const delay = getRetryDelay(
          lastError as AsterDEXError,
          this.retryConfig.retryDelay * Math.pow(this.retryConfig.backoffMultiplier, attempt),
        );

        // Wait before retrying
        await this.sleep(delay);
        attempt++;
      }
    }

    // This should never happen, but TypeScript requires it
    throw lastError ?? new Error('Unknown error occurred during request');
  }

  /**
   * Execute the actual HTTP request
   */
  private async executeRequest<T>(options: HttpRequestOptions): Promise<HttpResponse<T>> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeout ?? this.timeout);

    try {
      // Prepare URL with query parameters (sorted alphabetically to match signature)
      const url = new URL(options.url);
      if (options.params) {
        // Sort parameters alphabetically to match signature generation order
        Object.entries(options.params)
          .sort(([a], [b]) => a.localeCompare(b))
          .forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
              let stringValue: string;
              if (typeof value === 'object' && value !== null) {
                if (Array.isArray(value)) {
                  stringValue = value.join(',');
                } else {
                  stringValue = JSON.stringify(value);
                }
              } else {
                // Ensure safe stringification - avoid '[object Object]'
                if (typeof value === 'object' && value !== null) {
                  stringValue = JSON.stringify(value);
                } else if (
                  typeof value === 'string' ||
                  typeof value === 'number' ||
                  typeof value === 'boolean'
                ) {
                  stringValue = String(value);
                } else {
                  // Fallback for other types like undefined, bigint, symbol, function
                  stringValue = JSON.stringify(value);
                }
              }
              url.searchParams.append(key, stringValue);
            }
          });
      }

      // Prepare request options
      const requestInit: RequestInit = {
        method: options.method,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        signal: controller.signal,
      };

      // Add body for POST/PUT requests
      if (options.data && (options.method === 'POST' || options.method === 'PUT')) {
        if (typeof options.data === 'string') {
          requestInit.body = options.data;
        } else {
          requestInit.body = JSON.stringify(options.data);
        }
      }

      const response = await fetch(url.toString(), requestInit);

      // Convert headers to object
      const headers: Record<string, string> = {};
      if (response?.headers) {
        response.headers.forEach((value, key) => {
          headers[key.toLowerCase()] = value;
        });
      }

      // Handle non-2xx responses
      if (!response.ok) {
        const responseText = await response.text();
        throw ErrorFactory.fromHttpResponse(response.status, responseText, headers);
      }

      // Parse response
      const contentType = headers['content-type'] ?? '';
      let data: T;

      if (contentType.includes('application/json')) {
        data = (await response.json()) as T;
      } else {
        data = (await response.text()) as T;
      }

      return {
        data,
        status: response.status,
        statusText: response.statusText,
        headers,
      };
    } catch (error) {
      // Handle abort/timeout errors
      if (error instanceof Error && error.name === 'AbortError') {
        throw ErrorFactory.fromNetworkError(new Error('Request timeout'));
      }

      // Handle network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw ErrorFactory.fromNetworkError(error);
      }

      // Re-throw other errors
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Helper method for GET requests
   */
  public async get<T = any>(
    url: string,
    params?: Record<string, any>,
    headers?: Record<string, string>,
  ): Promise<HttpResponse<T>> {
    return this.request<T>({
      method: 'GET',
      url,
      ...(params && { params }),
      ...(headers && { headers }),
    });
  }

  /**
   * Helper method for POST requests
   */
  public async post<T = unknown>(
    url: string,
    data?: unknown,
    headers?: Record<string, string>,
  ): Promise<HttpResponse<T>> {
    return this.request<T>({
      method: 'POST',
      url,
      ...(data !== undefined && { data }),
      ...(headers && { headers }),
    });
  }

  /**
   * Helper method for PUT requests
   */
  public async put<T = unknown>(
    url: string,
    data?: unknown,
    headers?: Record<string, string>,
  ): Promise<HttpResponse<T>> {
    return this.request<T>({
      method: 'PUT',
      url,
      ...(data !== undefined && { data }),
      ...(headers && { headers }),
    });
  }

  /**
   * Helper method for DELETE requests
   */
  public async delete<T = any>(
    url: string,
    params?: Record<string, any>,
    headers?: Record<string, string>,
  ): Promise<HttpResponse<T>> {
    return this.request<T>({
      method: 'DELETE',
      url,
      ...(params && { params }),
      ...(headers && { headers }),
    });
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Rate limiter for managing API request rates
 */
export class RateLimiter {
  private requests: number[] = [];
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  /**
   * Check if a request can be made
   */
  public canMakeRequest(): boolean {
    const now = Date.now();
    this.cleanOldRequests(now);
    return this.requests.length < this.maxRequests;
  }

  /**
   * Record a request
   */
  public recordRequest(): void {
    const now = Date.now();
    this.cleanOldRequests(now);
    this.requests.push(now);
  }

  /**
   * Get time until next request can be made
   */
  public getTimeUntilReset(): number {
    if (this.requests.length === 0) {
      return 0;
    }

    const oldestRequest = Math.min(...this.requests);
    const resetTime = oldestRequest + this.windowMs;
    return Math.max(0, resetTime - Date.now());
  }

  /**
   * Wait until a request can be made
   */
  public async waitUntilReady(): Promise<void> {
    if (this.canMakeRequest()) {
      return;
    }

    const waitTime = this.getTimeUntilReset();
    if (waitTime > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }

  /**
   * Remove old requests outside the time window
   */
  private cleanOldRequests(now: number): void {
    const cutoff = now - this.windowMs;
    this.requests = this.requests.filter((timestamp) => timestamp > cutoff);
  }

  /**
   * Reset the rate limiter
   */
  public reset(): void {
    this.requests = [];
  }
}

/**
 * @file The base REST API client for AsterDEX, providing common functionality for other clients.
 * @author AsterDEX
 * @version 1.0.0
 * @license MIT
 */

import { HttpClient, RateLimiter } from '@/utils/http';
import { AuthManager, ParameterUtils } from '@/auth/signature';
import { Config } from '@/config/config';
import { RATE_LIMITS, API_VERSIONS, RETRY_CONSTANTS } from '@/config/constants';
import { ErrorFactory as _ErrorFactory } from '@/errors/errors';
import { HttpMethods } from '@/constants/http';
import { ApiAuthTypes } from '@/constants/futures';
import type { HttpMethod, ApiResponse as _ApiResponse, ApiAuthType } from '@/types/common';

/**
 * An abstract base class for REST API clients, handling authentication, rate limiting, and request signing.
 * @abstract
 * @class BaseRestClient
 */
export abstract class BaseRestClient {
  protected readonly config: Config;
  protected readonly httpClient: HttpClient;
  protected readonly authManager: AuthManager;
  protected readonly rateLimiter?: RateLimiter;
  protected readonly baseUrl: string;

  /**
   * Creates an instance of BaseRestClient.
   * @param {Config} config - The configuration object for the client.
   * @param {string} baseUrl - The base URL for the API.
   */
  constructor(config: Config, baseUrl: string) {
    this.config = config;
    this.baseUrl = baseUrl;
    this.httpClient = new HttpClient(config.getTimeout(), config.getRetryConfig());
    this.authManager = new AuthManager(config.getApiKey(), config.getApiSecret());

    if (config.isRateLimitingEnabled()) {
      this.rateLimiter = new RateLimiter(
        RATE_LIMITS.MAX_REQUESTS_PER_MINUTE,
        RETRY_CONSTANTS.ONE_MINUTE_MS,
      );
    }
  }

  /**
   * Makes a public API request that does not require authentication.
   * @protected
   * @template T
   * @param {HttpMethod} method - The HTTP method for the request.
   * @param {string} endpoint - The API endpoint to call.
   * @param {Record<string, any>} [params] - The parameters for the request.
   * @returns {Promise<T>} A promise that resolves with the response data.
   */
  protected async publicRequest<T = any>(
    method: HttpMethod,
    endpoint: string,
    params?: Record<string, any>,
  ): Promise<T> {
    return this.makeRequest<T>(method, endpoint, params, ApiAuthTypes.NONE);
  }

  /**
   * Makes an API request that requires an API key.
   * @protected
   * @template T
   * @param {HttpMethod} method - The HTTP method for the request.
   * @param {string} endpoint - The API endpoint to call.
   * @param {Record<string, any>} [params] - The parameters for the request.
   * @returns {Promise<T>} A promise that resolves with the response data.
   */
  protected async keyRequest<T = any>(
    method: HttpMethod,
    endpoint: string,
    params?: Record<string, any>,
  ): Promise<T> {
    return this.makeRequest<T>(method, endpoint, params, ApiAuthTypes.MARKET_DATA);
  }

  /**
   * Makes a signed API request that requires both an API key and secret.
   * @protected
   * @template T
   * @param {HttpMethod} method - The HTTP method for the request.
   * @param {string} endpoint - The API endpoint to call.
   * @param {Record<string, any>} [params] - The parameters for the request.
   * @returns {Promise<T>} A promise that resolves with the response data.
   */
  protected async signedRequest<T = any>(
    method: HttpMethod,
    endpoint: string,
    params?: Record<string, any>,
  ): Promise<T> {
    return this.makeRequest<T>(method, endpoint, params, ApiAuthTypes.TRADE);
  }

  /**
   * Makes a user data API request that requires an API key and secret.
   * @protected
   * @template T
   * @param {HttpMethod} method - The HTTP method for the request.
   * @param {string} endpoint - The API endpoint to call.
   * @param {Record<string, any>} [params] - The parameters for the request.
   * @returns {Promise<T>} A promise that resolves with the response data.
   */
  protected async userDataRequest<T = any>(
    method: HttpMethod,
    endpoint: string,
    params?: Record<string, any>,
  ): Promise<T> {
    return this.makeRequest<T>(method, endpoint, params, ApiAuthTypes.USER_DATA);
  }

  /**
   * Makes a user stream API request that requires an API key.
   * @protected
   * @template T
   * @param {HttpMethod} method - The HTTP method for the request.
   * @param {string} endpoint - The API endpoint to call.
   * @param {Record<string, any>} [params] - The parameters for the request.
   * @returns {Promise<T>} A promise that resolves with the response data.
   */
  protected async userStreamRequest<T = any>(
    method: HttpMethod,
    endpoint: string,
    params?: Record<string, any>,
  ): Promise<T> {
    return this.makeRequest<T>(method, endpoint, params, ApiAuthTypes.USER_STREAM);
  }

  /**
   * The core method for making API requests, handling authentication and rate limiting.
   * @private
   * @template T
   * @param {HttpMethod} method - The HTTP method for the request.
   * @param {string} endpoint - The API endpoint to call.
   * @param {Record<string, any>} [params={}] - The parameters for the request.
   * @param {ApiAuthType} authType - The type of authentication required for the request.
   * @returns {Promise<T>} A promise that resolves with the response data.
   */
  private async makeRequest<T>(
    method: HttpMethod,
    endpoint: string,
    params: Record<string, any> = {},
    authType: ApiAuthType,
  ): Promise<T> {
    if (this.rateLimiter) {
      await this.rateLimiter.waitUntilReady();
      this.rateLimiter.recordRequest();
    }

    const cleanedParams = ParameterUtils.cleanParams(params);
    const headers = this.authManager.createHeaders(
      authType === ApiAuthTypes.TRADE || authType === ApiAuthTypes.USER_DATA
        ? ApiAuthTypes.SIGNED
        : authType,
    );

    let queryParams: Record<string, any> = {};
    let bodyData: Record<string, any> = {};

    if (authType === ApiAuthTypes.TRADE || authType === ApiAuthTypes.USER_DATA) {
      const recvWindow = this.config.getRecvWindow();
      if (this.shouldUseQueryParams(method)) {
        const signedParams = this.authManager.signRequest(cleanedParams, recvWindow);
        queryParams = signedParams;
      } else {
        const signedParams = this.authManager.signRequest(cleanedParams, recvWindow);
        queryParams = signedParams;
      }
    } else {
      if (this.shouldUseQueryParams(method)) {
        queryParams = cleanedParams;
      } else {
        bodyData = cleanedParams;
      }
    }

    const url = `${this.baseUrl}${endpoint}`;
    let requestData: string | undefined = undefined;
    const requestHeaders = { ...headers };

    if (Object.keys(bodyData).length > 0) {
      const formData = new URLSearchParams();
      Object.entries(bodyData).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          formData.append(key, String(value));
        }
      });
      requestData = formData.toString();
      requestHeaders['Content-Type'] = 'application/x-www-form-urlencoded';
    } else {
      delete requestHeaders['Content-Type'];
    }

    const response = await this.httpClient.request<T>({
      method,
      url,
      headers: requestHeaders,
      ...(Object.keys(queryParams).length > 0 && { params: queryParams }),
      ...(requestData && { data: requestData }),
    });

    return response.data;
  }

  /**
   * Determines whether the given HTTP method should use query parameters or a request body.
   * @private
   * @param {HttpMethod} method - The HTTP method to check.
   * @returns {boolean} `true` if the method should use query parameters, `false` otherwise.
   */
  private shouldUseQueryParams(method: HttpMethod): boolean {
    return method === HttpMethods.GET || method === HttpMethods.DELETE;
  }

  /**
   * Validates that all required parameters are present.
   * @protected
   * @param {Record<string, any>} params - The parameters to validate.
   * @param {string[]} required - An array of required parameter names.
   */
  protected validateRequired(params: Record<string, any>, required: string[]): void {
    ParameterUtils.validateRequired(params, required);
  }

  /**
   * Validates the types of the given parameters against a schema.
   * @protected
   * @param {Record<string, any>} params - The parameters to validate.
   * @param {Record<string, string>} schema - A schema defining the expected types.
   */
  protected validateTypes(params: Record<string, any>, schema: Record<string, string>): void {
    ParameterUtils.validateTypes(params, schema);
  }

  /**
   * Gets the current server time.
   * @param {string} [url=`${API_VERSIONS.spot.v1}/time`] - The endpoint to use for fetching the server time.
   * @returns {Promise<{ serverTime: number }>} A promise that resolves with the server time.
   */
  public async getServerTime(
    url: string = `${API_VERSIONS.spot.v1}/time`,
  ): Promise<{ serverTime: number }> {
    return this.publicRequest(HttpMethods.GET, url);
  }

  /**
   * Pings the API to test connectivity.
   * @param {string} [url=`${API_VERSIONS.spot.v1}/ping`] - The endpoint to use for the ping.
   * @returns {Promise<Record<string, never>>} A promise that resolves with an empty object if the ping is successful.
   */
  public async ping(url: string = `${API_VERSIONS.spot.v1}/ping`): Promise<Record<string, never>> {
    return this.publicRequest(HttpMethods.GET, url);
  }

  /**
   * Updates the authentication credentials for the client.
   * @param {string} [apiKey] - The new API key.
   * @param {string} [apiSecret] - The new API secret.
   */
  public updateCredentials(apiKey?: string, apiSecret?: string): void {
    this.authManager.updateCredentials(apiKey, apiSecret);
  }

  /**
   * Checks if the client has authentication credentials configured.
   * @returns {boolean} `true` if authentication is configured, `false` otherwise.
   */
  public hasAuth(): boolean {
    return this.authManager.hasSignatureAuth();
  }

  /**
   * Gets the base URL for this client.
   * @returns {string} The base URL.
   */
  public getBaseUrl(): string {
    return this.baseUrl;
  }
}

/**
 * @file Manages the configuration for the AsterDEX SDK.
 * @author AsterDEX
 * @version 1.0.0
 * @license MIT
 */

import type { AsterDEXConfig, InternalConfig, Environment } from '@/types/common';
import type { RetryConfig } from '@/utils/http';
import {
  DEFAULT_ENDPOINTS,
  DEFAULT_CONFIG,
  TIME_CONSTANTS,
  VALIDATION_CONSTANTS,
} from './constants';

/**
 * A class for managing the configuration of the SDK, including API credentials, endpoints, and request settings.
 * @class Config
 */
export class Config {
  private config: InternalConfig;

  /**
   * Creates an instance of the Config class.
   * @param {AsterDEXConfig} [userConfig={}] - The user-provided configuration options.
   */
  constructor(userConfig: AsterDEXConfig = {}) {
    this.config = this.mergeConfig(userConfig);
    this.validateConfig();
  }

  /**
   * Merges the user-provided configuration with the default settings.
   * @private
   * @param {AsterDEXConfig} userConfig - The user-provided configuration.
   * @returns {InternalConfig} The merged configuration.
   */
  private mergeConfig(userConfig: AsterDEXConfig): InternalConfig {
    const environment = userConfig.environment ?? DEFAULT_CONFIG.environment;
    const defaultEndpoints = DEFAULT_ENDPOINTS[environment];

    return {
      apiKey: userConfig.apiKey ?? '',
      apiSecret: userConfig.apiSecret ?? '',
      environment,
      baseUrl: {
        spot: userConfig.baseUrl?.spot ?? defaultEndpoints.spot,
        futures: userConfig.baseUrl?.futures ?? defaultEndpoints.futures,
        websocket: userConfig.baseUrl?.websocket ?? defaultEndpoints.websocket,
      },
      timeout: userConfig.timeout ?? DEFAULT_CONFIG.timeout,
      recvWindow: userConfig.recvWindow ?? DEFAULT_CONFIG.recvWindow,
      enableRateLimiting: userConfig.enableRateLimiting ?? DEFAULT_CONFIG.enableRateLimiting,
      retryConfig: {
        maxRetries: userConfig.retryConfig?.maxRetries ?? DEFAULT_CONFIG.retryConfig.maxRetries,
        retryDelay: userConfig.retryConfig?.retryDelay ?? DEFAULT_CONFIG.retryConfig.retryDelay,
        backoffMultiplier:
          userConfig.retryConfig?.backoffMultiplier ?? DEFAULT_CONFIG.retryConfig.backoffMultiplier,
      },
    };
  }

  /**
   * Validates the current configuration.
   * @private
   * @throws {Error} If any configuration settings are invalid.
   */
  private validateConfig(): void {
    if (this.config.timeout <= 0) {
      throw new Error('Timeout must be greater than 0');
    }

    if (
      this.config.recvWindow <= TIME_CONSTANTS.MIN_RECV_WINDOW ||
      this.config.recvWindow > TIME_CONSTANTS.MAX_RECV_WINDOW
    ) {
      throw new Error(
        `recvWindow must be between ${TIME_CONSTANTS.MIN_RECV_WINDOW} and ${TIME_CONSTANTS.MAX_RECV_WINDOW}`,
      );
    }

    if (this.config.retryConfig.maxRetries < 0) {
      throw new Error('maxRetries must be non-negative');
    }

    if (this.config.retryConfig.retryDelay <= 0) {
      throw new Error('retryDelay must be greater than 0');
    }

    if (this.config.retryConfig.backoffMultiplier <= 0) {
      throw new Error('backoffMultiplier must be greater than 0');
    }

    this.validateUrl(this.config.baseUrl.spot, 'spot baseUrl');
    this.validateUrl(this.config.baseUrl.futures, 'futures baseUrl');
    this.validateUrl(this.config.baseUrl.websocket, 'websocket baseUrl');
  }

  /**
   * Validates the format of a URL.
   * @private
   * @param {string} url - The URL to validate.
   * @param {string} fieldName - The name of the field being validated.
   * @throws {Error} If the URL is invalid.
   */
  private validateUrl(url: string, fieldName: string): void {
    try {
      new URL(url);
    } catch {
      throw new Error(`Invalid ${fieldName}: ${url}`);
    }
  }

  /**
   * Gets the complete configuration object.
   * @returns {InternalConfig} The current configuration.
   */
  public getConfig(): InternalConfig {
    return { ...this.config };
  }

  /**
   * Gets the API key.
   * @returns {string} The API key.
   */
  public getApiKey(): string {
    return this.config.apiKey;
  }

  /**
   * Gets the API secret.
   * @returns {string} The API secret.
   */
  public getApiSecret(): string {
    return this.config.apiSecret;
  }

  /**
   * Gets the current environment.
   * @returns {Environment} The current environment ('mainnet' or 'testnet').
   */
  public getEnvironment(): Environment {
    return this.config.environment;
  }

  /**
   * Gets the base URL for a specific service.
   * @param {'spot' | 'futures' | 'websocket'} service - The service to get the URL for.
   * @returns {string} The base URL for the specified service.
   */
  public getBaseUrl(service: 'spot' | 'futures' | 'websocket'): string {
    return this.config.baseUrl[service];
  }

  /**
   * Gets the request timeout value.
   * @returns {number} The timeout in milliseconds.
   */
  public getTimeout(): number {
    return this.config.timeout;
  }

  /**
   * Gets the receive window value.
   * @returns {number} The receive window in milliseconds.
   */
  public getRecvWindow(): number {
    return this.config.recvWindow;
  }

  /**
   * Checks if rate limiting is enabled.
   * @returns {boolean} `true` if rate limiting is enabled, `false` otherwise.
   */
  public isRateLimitingEnabled(): boolean {
    return this.config.enableRateLimiting;
  }

  /**
   * Gets the retry configuration.
   * @returns {RetryConfig} The retry configuration object.
   */
  public getRetryConfig(): RetryConfig {
    return { ...this.config.retryConfig };
  }

  /**
   * Updates the configuration with new values.
   * @param {Partial<AsterDEXConfig>} updates - An object containing the configuration updates.
   */
  public updateConfig(updates: Partial<AsterDEXConfig>): void {
    this.config = this.mergeConfig({ ...this.config, ...updates });
    this.validateConfig();
  }

  /**
   * Checks if authentication credentials are configured.
   * @returns {boolean} `true` if both API key and secret are configured, `false` otherwise.
   */
  public hasAuth(): boolean {
    return !!(this.config.apiKey && this.config.apiSecret);
  }

  /**
   * Checks if an API key is configured.
   * @returns {boolean} `true` if an API key is configured, `false` otherwise.
   */
  public hasApiKey(): boolean {
    return !!this.config.apiKey;
  }

  /**
   * Creates a Config instance from environment variables.
   * @returns {Config} A new Config instance configured from environment variables.
   */
  public static fromEnv(): Config {
    const config: AsterDEXConfig = {};

    if (process.env.ASTERDEX_API_KEY) {
      config.apiKey = process.env.ASTERDEX_API_KEY;
    }
    if (process.env.ASTERDEX_API_SECRET) {
      config.apiSecret = process.env.ASTERDEX_API_SECRET;
    }
    if (process.env.ASTERDEX_ENVIRONMENT) {
      const env = process.env.ASTERDEX_ENVIRONMENT.toLowerCase();
      if (env === 'mainnet') {
        config.environment = env;
      }
    }
    if (process.env.ASTERDEX_TIMEOUT) {
      const timeout = parseInt(process.env.ASTERDEX_TIMEOUT, VALIDATION_CONSTANTS.RADIX_DECIMAL);
      if (!isNaN(timeout)) {
        config.timeout = timeout;
      }
    }
    if (process.env.ASTERDEX_RECV_WINDOW) {
      const recvWindow = parseInt(
        process.env.ASTERDEX_RECV_WINDOW,
        VALIDATION_CONSTANTS.RADIX_DECIMAL,
      );
      if (!isNaN(recvWindow)) {
        config.recvWindow = recvWindow;
      }
    }
    if (
      process.env.ASTERDEX_SPOT_URL ||
      process.env.ASTERDEX_FUTURES_URL ||
      process.env.ASTERDEX_WEBSOCKET_URL
    ) {
      config.baseUrl = {};
      if (process.env.ASTERDEX_SPOT_URL) {
        config.baseUrl.spot = process.env.ASTERDEX_SPOT_URL;
      }
      if (process.env.ASTERDEX_FUTURES_URL) {
        config.baseUrl.futures = process.env.ASTERDEX_FUTURES_URL;
      }
      if (process.env.ASTERDEX_WEBSOCKET_URL) {
        config.baseUrl.websocket = process.env.ASTERDEX_WEBSOCKET_URL;
      }
    }
    if (process.env.ASTERDEX_ENABLE_RATE_LIMITING !== undefined) {
      config.enableRateLimiting = process.env.ASTERDEX_ENABLE_RATE_LIMITING !== 'false';
    }
    const retryConfig: Partial<RetryConfig> = {};
    if (process.env.ASTERDEX_MAX_RETRIES) {
      const maxRetries = parseInt(process.env.ASTERDEX_MAX_RETRIES, 10);
      if (!isNaN(maxRetries)) {
        retryConfig.maxRetries = maxRetries;
      }
    }
    if (process.env.ASTERDEX_RETRY_DELAY) {
      const retryDelay = parseInt(process.env.ASTERDEX_RETRY_DELAY, 10);
      if (!isNaN(retryDelay)) {
        retryConfig.retryDelay = retryDelay;
      }
    }
    if (process.env.ASTERDEX_BACKOFF_MULTIPLIER) {
      const backoffMultiplier = parseFloat(process.env.ASTERDEX_BACKOFF_MULTIPLIER);
      if (!isNaN(backoffMultiplier)) {
        retryConfig.backoffMultiplier = backoffMultiplier;
      }
    }
    if (Object.keys(retryConfig).length > 0) {
      config.retryConfig = retryConfig;
    }

    return new Config(config);
  }
}

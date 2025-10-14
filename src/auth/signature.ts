/**
 * @file Authentication and signature utilities for the AsterDEX API.
 * @author AsterDEX
 * @version 1.0.0
 * @license MIT
 */

import { createHmac } from 'node:crypto';
import type { HttpMethod as _HttpMethod } from '@/types/common';
import { ErrorFactory } from '@/errors/errors';
import { DEFAULT_CONFIG } from '@/config/constants';

/**
 * Handles HMAC SHA256 signature generation for API requests.
 * This class is responsible for creating the necessary authentication signatures
 * for private API endpoints.
 * @class SignatureAuth
 */
export class SignatureAuth {
  /**
   * The API key for authentication.
   * @private
   * @readonly
   */
  private readonly apiKey: string;

  /**
   * The API secret for generating HMAC signatures.
   * @private
   * @readonly
   */
  private readonly apiSecret: string;

  /**
   * Creates a new SignatureAuth instance.
   * @param {string} apiKey - The API key provided by AsterDEX.
   * @param {string} apiSecret - The API secret provided by AsterDEX.
   * @throws {AuthError} If the API key or secret is missing.
   */
  constructor(apiKey: string, apiSecret: string) {
    if (!apiKey) {
      throw ErrorFactory.authError('API key is required');
    }
    if (!apiSecret) {
      throw ErrorFactory.authError('API secret is required');
    }

    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
  }

  /**
   * Generates an HMAC SHA256 signature for a given query string.
   * @param {string} queryString - The URL-encoded query string to sign.
   * @returns {string} The generated HMAC SHA256 signature in hexadecimal format.
   * @throws {AuthError} If the signature generation fails.
   * @example
   * const signature = auth.generateSignature('symbol=BTCUSDT&timestamp=1234567890');
   */
  public generateSignature(queryString: string): string {
    try {
      const hmac = createHmac('sha256', this.apiSecret);
      hmac.update(queryString);
      return hmac.digest('hex');
    } catch (error) {
      throw ErrorFactory.authError(`Failed to generate signature: ${(error as Error).message}`);
    }
  }

  /**
   * Creates a signed parameter object for an API request.
   * This method adds the timestamp, receive window (optional), and signature to the request parameters.
   * @param {Record<string, any>} params - The request parameters to sign.
   * @param {number} [recvWindow] - The receive window in milliseconds.
   * @returns {Record<string, any>} The signed parameters object.
   * @example
   * const signed = auth.signRequest({ symbol: 'BTCUSDT', side: 'BUY' }, 5000);
   */
  public signRequest(params: Record<string, any>, recvWindow?: number): Record<string, any> {
    const timestamp = this.getTimestamp();
    const signedParams = {
      ...params,
      timestamp,
      ...(recvWindow ? { recvWindow } : {}),
    };

    const queryString = this.createQueryString(signedParams);
    const signature = this.generateSignature(queryString);

    return {
      ...signedParams,
      signature,
    };
  }

  /**
   * Creates the authorization headers for an API request.
   * @param {string} [contentType='application/json'] - The content type of the request.
   * @returns {Record<string, string>} An object containing the required headers.
   */
  public createHeaders(contentType = 'application/json'): Record<string, string> {
    return {
      'Content-Type': contentType,
      'X-MBX-APIKEY': this.apiKey,
    };
  }

  /**
   * Creates a URL-encoded query string from a parameter object.
   * The parameters are sorted alphabetically by key before being encoded.
   * @param {Record<string, any>} params - The parameters to encode.
   * @returns {string} The URL-encoded query string.
   */
  public createQueryString(params: Record<string, any>): string {
    return Object.entries(params)
      .filter(([, value]) => value !== undefined && value !== null && value !== '')
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
      .join('&');
  }

  /**
   * Gets the current timestamp in milliseconds.
   * @returns {number} The current Unix timestamp in milliseconds.
   */
  public getTimestamp(): number {
    return Date.now();
  }

  /**
   * Validates if a timestamp is within the acceptable receive window.
   * @param {number} timestamp - The timestamp to validate in milliseconds.
   * @param {number} [recvWindow=DEFAULT_CONFIG.recvWindow] - The receive window in milliseconds.
   * @returns {boolean} `true` if the timestamp is valid, `false` otherwise.
   */
  public validateTimestamp(timestamp: number, recvWindow = DEFAULT_CONFIG.recvWindow): boolean {
    const now = this.getTimestamp();
    const diff = Math.abs(now - timestamp);
    return diff <= recvWindow;
  }

  /**
   * Gets the configured API key.
   * @returns {string} The API key.
   */
  public getApiKey(): string {
    return this.apiKey;
  }
}

/**
 * Manages different authentication strategies for API endpoints.
 * This class can handle both public and private endpoints, applying the correct
 * authentication method based on the endpoint's requirements.
 * @class AuthManager
 */
export class AuthManager {
  /**
   * The SignatureAuth instance for HMAC authentication.
   * @private
   */
  private signatureAuth: SignatureAuth | undefined;

  /**
   * Creates a new AuthManager instance.
   * @param {string} [apiKey] - The API key.
   * @param {string} [apiSecret] - The API secret.
   */
  constructor(apiKey?: string, apiSecret?: string) {
    if (apiKey && apiSecret) {
      this.signatureAuth = new SignatureAuth(apiKey, apiSecret);
    }
  }

  /**
   * Checks if signature authentication is available.
   * @returns {boolean} `true` if both API key and secret are configured, `false` otherwise.
   */
  public hasSignatureAuth(): boolean {
    return !!this.signatureAuth;
  }

  /**
   * Checks if API key authentication is available.
   * @returns {boolean} `true` if the API key is configured, `false` otherwise.
   */
  public hasApiKeyAuth(): boolean {
    return !!this.signatureAuth;
  }

  /**
   * Gets the SignatureAuth instance.
   * @returns {SignatureAuth} The SignatureAuth instance.
   * @throws {AuthError} If signature authentication is not configured.
   */
  public getSignatureAuth(): SignatureAuth {
    if (!this.signatureAuth) {
      throw ErrorFactory.authError('Signature authentication not configured');
    }
    return this.signatureAuth;
  }

  /**
   * Creates headers for a given authentication type.
   * @param {'NONE' | 'USER_STREAM' | 'MARKET_DATA' | 'SIGNED'} authType - The authentication type required by the endpoint.
   * @returns {Record<string, string>} An object containing the required headers.
   * @throws {AuthError} If the required authentication is not configured.
   * @throws {ConfigError} If an unknown authentication type is provided.
   */
  public createHeaders(
    authType: 'NONE' | 'USER_STREAM' | 'MARKET_DATA' | 'SIGNED',
  ): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'AsterDEX-TypeScript-SDK/1.0.0',
    };

    switch (authType) {
      case 'NONE':
        break;
      case 'USER_STREAM':
      case 'MARKET_DATA':
        if (!this.hasApiKeyAuth()) {
          throw ErrorFactory.authError('API key required for this endpoint');
        }
        headers['X-MBX-APIKEY'] = this.getSignatureAuth().getApiKey();
        break;
      case 'SIGNED':
        if (!this.hasSignatureAuth()) {
          throw ErrorFactory.authError('API key and secret required for this endpoint');
        }
        headers['X-MBX-APIKEY'] = this.getSignatureAuth().getApiKey();
        break;
      default:
        throw ErrorFactory.configError(`Unknown authentication type: ${authType}`);
    }

    return headers;
  }

  /**
   * Signs a request's parameters with an HMAC signature.
   * @param {Record<string, any>} params - The parameters to sign.
   * @param {number} [recvWindow] - The receive window in milliseconds.
   * @returns {Record<string, any>} The signed parameters object.
   * @throws {AuthError} If signature authentication is not configured.
   */
  public signRequest(params: Record<string, any>, recvWindow?: number): Record<string, any> {
    if (!this.signatureAuth) {
      throw ErrorFactory.authError('Signature authentication not configured');
    }
    return this.signatureAuth.signRequest(params, recvWindow);
  }

  /**
   * Updates the authentication credentials.
   * @param {string} [apiKey] - The new API key.
   * @param {string} [apiSecret] - The new API secret.
   */
  public updateCredentials(apiKey?: string, apiSecret?: string): void {
    if (apiKey && apiSecret) {
      this.signatureAuth = new SignatureAuth(apiKey, apiSecret);
    } else {
      this.signatureAuth = undefined;
    }
  }
}

/**
 * A utility class for handling and validating API request parameters.
 * @class ParameterUtils
 */
export class ParameterUtils {
  /**
   * Removes undefined, null, and empty string values from a parameter object.
   * @param {Record<string, any>} params - The parameters to clean.
   * @returns {Record<string, any>} The cleaned parameters object.
   */
  public static cleanParams(params: Record<string, any>): Record<string, any> {
    const cleaned: Record<string, any> = {};

    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        cleaned[key] = value;
      }
    }

    return cleaned;
  }

  /**
   * Validates that all required parameters are present in a parameter object.
   * @param {Record<string, any>} params - The parameters to validate.
   * @param {string[]} required - An array of required parameter names.
   * @throws {ValidationError} If any required parameters are missing.
   */
  public static validateRequired(params: Record<string, any>, required: string[]): void {
    const missing = required.filter(
      (param) => params[param] === undefined || params[param] === null || params[param] === '',
    );

    if (missing.length > 0) {
      throw ErrorFactory.validationError(`Missing required parameters: ${missing.join(', ')}`);
    }
  }

  /**
   * Validates the types of parameters against a given schema.
   * @param {Record<string, any>} params - The parameters to validate.
   * @param {Record<string, string>} schema - A schema defining the expected types (e.g., { symbol: 'string', quantity: 'number' }).
   * @throws {ValidationError} If any parameter has an incorrect type.
   */
  public static validateTypes(params: Record<string, any>, schema: Record<string, string>): void {
    for (const [key, expectedType] of Object.entries(schema)) {
      if (params[key] !== undefined) {
        const actualType = typeof params[key];
        if (actualType !== expectedType) {
          throw ErrorFactory.validationError(
            `Parameter '${key}' must be of type ${expectedType}, got ${actualType}`,
            key,
          );
        }
      }
    }
  }

  /**
   * Converts a parameter object to a URL-encoded string.
   * @param {Record<string, any>} params - The parameters to encode.
   * @returns {string} The URL-encoded parameter string.
   */
  public static toUrlEncoded(params: Record<string, any>): string {
    const cleaned = this.cleanParams(params);
    return Object.entries(cleaned)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
      .join('&');
  }
}

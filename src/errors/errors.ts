/**
 * @file Defines custom error classes and error handling utilities for the AsterDEX SDK.
 * @author AsterDEX
 * @version 1.0.0
 * @license MIT
 */

import type { ApiError } from '@/types/common';
import {
  ASTER_ERROR_CODES,
  HTTP_STATUS,
  TIME_CONSTANTS,
  WS_CLOSE_CODES,
  VALIDATION_CONSTANTS,
} from '@/config/constants';

/**
 * The base error class for all custom errors in the AsterDEX SDK.
 * @abstract
 * @class AsterDEXError
 * @extends {Error}
 */
export abstract class AsterDEXError extends Error {
  /**
   * The name of the error.
   * @public
   * @readonly
   */
  public override readonly name: string;

  /**
   * The timestamp when the error occurred.
   * @public
   * @readonly
   */
  public readonly timestamp: Date;

  /**
   * Creates an instance of AsterDEXError.
   * @param {string} message - The error message.
   * @param {string} [name] - The name of the error.
   */
  constructor(message: string, name?: string) {
    super(message);
    this.name = name ?? this.constructor.name;
    this.timestamp = new Date();
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * An error thrown for invalid SDK configuration.
 * @class ConfigError
 * @extends {AsterDEXError}
 */
export class ConfigError extends AsterDEXError {
  constructor(message: string) {
    super(message, 'ConfigError');
  }
}

/**
 * An error thrown for missing or invalid authentication credentials.
 * @class AuthError
 * @extends {AsterDEXError}
 */
export class AuthError extends AsterDEXError {
  constructor(message: string) {
    super(message, 'AuthError');
  }
}

/**
 * An error thrown for network-related issues.
 * @class NetworkError
 * @extends {AsterDEXError}
 */
export class NetworkError extends AsterDEXError {
  public override readonly cause: Error | undefined;

  constructor(message: string, cause?: Error) {
    super(message, 'NetworkError');
    this.cause = cause;
  }
}

/**
 * An error thrown for non-successful API responses (e.g., 4xx or 5xx status codes).
 * @class ApiResponseError
 * @extends {AsterDEXError}
 */
export class ApiResponseError extends AsterDEXError {
  public readonly statusCode: number;
  public readonly code: number | undefined;
  public readonly headers: Record<string, string> | undefined;

  constructor(
    message: string,
    statusCode: number,
    code?: number,
    headers?: Record<string, string>,
  ) {
    super(message, 'ApiResponseError');
    this.statusCode = statusCode;
    this.code = code;
    this.headers = headers;
  }

  /**
   * Checks if the error is a client error (4xx status code).
   * @returns {boolean} `true` if the error is a client error, `false` otherwise.
   */
  public isClientError(): boolean {
    return (
      this.statusCode >= HTTP_STATUS.BAD_REQUEST &&
      this.statusCode < HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }

  /**
   * Checks if the error is a server error (5xx status code).
   * @returns {boolean} `true` if the error is a server error, `false` otherwise.
   */
  public isServerError(): boolean {
    return this.statusCode >= HTTP_STATUS.INTERNAL_SERVER_ERROR;
  }

  /**
   * Checks if the error is related to rate limiting.
   * @returns {boolean} `true` if the error is a rate limit error, `false` otherwise.
   */
  public isRateLimitError(): boolean {
    return (
      this.statusCode === HTTP_STATUS.TOO_MANY_REQUESTS ||
      this.statusCode === HTTP_STATUS.IM_A_TEAPOT
    );
  }

  /**
   * Gets the value of the 'retry-after' header, if available.
   * @returns {number | undefined} The retry-after value in seconds, or `undefined` if not present.
   */
  public getRetryAfter(): number | undefined {
    const retryAfter = this.headers?.['retry-after'];
    return retryAfter ? parseInt(retryAfter, VALIDATION_CONSTANTS.RADIX_DECIMAL) : undefined;
  }
}

/**
 * An error thrown specifically for rate limiting errors.
 * @class RateLimitError
 * @extends {ApiResponseError}
 */
export class RateLimitError extends ApiResponseError {
  public readonly retryAfter: number | undefined;

  constructor(
    message: string,
    statusCode: number,
    headers?: Record<string, string>,
    code?: number,
  ) {
    super(message, statusCode, code, headers);
    Object.defineProperty(this, 'name', {
      value: 'RateLimitError',
      configurable: true,
    });
    this.retryAfter = this.getRetryAfter();
  }
}

/**
 * An error thrown for WebSocket-related issues.
 * @class WebSocketError
 * @extends {AsterDEXError}
 */
export class WebSocketError extends AsterDEXError {
  public readonly code: number | undefined;

  constructor(message: string, code?: number) {
    super(message, 'WebSocketError');
    this.code = code;
  }
}

/**
 * An error thrown for invalid request parameters.
 * @class ValidationError
 * @extends {AsterDEXError}
 */
export class ValidationError extends AsterDEXError {
  public readonly field: string | undefined;

  constructor(message: string, field?: string) {
    super(message, 'ValidationError');
    this.field = field;
  }
}

/**
 * A factory class for creating appropriate error instances from different sources.
 * @class ErrorFactory
 */
export class ErrorFactory {
  /**
   * Creates an error from an HTTP response.
   * @param {number} statusCode - The HTTP status code.
   * @param {string} responseText - The response text.
   * @param {Record<string, string>} [headers] - The response headers.
   * @returns {AsterDEXError} The created error instance.
   */
  public static fromHttpResponse(
    statusCode: number,
    responseText: string,
    headers?: Record<string, string>,
  ): AsterDEXError {
    let apiError: ApiError | undefined;
    let message = responseText;

    try {
      const parsed = JSON.parse(responseText) as unknown;
      if (this.isApiError(parsed)) {
        apiError = parsed;
        message = `${apiError.msg} (Code: ${apiError.code})`;
      }
    } catch {
      // Use raw response text if parsing fails
    }

    if (statusCode === HTTP_STATUS.TOO_MANY_REQUESTS || statusCode === HTTP_STATUS.IM_A_TEAPOT) {
      return new RateLimitError(message, statusCode, headers, apiError?.code);
    }

    return new ApiResponseError(message, statusCode, apiError?.code, headers);
  }

  /**
   * Creates an error from a WebSocket close event.
   * @param {number} code - The WebSocket close code.
   * @param {string} reason - The reason for the closure.
   * @returns {WebSocketError} The created WebSocket error instance.
   */
  public static fromWebSocketEvent(code: number, reason: string): WebSocketError {
    return new WebSocketError(`WebSocket closed: ${reason}`, code);
  }

  /**
   * Creates an error from a network failure.
   * @param {Error} cause - The original error that caused the network failure.
   * @returns {NetworkError} The created network error instance.
   */
  public static fromNetworkError(cause: Error): NetworkError {
    return new NetworkError(`Network request failed: ${cause.message}`, cause);
  }

  /**
   * Creates a validation error.
   * @param {string} message - The error message.
   * @param {string} [field] - The name of the field that failed validation.
   * @returns {ValidationError} The created validation error instance.
   */
  public static validationError(message: string, field?: string): ValidationError {
    return new ValidationError(message, field);
  }

  /**
   * Creates an authentication error.
   * @param {string} message - The error message.
   * @returns {AuthError} The created authentication error instance.
   */
  public static authError(message: string): AuthError {
    return new AuthError(message);
  }

  /**
   * Creates a configuration error.
   * @param {string} message - The error message.
   * @returns {ConfigError} The created configuration error instance.
   */
  public static configError(message: string): ConfigError {
    return new ConfigError(message);
  }

  /**
   * A type guard to check if an object is an API error.
   * @private
   * @param {unknown} obj - The object to check.
   * @returns {obj is ApiError} `true` if the object is an API error, `false` otherwise.
   */
  private static isApiError(obj: unknown): obj is ApiError {
    return (
      typeof obj === 'object' &&
      obj !== null &&
      typeof (obj as ApiError).code === 'number' &&
      typeof (obj as ApiError).msg === 'string'
    );
  }
}

/**
 * Gets the error message corresponding to an AsterDEX error code.
 * @param {number} code - The AsterDEX error code.
 * @returns {string} The corresponding error message, or a default message if the code is unknown.
 */
export function getErrorMessage(code: number): string {
  const errorCode = Object.entries(ASTER_ERROR_CODES).find(([, value]) => value === code);
  return errorCode ? errorCode[0] : `Unknown error code: ${code}`;
}

/**
 * Checks if an error is retryable.
 * @param {Error} error - The error to check.
 * @returns {boolean} `true` if the error is retryable, `false` otherwise.
 */
export function isRetryableError(error: Error): boolean {
  if (error instanceof ApiResponseError) {
    if (error.isClientError() && !error.isRateLimitError()) {
      return false;
    }
    return error.isServerError() || error.isRateLimitError();
  }

  if (error instanceof NetworkError) {
    return true;
  }

  if (error instanceof WebSocketError) {
    return error.code !== WS_CLOSE_CODES.POLICY_VIOLATION;
  }

  return false;
}

/**
 * Gets the retry delay for a rate limit error.
 * @param {AsterDEXError} error - The error to check.
 * @param {number} defaultDelay - The default delay to use if no 'retry-after' header is present.
 * @returns {number} The retry delay in milliseconds.
 */
export function getRetryDelay(error: AsterDEXError, defaultDelay: number): number {
  if (error instanceof RateLimitError && error.retryAfter) {
    return error.retryAfter * TIME_CONSTANTS.MILLISECONDS_IN_SECOND;
  }
  return defaultDelay;
}

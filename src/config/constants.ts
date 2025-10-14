/**
 * @file Defines constants and default configuration for the AsterDEX SDK.
 * @author AsterDEX
 * @version 1.0.0
 * @license MIT
 */

import type { Environment } from '@/types/common';

/**
 * The base API endpoints for the different environments.
 * @constant {object}
 */
const BASE_ENDPOINTS = {
  mainnet: {
    spot: 'https://sapi.asterdex.com',
    futures: 'https://fapi.asterdex.com',
    websocket: 'wss://fstream.asterdex.com',
  },
} as const;

/**
 * Gets the endpoints for a specified environment, with optional overrides from environment variables.
 * @param {Environment} env - The environment to get the endpoints for.
 * @returns {object} The endpoints for the specified environment.
 */
function getEndpointsForEnvironment(env: Environment) {
  const baseEndpoints = BASE_ENDPOINTS[env];
  return {
    spot: process.env.ASTERDEX_SPOT_URL ?? baseEndpoints.spot,
    futures: process.env.ASTERDEX_FUTURES_URL ?? baseEndpoints.futures,
    websocket: process.env.ASTERDEX_WEBSOCKET_URL ?? baseEndpoints.websocket,
  };
}

/**
 * The default API endpoints for the different environments.
 * These can be overridden by setting the `ASTERDEX_SPOT_URL`, `ASTERDEX_FUTURES_URL`,
 * and `ASTERDEX_WEBSOCKET_URL` environment variables.
 * @constant {object}
 */
export const DEFAULT_ENDPOINTS = {
  mainnet: getEndpointsForEnvironment('mainnet'),
} as const;

/**
 * The default configuration values for the SDK.
 * These can be overridden by setting the corresponding environment variables.
 * @constant {object}
 */
export const DEFAULT_CONFIG = {
  environment: (process.env.ASTERDEX_ENVIRONMENT as Environment) ?? 'mainnet',
  timeout: parseInt(process.env.ASTERDEX_TIMEOUT ?? '60000', 10),
  recvWindow: parseInt(process.env.ASTERDEX_RECV_WINDOW ?? '5000', 10),
  enableRateLimiting: process.env.ASTERDEX_ENABLE_RATE_LIMITING !== 'false',
  retryConfig: {
    maxRetries: parseInt(process.env.ASTERDEX_MAX_RETRIES ?? '3', 10),
    retryDelay: parseInt(process.env.ASTERDEX_RETRY_DELAY ?? '1000', 10),
    backoffMultiplier: parseFloat(process.env.ASTERDEX_BACKOFF_MULTIPLIER ?? '2'),
  },
} as const;

/**
 * The API version paths for the different services.
 * @constant {object}
 */
export const API_VERSIONS = {
  spot: {
    v1: '/api/v1',
    v3: '/api/v3',
  },
  futures: {
    v3: '/fapi/v3',
    v1: '/fapi/v1',
  },
} as const;

/**
 * The WebSocket stream paths.
 * @constant {object}
 */
export const WS_PATHS = {
  stream: '/stream',
  ws: '/ws',
} as const;

/**
 * Constants related to API rate limiting.
 * @constant {object}
 */
export const RATE_LIMITS = {
  DEFAULT_WEIGHT: 1,
  MAX_REQUESTS_PER_MINUTE: 1200,
  MAX_ORDERS_PER_MINUTE: 100,
  MAX_ORDERS_PER_10_SECONDS: 300,
} as const;

/**
 * Common HTTP status codes.
 * @constant {object}
 */
export const HTTP_STATUS = {
  OK: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  TOO_MANY_REQUESTS: 429,
  IM_A_TEAPOT: 418,
  INTERNAL_SERVER_ERROR: 500,
} as const;

/**
 * Constants related to WebSocket connections.
 * @constant {object}
 */
export const WS_CONSTANTS = {
  MAX_SUBSCRIPTIONS: 1024,
  MAX_MESSAGES_PER_SECOND: 5,
  PING_INTERVAL: 180000,
  PONG_TIMEOUT: 600000,
  RECONNECT_INTERVAL: 5000,
  MAX_RECONNECT_ATTEMPTS: 5,
} as const;

/**
 * Error codes specific to the AsterDEX API.
 * @constant {object}
 */
export const ASTER_ERROR_CODES = {
  UNKNOWN: -1000,
  DISCONNECTED: -1001,
  UNAUTHORIZED: -1002,
  TOO_MANY_REQUESTS: -1003,
  DUPLICATE_IP: -1004,
  NO_SUCH_IP: -1005,
  UNEXPECTED_RESP: -1006,
  TIMEOUT: -1007,
  UNKNOWN_ORDER_COMPOSITION: -1014,
  TOO_MANY_ORDERS: -1015,
  SERVICE_SHUTTING_DOWN: -1016,
  UNSUPPORTED_OPERATION: -1020,
  INVALID_TIMESTAMP: -1021,
  INVALID_SIGNATURE: -1022,
  START_TIME_GREATER_THAN_END_TIME: -1023,
  ILLEGAL_CHARS: -1100,
  TOO_MANY_PARAMETERS: -1101,
  MANDATORY_PARAM_EMPTY_OR_MALFORMED: -1102,
  UNKNOWN_PARAM: -1103,
  UNREAD_PARAMETERS: -1104,
  PARAM_EMPTY: -1105,
  PARAM_NOT_REQUIRED: -1106,
  BAD_PRECISION: -1111,
  NO_DEPTH: -1112,
  TIF_NOT_REQUIRED: -1114,
  INVALID_TIF: -1115,
  INVALID_ORDER_TYPE: -1116,
  INVALID_SIDE: -1117,
  EMPTY_NEW_CL_ORD_ID: -1118,
  EMPTY_ORG_CL_ORD_ID: -1119,
  BAD_INTERVAL: -1120,
  BAD_SYMBOL: -1121,
  INVALID_LISTEN_KEY: -1125,
  MORE_THAN_XX_HOURS: -1127,
  OPTIONAL_PARAMS_BAD_COMBO: -1128,
  INVALID_PARAMETER: -1130,
  INVALID_NEW_ORDER_RESP_TYPE: -1136,
  NEW_ORDER_REJECTED: -2010,
  CANCEL_REJECTED: -2011,
  NO_SUCH_ORDER: -2013,
  BAD_API_KEY_FMT: -2014,
  REJECTED_MBX_KEY: -2015,
  NO_TRADING_WINDOW: -2016,
  BALANCE_NOT_SUFFICIENT: -2018,
  UNABLE_TO_FILL: -2020,
  ORDER_WOULD_IMMEDIATELY_TRIGGER: -2021,
  REDUCE_ONLY_REJECT: -2022,
  POSITION_NOT_SUFFICIENT: -2024,
  MAX_OPEN_ORDER_EXCEEDED: -2025,
  REDUCE_ONLY_ORDER_TYPE_NOT_SUPPORTED: -2026,
  INVALID_ORDER_STATUS: -4000,
  PRICE_LESS_THAN_ZERO: -4001,
  PRICE_GREATER_THAN_MAX_PRICE: -4002,
  QTY_LESS_THAN_ZERO: -4003,
  QTY_LESS_THAN_MIN_QTY: -4004,
  QTY_GREATER_THAN_MAX_QTY: -4005,
  MIN_NOTIONAL: -4164,
  INVALID_TIME_INTERVAL: -4165,
} as const;

/**
 * A list of supported assets.
 * @constant {string[]}
 */
export const SUPPORTED_ASSETS = [
  'BTC',
  'ETH',
  'BNB',
  'USDT',
  'USDC',
  'ADA',
  'SOL',
  'DOT',
  'MATIC',
  'AVAX',
] as const;

/**
 * A list of common quote assets.
 * @constant {string[]}
 */
export const QUOTE_ASSETS = ['USDT', 'USDC', 'BTC', 'ETH', 'BNB'] as const;

/**
 * Constants related to time and conversions.
 * @constant {object}
 */
export const TIME_CONSTANTS = {
  MILLISECONDS_IN_SECOND: 1000,
  SECONDS_IN_MINUTE: 60,
  MINUTES_IN_HOUR: 60,
  MICROSECONDS_IN_MILLISECOND: 1000,
  DEFAULT_REQUEST_TIMEOUT: 10000,
  MAX_RECV_WINDOW: 60000,
  MIN_RECV_WINDOW: 1,
  DEFAULT_WEB3_RECV_WINDOW: 50000,
} as const;

/**
 * Common WebSocket close codes.
 * @constant {object}
 */
export const WS_CLOSE_CODES = {
  NORMAL_CLOSURE: 1000,
  POLICY_VIOLATION: 1008,
} as const;

/**
 * Constants used for validation.
 * @constant {object}
 */
export const VALIDATION_CONSTANTS = {
  ETHEREUM_ADDRESS_LENGTH: 40,
  PRIVATE_KEY_LENGTH: 64,
  RADIX_DECIMAL: 10,
  RADIX_HEXADECIMAL: 16,
} as const;

/**
 * Constants related to request retries and backoff strategies.
 * @constant {object}
 */
export const RETRY_CONSTANTS = {
  DEFAULT_MAX_RETRIES: 3,
  DEFAULT_RETRY_DELAY: 1000,
  DEFAULT_BACKOFF_MULTIPLIER: 2,
  ONE_MINUTE_MS: 60 * 1000,
} as const;

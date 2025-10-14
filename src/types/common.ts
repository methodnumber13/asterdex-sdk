/**
 * @file Defines common types and interfaces used throughout the AsterDEX SDK.
 * @author AsterDEX
 * @version 1.0.0
 * @license MIT
 */

/**
 * The environment for the SDK, either 'mainnet' or 'testnet'.
 * @typedef {('mainnet')} Environment
 */
export type Environment = 'mainnet';

/**
 * The type of authentication required for an API endpoint.
 * @typedef {('NONE' | 'TRADE' | 'USER_DATA' | 'USER_STREAM' | 'MARKET_DATA')} ApiAuthType
 */
export type ApiAuthType = 'NONE' | 'TRADE' | 'USER_DATA' | 'USER_STREAM' | 'MARKET_DATA';

/**
 * The supported HTTP methods for API requests.
 * @typedef {('GET' | 'POST' | 'PUT' | 'DELETE')} HttpMethod
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

/**
 * The side of an order, either 'BUY' or 'SELL'.
 * @typedef {('BUY' | 'SELL')} OrderSide
 */
export type OrderSide = 'BUY' | 'SELL';

/**
 * The supported types of orders.
 * @typedef {('LIMIT' | 'MARKET' | 'STOP' | 'TAKE_PROFIT' | 'STOP_MARKET' | 'TAKE_PROFIT_MARKET' | 'TRAILING_STOP_MARKET')} OrderType
 */
export type OrderType =
  | 'LIMIT'
  | 'MARKET'
  | 'STOP'
  | 'TAKE_PROFIT'
  | 'STOP_MARKET'
  | 'TAKE_PROFIT_MARKET'
  | 'TRAILING_STOP_MARKET';

/**
 * The time in force for an order.
 * @typedef {('GTC' | 'IOC' | 'FOK' | 'GTX')} TimeInForce
 */
export type TimeInForce = 'GTC' | 'IOC' | 'FOK' | 'GTX';

/**
 * The status of an order.
 * @typedef {('NEW' | 'PARTIALLY_FILLED' | 'FILLED' | 'CANCELED' | 'REJECTED' | 'EXPIRED')} OrderStatus
 */
export type OrderStatus =
  | 'NEW'
  | 'PARTIALLY_FILLED'
  | 'FILLED'
  | 'CANCELED'
  | 'REJECTED'
  | 'EXPIRED';

/**
 * The status of a trading symbol.
 * @typedef {('TRADING')} SymbolStatus
 */
export type SymbolStatus = 'TRADING';

/**
 * The type of a trading symbol.
 * @typedef {('SPOT')} SymbolType
 */
export type SymbolType = 'SPOT';

/**
 * The supported intervals for Kline/candlestick data.
 * @typedef {('1m' | '3m' | '5m' | '15m' | '30m' | '1h' | '2h' | '4h' | '6h' | '8h' | '12h' | '1d' | '3d' | '1w' | '1M')} KlineInterval
 */
export type KlineInterval =
  | '1m'
  | '3m'
  | '5m'
  | '15m'
  | '30m'
  | '1h'
  | '2h'
  | '4h'
  | '6h'
  | '8h'
  | '12h'
  | '1d'
  | '3d'
  | '1w'
  | '1M';

/**
 * The type of rate limit.
 * @typedef {('REQUEST_WEIGHT' | 'ORDERS')} RateLimitType
 */
export type RateLimitType = 'REQUEST_WEIGHT' | 'ORDERS';

/**
 * The interval for a rate limit.
 * @typedef {('MINUTE' | 'SECOND')} RateLimitInterval
 */
export type RateLimitInterval = 'MINUTE' | 'SECOND';

/**
 * The base structure for an API response.
 * @interface ApiResponse
 * @template T
 */
export interface ApiResponse<T = any> {
  data?: T;
  limit_usage?: Record<string, string>;
  header?: Record<string, string>;
}

/**
 * The structure for an API error response.
 * @interface ApiError
 */
export interface ApiError {
  code: number;
  msg: string;
}

/**
 * The configuration for a rate limit.
 * @interface RateLimit
 */
export interface RateLimit {
  rateLimitType: RateLimitType;
  interval: RateLimitInterval;
  intervalNum: number;
  limit: number;
}

/**
 * Information about an asset.
 * @interface Asset
 */
export interface Asset {
  asset: string;
}

/**
 * Information about an account's balance for a specific asset.
 * @interface Balance
 */
export interface Balance {
  asset: string;
  free: string;
  locked: string;
}

/**
 * The supported types of trading filters.
 * @typedef {('PRICE_FILTER' | 'PERCENT_PRICE' | 'LOT_SIZE' | 'MARKET_LOT_SIZE' | 'MAX_NUM_ORDERS' | 'MIN_NOTIONAL' | 'MAX_NOTIONAL' | 'NOTIONAL' | 'PERCENT_PRICE_BY_SIDE')} FilterType
 */
export type FilterType =
  | 'PRICE_FILTER'
  | 'PERCENT_PRICE'
  | 'LOT_SIZE'
  | 'MARKET_LOT_SIZE'
  | 'MAX_NUM_ORDERS'
  | 'MIN_NOTIONAL'
  | 'MAX_NOTIONAL'
  | 'NOTIONAL'
  | 'PERCENT_PRICE_BY_SIDE';

/**
 * The base interface for a trading filter.
 * @interface BaseFilter
 */
export interface BaseFilter {
  filterType: FilterType;
}

/**
 * The configuration for a price filter.
 * @interface PriceFilter
 * @extends {BaseFilter}
 */
export interface PriceFilter extends BaseFilter {
  filterType: 'PRICE_FILTER';
  minPrice: string;
  maxPrice: string;
  tickSize: string;
}

/**
 * The configuration for a lot size filter.
 * @interface LotSizeFilter
 * @extends {BaseFilter}
 */
export interface LotSizeFilter extends BaseFilter {
  filterType: 'LOT_SIZE';
  minQty: string;
  maxQty: string;
  stepSize: string;
}

/**
 * The configuration for a market lot size filter.
 * @interface MarketLotSizeFilter
 * @extends {BaseFilter}
 */
export interface MarketLotSizeFilter extends BaseFilter {
  filterType: 'MARKET_LOT_SIZE';
  minQty: string;
  maxQty: string;
  stepSize: string;
}

/**
 * A union type representing all possible trading filters.
 * @typedef {(PriceFilter | LotSizeFilter | MarketLotSizeFilter | (BaseFilter & Record<string, unknown>))} Filter
 */
export type Filter =
  | PriceFilter
  | LotSizeFilter
  | MarketLotSizeFilter
  | (BaseFilter & Record<string, unknown>);

/**
 * Information about a trading symbol.
 * @interface Symbol
 */
export interface Symbol {
  symbol: string;
  status: SymbolStatus;
  baseAsset: string;
  quoteAsset: string;
  pricePrecision: number;
  quantityPrecision: number;
  baseAssetPrecision: number;
  quotePrecision: number;
  orderTypes: OrderType[];
  timeInForce: TimeInForce[];
  filters: Filter[];
  ocoAllowed: boolean;
}

/**
 * The response type for a new order.
 * @typedef {('ACK' | 'RESULT' | 'FULL')} OrderResponseType
 */
export type OrderResponseType = 'ACK' | 'RESULT' | 'FULL';

/**
 * A Unix timestamp in milliseconds.
 * @typedef {number} Timestamp
 */
export type Timestamp = number;

/**
 * A string representation of a decimal number.
 * @typedef {string} Decimal
 */
export type Decimal = string;

/**
 * The configuration options for the SDK.
 * @interface AsterDEXConfig
 */
export interface AsterDEXConfig {
  apiKey?: string;
  apiSecret?: string;
  environment?: Environment;
  baseUrl?: {
    spot?: string;
    futures?: string;
    websocket?: string;
  };
  timeout?: number;
  recvWindow?: number;
  enableRateLimiting?: boolean;
  retryConfig?: {
    maxRetries?: number;
    retryDelay?: number;
    backoffMultiplier?: number;
  };
}

/**
 * The internal configuration of the SDK, with all properties required.
 * @interface InternalConfig
 */
export interface InternalConfig {
  apiKey: string;
  apiSecret: string;
  environment: Environment;
  baseUrl: {
    spot: string;
    futures: string;
    websocket: string;
  };
  timeout: number;
  recvWindow: number;
  enableRateLimiting: boolean;
  retryConfig: {
    maxRetries: number;
    retryDelay: number;
    backoffMultiplier: number;
  };
}

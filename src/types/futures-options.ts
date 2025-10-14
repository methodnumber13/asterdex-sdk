/**
 * @file Defines option interfaces for the AsterDEX Futures API.
 * @author AsterDEX
 * @version 1.0.0
 * @license MIT
 */

import type { IncomeType } from './futures';
import type { AutoCloseType } from '@/constants/futures';

/**
 * Options for API requests that can be filtered by a time range.
 * @interface TimeRangeOptions
 */
export interface TimeRangeOptions {
  startTime?: number;
  endTime?: number;
  limit?: number;
}

/**
 * Options for API requests that support pagination.
 * @interface PaginationOptions
 */
export interface PaginationOptions {
  fromId?: number;
  limit?: number;
}

/**
 * Options for querying trades.
 * @interface TradeQueryOptions
 * @extends {TimeRangeOptions}
 */
export interface TradeQueryOptions extends TimeRangeOptions {
  fromId?: number;
}

/**
 * Options for querying Kline/candlestick data.
 * @typedef {TimeRangeOptions} KlineOptions
 */
export type KlineOptions = TimeRangeOptions;

/**
 * Options for querying orders.
 * @interface OrderQueryOptions
 * @extends {TimeRangeOptions}
 */
export interface OrderQueryOptions extends TimeRangeOptions {
  orderId?: number;
}

/**
 * Options for querying force orders.
 * @interface ForceOrderOptions
 * @extends {TimeRangeOptions}
 */
export interface ForceOrderOptions extends TimeRangeOptions {
  symbol?: string;
  autoCloseType?: AutoCloseType;
}

/**
 * Options for querying income history.
 * @interface IncomeHistoryOptions
 * @extends {TimeRangeOptions}
 */
export interface IncomeHistoryOptions extends TimeRangeOptions {
  symbol?: string;
  incomeType?: IncomeType;
}

/**
 * Options for querying position margin history.
 * @interface PositionMarginHistoryOptions
 * @extends {TimeRangeOptions}
 */
export interface PositionMarginHistoryOptions extends TimeRangeOptions {
  type?: 1 | 2;
}

/**
 * Parameters for API requests that require a symbol.
 * @interface SymbolParams
 */
export interface SymbolParams {
  symbol: string;
}

/**
 * Parameters for API requests that require a symbol and support a limit.
 * @interface SymbolWithLimitParams
 * @extends {SymbolParams}
 */
export interface SymbolWithLimitParams extends SymbolParams {
  limit?: number;
}

/**
 * Parameters for API requests that require a symbol and support pagination.
 * @interface SymbolWithPaginationParams
 * @extends {SymbolParams}
 */
export interface SymbolWithPaginationParams extends SymbolParams {
  limit?: number;
  fromId?: number;
}

/**
 * Parameters for looking up an order.
 * @interface OrderLookupParams
 * @extends {SymbolParams}
 */
export interface OrderLookupParams extends SymbolParams {
  orderId?: number;
  origClientOrderId?: string;
}

/**
 * Parameters for canceling a batch of orders.
 * @interface BatchOrderCancelParams
 * @extends {SymbolParams}
 */
export interface BatchOrderCancelParams extends SymbolParams {
  orderIdList?: string;
  origClientOrderIdList?: string;
}

/**
 * Base parameters for user operations.
 * @interface BaseUserOperationParams
 */
export interface BaseUserOperationParams {
  address: string;
  userOperationType: string;
  network?: string;
}

/**
 * The response structure for a successful API request.
 * @interface ApiSuccessResponse
 */
export interface ApiSuccessResponse {
  code: number;
  msg: string;
}

/**
 * The response structure for a server time request.
 * @interface ServerTimeResponse
 */
export interface ServerTimeResponse {
  serverTime: number;
}

/**
 * An empty response.
 * @typedef {Record<string, never>} EmptyResponse
 */
export type EmptyResponse = Record<string, never>;

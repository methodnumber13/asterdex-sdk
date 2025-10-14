/**
 * TypeScript interfaces for AsterDEX Spot API
 */

import type {
  OrderSide,
  OrderType,
  OrderStatus,
  TimeInForce,
  OrderResponseType as _OrderResponseType,
  Timestamp,
  Decimal,
  Symbol,
  RateLimit,
  Asset,
  Balance,
  KlineInterval as _KlineInterval,
  Filter,
} from './common';
import type { BaseUserOperationParams } from './futures-options';

/**
 * Spot exchange information response
 */
export interface SpotExchangeInfo {
  timezone: string;
  serverTime: Timestamp;
  rateLimits: RateLimit[];
  exchangeFilters: Filter[];
  assets: Asset[];
  symbols: Symbol[];
}

/**
 * Order book (depth) response
 */
export interface OrderBook {
  lastUpdateId: number;
  E: Timestamp; // Message output time
  T: Timestamp; // Transaction time
  bids: [Decimal, Decimal][]; // [price, quantity]
  asks: [Decimal, Decimal][]; // [price, quantity]
}

/**
 * Trade information
 */
export interface Trade {
  id: number;
  price: Decimal;
  qty: Decimal;
  baseQty: Decimal;
  time: Timestamp;
  isBuyerMaker: boolean;
}

/**
 * Aggregated trade information
 */
export interface AggregatedTrade {
  a: number; // Aggregate trade ID
  p: Decimal; // Price
  q: Decimal; // Quantity
  f: number; // First trade ID
  l: number; // Last trade ID
  T: Timestamp; // Timestamp
  m: boolean; // Was the buyer the maker?
}

/**
 * Kline (candlestick) data
 */
export type Kline = [
  Timestamp, // Open time
  Decimal, // Open price
  Decimal, // High price
  Decimal, // Low price
  Decimal, // Close price
  Decimal, // Volume
  Timestamp, // Close time
  Decimal, // Quote asset volume
  number, // Number of trades
  Decimal, // Taker buy base asset volume
  Decimal, // Taker buy quote asset volume
];

/**
 * 24hr ticker statistics
 */
export interface Ticker24hr {
  symbol: string;
  priceChange: Decimal;
  priceChangePercent: Decimal;
  weightedAvgPrice: Decimal;
  prevClosePrice: Decimal;
  lastPrice: Decimal;
  lastQty: Decimal;
  bidPrice: Decimal;
  bidQty: Decimal;
  askPrice: Decimal;
  askQty: Decimal;
  openPrice: Decimal;
  highPrice: Decimal;
  lowPrice: Decimal;
  volume: Decimal;
  quoteVolume: Decimal;
  openTime: Timestamp;
  closeTime: Timestamp;
  firstId: number;
  lastId: number;
  count: number;
  baseAsset: string;
  quoteAsset: string;
}

/**
 * Symbol price ticker
 */
export interface PriceTicker {
  symbol: string;
  price: Decimal;
  time: Timestamp;
}

/**
 * Best bid/ask price and quantity
 */
export interface BookTicker {
  symbol: string;
  bidPrice: Decimal;
  bidQty: Decimal;
  askPrice: Decimal;
  askQty: Decimal;
  time: Timestamp;
}

/**
 * Commission rate information
 */
export interface CommissionRate {
  symbol: string;
  makerCommissionRate: Decimal;
  takerCommissionRate: Decimal;
}

/**
 * Order placement parameters
 */
export interface NewOrderParams {
  symbol: string;
  side: OrderSide;
  type: OrderType;
  timeInForce?: TimeInForce;
  quantity?: Decimal;
  quoteOrderQty?: Decimal;
  price?: Decimal;
  newClientOrderId?: string;
  stopPrice?: Decimal;
  recvWindow?: number;
}

/**
 * Order response (ACK type)
 */
export interface OrderAck {
  symbol: string;
  orderId: number;
  clientOrderId: string;
  updateTime: Timestamp;
  price: Decimal;
  avgPrice: Decimal;
  origQty: Decimal;
  cumQty: Decimal;
  executedQty: Decimal;
  cumQuote: Decimal;
  status: OrderStatus;
  timeInForce: TimeInForce;
  stopPrice: Decimal;
  origType: OrderType;
  type: OrderType;
  side: OrderSide;
}

/**
 * Order query response
 */
export interface Order {
  orderId: number;
  symbol: string;
  status: OrderStatus;
  clientOrderId: string;
  price: Decimal;
  avgPrice: Decimal;
  origQty: Decimal;
  executedQty: Decimal;
  cumQuote: Decimal;
  timeInForce: TimeInForce;
  type: OrderType;
  side: OrderSide;
  stopPrice: Decimal;
  origType: OrderType;
  time: Timestamp;
  updateTime: Timestamp;
}

/**
 * Account information
 */
export interface SpotAccount {
  feeTier: number;
  canTrade: boolean;
  canDeposit: boolean;
  canWithdraw: boolean;
  canBurnAsset: boolean;
  updateTime: Timestamp;
  balances: Balance[];
}

/**
 * User trade information
 */
export interface UserTrade {
  symbol: string;
  id: number;
  orderId: number;
  side: OrderSide;
  price: Decimal;
  qty: Decimal;
  quoteQty: Decimal;
  commission: Decimal;
  commissionAsset: string;
  time: Timestamp;
  counterpartyId: number;
  createUpdateId: number | null;
  maker: boolean;
  buyer: boolean;
}

/**
 * Asset transfer between futures and spot
 */
export interface AssetTransferParams {
  amount: Decimal;
  asset: string;
  clientTranId: string;
  kindType: 'FUTURE_SPOT' | 'SPOT_FUTURE';
}

/**
 * Asset transfer response
 */
export interface AssetTransferResponse {
  tranId: number;
  status: 'SUCCESS' | 'FAILED';
}

/**
 * Send to address parameters
 */
export interface SendToAddressParams {
  amount: Decimal;
  asset: string;
  toAddress: string;
  clientTranId?: string;
  recvWindow?: number;
}

/**
 * Withdraw fee estimation
 */
export interface WithdrawFee {
  tokenPrice: number;
  gasCost: number;
  gasUsdValue: number;
}

/**
 * Withdraw parameters
 */
export interface WithdrawParams {
  chainId: string; // 1(ETH), 56(BSC), 42161(Arbi)
  asset: string;
  amount: string;
  fee: string;
  receiver: string;
  nonce: string;
  userSignature: string;
  recvWindow?: number;
}

/**
 * Withdraw response
 */
export interface WithdrawResponse {
  withdrawId: string;
  hash: string;
}

/**
 * Create API key parameters
 */
export interface CreateApiKeyParams extends BaseUserOperationParams {
  userOperationType: 'CREATE_API_KEY';
  userSignature: string;
  apikeyIP?: string;
  desc: string;
  recvWindow?: number;
}

/**
 * API key response
 */
export interface ApiKeyResponse {
  apiKey: string;
  apiSecret: string;
}

/**
 * Listen key response
 */
export interface ListenKeyResponse {
  listenKey: string;
}

/**
 * Re-export common types for convenience
 */
export type { KlineInterval } from './common';
export type { OrderResponseType } from './common';

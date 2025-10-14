/**
 * TypeScript interfaces for AsterDEX WebSocket streams
 */

import type {
  OrderSide,
  OrderType,
  OrderStatus,
  TimeInForce,
  Timestamp,
  Decimal,
  KlineInterval,
} from './common';

/**
 * WebSocket stream subscription methods
 */
export type WebSocketMethod =
  | 'SUBSCRIBE'
  | 'UNSUBSCRIBE'
  | 'LIST_SUBSCRIPTIONS'
  | 'SET_PROPERTY'
  | 'GET_PROPERTY';

/**
 * WebSocket request message
 */
export interface WebSocketRequest {
  method: WebSocketMethod;
  params?: string[];
  id: number;
}

/**
 * WebSocket response message
 */
export interface WebSocketResponse<T = unknown> {
  result: T | null;
  id?: number;
  error?: WebSocketErrorMessage;
}

/**
 * WebSocket error message
 */
export interface WebSocketErrorMessage {
  code: number;
  msg: string;
  id?: string;
}

/**
 * Combined stream wrapper
 */
export interface CombinedStreamData<T = any> {
  stream: string;
  data: T;
}

/**
 * Aggregate trade stream data
 */
export interface AggTradeStreamData {
  e: 'aggTrade'; // Event type
  E: Timestamp; // Event time
  s: string; // Symbol
  a: number; // Aggregate trade ID
  p: Decimal; // Price
  q: Decimal; // Quantity
  f: number; // First trade ID
  l: number; // Last trade ID
  T: Timestamp; // Trade time
  m: boolean; // Is the buyer the market maker?
  M: boolean; // Ignore
}

/**
 * Individual trade stream data
 */
export interface TradeStreamData {
  e: 'trade'; // Event type
  E: Timestamp; // Event time
  s: string; // Symbol
  t: number; // Trade ID
  p: Decimal; // Price
  q: Decimal; // Quantity
  T: Timestamp; // Trade time
  m: boolean; // Is the buyer the market maker?
}

/**
 * Kline stream data
 */
export interface KlineStreamData {
  e: 'kline'; // Event type
  E: Timestamp; // Event time
  s: string; // Symbol
  k: {
    t: Timestamp; // Kline start time
    T: Timestamp; // Kline close time
    s: string; // Symbol
    i: KlineInterval; // Interval
    f: number; // First trade ID
    L: number; // Last trade ID
    o: Decimal; // Open price
    c: Decimal; // Close price
    h: Decimal; // High price
    l: Decimal; // Low price
    v: Decimal; // Base asset volume
    n: number; // Number of trades
    x: boolean; // Is this kline closed?
    q: Decimal; // Quote asset volume
    V: Decimal; // Taker buy base asset volume
    Q: Decimal; // Taker buy quote asset volume
    B: string; // Ignore
  };
}

/**
 * 24hr mini ticker stream data
 */
export interface MiniTickerStreamData {
  e: '24hrMiniTicker'; // Event type
  E: Timestamp; // Event time
  s: string; // Symbol
  c: Decimal; // Close price
  o: Decimal; // Open price
  h: Decimal; // High price
  l: Decimal; // Low price
  v: Decimal; // Total traded base asset volume
  q: Decimal; // Total traded quote asset volume
}

/**
 * 24hr ticker stream data
 */
export interface TickerStreamData {
  e: '24hrTicker'; // Event type
  E: Timestamp; // Event time
  s: string; // Symbol
  p: Decimal; // Price change
  P: Decimal; // Price change percent
  w: Decimal; // Weighted average price
  c: Decimal; // Last price
  Q: Decimal; // Last quantity
  o: Decimal; // Open price
  h: Decimal; // High price
  l: Decimal; // Low price
  v: Decimal; // Total traded base asset volume
  q: Decimal; // Total traded quote asset volume
  O: Timestamp; // Statistics open time
  C: Timestamp; // Statistics close time
  F: number; // First trade ID
  L: number; // Last trade ID
  n: number; // Total number of trades
}

/**
 * Book ticker stream data
 */
export interface BookTickerStreamData {
  u: number; // Order book updateId
  s: string; // Symbol
  b: Decimal; // Best bid price
  B: Decimal; // Best bid qty
  a: Decimal; // Best ask price
  A: Decimal; // Best ask qty
}

/**
 * Depth update stream data
 */
export interface DepthStreamData {
  e: 'depthUpdate'; // Event type
  E: Timestamp; // Event time
  T: Timestamp; // Transaction time
  s: string; // Symbol
  U: number; // First update ID in event
  u: number; // Final update ID in event
  pu: number; // Final update ID in last stream
  b?: [Decimal, Decimal][]; // Bids to be updated [price, quantity]
  a?: [Decimal, Decimal][]; // Asks to be updated [price, quantity]
  bids?: [Decimal, Decimal][]; // Alternative format for bids
  asks?: [Decimal, Decimal][]; // Alternative format for asks
}

/**
 * Account update stream data
 */
export interface AccountUpdateStreamData {
  e: 'outboundAccountPosition'; // Event type
  E: Timestamp; // Event time
  T: Timestamp; // Time of last account update
  m: string; // Event reason type
  B: Array<{
    a: string; // Asset
    f: Decimal; // Free
    l: Decimal; // Locked
  }>;
}

/**
 * Order execution types
 */
export type ExecutionType = 'NEW' | 'CANCELED' | 'REJECTED' | 'TRADE' | 'EXPIRED';

/**
 * Execution report (order update) stream data
 */
export interface ExecutionReportStreamData {
  e: 'executionReport'; // Event type
  E: Timestamp; // Event time
  s: string; // Symbol
  c: string; // Client order ID
  S: OrderSide; // Side
  o: OrderType; // Order type
  f: TimeInForce; // Time in force
  q: Decimal; // Order quantity
  p: Decimal; // Order price
  ap: Decimal; // Average price
  P: Decimal; // Stop price
  x: ExecutionType; // Current execution type
  X: OrderStatus; // Current order status
  i: number; // Order ID
  l: Decimal; // Last executed quantity
  z: Decimal; // Cumulative filled quantity
  L: Decimal; // Last executed price
  n: Decimal; // Commission amount
  N: string; // Commission asset
  T: Timestamp; // Transaction time
  t: number; // Trade ID
  m: boolean; // Is this trade the maker side?
  ot: OrderType; // Original order type
  O: Timestamp; // Order creation time
  Z: Decimal; // Cumulative quote asset transacted quantity
  Y: Decimal; // Last quote asset transacted quantity
  Q: Decimal; // Quote order quantity
}

/**
 * Stream event handlers
 */
export interface StreamEventHandlers {
  onAggTrade?: (data: AggTradeStreamData) => void;
  onTrade?: (data: TradeStreamData) => void;
  onKline?: (data: KlineStreamData) => void;
  onMiniTicker?: (data: MiniTickerStreamData) => void;
  onTicker?: (data: TickerStreamData) => void;
  onBookTicker?: (data: BookTickerStreamData) => void;
  onDepthUpdate?: (data: DepthStreamData) => void;
  onAccountUpdate?: (data: AccountUpdateStreamData) => void;
  onExecutionReport?: (data: ExecutionReportStreamData) => void;
  onError?: (error: Error) => void;
  onClose?: (code: number, reason: string) => void;
  onOpen?: () => void;
}

// ========================================
// Futures WebSocket Stream Types
// ========================================

/**
 * Futures mark price stream data
 */
export interface FuturesMarkPriceStreamData {
  e: 'markPriceUpdate'; // Event type
  E: Timestamp; // Event time
  s: string; // Symbol
  p: Decimal; // Mark price
  i: Decimal; // Index price
  P: Decimal; // Estimated settle price
  r: Decimal; // Funding rate
  T: Timestamp; // Next funding time
}

/**
 * Futures liquidation order stream data
 */
export interface FuturesLiquidationStreamData {
  e: 'forceOrder'; // Event type
  E: Timestamp; // Event time
  o: {
    s: string; // Symbol
    S: 'BUY' | 'SELL'; // Side
    o: 'LIMIT'; // Order Type
    f: 'IOC'; // Time in Force
    q: Decimal; // Original Quantity
    p: Decimal; // Price
    ap: Decimal; // Average Price
    X: 'FILLED'; // Order Status
    l: Decimal; // Order Last Filled Quantity
    z: Decimal; // Order Filled Accumulated Quantity
    T: Timestamp; // Order Trade Time
  };
}

/**
 * Futures account update stream data
 */
export interface FuturesAccountUpdateStreamData {
  e: 'ACCOUNT_UPDATE'; // Event Type
  E: Timestamp; // Event Time
  T: Timestamp; // Transaction
  a: {
    m: 'ORDER' | 'FUNDING_FEE'; // Event reason type
    B: Array<{
      a: string; // Asset
      wb: Decimal; // Wallet Balance
      cw: Decimal; // Cross Wallet Balance
      bc: Decimal; // Balance Change except PnL and Commission
    }>;
    P: Array<{
      s: string; // Symbol
      pa: Decimal; // Position Amount
      ep: Decimal; // Entry Price
      cr: Decimal; // (Pre-fee) Accumulated Realized
      up: Decimal; // Unrealized PnL
      mt: 'isolated' | 'cross'; // Margin Type
      iw: Decimal; // Isolated Wallet (if isolated position)
      ps: 'BOTH' | 'LONG' | 'SHORT'; // Position Side
    }>;
  };
}

/**
 * Futures order update stream data
 */
export interface FuturesOrderUpdateStreamData {
  e: 'ORDER_TRADE_UPDATE'; // Event Type
  E: Timestamp; // Event Time
  T: Timestamp; // Transaction Time
  o: {
    s: string; // Symbol
    c: string; // Client Order Id
    S: 'BUY' | 'SELL'; // Side
    o: string; // Order Type
    f: string; // Time in Force
    q: Decimal; // Original Quantity
    p: Decimal; // Original Price
    ap: Decimal; // Average Price
    sp: Decimal; // Stop Price
    x: string; // Execution Type
    X: string; // Order Status
    i: number; // Order Id
    l: Decimal; // Order Last Filled Quantity
    z: Decimal; // Order Filled Accumulated Quantity
    L: Decimal; // Last Filled Price
    N: string; // Commission Asset
    n: Decimal; // Commission
    T: Timestamp; // Order Trade Time
    t: number; // Trade Id
    b: Decimal; // Bids Notional
    a: Decimal; // Ask Notional
    m: boolean; // Is this trade the maker side?
    R: boolean; // Is this reduce only
    wt: 'CONTRACT_PRICE' | 'MARK_PRICE'; // Stop Price Working Type
    ot: string; // Original Order Type
    ps: 'BOTH' | 'LONG' | 'SHORT'; // Position Side
    cp: boolean; // If Close-All
    AP: Decimal; // Activation Price, only for TRAILING_STOP_MARKET order
    cr: Decimal; // Callback Rate, only for TRAILING_STOP_MARKET order
    rp: Decimal; // Realized Profit of the trade
  };
}

/**
 * Futures account configuration update stream data
 */
export interface FuturesAccountConfigUpdateStreamData {
  e: 'ACCOUNT_CONFIG_UPDATE'; // Event Type
  E: Timestamp; // Event Time
  T: Timestamp; // Transaction Time
  ac?: {
    s: string; // Symbol
    l: number; // Leverage
  };
  ai?: {
    j: boolean; // Multi-Assets Mode
  };
}

/**
 * Futures stream event handlers
 */
export interface FuturesStreamEventHandlers {
  // Market data streams
  onAggTrade?: (data: AggTradeStreamData) => void;
  onMarkPrice?: (data: FuturesMarkPriceStreamData) => void;
  onKline?: (data: KlineStreamData) => void;
  onMiniTicker?: (data: MiniTickerStreamData) => void;
  onTicker?: (data: TickerStreamData) => void;
  onBookTicker?: (data: BookTickerStreamData) => void;
  onLiquidation?: (data: FuturesLiquidationStreamData) => void;
  onDepthUpdate?: (data: DepthStreamData) => void;

  // User data streams
  onAccountUpdate?: (data: FuturesAccountUpdateStreamData) => void;
  onOrderUpdate?: (data: FuturesOrderUpdateStreamData) => void;
  onAccountConfigUpdate?: (data: FuturesAccountConfigUpdateStreamData) => void;

  // Connection events
  onError?: (error: Error) => void;
  onClose?: (code: number, reason: string) => void;
  onOpen?: () => void;
}

/**
 * Combined stream event handlers (Spot + Futures)
 */
export interface CombinedStreamEventHandlers
  extends Omit<StreamEventHandlers, 'onAccountUpdate'>,
    Omit<FuturesStreamEventHandlers, 'onAccountUpdate'> {
  onAccountUpdate?: (data: AccountUpdateStreamData | FuturesAccountUpdateStreamData) => void;
}

/**
 * WebSocket connection configuration
 */
export interface WebSocketConfig {
  baseUrl?: string;
  reconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  pingInterval?: number;
  pongTimeout?: number;
}

/**
 * @file Defines TypeScript interfaces for the AsterDEX Futures API.
 * @author AsterDEX
 * @version 1.0.0
 * @license MIT
 */

import type {
  OrderSide,
  OrderStatus,
  TimeInForce,
  Timestamp,
  Decimal,
  KlineInterval as _KlineInterval,
  RateLimit,
} from './common';

/**
 * The supported order types for futures trading.
 * @typedef {('LIMIT' | 'MARKET' | 'STOP' | 'STOP_MARKET' | 'TAKE_PROFIT' | 'TAKE_PROFIT_MARKET' | 'TRAILING_STOP_MARKET')} FuturesOrderType
 */
export type FuturesOrderType =
  | 'LIMIT'
  | 'MARKET'
  | 'STOP'
  | 'STOP_MARKET'
  | 'TAKE_PROFIT'
  | 'TAKE_PROFIT_MARKET'
  | 'TRAILING_STOP_MARKET';

/**
 * The side of a futures position.
 * @typedef {('BOTH' | 'LONG' | 'SHORT')} PositionSide
 */
export type PositionSide = 'BOTH' | 'LONG' | 'SHORT';

/**
 * The working type for a stop order.
 * @typedef {('MARK_PRICE' | 'CONTRACT_PRICE')} WorkingType
 */
export type WorkingType = 'MARK_PRICE' | 'CONTRACT_PRICE';

/**
 * The response type for a new futures order.
 * @typedef {('ACK' | 'RESULT')} FuturesOrderResponseType
 */
export type FuturesOrderResponseType = 'ACK' | 'RESULT';

/**
 * The type of a futures contract.
 * @typedef {('PERPETUAL')} ContractType
 */
export type ContractType = 'PERPETUAL';

/**
 * The status of a futures contract.
 * @typedef {('PENDING_TRADING' | 'TRADING' | 'PRE_SETTLE' | 'SETTLING' | 'CLOSE')} ContractStatus
 */
export type ContractStatus = 'PENDING_TRADING' | 'TRADING' | 'PRE_SETTLE' | 'SETTLING' | 'CLOSE';

/**
 * The type of a futures symbol.
 * @typedef {('FUTURE')} FuturesSymbolType
 */
export type FuturesSymbolType = 'FUTURE';

/**
 * The margin type for a futures position.
 * @typedef {('ISOLATED' | 'CROSS')} MarginType
 */
export type MarginType = 'ISOLATED' | 'CROSS';

/**
 * The type of income for a futures account.
 * @typedef {('TRANSFER' | 'WELCOME_BONUS' | 'REALIZED_PNL' | 'FUNDING_FEE' | 'COMMISSION' | 'INSURANCE_CLEAR' | 'REFERRAL_KICKBACK' | 'COMMISSION_REBATE' | 'API_REBATE' | 'CONTEST_REWARD' | 'CROSS_COLLATERAL_TRANSFER' | 'OPTIONS_PREMIUM_FEE' | 'OPTIONS_SETTLE_PROFIT' | 'AUTO_EXCHANGE')} IncomeType
 */
export type IncomeType =
  | 'TRANSFER'
  | 'WELCOME_BONUS'
  | 'REALIZED_PNL'
  | 'FUNDING_FEE'
  | 'COMMISSION'
  | 'INSURANCE_CLEAR'
  | 'REFERRAL_KICKBACK'
  | 'COMMISSION_REBATE'
  | 'API_REBATE'
  | 'CONTEST_REWARD'
  | 'CROSS_COLLATERAL_TRANSFER'
  | 'OPTIONS_PREMIUM_FEE'
  | 'OPTIONS_SETTLE_PROFIT'
  | 'AUTO_EXCHANGE';

/**
 * The Web3 authentication parameters for the Futures API.
 * @interface Web3AuthParams
 */
export interface Web3AuthParams {
  user: string;
  signer: string;
  nonce: number;
  signature: string;
  timestamp: number;
  recvWindow: number;
}

/**
 * Information about the futures exchange.
 * @interface FuturesExchangeInfo
 */
export interface FuturesExchangeInfo {
  timezone: string;
  serverTime: Timestamp;
  rateLimits: RateLimit[];
  exchangeFilters: FuturesFilter[];
  assets: FuturesAsset[];
  symbols: FuturesSymbol[];
}

/**
 * Information about a futures asset.
 * @interface FuturesAsset
 */
export interface FuturesAsset {
  asset: string;
  marginAvailable: boolean;
  autoAssetExchange?: string;
}

/**
 * Information about a futures symbol.
 * @interface FuturesSymbol
 */
export interface FuturesSymbol {
  symbol: string;
  pair: string;
  contractType: ContractType;
  deliveryDate: Timestamp;
  onboardDate: Timestamp;
  status: ContractStatus;
  maintMarginPercent: Decimal;
  requiredMarginPercent: Decimal;
  baseAsset: string;
  quoteAsset: string;
  marginAsset: string;
  pricePrecision: number;
  quantityPrecision: number;
  baseAssetPrecision: number;
  quotePrecision: number;
  underlyingType: string;
  underlyingSubType: string[];
  settlePlan: number;
  triggerProtect: Decimal;
  liquidationFee: Decimal;
  marketTakeBound: Decimal;
  maxMoveOrderLimit: number;
  filters: FuturesFilter[];
  orderTypes: FuturesOrderType[];
  timeInForce: TimeInForce[];
}

/**
 * The supported types of futures trading filters.
 * @typedef {('PRICE_FILTER' | 'LOT_SIZE' | 'MARKET_LOT_SIZE' | 'MAX_NUM_ORDERS' | 'MAX_NUM_ALGO_ORDERS' | 'PERCENT_PRICE' | 'MIN_NOTIONAL')} FuturesFilterType
 */
export type FuturesFilterType =
  | 'PRICE_FILTER'
  | 'LOT_SIZE'
  | 'MARKET_LOT_SIZE'
  | 'MAX_NUM_ORDERS'
  | 'MAX_NUM_ALGO_ORDERS'
  | 'PERCENT_PRICE'
  | 'MIN_NOTIONAL';

/**
 * The base interface for a futures trading filter.
 * @interface BaseFuturesFilter
 */
export interface BaseFuturesFilter {
  filterType: FuturesFilterType;
}

/**
 * The configuration for a futures price filter.
 * @interface FuturesPriceFilter
 * @extends {BaseFuturesFilter}
 */
export interface FuturesPriceFilter extends BaseFuturesFilter {
  filterType: 'PRICE_FILTER';
  minPrice: Decimal;
  maxPrice: Decimal;
  tickSize: Decimal;
}

/**
 * The configuration for a futures lot size filter.
 * @interface FuturesLotSizeFilter
 * @extends {BaseFuturesFilter}
 */
export interface FuturesLotSizeFilter extends BaseFuturesFilter {
  filterType: 'LOT_SIZE';
  minQty: Decimal;
  maxQty: Decimal;
  stepSize: Decimal;
}

/**
 * The configuration for a futures market lot size filter.
 * @interface FuturesMarketLotSizeFilter
 * @extends {BaseFuturesFilter}
 */
export interface FuturesMarketLotSizeFilter extends BaseFuturesFilter {
  filterType: 'MARKET_LOT_SIZE';
  minQty: Decimal;
  maxQty: Decimal;
  stepSize: Decimal;
}

/**
 * A union type representing all possible futures trading filters.
 * @typedef {(FuturesPriceFilter | FuturesLotSizeFilter | FuturesMarketLotSizeFilter | (BaseFuturesFilter & Record<string, unknown>))} FuturesFilter
 */
export type FuturesFilter =
  | FuturesPriceFilter
  | FuturesLotSizeFilter
  | FuturesMarketLotSizeFilter
  | (BaseFuturesFilter & Record<string, unknown>);

/**
 * The order book for a futures symbol.
 * @interface FuturesOrderBook
 */
export interface FuturesOrderBook {
  lastUpdateId: number;
  E: Timestamp;
  T: Timestamp;
  bids: [Decimal, Decimal][];
  asks: [Decimal, Decimal][];
}

/**
 * Information about a futures trade.
 * @interface FuturesTrade
 */
export interface FuturesTrade {
  id: number;
  price: Decimal;
  qty: Decimal;
  quoteQty: Decimal;
  time: Timestamp;
  isBuyerMaker: boolean;
}

/**
 * Information about an aggregated futures trade.
 * @interface FuturesAggTrade
 */
export interface FuturesAggTrade {
  a: number;
  p: Decimal;
  q: Decimal;
  f: number;
  l: number;
  T: Timestamp;
  m: boolean;
}

/**
 * Information about the mark price of a futures symbol.
 * @interface FuturesMarkPrice
 */
export interface FuturesMarkPrice {
  symbol: string;
  markPrice: Decimal;
  indexPrice: Decimal;
  estimatedSettlePrice: Decimal;
  lastFundingRate: Decimal;
  interestRate: Decimal;
  nextFundingTime: Timestamp;
  time: Timestamp;
}

/**
 * Information about a futures funding rate.
 * @interface FuturesFundingRate
 */
export interface FuturesFundingRate {
  symbol: string;
  fundingRate: Decimal;
  fundingTime: Timestamp;
}

/**
 * The 24-hour ticker statistics for a futures symbol.
 * @interface Futures24hrTicker
 */
export interface Futures24hrTicker {
  symbol: string;
  priceChange: Decimal;
  priceChangePercent: Decimal;
  weightedAvgPrice: Decimal;
  lastPrice: Decimal;
  lastQty: Decimal;
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
}

/**
 * The parameters for placing a new futures order.
 * @interface FuturesNewOrderParams
 */
export interface FuturesNewOrderParams {
  symbol: string;
  side: OrderSide;
  positionSide?: PositionSide;
  type: FuturesOrderType;
  timeInForce?: TimeInForce;
  quantity?: Decimal;
  reduceOnly?: boolean;
  price?: Decimal;
  newClientOrderId?: string;
  stopPrice?: Decimal;
  closePosition?: boolean;
  activationPrice?: Decimal;
  callbackRate?: Decimal;
  workingType?: WorkingType;
  priceProtect?: boolean;
  newOrderRespType?: FuturesOrderResponseType;
  recvWindow?: number;
}

/**
 * The response for a futures order request.
 * @interface FuturesOrderResponse
 */
export interface FuturesOrderResponse {
  orderId: number;
  symbol: string;
  status: OrderStatus;
  clientOrderId: string;
  price: Decimal;
  avgPrice: Decimal;
  origQty: Decimal;
  executedQty: Decimal;
  cumQty: Decimal;
  cumQuote: Decimal;
  timeInForce: TimeInForce;
  type: FuturesOrderType;
  reduceOnly: boolean;
  closePosition: boolean;
  side: OrderSide;
  positionSide: PositionSide;
  stopPrice: Decimal;
  workingType: WorkingType;
  priceProtect: boolean;
  origType: FuturesOrderType;
  time: Timestamp;
  updateTime: Timestamp;
}

/**
 * The balance of a futures account.
 * @interface FuturesBalance
 */
export interface FuturesBalance {
  accountAlias: string;
  asset: string;
  balance: Decimal;
  crossWalletBalance: Decimal;
  crossUnPnl: Decimal;
  availableBalance: Decimal;
  maxWithdrawAmount: Decimal;
  marginAvailable: boolean;
  updateTime: Timestamp;
}

/**
 * Information about a futures account.
 * @interface FuturesAccount
 */
export interface FuturesAccount {
  feeTier: number;
  canTrade: boolean;
  canDeposit: boolean;
  canWithdraw: boolean;
  updateTime: Timestamp;
  multiAssetsMargin: boolean;
  tradeGroupId: number;
  totalInitialMargin: Decimal;
  totalMaintMargin: Decimal;
  totalWalletBalance: Decimal;
  totalUnrealizedProfit: Decimal;
  totalMarginBalance: Decimal;
  totalPositionInitialMargin: Decimal;
  totalOpenOrderInitialMargin: Decimal;
  totalCrossWalletBalance: Decimal;
  totalCrossUnPnl: Decimal;
  availableBalance: Decimal;
  maxWithdrawAmount: Decimal;
  assets: FuturesAccountAsset[];
  positions: FuturesPosition[];
}

/**
 * Information about an asset in a futures account.
 * @interface FuturesAccountAsset
 */
export interface FuturesAccountAsset {
  asset: string;
  walletBalance: Decimal;
  unrealizedProfit: Decimal;
  marginBalance: Decimal;
  maintMargin: Decimal;
  initialMargin: Decimal;
  positionInitialMargin: Decimal;
  openOrderInitialMargin: Decimal;
  crossWalletBalance: Decimal;
  crossUnPnl: Decimal;
  availableBalance: Decimal;
  maxWithdrawAmount: Decimal;
  marginAvailable: boolean;
  updateTime: Timestamp;
}

/**
 * Information about a futures position.
 * @interface FuturesPosition
 */
export interface FuturesPosition {
  symbol: string;
  initialMargin: Decimal;
  maintMargin: Decimal;
  unrealizedProfit: Decimal;
  positionInitialMargin: Decimal;
  openOrderInitialMargin: Decimal;
  leverage: Decimal;
  isolated: boolean;
  entryPrice: Decimal;
  maxNotional: Decimal;
  bidNotional: Decimal;
  askNotional: Decimal;
  positionSide: PositionSide;
  positionAmt: Decimal;
  updateTime: Timestamp;
}

/**
 * Information about the risk of a futures position.
 * @interface FuturesPositionRisk
 */
export interface FuturesPositionRisk {
  symbol: string;
  positionAmt: Decimal;
  entryPrice: Decimal;
  markPrice: Decimal;
  unRealizedProfit: Decimal;
  liquidationPrice: Decimal;
  leverage: Decimal;
  maxNotionalValue: Decimal;
  marginType: MarginType;
  isolatedMargin: Decimal;
  isAutoAddMargin: boolean;
  positionSide: PositionSide;
  notional: Decimal;
  isolatedWallet: Decimal;
  updateTime: Timestamp;
}

/**
 * Information about a user's futures trade.
 * @interface FuturesUserTrade
 */
export interface FuturesUserTrade {
  buyer: boolean;
  commission: Decimal;
  commissionAsset: string;
  id: number;
  maker: boolean;
  orderId: number;
  price: Decimal;
  qty: Decimal;
  quoteQty: Decimal;
  realizedPnl: Decimal;
  side: OrderSide;
  positionSide: PositionSide;
  symbol: string;
  time: Timestamp;
}

/**
 * Information about the income history of a futures account.
 * @interface FuturesIncome
 */
export interface FuturesIncome {
  symbol: string;
  incomeType: IncomeType;
  income: Decimal;
  asset: string;
  info: string;
  time: Timestamp;
  tranId: number;
  tradeId: string;
}

/**
 * Information about the leverage brackets for a futures symbol.
 * @interface FuturesLeverageBracket
 */
export interface FuturesLeverageBracket {
  symbol: string;
  brackets: {
    bracket: number;
    initialLeverage: number;
    notionalCap: number;
    notionalFloor: number;
    maintMarginRatio: Decimal;
    cum: Decimal;
  }[];
}

/**
 * The ADL quantile estimation for a futures position.
 * @interface FuturesADLQuantile
 */
export interface FuturesADLQuantile {
  symbol: string;
  adlQuantile: {
    LONG: number;
    SHORT: number;
    BOTH?: number;
  };
}

/**
 * Information about a forced order.
 * @interface FuturesForceOrder
 */
export interface FuturesForceOrder {
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
  type: FuturesOrderType;
  reduceOnly: boolean;
  closePosition: boolean;
  side: OrderSide;
  positionSide: PositionSide;
  stopPrice: Decimal;
  workingType: WorkingType;
  origType: FuturesOrderType;
  time: Timestamp;
  updateTime: Timestamp;
}

/**
 * The commission rates for a futures symbol.
 * @interface FuturesCommissionRate
 */
export interface FuturesCommissionRate {
  symbol: string;
  makerCommissionRate: Decimal;
  takerCommissionRate: Decimal;
}

/**
 * The type of asset transfer.
 * @typedef {('FUTURE_SPOT' | 'SPOT_FUTURE')} TransferKindType
 */
export type TransferKindType = 'FUTURE_SPOT' | 'SPOT_FUTURE';

/**
 * The parameters for a futures asset transfer.
 * @interface FuturesTransferParams
 */
export interface FuturesTransferParams {
  asset: string;
  amount: Decimal;
  clientTranId: string;
  kindType: TransferKindType;
  recvWindow?: number;
}

/**
 * The response for a futures asset transfer.
 * @interface FuturesTransferResponse
 */
export interface FuturesTransferResponse {
  tranId: number;
}

/**
 * The response for a position mode request.
 * @interface FuturesPositionMode
 */
export interface FuturesPositionMode {
  dualSidePosition: boolean;
}

/**
 * The response for a multi-assets mode request.
 * @interface FuturesMultiAssetsMode
 */
export interface FuturesMultiAssetsMode {
  multiAssetsMargin: boolean;
}

/**
 * The response for a listen key request.
 * @interface FuturesListenKeyResponse
 */
export interface FuturesListenKeyResponse {
  listenKey: string;
}

/**
 * The parameters for a batch order request.
 * @interface FuturesBatchOrderParams
 */
export interface FuturesBatchOrderParams {
  batchOrders: FuturesNewOrderParams[];
}

/**
 * The parameters for a countdown cancel request.
 * @interface FuturesCountdownCancelParams
 */
export interface FuturesCountdownCancelParams {
  symbol: string;
  countdownTime: number;
  recvWindow?: number;
}

/**
 * The response for a countdown cancel request.
 * @interface FuturesCountdownCancelResponse
 */
export interface FuturesCountdownCancelResponse {
  symbol: string;
  countdownTime: number;
}

/**
 * The parameters for changing leverage.
 * @interface FuturesLeverageParams
 */
export interface FuturesLeverageParams {
  symbol: string;
  leverage: number;
  recvWindow?: number;
}

/**
 * The response for a leverage change request.
 * @interface FuturesLeverageResponse
 */
export interface FuturesLeverageResponse {
  leverage: number;
  maxNotionalValue: Decimal;
  symbol: string;
}

/**
 * The parameters for changing margin type.
 * @interface FuturesMarginTypeParams
 */
export interface FuturesMarginTypeParams {
  symbol: string;
  marginType: MarginType;
  recvWindow?: number;
}

/**
 * The parameters for modifying position margin.
 * @interface FuturesPositionMarginParams
 */
export interface FuturesPositionMarginParams {
  symbol: string;
  positionSide?: PositionSide;
  amount: Decimal;
  type: 1 | 2;
  recvWindow?: number;
}

/**
 * The response for a position margin modification request.
 * @interface FuturesPositionMarginResponse
 */
export interface FuturesPositionMarginResponse {
  amount: Decimal;
  code: number;
  msg: string;
  type: number;
}

/**
 * Information about the position margin history.
 * @interface FuturesPositionMarginHistory
 */
export interface FuturesPositionMarginHistory {
  amount: Decimal;
  asset: string;
  symbol: string;
  time: Timestamp;
  type: number;
  positionSide: PositionSide;
}

/**
 * A signed hash.
 * @typedef {object} SignedHash
 * @property {string} signature - The signature.
 * @property {string} r - The r value of the signature.
 * @property {string} s - The s value of the signature.
 * @property {number} v - The v value of the signature.
 */
export type SignedHash = {
  signature: string;
  r: string;
  s: string;
  v: number;
};

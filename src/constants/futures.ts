/**
 * @file Defines constants and endpoints for the AsterDEX Futures API.
 * @author AsterDEX
 * @version 1.0.0
 * @license MIT
 */

/**
 * The base paths for the different versions of the Futures API.
 * @constant {object}
 */
const API_BASE = {
  V1: '/fapi/v1',
  V2: '/fapi/v3',
  V3: '/fapi/v3',
  V4: '/fapi/v4',
} as const;

/**
 * The endpoints for the Futures API, organized by category.
 * @constant {object}
 */
export const FuturesEndpoints = {
  // Market Data
  PING: `${API_BASE.V3}/ping`,
  SERVER_TIME: `${API_BASE.V3}/time`,
  EXCHANGE_INFO: `${API_BASE.V3}/exchangeInfo`,
  ORDER_BOOK: `${API_BASE.V3}/depth`,
  RECENT_TRADES: `${API_BASE.V3}/trades`,
  HISTORICAL_TRADES: `${API_BASE.V3}/historicalTrades`,
  AGG_TRADES: `${API_BASE.V3}/aggTrades`,
  KLINES: `${API_BASE.V3}/klines`,
  INDEX_PRICE_KLINES: `${API_BASE.V3}/indexPriceKlines`,
  MARK_PRICE_KLINES: `${API_BASE.V3}/markPriceKlines`,
  PREMIUM_INDEX: `${API_BASE.V3}/premiumIndex`,
  FUNDING_RATE: `${API_BASE.V3}/fundingRate`,
  FUNDING_INFO: `${API_BASE.V3}/fundingInfo`,
  TICKER_24HR: `${API_BASE.V3}/ticker/24hr`,
  TICKER_PRICE: `${API_BASE.V3}/ticker/price`,
  BOOK_TICKER: `${API_BASE.V3}/ticker/bookTicker`,
  INDEX_REFERENCES: `${API_BASE.V3}/indexreferences`,

  // Account/Trading
  NOOP: `${API_BASE.V3}/noop`,
  POSITION_MODE: `${API_BASE.V3}/positionSide/dual`,
  STP_MODE: `${API_BASE.V3}/stpMode`,
  MULTI_ASSETS_MARGIN: `${API_BASE.V3}/multiAssetsMargin`,
  ORDER: `${API_BASE.V3}/order`,
  ORDER_TEST: `${API_BASE.V3}/order/test`,
  CHASE: `${API_BASE.V3}/chase`,
  BATCH_ORDERS: `${API_BASE.V3}/batchOrders`,
  TRANSFER: `${API_BASE.V3}/asset/wallet/transfer`,
  ALL_OPEN_ORDERS: `${API_BASE.V3}/allOpenOrders`,
  COUNTDOWN_CANCEL_ALL: `${API_BASE.V3}/countdownCancelAll`,
  OPEN_ORDER: `${API_BASE.V3}/openOrder`,
  OPEN_ORDERS: `${API_BASE.V3}/openOrders`,
  ALL_ORDERS: `${API_BASE.V3}/allOrders`,
  BALANCE: `${API_BASE.V3}/balance`,
  ACCOUNT: `${API_BASE.V3}/accountWithJoinMargin`,
  LEVERAGE: `${API_BASE.V3}/leverage`,
  MARGIN_TYPE: `${API_BASE.V3}/marginType`,
  POSITION_MARGIN: `${API_BASE.V3}/positionMargin`,
  POSITION_MARGIN_HISTORY: `${API_BASE.V3}/positionMargin/history`,
  POSITION_RISK: `${API_BASE.V3}/positionRisk`,
  USER_TRADES: `${API_BASE.V3}/userTrades`,
  INCOME: `${API_BASE.V3}/income`,
  LEVERAGE_BRACKET: `${API_BASE.V3}/leverageBracket`,
  ADL_QUANTILE: `${API_BASE.V3}/adlQuantile`,
  FORCE_ORDERS: `${API_BASE.V3}/forceOrders`,
  COMMISSION_RATE: `${API_BASE.V3}/commissionRate`,
  MMP: `${API_BASE.V3}/mmp`,
  MMP_RESET: `${API_BASE.V3}/mmpReset`,
  PLACE_STRATEGY_ORDER: `${API_BASE.V3}/placeStrategyOrder`,
  UPDATE_STRATEGY_ORDER: `${API_BASE.V3}/updateStrategyOrder`,
  STRATEGY_OPEN_ORDER: `${API_BASE.V3}/strategyOpenOrder`,
  STRATEGY_HISTORY_ORDER: `${API_BASE.V3}/strategyHistoryOrder`,
  BIND_SUB_ACCOUNT: `${API_BASE.V3}/sub-accounts/bind`,
  CREATE_SUB_ACCOUNT: `${API_BASE.V3}/createSubAccount`,
  GET_SUB_ACCOUNT_LIST: `${API_BASE.V3}/getSubAccountList`,
  UPDATE_SUB_ACCOUNT: `${API_BASE.V3}/updateSubAccount`,
  SUB_ACCOUNT_TRANSFER: `${API_BASE.V3}/subAccountTransfer`,
  MIGRATE_USER: `${API_BASE.V3}/asset/migrateUser`,
  MIGRATE_USER_HISTORY: `${API_BASE.V3}/asset/migrateUser/history`,
  REGISTER_AND_APPROVE_AGENT: `${API_BASE.V3}/registerAndApproveAgent`,
  ANNOUNCEMENT_DIRECT: `${API_BASE.V3}/announcement/direct`,
  ANNOUNCEMENT_DIRECT_BY_ID: `${API_BASE.V3}/announcement/directById`,

  // User Data Stream
  LISTEN_KEY: `${API_BASE.V3}/listenKey`,
} as const;

/**
 * The types of auto-close positions.
 * @enum {string}
 */
export enum AutoCloseType {
  LIQUIDATION = 'LIQUIDATION',
  ADL = 'ADL',
}

/**
 * The supported order types for validation.
 * @enum {string}
 */
export enum OrderTypeValidation {
  LIMIT = 'LIMIT',
  MARKET = 'MARKET',
  STOP = 'STOP',
  TAKE_PROFIT = 'TAKE_PROFIT',
  STOP_MARKET = 'STOP_MARKET',
  TAKE_PROFIT_MARKET = 'TAKE_PROFIT_MARKET',
  TRAILING_STOP_MARKET = 'TRAILING_STOP_MARKET',
}

/**
 * Self-trade prevention modes supported by the Futures V3 API.
 * @enum {string}
 */
export enum SelfTradePreventionModes {
  EXPIRE_TAKER = 'EXPIRE_TAKER',
  EXPIRE_MAKER = 'EXPIRE_MAKER',
  EXPIRE_BOTH = 'EXPIRE_BOTH',
}

/**
 * The required parameters for different order types.
 * @enum {string}
 */
export enum OrderRequiredParams {
  SYMBOL = 'symbol',
  SIDE = 'side',
  TYPE = 'type',
  TIME_IN_FORCE = 'timeInForce',
  QUANTITY = 'quantity',
  PRICE = 'price',
  STOP_PRICE = 'stopPrice',
  CALLBACK_RATE = 'callbackRate',
  INTERVAL = 'interval',
  BATCH_ORDERS = 'batchOrders',
  QUOTE_ORDER_QTY = 'quoteOrderQty',
}

/**
 * General API parameter names.
 * @enum {string}
 */
export enum ApiParams {
  PAIR = 'pair',
  COUNTDOWN_TIME = 'countdownTime',
  LISTEN_KEY = 'listenKey',
  LEVERAGE = 'leverage',
  MARGIN_TYPE = 'marginType',
  AMOUNT = 'amount',
  ASSET = 'asset',
  TYPE = 'type',
  STP_MODE = 'stpMode',
  ORDER_ID = 'orderId',
  ORIG_CLIENT_ORDER_ID = 'origClientOrderId',
  WINDOW_TIME_IN_MILLISECONDS = 'windowTimeInMilliseconds',
  FROZEN_TIME_IN_MILLISECONDS = 'frozenTimeInMilliseconds',
  STRATEGY_TYPE = 'strategyType',
  SUB_ORDER_LIST = 'subOrderList',
  STRATEGY_ID = 'strategyId',
  CLIENT_STRATEGY_ID = 'clientStrategyId',
  PAGE = 'page',
  SIZE = 'size',
  ID = 'id',
  BATCH_ID = 'batchId',
}

/**
 * The limits for batch orders.
 * @enum {number}
 */
export enum BatchOrderLimits {
  MAX_ORDERS = 5,
}

/**
 * The types of asset transfers.
 * @enum {number}
 */
export enum TransferType {
  SPOT_TO_FUTURES = 1,
  FUTURES_TO_SPOT = 2,
}

/**
 * Common error messages.
 * @enum {string}
 */
export enum ErrorMessages {
  WEB3_AUTH_NOT_CONFIGURED = 'Web3 authentication not configured. Please provide user address, signer address, and private key.',
  WEBSOCKET_NOT_CONNECTED = 'WebSocket is not connected',
  BATCH_ORDERS_REQUIRED = 'batchOrders must be a non-empty array',
  MAX_BATCH_ORDERS_EXCEEDED = 'Maximum 5 orders per batch',
  ORDER_ID_OR_CLIENT_ID_REQUIRED = 'Either orderId or origClientOrderId must be provided',
  ORDER_LIST_REQUIRED = 'Either orderIdList or origClientOrderIdList must be provided',
  STRATEGY_ID_OR_CLIENT_ID_REQUIRED = 'Either strategyId or clientStrategyId must be provided',
  STRATEGY_ID_AND_CLIENT_ID_MUTUALLY_EXCLUSIVE = 'strategyId and clientStrategyId are mutually exclusive',
}

/**
 * Arrays of required parameters for different API endpoints.
 * @constant {object}
 */
export const ValidationParams = {
  ASSET_TRANSFER: ['amount', 'asset', 'clientTranId', 'kindType'],
  SEND_TO_ADDRESS: ['amount', 'asset', 'toAddress'],
  CHAIN_ASSET: ['chainId', 'asset'],
  WITHDRAW: ['chainId', 'asset', 'amount', 'fee', 'receiver', 'nonce', 'userSignature'],
  ADDRESS_USER_OP: ['address', 'userOperationType'],
  CREATE_API_KEY: ['address', 'userOperationType', 'userSignature', 'desc'],
};

/**
 * The different types of API authentication.
 * @constant {object}
 */
export const ApiAuthTypes = {
  NONE: 'NONE' as const,
  MARKET_DATA: 'MARKET_DATA' as const,
  TRADE: 'TRADE' as const,
  USER_DATA: 'USER_DATA' as const,
  USER_STREAM: 'USER_STREAM' as const,
  SIGNED: 'SIGNED' as const,
} as const;

/**
 * @file The REST API client for AsterDEX Futures trading.
 * @author methodnumber13
 * @version 1.0.0
 * @license MIT
 */

import { Config } from '@/config/config';
import { BaseRestClient } from './base';
import { FuturesAuthManager } from '@/auth/web3signature';
import { ErrorFactory } from '@/errors/errors';
import type { HttpMethod } from '@/types/common';
import type {
  FuturesExchangeInfo,
  FuturesOrderBook,
  FuturesTrade,
  FuturesAggTrade,
  FuturesMarkPrice,
  FuturesFundingRate,
  Futures24hrTicker,
  FuturesNewOrderParams,
  FuturesOrderResponse,
  FuturesBalance,
  FuturesAccount,
  FuturesPositionRisk,
  FuturesUserTrade,
  FuturesIncome,
  FuturesLeverageBracket,
  FuturesADLQuantile,
  FuturesForceOrder,
  FuturesCommissionRate,
  FuturesTransferParams,
  FuturesTransferResponse,
  FuturesPositionMode,
  FuturesMultiAssetsMode,
  FuturesListenKeyResponse,
  FuturesBatchOrderParams,
  FuturesCountdownCancelParams,
  FuturesCountdownCancelResponse,
  FuturesLeverageParams,
  FuturesLeverageResponse,
  FuturesMarginTypeParams,
  FuturesPositionMarginParams,
  FuturesPositionMarginResponse,
  FuturesPositionMarginHistory,
  MarginType as _MarginType,
  PositionSide as _PositionSide,
  FuturesOrderType,
} from '@/types/futures';
import type { KlineInterval } from '@/types/common';
import type { Kline, PriceTicker, BookTicker } from '@/types/spot';
import type {
  TimeRangeOptions,
  TradeQueryOptions,
  KlineOptions,
  OrderQueryOptions,
  ForceOrderOptions,
  IncomeHistoryOptions,
  PositionMarginHistoryOptions,
  SymbolWithLimitParams,
  SymbolWithPaginationParams,
  OrderLookupParams,
  BatchOrderCancelParams,
  ApiSuccessResponse,
  ServerTimeResponse,
  EmptyResponse,
} from '@/types/futures-options';
import {
  FuturesEndpoints,
  OrderTypeValidation,
  OrderRequiredParams,
  BatchOrderLimits,
  ErrorMessages,
  ApiParams,
  ValidationParams,
} from '@/constants/futures';
import { HttpMethods } from '@/constants/http';

/**
 * A client for interacting with the AsterDEX Futures REST API.
 * @class FuturesClient
 * @extends {BaseRestClient}
 */
export class FuturesClient extends BaseRestClient {
  private web3AuthManager?: FuturesAuthManager;

  /**
   * Creates an instance of the FuturesClient.
   * @param {Config} config - The configuration object for the client.
   * @param {string} [userAddress] - The user's main account wallet address for Web3 authentication.
   * @param {string} [signerAddress] - The user's API wallet address for Web3 authentication.
   * @param {string} [privateKey] - The private key for signing Web3 transactions.
   */
  constructor(config: Config, userAddress?: string, signerAddress?: string, privateKey?: string) {
    super(config, config.getBaseUrl('futures'));
    if (userAddress && signerAddress && privateKey) {
      this.web3AuthManager = new FuturesAuthManager(userAddress, signerAddress, privateKey);
    }
  }

  /**
   * Pings the Futures API to test connectivity.
   * @param {string} [url=FuturesEndpoints.PING] - The endpoint to use for the ping.
   * @returns {Promise<EmptyResponse>} A promise that resolves with an empty object if the ping is successful.
   */
  public override async ping(url: string = FuturesEndpoints.PING): Promise<EmptyResponse> {
    return this.publicRequest(HttpMethods.GET, url);
  }

  /**
   * Gets the current server time from the Futures API.
   * @param {string} [url=FuturesEndpoints.SERVER_TIME] - The endpoint to use for fetching the server time.
   * @returns {Promise<ServerTimeResponse>} A promise that resolves with the server time.
   */
  public override async getServerTime(
    url: string = FuturesEndpoints.SERVER_TIME,
  ): Promise<ServerTimeResponse> {
    return this.publicRequest(HttpMethods.GET, url);
  }

  /**
   * Gets the exchange trading rules and symbol information.
   * @returns {Promise<FuturesExchangeInfo>} A promise that resolves with the exchange information.
   */
  public async getExchangeInfo(): Promise<FuturesExchangeInfo> {
    return this.publicRequest(HttpMethods.GET, FuturesEndpoints.EXCHANGE_INFO);
  }

  /**
   * Gets the order book for a given symbol.
   * @param {string} symbol - The trading symbol.
   * @param {number} [limit] - The number of orders to retrieve.
   * @returns {Promise<FuturesOrderBook>} A promise that resolves with the order book data.
   */
  public async getOrderBook(symbol: string, limit?: number): Promise<FuturesOrderBook> {
    this.validateRequired({ symbol }, [OrderRequiredParams.SYMBOL]);
    const params: SymbolWithLimitParams = { symbol };
    if (limit !== undefined) {
      params.limit = limit;
    }
    return this.publicRequest(HttpMethods.GET, FuturesEndpoints.ORDER_BOOK, params);
  }

  /**
   * Gets a list of recent trades for a given symbol.
   * @param {string} symbol - The trading symbol.
   * @param {number} [limit] - The number of trades to retrieve.
   * @returns {Promise<FuturesTrade[]>} A promise that resolves with the list of recent trades.
   */
  public async getRecentTrades(symbol: string, limit?: number): Promise<FuturesTrade[]> {
    this.validateRequired({ symbol }, [OrderRequiredParams.SYMBOL]);
    const params: SymbolWithLimitParams = { symbol };
    if (limit !== undefined) {
      params.limit = limit;
    }
    return this.publicRequest(HttpMethods.GET, FuturesEndpoints.RECENT_TRADES, params);
  }

  /**
   * Gets a list of historical trades for a given symbol.
   * @param {string} symbol - The trading symbol.
   * @param {number} [limit] - The number of trades to retrieve.
   * @param {number} [fromId] - The ID of the first trade to fetch.
   * @returns {Promise<FuturesTrade[]>} A promise that resolves with the list of historical trades.
   */
  public async getHistoricalTrades(
    symbol: string,
    limit?: number,
    fromId?: number,
  ): Promise<FuturesTrade[]> {
    this.validateRequired({ symbol }, [OrderRequiredParams.SYMBOL]);
    const params: SymbolWithPaginationParams = { symbol };
    if (limit !== undefined) {
      params.limit = limit;
    }
    if (fromId !== undefined) {
      params.fromId = fromId;
    }
    return this.publicRequest(HttpMethods.GET, FuturesEndpoints.HISTORICAL_TRADES, params);
  }

  /**
   * Gets a list of aggregated trades for a given symbol.
   * @param {string} symbol - The trading symbol.
   * @param {TradeQueryOptions} [options] - Additional options for the query.
   * @returns {Promise<FuturesAggTrade[]>} A promise that resolves with the list of aggregated trades.
   */
  public async getAggregatedTrades(
    symbol: string,
    options?: TradeQueryOptions,
  ): Promise<FuturesAggTrade[]> {
    this.validateRequired({ symbol }, [OrderRequiredParams.SYMBOL]);
    const params = { symbol, ...options };
    return this.publicRequest(HttpMethods.GET, FuturesEndpoints.AGG_TRADES, params);
  }

  /**
   * Gets Kline/candlestick data for a given symbol and interval.
   * @param {string} symbol - The trading symbol.
   * @param {KlineInterval} interval - The Kline interval.
   * @param {KlineOptions} [options] - Additional options for the query.
   * @returns {Promise<Kline[]>} A promise that resolves with the Kline data.
   */
  public async getKlines(
    symbol: string,
    interval: KlineInterval,
    options?: KlineOptions,
  ): Promise<Kline[]> {
    this.validateRequired({ symbol, interval }, [
      OrderRequiredParams.SYMBOL,
      OrderRequiredParams.INTERVAL,
    ]);
    const params = { symbol, interval, ...options };
    return this.publicRequest(HttpMethods.GET, FuturesEndpoints.KLINES, params);
  }

  /**
   * Gets index price Kline/candlestick data for a given pair and interval.
   * @param {string} pair - The trading pair.
   * @param {KlineInterval} interval - The Kline interval.
   * @param {KlineOptions} [options] - Additional options for the query.
   * @returns {Promise<Kline[]>} A promise that resolves with the index price Kline data.
   */
  public async getIndexPriceKlines(
    pair: string,
    interval: KlineInterval,
    options?: KlineOptions,
  ): Promise<Kline[]> {
    this.validateRequired({ pair, interval }, [ApiParams.PAIR, OrderRequiredParams.INTERVAL]);
    const params = { pair, interval, ...options };
    return this.publicRequest(HttpMethods.GET, FuturesEndpoints.INDEX_PRICE_KLINES, params);
  }

  /**
   * Gets mark price Kline/candlestick data for a given symbol and interval.
   * @param {string} symbol - The trading symbol.
   * @param {KlineInterval} interval - The Kline interval.
   * @param {KlineOptions} [options] - Additional options for the query.
   * @returns {Promise<Kline[]>} A promise that resolves with the mark price Kline data.
   */
  public async getMarkPriceKlines(
    symbol: string,
    interval: KlineInterval,
    options?: KlineOptions,
  ): Promise<Kline[]> {
    this.validateRequired({ symbol, interval }, [
      OrderRequiredParams.SYMBOL,
      OrderRequiredParams.INTERVAL,
    ]);
    const params = { symbol, interval, ...options };
    return this.publicRequest(HttpMethods.GET, FuturesEndpoints.MARK_PRICE_KLINES, params);
  }

  /**
   * Gets the mark price and funding rate for a symbol or all symbols.
   * @param {string} [symbol] - The trading symbol. If not provided, returns data for all symbols.
   * @returns {Promise<FuturesMarkPrice | FuturesMarkPrice[]>} A promise that resolves with the mark price data.
   */
  public async getMarkPrice(symbol?: string): Promise<FuturesMarkPrice | FuturesMarkPrice[]> {
    const params = symbol ? { symbol } : {};
    return this.publicRequest(HttpMethods.GET, FuturesEndpoints.PREMIUM_INDEX, params);
  }

  /**
   * Gets the funding rate history for a symbol.
   * @param {string} [symbol] - The trading symbol.
   * @param {TimeRangeOptions} [options] - Additional options for the query.
   * @returns {Promise<FuturesFundingRate[]>} A promise that resolves with the funding rate history.
   */
  public async getFundingRate(
    symbol?: string,
    options?: TimeRangeOptions,
  ): Promise<FuturesFundingRate[]> {
    const params = { symbol, ...options };
    return this.publicRequest(HttpMethods.GET, FuturesEndpoints.FUNDING_RATE, params);
  }

  /**
   * Gets 24-hour ticker price change statistics for a symbol or all symbols.
   * @param {string} [symbol] - The trading symbol. If not provided, returns data for all symbols.
   * @returns {Promise<Futures24hrTicker | Futures24hrTicker[]>} A promise that resolves with the ticker data.
   */
  public async get24hrTicker(symbol?: string): Promise<Futures24hrTicker | Futures24hrTicker[]> {
    const params = symbol ? { symbol } : {};
    return this.publicRequest(HttpMethods.GET, FuturesEndpoints.TICKER_24HR, params);
  }

  /**
   * Gets the latest price for a symbol or all symbols.
   * @param {string} [symbol] - The trading symbol. If not provided, returns data for all symbols.
   * @returns {Promise<PriceTicker | PriceTicker[]>} A promise that resolves with the price ticker data.
   */
  public async getPrice(symbol?: string): Promise<PriceTicker | PriceTicker[]> {
    const params = symbol ? { symbol } : {};
    return this.publicRequest(HttpMethods.GET, FuturesEndpoints.TICKER_PRICE, params);
  }

  /**
   * Gets the best price/quantity on the order book for a symbol or all symbols.
   * @param {string} [symbol] - The trading symbol. If not provided, returns data for all symbols.
   * @returns {Promise<BookTicker | BookTicker[]>} A promise that resolves with the book ticker data.
   */
  public async getBookTicker(symbol?: string): Promise<BookTicker | BookTicker[]> {
    const params = symbol ? { symbol } : {};
    return this.publicRequest(HttpMethods.GET, FuturesEndpoints.BOOK_TICKER, params);
  }

  /**
   * Changes the position mode (Hedge Mode or One-way Mode).
   * @param {boolean} dualSidePosition - `true` for Hedge Mode, `false` for One-way Mode.
   * @returns {Promise<ApiSuccessResponse>} A promise that resolves with a success response.
   */
  public async changePositionMode(dualSidePosition: boolean): Promise<ApiSuccessResponse> {
    const params = { dualSidePosition };
    return this.signedRequest(HttpMethods.POST, FuturesEndpoints.POSITION_MODE, params);
  }

  /**
   * Gets the current position mode.
   * @returns {Promise<FuturesPositionMode>} A promise that resolves with the current position mode.
   */
  public async getPositionMode(): Promise<FuturesPositionMode> {
    return this.signedRequest(HttpMethods.GET, FuturesEndpoints.POSITION_MODE);
  }

  /**
   * Changes the multi-assets mode.
   * @param {boolean} multiAssetsMargin - `true` to enable multi-assets mode, `false` to disable it.
   * @returns {Promise<ApiSuccessResponse>} A promise that resolves with a success response.
   */
  public async changeMultiAssetsMode(multiAssetsMargin: boolean): Promise<ApiSuccessResponse> {
    const params = { multiAssetsMargin };
    return this.signedRequest(HttpMethods.POST, FuturesEndpoints.MULTI_ASSETS_MARGIN, params);
  }

  /**
   * Gets the current multi-assets mode.
   * @returns {Promise<FuturesMultiAssetsMode>} A promise that resolves with the current multi-assets mode.
   */
  public async getMultiAssetsMode(): Promise<FuturesMultiAssetsMode> {
    return this.signedRequest(HttpMethods.GET, FuturesEndpoints.MULTI_ASSETS_MARGIN);
  }

  /**
   * Places a new futures order.
   * @param {FuturesNewOrderParams} params - The parameters for the new order.
   * @returns {Promise<FuturesOrderResponse>} A promise that resolves with the order response.
   * @throws {ValidationError} If the required parameters are missing for the given order type.
   */
  public async newOrder(params: FuturesNewOrderParams): Promise<FuturesOrderResponse> {
    this.validateRequired(params, [
      OrderRequiredParams.SYMBOL,
      OrderRequiredParams.SIDE,
      OrderRequiredParams.TYPE,
    ]);

    if (params.type === (OrderTypeValidation.LIMIT as FuturesOrderType)) {
      this.validateRequired(params, [
        OrderRequiredParams.TIME_IN_FORCE,
        OrderRequiredParams.QUANTITY,
        OrderRequiredParams.PRICE,
      ]);
    } else if (params.type === (OrderTypeValidation.MARKET as FuturesOrderType)) {
      this.validateRequired(params, [OrderRequiredParams.QUANTITY]);
    } else if (
      params.type === (OrderTypeValidation.STOP as FuturesOrderType) ||
      params.type === (OrderTypeValidation.TAKE_PROFIT as FuturesOrderType)
    ) {
      this.validateRequired(params, [
        OrderRequiredParams.QUANTITY,
        OrderRequiredParams.PRICE,
        OrderRequiredParams.STOP_PRICE,
      ]);
    } else if (
      params.type === (OrderTypeValidation.STOP_MARKET as FuturesOrderType) ||
      params.type === (OrderTypeValidation.TAKE_PROFIT_MARKET as FuturesOrderType)
    ) {
      this.validateRequired(params, [OrderRequiredParams.STOP_PRICE]);
      if (!params.closePosition) {
        this.validateRequired(params, [OrderRequiredParams.QUANTITY]);
      }
    } else if (params.type === (OrderTypeValidation.TRAILING_STOP_MARKET as FuturesOrderType)) {
      this.validateRequired(params, [OrderRequiredParams.CALLBACK_RATE]);
      if (!params.closePosition) {
        this.validateRequired(params, [OrderRequiredParams.QUANTITY]);
      }
    }

    return this.web3SignedRequest(HttpMethods.POST, FuturesEndpoints.ORDER, params);
  }

  /**
   * Places multiple orders in a batch.
   * @param {FuturesBatchOrderParams} params - The parameters for the batch order.
   * @returns {Promise<FuturesOrderResponse[]>} A promise that resolves with a list of order responses.
   * @throws {ValidationError} If the batchOrders array is invalid or exceeds the maximum limit.
   */
  public async newBatchOrders(params: FuturesBatchOrderParams): Promise<FuturesOrderResponse[]> {
    this.validateRequired(params, [OrderRequiredParams.BATCH_ORDERS]);

    if (!Array.isArray(params.batchOrders) || params.batchOrders.length === 0) {
      throw ErrorFactory.validationError(ErrorMessages.BATCH_ORDERS_REQUIRED);
    }

    if (params.batchOrders.length > Number(BatchOrderLimits.MAX_ORDERS)) {
      throw ErrorFactory.validationError(ErrorMessages.MAX_BATCH_ORDERS_EXCEEDED);
    }

    return this.web3SignedRequest(HttpMethods.POST, FuturesEndpoints.BATCH_ORDERS, params);
  }

  /**
   * Transfers assets between the futures and spot accounts.
   * @param {FuturesTransferParams} params - The parameters for the asset transfer.
   * @returns {Promise<FuturesTransferResponse>} A promise that resolves with the transfer response.
   */
  public async transferAsset(params: FuturesTransferParams): Promise<FuturesTransferResponse> {
    this.validateRequired(params, ValidationParams.ASSET_TRANSFER);
    return this.web3SignedRequest(HttpMethods.POST, FuturesEndpoints.TRANSFER, params);
  }

  /**
   * Queries the status of an order.
   * @param {string} symbol - The trading symbol.
   * @param {number} [orderId] - The order ID.
   * @param {string} [origClientOrderId] - The original client order ID.
   * @returns {Promise<FuturesOrderResponse>} A promise that resolves with the order data.
   * @throws {ValidationError} If neither orderId nor origClientOrderId is provided.
   */
  public async getOrder(
    symbol: string,
    orderId?: number,
    origClientOrderId?: string,
  ): Promise<FuturesOrderResponse> {
    this.validateRequired({ symbol }, [OrderRequiredParams.SYMBOL]);

    if (!orderId && !origClientOrderId) {
      throw ErrorFactory.validationError(ErrorMessages.ORDER_ID_OR_CLIENT_ID_REQUIRED);
    }

    const params: OrderLookupParams = { symbol };
    if (orderId !== undefined) {
      params.orderId = orderId;
    }
    if (origClientOrderId !== undefined) {
      params.origClientOrderId = origClientOrderId;
    }

    return this.signedRequest(HttpMethods.GET, FuturesEndpoints.ORDER, params);
  }

  /**
   * Cancels an active order.
   * @param {string} symbol - The trading symbol.
   * @param {number} [orderId] - The order ID.
   * @param {string} [origClientOrderId] - The original client order ID.
   * @returns {Promise<FuturesOrderResponse>} A promise that resolves with the cancelled order data.
   * @throws {ValidationError} If neither orderId nor origClientOrderId is provided.
   */
  public async cancelOrder(
    symbol: string,
    orderId?: number,
    origClientOrderId?: string,
  ): Promise<FuturesOrderResponse> {
    this.validateRequired({ symbol }, [OrderRequiredParams.SYMBOL]);

    if (!orderId && !origClientOrderId) {
      throw ErrorFactory.validationError(ErrorMessages.ORDER_ID_OR_CLIENT_ID_REQUIRED);
    }

    const params: OrderLookupParams = { symbol };
    if (orderId !== undefined) {
      params.orderId = orderId;
    }
    if (origClientOrderId !== undefined) {
      params.origClientOrderId = origClientOrderId;
    }

    return this.signedRequest(HttpMethods.DELETE, FuturesEndpoints.ORDER, params);
  }

  /**
   * Cancels all open orders for a symbol.
   * @param {string} symbol - The trading symbol.
   * @returns {Promise<ApiSuccessResponse>} A promise that resolves with a success response.
   */
  public async cancelAllOpenOrders(symbol: string): Promise<ApiSuccessResponse> {
    this.validateRequired({ symbol }, [OrderRequiredParams.SYMBOL]);
    return this.signedRequest(HttpMethods.DELETE, FuturesEndpoints.ALL_OPEN_ORDERS, {
      symbol,
    });
  }

  /**
   * Cancels multiple orders in a batch.
   * @param {string} symbol - The trading symbol.
   * @param {number[]} [orderIdList] - A list of order IDs to cancel.
   * @param {string[]} [origClientOrderIdList] - A list of original client order IDs to cancel.
   * @returns {Promise<FuturesOrderResponse[]>} A promise that resolves with a list of cancelled order data.
   * @throws {ValidationError} If neither orderIdList nor origClientOrderIdList is provided.
   */
  public async cancelBatchOrders(
    symbol: string,
    orderIdList?: number[],
    origClientOrderIdList?: string[],
  ): Promise<FuturesOrderResponse[]> {
    this.validateRequired({ symbol }, [OrderRequiredParams.SYMBOL]);

    if (!orderIdList && !origClientOrderIdList) {
      throw ErrorFactory.validationError(ErrorMessages.ORDER_LIST_REQUIRED);
    }

    const params: BatchOrderCancelParams = { symbol };
    if (orderIdList) {
      params.orderIdList = JSON.stringify(orderIdList);
    }
    if (origClientOrderIdList) {
      params.origClientOrderIdList = JSON.stringify(origClientOrderIdList);
    }

    return this.signedRequest(HttpMethods.DELETE, FuturesEndpoints.BATCH_ORDERS, params);
  }

  /**
   * Sets a countdown timer to automatically cancel all open orders for a symbol.
   * @param {FuturesCountdownCancelParams} params - The parameters for the countdown cancel.
   * @returns {Promise<FuturesCountdownCancelResponse>} A promise that resolves with the countdown cancel response.
   */
  public async countdownCancelAll(
    params: FuturesCountdownCancelParams,
  ): Promise<FuturesCountdownCancelResponse> {
    this.validateRequired(params, [OrderRequiredParams.SYMBOL, ApiParams.COUNTDOWN_TIME]);
    return this.signedRequest(HttpMethods.POST, FuturesEndpoints.COUNTDOWN_CANCEL_ALL, params);
  }

  /**
   * Queries a currently open order.
   * @param {string} symbol - The trading symbol.
   * @param {number} [orderId] - The order ID.
   * @param {string} [origClientOrderId] - The original client order ID.
   * @returns {Promise<FuturesOrderResponse>} A promise that resolves with the open order data.
   * @throws {ValidationError} If neither orderId nor origClientOrderId is provided.
   */
  public async getCurrentOpenOrder(
    symbol: string,
    orderId?: number,
    origClientOrderId?: string,
  ): Promise<FuturesOrderResponse> {
    this.validateRequired({ symbol }, [OrderRequiredParams.SYMBOL]);

    if (!orderId && !origClientOrderId) {
      throw ErrorFactory.validationError(ErrorMessages.ORDER_ID_OR_CLIENT_ID_REQUIRED);
    }

    const params: OrderLookupParams = { symbol };
    if (orderId !== undefined) {
      params.orderId = orderId;
    }
    if (origClientOrderId !== undefined) {
      params.origClientOrderId = origClientOrderId;
    }

    return this.signedRequest(HttpMethods.GET, FuturesEndpoints.OPEN_ORDER, params);
  }

  /**
   * Gets all open orders for a symbol or for the entire account.
   * @param {string} [symbol] - The trading symbol. If not provided, returns all open orders.
   * @returns {Promise<FuturesOrderResponse[]>} A promise that resolves with a list of open orders.
   */
  public async getOpenOrders(symbol?: string): Promise<FuturesOrderResponse[]> {
    const params = symbol ? { symbol } : {};
    return this.web3SignedRequest(HttpMethods.GET, FuturesEndpoints.OPEN_ORDERS, params);
  }

  /**
   * Gets all orders for a symbol.
   * @param {string} symbol - The trading symbol.
   * @param {OrderQueryOptions} [options] - Additional options for the query.
   * @returns {Promise<FuturesOrderResponse[]>} A promise that resolves with a list of all orders.
   */
  public async getAllOrders(
    symbol: string,
    options?: OrderQueryOptions,
  ): Promise<FuturesOrderResponse[]> {
    this.validateRequired({ symbol }, [OrderRequiredParams.SYMBOL]);
    const params = { symbol, ...options };
    return this.signedRequest(HttpMethods.GET, FuturesEndpoints.ALL_ORDERS, params);
  }

  /**
   * Gets the futures account balance.
   * @returns {Promise<FuturesBalance[]>} A promise that resolves with the account balance.
   */
  public async getBalance(): Promise<FuturesBalance[]> {
    return this.web3SignedRequest(HttpMethods.GET, FuturesEndpoints.BALANCE, {});
  }

  /**
   * Gets account information.
   * @returns {Promise<FuturesAccount>} A promise that resolves with the account information.
   */
  public async getAccount(): Promise<FuturesAccount> {
    return this.web3SignedRequest(HttpMethods.GET, FuturesEndpoints.ACCOUNT, {});
  }

  /**
   * Changes the initial leverage for a symbol.
   * @param {FuturesLeverageParams} params - The parameters for changing the leverage.
   * @returns {Promise<FuturesLeverageResponse>} A promise that resolves with the leverage response.
   */
  public async changeLeverage(params: FuturesLeverageParams): Promise<FuturesLeverageResponse> {
    this.validateRequired(params, [OrderRequiredParams.SYMBOL, ApiParams.LEVERAGE]);
    return this.web3SignedRequest(HttpMethods.POST, FuturesEndpoints.LEVERAGE, params);
  }

  /**
   * Changes the margin type for a symbol.
   * @param {FuturesMarginTypeParams} params - The parameters for changing the margin type.
   * @returns {Promise<ApiSuccessResponse>} A promise that resolves with a success response.
   */
  public async changeMarginType(params: FuturesMarginTypeParams): Promise<ApiSuccessResponse> {
    this.validateRequired(params, [OrderRequiredParams.SYMBOL, ApiParams.MARGIN_TYPE]);
    return this.web3SignedRequest(HttpMethods.POST, FuturesEndpoints.MARGIN_TYPE, params);
  }

  /**
   * Modifies the margin for an isolated position.
   * @param {FuturesPositionMarginParams} params - The parameters for modifying the position margin.
   * @returns {Promise<FuturesPositionMarginResponse>} A promise that resolves with the position margin response.
   */
  public async modifyPositionMargin(
    params: FuturesPositionMarginParams,
  ): Promise<FuturesPositionMarginResponse> {
    this.validateRequired(params, [OrderRequiredParams.SYMBOL, ApiParams.AMOUNT, ApiParams.TYPE]);
    return this.signedRequest(HttpMethods.POST, FuturesEndpoints.POSITION_MARGIN, params);
  }

  /**
   * Gets the position margin change history for a symbol.
   * @param {string} symbol - The trading symbol.
   * @param {PositionMarginHistoryOptions} [options] - Additional options for the query.
   * @returns {Promise<FuturesPositionMarginHistory[]>} A promise that resolves with the position margin history.
   */
  public async getPositionMarginHistory(
    symbol: string,
    options?: PositionMarginHistoryOptions,
  ): Promise<FuturesPositionMarginHistory[]> {
    this.validateRequired({ symbol }, [OrderRequiredParams.SYMBOL]);
    const params = { symbol, ...options };
    return this.signedRequest(HttpMethods.GET, FuturesEndpoints.POSITION_MARGIN_HISTORY, params);
  }

  /**
   * Gets position information.
   * @param {string} [symbol] - The trading symbol. If not provided, returns information for all positions.
   * @returns {Promise<FuturesPositionRisk[]>} A promise that resolves with the position risk data.
   */
  public async getPositionRisk(symbol?: string): Promise<FuturesPositionRisk[]> {
    const params = symbol ? { symbol } : {};
    return this.web3SignedRequest(HttpMethods.GET, FuturesEndpoints.POSITION_RISK, params);
  }

  /**
   * Gets the account's trade list for a symbol.
   * @param {string} symbol - The trading symbol.
   * @param {TradeQueryOptions} [options] - Additional options for the query.
   * @returns {Promise<FuturesUserTrade[]>} A promise that resolves with the user's trade list.
   */
  public async getUserTrades(
    symbol: string,
    options?: TradeQueryOptions,
  ): Promise<FuturesUserTrade[]> {
    this.validateRequired({ symbol }, [OrderRequiredParams.SYMBOL]);
    const params = { symbol, ...options };
    return this.signedRequest(HttpMethods.GET, FuturesEndpoints.USER_TRADES, params);
  }

  /**
   * Gets the income history for the account.
   * @param {IncomeHistoryOptions} [options] - Additional options for the query.
   * @returns {Promise<FuturesIncome[]>} A promise that resolves with the income history.
   */
  public async getIncomeHistory(options?: IncomeHistoryOptions): Promise<FuturesIncome[]> {
    return this.web3SignedRequest(HttpMethods.GET, FuturesEndpoints.INCOME, options ?? {});
  }

  /**
   * Gets the notional and leverage brackets for a symbol.
   * @param {string} [symbol] - The trading symbol.
   * @returns {Promise<FuturesLeverageBracket[]>} A promise that resolves with the leverage bracket data.
   */
  public async getLeverageBracket(symbol?: string): Promise<FuturesLeverageBracket[]> {
    const params = symbol ? { symbol } : {};
    return this.web3SignedRequest(HttpMethods.GET, FuturesEndpoints.LEVERAGE_BRACKET, params);
  }

  /**
   * Gets the position ADL quantile estimation.
   * @param {string} [symbol] - The trading symbol.
   * @returns {Promise<FuturesADLQuantile[]>} A promise that resolves with the ADL quantile data.
   */
  public async getADLQuantile(symbol?: string): Promise<FuturesADLQuantile[]> {
    const params = symbol ? { symbol } : {};
    return this.web3SignedRequest(HttpMethods.GET, FuturesEndpoints.ADL_QUANTILE, params);
  }

  /**
   * Gets the user's force orders.
   * @param {ForceOrderOptions} [options] - Additional options for the query.
   * @returns {Promise<FuturesForceOrder[]>} A promise that resolves with the force order data.
   */
  public async getForceOrders(options?: ForceOrderOptions): Promise<FuturesForceOrder[]> {
    return this.web3SignedRequest(HttpMethods.GET, FuturesEndpoints.FORCE_ORDERS, options ?? {});
  }

  /**
   * Gets the user's commission rate for a symbol.
   * @param {string} symbol - The trading symbol.
   * @returns {Promise<FuturesCommissionRate>} A promise that resolves with the commission rate data.
   */
  public async getCommissionRate(symbol: string): Promise<FuturesCommissionRate> {
    this.validateRequired({ symbol }, [OrderRequiredParams.SYMBOL]);
    return this.web3SignedRequest(HttpMethods.GET, FuturesEndpoints.COMMISSION_RATE, {
      symbol,
    });
  }

  /**
   * Starts a new user data stream.
   * @returns {Promise<FuturesListenKeyResponse>} A promise that resolves with the listen key for the user data stream.
   */
  public async startUserDataStream(): Promise<FuturesListenKeyResponse> {
    return this.web3SignedRequest(HttpMethods.POST, FuturesEndpoints.LISTEN_KEY);
  }

  /**
   * Pings a user data stream to keep it alive.
   * @param {string} listenKey - The listen key for the user data stream.
   * @returns {Promise<EmptyResponse>} A promise that resolves with an empty object if the ping is successful.
   */
  public async keepAliveUserDataStream(listenKey: string): Promise<EmptyResponse> {
    this.validateRequired({ listenKey }, [ApiParams.LISTEN_KEY]);
    return this.web3SignedRequest(HttpMethods.PUT, FuturesEndpoints.LISTEN_KEY, {
      listenKey,
    });
  }

  /**
   * Closes a user data stream.
   * @param {string} listenKey - The listen key for the user data stream.
   * @returns {Promise<EmptyResponse>} A promise that resolves with an empty object if the stream is closed successfully.
   */
  public async closeUserDataStream(listenKey: string): Promise<EmptyResponse> {
    this.validateRequired({ listenKey }, [ApiParams.LISTEN_KEY]);
    return this.web3SignedRequest(HttpMethods.DELETE, FuturesEndpoints.LISTEN_KEY, {
      listenKey,
    });
  }

  /**
   * Makes a Web3-signed request to the Futures API.
   * @private
   * @template T
   * @param {HttpMethod} method - The HTTP method for the request.
   * @param {string} endpoint - The API endpoint to call.
   * @param {Record<string, any>} [params] - The parameters for the request.
   * @returns {Promise<T>} A promise that resolves with the response data.
   * @throws {AuthError} If Web3 authentication is not configured.
   */
  private async web3SignedRequest<T = any>(
    method: HttpMethod,
    endpoint: string,
    params?: Record<string, any>,
  ): Promise<T> {
    if (!this.web3AuthManager?.hasWeb3Auth()) {
      throw ErrorFactory.authError('Web3 authentication not configured for this Futures endpoint');
    }

    const cleanedParams = this.cleanParams(params ?? {});
    const signedParams = await this.web3AuthManager.signRequest(cleanedParams);
    const headers = this.web3AuthManager.createHeaders();
    const url = `${this.baseUrl}${endpoint}`;
    const isPostOrPut = method === HttpMethods.POST || method === HttpMethods.PUT;

    if (isPostOrPut) {
      const formBody = new URLSearchParams();
      Object.entries(signedParams).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          formBody.append(key, String(value));
        }
      });

      const response = await this.httpClient.request<T>({
        method,
        url,
        data: formBody.toString(),
        headers: {
          ...headers,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
      return response.data;
    } else {
      const response = await this.httpClient.request<T>({
        method,
        url,
        params: signedParams,
        headers,
      });
      return response.data;
    }
  }

  /**
   * Removes null and undefined values from a parameter object.
   * @private
   * @param {Record<string, any>} params - The parameters to clean.
   * @returns {Record<string, any>} The cleaned parameters object.
   */
  private cleanParams(params: Record<string, any>): Record<string, any> {
    return Object.fromEntries(
      Object.entries(params).filter(([, value]) => value !== null && value !== undefined),
    );
  }

  /**
   * Updates the Web3 authentication credentials.
   * @param {string} userAddress - The new user address.
   * @param {string} signerAddress - The new signer address.
   * @param {string} privateKey - The new private key.
   */
  public updateWeb3Credentials(
    userAddress: string,
    signerAddress: string,
    privateKey: string,
  ): void {
    if (!this.web3AuthManager) {
      this.web3AuthManager = new FuturesAuthManager(userAddress, signerAddress, privateKey);
    } else {
      this.web3AuthManager.updateCredentials(userAddress, signerAddress, privateKey);
    }
  }

  /**
   * Checks if the client has Web3 authentication credentials configured.
   * @returns {boolean} `true` if Web3 authentication is configured, `false` otherwise.
   */
  public hasAuthentication(): boolean {
    return !!this.web3AuthManager?.hasWeb3Auth();
  }

  /**
   * Gets the user address if Web3 authentication is configured.
   * @returns {string | undefined} The user address, or `undefined` if not configured.
   */
  public getUserAddress(): string | undefined {
    return this.web3AuthManager?.getWeb3Auth().getUserAddress();
  }

  /**
   * Gets the signer address if Web3 authentication is configured.
   * @returns {string | undefined} The signer address, or `undefined` if not configured.
   */
  public getSignerAddress(): string | undefined {
    return this.web3AuthManager?.getWeb3Auth().getSignerAddress();
  }
}

/**
 * @file The REST API client for AsterDEX Spot trading.
 * @author methodnumber13
 * @version 1.0.0
 * @license MIT
 */

import { BaseRestClient } from './base';
import { Config } from '@/config/config';
import { API_VERSIONS } from '@/config/constants';
import { HttpMethods } from '@/constants/http';
import type {
  SymbolWithLimitParams,
  SymbolWithPaginationParams,
  TradeQueryOptions,
  KlineOptions,
  EmptyResponse,
  OrderLookupParams,
  BaseUserOperationParams,
} from '@/types/futures-options';
import {
  ApiParams,
  OrderRequiredParams,
  OrderTypeValidation,
  ErrorMessages,
  ValidationParams,
} from '@/constants/futures';
import type {
  SpotExchangeInfo,
  OrderBook,
  Trade,
  AggregatedTrade,
  Kline,
  Ticker24hr,
  PriceTicker,
  BookTicker,
  CommissionRate,
  NewOrderParams,
  OrderAck,
  Order,
  SpotAccount,
  UserTrade,
  AssetTransferParams,
  AssetTransferResponse,
  SendToAddressParams,
  WithdrawFee,
  WithdrawParams,
  WithdrawResponse,
  CreateApiKeyParams,
  ApiKeyResponse,
  ListenKeyResponse,
  KlineInterval,
  OrderResponseType as _OrderResponseType,
} from '@/types/spot';
import type { OrderType } from '@/types/common';

/**
 * A client for interacting with the AsterDEX Spot REST API.
 * @class SpotClient
 * @extends {BaseRestClient}
 */
export class SpotClient extends BaseRestClient {
  /**
   * Creates an instance of the SpotClient.
   * @param {Config} config - The configuration object for the client.
   */
  constructor(config: Config) {
    super(config, config.getBaseUrl('spot'));
  }

  /**
   * Gets the exchange trading rules and symbol information.
   * @returns {Promise<SpotExchangeInfo>} A promise that resolves with the exchange information.
   */
  public async getExchangeInfo(): Promise<SpotExchangeInfo> {
    return this.publicRequest(HttpMethods.GET, `${API_VERSIONS.spot.v1}/exchangeInfo`);
  }

  /**
   * Gets the order book for a given symbol.
   * @param {string} symbol - The trading symbol.
   * @param {number} [limit] - The number of orders to retrieve.
   * @returns {Promise<OrderBook>} A promise that resolves with the order book data.
   */
  public async getOrderBook(symbol: string, limit?: number): Promise<OrderBook> {
    this.validateRequired({ symbol }, [OrderRequiredParams.SYMBOL]);
    const params: SymbolWithLimitParams = { symbol };
    if (limit !== undefined) {
      params.limit = limit;
    }
    return this.publicRequest(HttpMethods.GET, `${API_VERSIONS.spot.v1}/depth`, params);
  }

  /**
   * Gets a list of recent trades for a given symbol.
   * @param {string} symbol - The trading symbol.
   * @param {number} [limit] - The number of trades to retrieve.
   * @returns {Promise<Trade[]>} A promise that resolves with the list of recent trades.
   */
  public async getRecentTrades(symbol: string, limit?: number): Promise<Trade[]> {
    this.validateRequired({ symbol }, [OrderRequiredParams.SYMBOL]);
    const params: SymbolWithLimitParams = { symbol };
    if (limit !== undefined) {
      params.limit = limit;
    }
    return this.publicRequest(HttpMethods.GET, `${API_VERSIONS.spot.v1}/trades`, params);
  }

  /**
   * Gets a list of historical trades for a given symbol.
   * @param {string} symbol - The trading symbol.
   * @param {number} [limit] - The number of trades to retrieve.
   * @param {number} [fromId] - The ID of the first trade to fetch.
   * @returns {Promise<Trade[]>} A promise that resolves with the list of historical trades.
   */
  public async getHistoricalTrades(
    symbol: string,
    limit?: number,
    fromId?: number,
  ): Promise<Trade[]> {
    this.validateRequired({ symbol }, [OrderRequiredParams.SYMBOL]);
    const params: SymbolWithPaginationParams = { symbol };
    if (limit !== undefined) {
      params.limit = limit;
    }
    if (fromId !== undefined) {
      params.fromId = fromId;
    }
    return this.keyRequest(HttpMethods.GET, `${API_VERSIONS.spot.v1}/historicalTrades`, params);
  }

  /**
   * Gets a list of aggregated trades for a given symbol.
   * @param {string} symbol - The trading symbol.
   * @param {TradeQueryOptions} [options] - Additional options for the query.
   * @returns {Promise<AggregatedTrade[]>} A promise that resolves with the list of aggregated trades.
   */
  public async getAggregatedTrades(
    symbol: string,
    options?: TradeQueryOptions,
  ): Promise<AggregatedTrade[]> {
    this.validateRequired({ symbol }, [OrderRequiredParams.SYMBOL]);
    const params = { symbol, ...options };
    return this.publicRequest(HttpMethods.GET, `${API_VERSIONS.spot.v1}/aggTrades`, params);
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
    const params = { symbol, interval, ...(options ?? {}) };
    return this.publicRequest(HttpMethods.GET, `${API_VERSIONS.spot.v1}/klines`, params);
  }

  /**
   * Gets 24-hour ticker price change statistics for a symbol or all symbols.
   * @param {string} [symbol] - The trading symbol. If not provided, returns data for all symbols.
   * @returns {Promise<Ticker24hr | Ticker24hr[]>} A promise that resolves with the ticker data.
   */
  public async get24hrTicker(symbol?: string): Promise<Ticker24hr | Ticker24hr[]> {
    const params = symbol ? { symbol } : {};
    return this.publicRequest(HttpMethods.GET, `${API_VERSIONS.spot.v1}/ticker/24hr`, params);
  }

  /**
   * Gets the latest price for a symbol or all symbols.
   * @param {string} [symbol] - The trading symbol. If not provided, returns data for all symbols.
   * @returns {Promise<PriceTicker | PriceTicker[]>} A promise that resolves with the price ticker data.
   */
  public async getPrice(symbol?: string): Promise<PriceTicker | PriceTicker[]> {
    const params = symbol ? { symbol } : {};
    return this.publicRequest(HttpMethods.GET, `${API_VERSIONS.spot.v1}/ticker/price`, params);
  }

  /**
   * Gets the best price/quantity on the order book for a symbol or all symbols.
   * @param {string} [symbol] - The trading symbol. If not provided, returns data for all symbols.
   * @returns {Promise<BookTicker | BookTicker[]>} A promise that resolves with the book ticker data.
   */
  public async getBookTicker(symbol?: string): Promise<BookTicker | BookTicker[]> {
    const params = symbol ? { symbol } : {};
    return this.publicRequest(HttpMethods.GET, `${API_VERSIONS.spot.v1}/ticker/bookTicker`, params);
  }

  /**
   * Gets the trading fees for a symbol.
   * @param {string} symbol - The trading symbol.
   * @returns {Promise<CommissionRate>} A promise that resolves with the commission rate data.
   */
  public async getCommissionRate(symbol: string): Promise<CommissionRate> {
    this.validateRequired({ symbol }, [OrderRequiredParams.SYMBOL]);
    return this.signedRequest(HttpMethods.GET, `${API_VERSIONS.spot.v1}/commissionRate`, {
      symbol,
    });
  }

  /**
   * Places a new order.
   * @param {NewOrderParams} params - The parameters for the new order.
   * @returns {Promise<OrderAck>} A promise that resolves with the order acknowledgement.
   * @throws {Error} If the required parameters are missing for the given order type.
   */
  public async newOrder(params: NewOrderParams): Promise<OrderAck> {
    this.validateRequired(params, [
      OrderRequiredParams.SYMBOL,
      OrderRequiredParams.SIDE,
      OrderRequiredParams.TYPE,
    ]);

    if (params.type === (OrderTypeValidation.LIMIT as OrderType)) {
      this.validateRequired(params, [
        OrderRequiredParams.TIME_IN_FORCE,
        OrderRequiredParams.QUANTITY,
        OrderRequiredParams.PRICE,
      ]);
    } else if (params.type === (OrderTypeValidation.MARKET as OrderType)) {
      if (!params.quantity && !params.quoteOrderQty) {
        throw new Error('Either quantity or quoteOrderQty is required for MARKET orders');
      }
    } else if (
      params.type === (OrderTypeValidation.STOP as OrderType) ||
      params.type === (OrderTypeValidation.TAKE_PROFIT as OrderType)
    ) {
      this.validateRequired(params, [
        OrderRequiredParams.QUANTITY,
        OrderRequiredParams.PRICE,
        OrderRequiredParams.STOP_PRICE,
      ]);
    } else if (
      params.type === (OrderTypeValidation.STOP_MARKET as OrderType) ||
      params.type === (OrderTypeValidation.TAKE_PROFIT_MARKET as OrderType)
    ) {
      this.validateRequired(params, [OrderRequiredParams.QUANTITY, OrderRequiredParams.STOP_PRICE]);
    }

    return this.signedRequest(HttpMethods.POST, `${API_VERSIONS.spot.v1}/order`, params);
  }

  /**
   * Cancels an active order.
   * @param {string} symbol - The trading symbol.
   * @param {number} [orderId] - The order ID.
   * @param {string} [origClientOrderId] - The original client order ID.
   * @returns {Promise<OrderAck>} A promise that resolves with the cancelled order acknowledgement.
   * @throws {Error} If neither orderId nor origClientOrderId is provided.
   */
  public async cancelOrder(
    symbol: string,
    orderId?: number,
    origClientOrderId?: string,
  ): Promise<OrderAck> {
    this.validateRequired({ symbol }, [OrderRequiredParams.SYMBOL]);

    if (!orderId && !origClientOrderId) {
      throw new Error(ErrorMessages.ORDER_ID_OR_CLIENT_ID_REQUIRED);
    }

    const params: OrderLookupParams = { symbol };
    if (orderId !== undefined) {
      params.orderId = orderId;
    }
    if (origClientOrderId !== undefined) {
      params.origClientOrderId = origClientOrderId;
    }

    return this.signedRequest(HttpMethods.DELETE, `${API_VERSIONS.spot.v1}/order`, params);
  }

  /**
   * Checks the status of an order.
   * @param {string} symbol - The trading symbol.
   * @param {number} [orderId] - The order ID.
   * @param {string} [origClientOrderId] - The original client order ID.
   * @returns {Promise<Order>} A promise that resolves with the order data.
   * @throws {Error} If neither orderId nor origClientOrderId is provided.
   */
  public async getOrder(
    symbol: string,
    orderId?: number,
    origClientOrderId?: string,
  ): Promise<Order> {
    this.validateRequired({ symbol }, [OrderRequiredParams.SYMBOL]);

    if (!orderId && !origClientOrderId) {
      throw new Error(ErrorMessages.ORDER_ID_OR_CLIENT_ID_REQUIRED);
    }

    const params: OrderLookupParams = { symbol };
    if (orderId !== undefined) {
      params.orderId = orderId;
    }
    if (origClientOrderId !== undefined) {
      params.origClientOrderId = origClientOrderId;
    }

    return this.userDataRequest(HttpMethods.GET, `${API_VERSIONS.spot.v1}/order`, params);
  }

  /**
   * Gets all open orders for a symbol or for the entire account.
   * @param {string} [symbol] - The trading symbol. If not provided, returns all open orders.
   * @returns {Promise<Order[]>} A promise that resolves with a list of open orders.
   */
  public async getOpenOrders(symbol?: string): Promise<Order[]> {
    const params = symbol ? { symbol } : {};
    return this.userDataRequest(HttpMethods.GET, `${API_VERSIONS.spot.v1}/openOrders`, params);
  }

  /**
   * Gets all orders for a symbol, including active, canceled, and filled orders.
   * @param {string} symbol - The trading symbol.
   * @param {object} [options] - Additional options for the query.
   * @param {number} [options.orderId] - The order ID to start from.
   * @param {number} [options.startTime] - The start time for the query.
   * @param {number} [options.endTime] - The end time for the query.
   * @param {number} [options.limit] - The number of orders to retrieve.
   * @returns {Promise<Order[]>} A promise that resolves with a list of all orders.
   */
  public async getAllOrders(
    symbol: string,
    options?: {
      orderId?: number;
      startTime?: number;
      endTime?: number;
      limit?: number;
    },
  ): Promise<Order[]> {
    this.validateRequired({ symbol }, [OrderRequiredParams.SYMBOL]);
    const params = { symbol, ...options };
    return this.userDataRequest(HttpMethods.GET, `${API_VERSIONS.spot.v1}/allOrders`, params);
  }

  /**
   * Gets the current account information.
   * @returns {Promise<SpotAccount>} A promise that resolves with the account information.
   */
  public async getAccount(): Promise<SpotAccount> {
    return this.userDataRequest(HttpMethods.GET, `${API_VERSIONS.spot.v1}/account`);
  }

  /**
   * Gets the trade history for a specific account and symbol.
   * @param {string} [symbol] - The trading symbol.
   * @param {object} [options] - Additional options for the query.
   * @param {number} [options.orderId] - The order ID to filter by.
   * @param {number} [options.startTime] - The start time for the query.
   * @param {number} [options.endTime] - The end time for the query.
   * @param {number} [options.fromId] - The ID of the first trade to fetch.
   * @param {number} [options.limit] - The number of trades to retrieve.
   * @returns {Promise<UserTrade[]>} A promise that resolves with the user's trade list.
   */
  public async getMyTrades(
    symbol?: string,
    options?: {
      orderId?: number;
      startTime?: number;
      endTime?: number;
      fromId?: number;
      limit?: number;
    },
  ): Promise<UserTrade[]> {
    const params = { symbol, ...options };
    return this.userDataRequest(HttpMethods.GET, `${API_VERSIONS.spot.v1}/userTrades`, params);
  }

  /**
   * Transfers assets between the futures and spot accounts.
   * @param {AssetTransferParams} params - The parameters for the asset transfer.
   * @returns {Promise<AssetTransferResponse>} A promise that resolves with the transfer response.
   */
  public async transferAsset(params: AssetTransferParams): Promise<AssetTransferResponse> {
    this.validateRequired(params, ValidationParams.ASSET_TRANSFER);
    return this.signedRequest(
      HttpMethods.POST,
      `${API_VERSIONS.spot.v1}/asset/wallet/transfer`,
      params,
    );
  }

  /**
   * Transfers an asset to another address.
   * @param {SendToAddressParams} params - The parameters for the transfer.
   * @returns {Promise<AssetTransferResponse>} A promise that resolves with the transfer response.
   */
  public async sendToAddress(params: SendToAddressParams): Promise<AssetTransferResponse> {
    this.validateRequired(params, ValidationParams.SEND_TO_ADDRESS);
    return this.signedRequest(
      HttpMethods.POST,
      `${API_VERSIONS.spot.v1}/asset/sendToAddress`,
      params,
    );
  }

  /**
   * Gets the estimated withdrawal fee for an asset on a specific chain.
   * @param {string} chainId - The numeric chain ID (e.g., '56' for BSC, '1' for Ethereum).
   * @param {string} asset - The asset symbol (e.g., 'USDT').
   * @returns {Promise<WithdrawFee>} A promise that resolves with the withdrawal fee information.
   */
  public async getWithdrawFee(chainId: string, asset: string): Promise<WithdrawFee> {
    this.validateRequired({ chainId, asset }, ValidationParams.CHAIN_ASSET);
    return this.publicRequest(
      HttpMethods.GET,
      `${API_VERSIONS.spot.v1}/aster/withdraw/estimateFee`,
      { chainId, asset },
    );
  }

  /**
   * Submits a withdrawal request.
   * @param {WithdrawParams} params - The parameters for the withdrawal.
   * @returns {Promise<WithdrawResponse>} A promise that resolves with the withdrawal response.
   */
  public async withdraw(params: WithdrawParams): Promise<WithdrawResponse> {
    this.validateRequired(params, ValidationParams.WITHDRAW);
    return this.userDataRequest(
      HttpMethods.POST,
      `${API_VERSIONS.spot.v1}/aster/user-withdraw`,
      params,
    );
  }

  /**
   * Gets the nonce for a user operation.
   * @param {string} address - The user's address.
   * @param {string} userOperationType - The type of user operation.
   * @param {string} [network] - The network to use.
   * @returns {Promise<number>} A promise that resolves with the nonce.
   */
  public async getNonce(
    address: string,
    userOperationType: string,
    network?: string,
  ): Promise<number> {
    this.validateRequired({ address, userOperationType }, ValidationParams.ADDRESS_USER_OP);
    const params: BaseUserOperationParams = { address, userOperationType };
    if (network !== undefined) {
      params.network = network;
    }
    return this.publicRequest(HttpMethods.POST, `${API_VERSIONS.spot.v1}/getNonce`, params);
  }

  /**
   * Creates a new API key.
   * @param {CreateApiKeyParams} params - The parameters for creating the API key.
   * @returns {Promise<ApiKeyResponse>} A promise that resolves with the new API key information.
   */
  public async createApiKey(params: CreateApiKeyParams): Promise<ApiKeyResponse> {
    this.validateRequired(params, ValidationParams.CREATE_API_KEY);
    return this.signedRequest(HttpMethods.POST, `${API_VERSIONS.spot.v1}/createApiKey`, params);
  }

  /**
   * Starts a new user data stream.
   * @returns {Promise<ListenKeyResponse>} A promise that resolves with the listen key for the user data stream.
   */
  public async startUserDataStream(): Promise<ListenKeyResponse> {
    return this.userStreamRequest(HttpMethods.POST, `${API_VERSIONS.spot.v1}/listenKey`);
  }

  /**
   * Pings a user data stream to keep it alive.
   * @param {string} listenKey - The listen key for the user data stream.
   * @returns {Promise<EmptyResponse>} A promise that resolves with an empty object if the ping is successful.
   */
  public async keepAliveUserDataStream(listenKey: string): Promise<EmptyResponse> {
    this.validateRequired({ listenKey }, [ApiParams.LISTEN_KEY]);
    return this.userStreamRequest(HttpMethods.PUT, `${API_VERSIONS.spot.v1}/listenKey`, {
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
    return this.userStreamRequest(HttpMethods.DELETE, `${API_VERSIONS.spot.v1}/listenKey`, {
      listenKey,
    });
  }
}

/**
 * @file The WebSocket client for AsterDEX, providing real-time data streams.
 * @author methodnumber13
 * @version 1.0.0
 * @license MIT
 */

import WebSocket from 'ws';
import { EventEmitter } from 'node:events';
import { ErrorFactory, WebSocketError } from '@/errors/errors';
import { WS_CONSTANTS, WS_CLOSE_CODES, TIME_CONSTANTS } from '@/config/constants';
import type {
  WebSocketConfig,
  WebSocketRequest,
  WebSocketResponse,
  WebSocketMethod,
  StreamEventHandlers,
  CombinedStreamData,
  AggTradeStreamData,
  TradeStreamData,
  KlineStreamData,
  MiniTickerStreamData,
  TickerStreamData,
  BookTickerStreamData,
  DepthStreamData,
  AccountUpdateStreamData,
  ExecutionReportStreamData,
  FuturesOrderUpdateStreamData,
  FuturesStreamEventHandlers,
  FuturesAccountUpdateStreamData,
  FuturesAccountConfigUpdateStreamData,
  FuturesLiquidationStreamData,
  FuturesMarkPriceStreamData,
} from '@/types/websocket';
import type { KlineInterval } from '@/types/common';

/**
 * Represents the different states of a WebSocket connection.
 * @enum {string}
 */
export enum WebSocketState {
  CONNECTING = 'CONNECTING',
  OPEN = 'OPEN',
  CLOSING = 'CLOSING',
  CLOSED = 'CLOSED',
}

/**
 * A client for interacting with the AsterDEX WebSocket API, providing real-time data streams.
 * @class AsterWebSocketClient
 * @extends {EventEmitter}
 * @template E - The type of event handlers for the client.
 */
export class AsterWebSocketClient<E = StreamEventHandlers> extends EventEmitter {
  private ws?: WebSocket;
  private readonly config: Required<WebSocketConfig>;
  private state: WebSocketState = WebSocketState.CLOSED;
  private subscriptions: Set<string> = new Set();
  private requestId = 1;
  private pingInterval?: NodeJS.Timeout | undefined;
  private pongTimeout?: NodeJS.Timeout | undefined;
  private reconnectTimeout?: NodeJS.Timeout | undefined;
  private reconnectAttempts = 0;
  private readonly eventHandlers: E;
  private readonly url: string;

  /**
   * Creates an instance of the AsterWebSocketClient.
   * @param {string} baseUrl - The base URL for the WebSocket API.
   * @param {string} [path='/ws'] - The path for the WebSocket connection.
   * @param {WebSocketConfig} [config={}] - The configuration options for the WebSocket client.
   * @param {E} [eventHandlers={} as E] - An object with event handlers for different stream events.
   */
  constructor(
    baseUrl: string,
    path: string = '/ws',
    config: WebSocketConfig = {},
    eventHandlers: E = {} as E,
  ) {
    super();

    this.url = `${baseUrl}${path}`;
    this.config = {
      baseUrl,
      reconnect: config.reconnect ?? true,
      reconnectInterval: config.reconnectInterval ?? WS_CONSTANTS.RECONNECT_INTERVAL,
      maxReconnectAttempts: config.maxReconnectAttempts ?? WS_CONSTANTS.MAX_RECONNECT_ATTEMPTS,
      pingInterval: config.pingInterval ?? WS_CONSTANTS.PING_INTERVAL,
      pongTimeout: config.pongTimeout ?? WS_CONSTANTS.PONG_TIMEOUT,
    };
    this.eventHandlers = eventHandlers;
  }

  private handlersAs<T>(): T {
    return this.eventHandlers as unknown as T;
  }

  /**
   * Connects to the WebSocket server.
   * @returns {Promise<void>} A promise that resolves when the connection is established.
   */
  public async connect(): Promise<void> {
    if (this.state === WebSocketState.OPEN || this.state === WebSocketState.CONNECTING) {
      return;
    }

    return new Promise((resolve, reject) => {
      this.state = WebSocketState.CONNECTING;
      this.ws = new WebSocket(this.url);

      this.ws.on('open', () => {
        this.state = WebSocketState.OPEN;
        this.reconnectAttempts = 0;
        this.startPingInterval();
        this.handlersAs<StreamEventHandlers>().onOpen?.();
        this.emit('open');
        resolve();
      });

      this.ws.on('message', (data: WebSocket.Data) => {
        this.handleMessage(data);
      });

      this.ws.on('close', (code: number, reason: string) => {
        this.handleClose(code, reason.toString());
      });

      this.ws.on('error', (error: Error) => {
        this.handleError(error);
        if (this.state === WebSocketState.CONNECTING) {
          reject(ErrorFactory.fromNetworkError(error));
        }
      });

      this.ws.on('pong', () => {
        this.clearPongTimeout();
      });
    });
  }

  /**
   * Disconnects from the WebSocket server.
   */
  public disconnect(): void {
    this.config.reconnect = false;
    this.clearTimers();

    if (this.ws && this.state === WebSocketState.OPEN) {
      this.state = WebSocketState.CLOSING;
      this.ws.close(WS_CLOSE_CODES.NORMAL_CLOSURE, 'Client disconnect');
    } else {
      this.state = WebSocketState.CLOSED;
    }
  }

  /**
   * Subscribes to one or more WebSocket streams.
   * @param {string | string[]} streams - The stream or streams to subscribe to.
   * @returns {Promise<void>} A promise that resolves when the subscription is successful.
   * @throws {WebSocketError} If the maximum number of subscriptions is exceeded.
   */
  public async subscribe(streams: string | string[]): Promise<void> {
    const streamArray = Array.isArray(streams) ? streams : [streams];

    if (this.subscriptions.size + streamArray.length > WS_CONSTANTS.MAX_SUBSCRIPTIONS) {
      throw new WebSocketError(
        `Cannot subscribe to more than ${WS_CONSTANTS.MAX_SUBSCRIPTIONS} streams`,
      );
    }

    await this.sendRequest('SUBSCRIBE', streamArray);
    streamArray.forEach((stream) => this.subscriptions.add(stream));
  }

  /**
   * Unsubscribes from one or more WebSocket streams.
   * @param {string | string[]} streams - The stream or streams to unsubscribe from.
   * @returns {Promise<void>} A promise that resolves when the unsubscription is successful.
   */
  public async unsubscribe(streams: string | string[]): Promise<void> {
    const streamArray = Array.isArray(streams) ? streams : [streams];

    await this.sendRequest('UNSUBSCRIBE', streamArray);
    streamArray.forEach((stream) => this.subscriptions.delete(stream));
  }

  /**
   * Lists the current subscriptions.
   * @returns {Promise<string[]>} A promise that resolves with a list of the current subscriptions.
   */
  public async listSubscriptions(): Promise<string[]> {
    const response = await this.sendRequest('LIST_SUBSCRIPTIONS');
    return (response.result as string[]) ?? [];
  }

  /**
   * Sets a property on the WebSocket connection.
   * @param {string} property - The name of the property to set.
   * @param {boolean} value - The value of the property.
   * @returns {Promise<void>} A promise that resolves when the property is set successfully.
   */
  public async setProperty(property: string, value: boolean): Promise<void> {
    await this.sendRequest('SET_PROPERTY', [property, value]);
  }

  /**
   * Gets a property from the WebSocket connection.
   * @param {string} property - The name of the property to get.
   * @returns {Promise<any>} A promise that resolves with the value of the property.
   */
  public async getProperty(property: string): Promise<any> {
    const response = await this.sendRequest('GET_PROPERTY', [property]);
    return response.result;
  }

  /**
   * Gets the current state of the WebSocket connection.
   * @returns {WebSocketState} The current connection state.
   */
  public getState(): WebSocketState {
    return this.state;
  }

  /**
   * Checks if the WebSocket is currently connected.
   * @returns {boolean} `true` if the WebSocket is connected, `false` otherwise.
   */
  public isConnected(): boolean {
    return this.state === WebSocketState.OPEN;
  }

  /**
   * Gets the current list of subscriptions.
   * @returns {string[]} A list of the current subscriptions.
   */
  public getSubscriptions(): string[] {
    return Array.from(this.subscriptions);
  }

  /**
   * Sends a request to the WebSocket server.
   * @private
   * @param {WebSocketMethod} method - The method for the request.
   * @param {unknown[]} [params] - The parameters for the request.
   * @returns {Promise<WebSocketResponse>} A promise that resolves with the response from the server.
   * @throws {WebSocketError} If the WebSocket is not connected or if the request times out.
   */
  private async sendRequest(
    method: WebSocketMethod,
    params?: unknown[],
  ): Promise<WebSocketResponse> {
    if (!this.isConnected()) {
      throw new WebSocketError('WebSocket is not connected');
    }

    const id = this.requestId++;
    const request: WebSocketRequest = { method, id };
    if (params !== undefined) {
      request.params = params.map(String);
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new WebSocketError('Request timeout'));
      }, TIME_CONSTANTS.DEFAULT_REQUEST_TIMEOUT);

      const messageHandler = (data: WebSocket.Data) => {
        try {
          const dataString = this.dataToString(data);
          const response = JSON.parse(dataString) as WebSocketResponse;
          if (response.id === id) {
            clearTimeout(timeout);
            this.ws?.off('message', messageHandler);

            if (response.error) {
              reject(new WebSocketError(response.error.msg, response.error.code));
            } else {
              resolve(response);
            }
          }
        } catch {
          // Ignore parsing errors for stream data
        }
      };

      this.ws?.on('message', messageHandler);
      this.ws?.send(JSON.stringify(request));
    });
  }

  /**
   * Converts WebSocket data to a string.
   * @private
   * @param {WebSocket.Data} data - The data to convert.
   * @returns {string} The converted string.
   */
  private dataToString(data: WebSocket.Data): string {
    if (Buffer.isBuffer(data)) {
      return data.toString('utf8');
    }
    if (typeof data === 'string') {
      return data;
    }
    if (Array.isArray(data)) {
      return Buffer.concat(data).toString('utf8');
    }
    return Buffer.from(data).toString('utf8');
  }

  /**
   * Handles incoming messages from the WebSocket server.
   * @private
   * @param {WebSocket.Data} data - The incoming data.
   */
  private handleMessage(data: WebSocket.Data): void {
    try {
      const dataString = this.dataToString(data);
      if (!dataString || dataString.trim().length === 0) {
        return;
      }
      const message = JSON.parse(dataString);
      if (typeof message.id === 'number') {
        return;
      }
      if (message.stream && message.data) {
        this.handleStreamData(message as CombinedStreamData);
      } else {
        this.handleStreamData(message);
      }
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  /**
   * Handles incoming stream data and emits the corresponding events.
   * @private
   * @param {unknown} data - The stream data.
   */
  private handleStreamData(data: unknown): void {
    const dataObj = data as Record<string, any>;
    const eventType = dataObj.e ?? dataObj.data?.e;

    switch (eventType) {
      case 'aggTrade':
        this.handlersAs<StreamEventHandlers>().onAggTrade?.(dataObj as AggTradeStreamData);
        this.emit('aggTrade', dataObj);
        break;
      case 'trade':
        this.handlersAs<StreamEventHandlers>().onTrade?.(dataObj as TradeStreamData);
        this.emit('trade', dataObj);
        break;
      case 'kline':
        this.handlersAs<StreamEventHandlers>().onKline?.(dataObj as KlineStreamData);
        this.emit('kline', dataObj);
        break;
      case '24hrMiniTicker':
        this.handlersAs<StreamEventHandlers>().onMiniTicker?.(dataObj as MiniTickerStreamData);
        this.emit('miniTicker', dataObj);
        break;
      case '24hrTicker':
        this.handlersAs<StreamEventHandlers>().onTicker?.(dataObj as TickerStreamData);
        this.emit('ticker', dataObj);
        break;
      case 'depthUpdate':
        this.handlersAs<StreamEventHandlers>().onDepthUpdate?.(dataObj as DepthStreamData);
        this.emit('depthUpdate', dataObj);
        break;
      case 'outboundAccountPosition':
        this.handlersAs<StreamEventHandlers>().onAccountUpdate?.(
          dataObj as AccountUpdateStreamData,
        );
        this.emit('accountUpdate', dataObj);
        break;
      case 'executionReport':
        this.handlersAs<StreamEventHandlers>().onExecutionReport?.(
          dataObj as ExecutionReportStreamData,
        );
        this.emit('executionReport', dataObj);
        break;
      case 'markPriceUpdate':
        this.handlersAs<FuturesStreamEventHandlers>().onMarkPrice?.(
          dataObj as FuturesMarkPriceStreamData,
        );
        this.emit('markPrice', dataObj);
        break;
      case 'forceOrder':
        this.handlersAs<FuturesStreamEventHandlers>().onLiquidation?.(
          dataObj as FuturesLiquidationStreamData,
        );
        this.emit('liquidation', dataObj);
        break;
      case 'ACCOUNT_UPDATE':
        this.handlersAs<FuturesStreamEventHandlers>().onAccountUpdate?.(
          dataObj as FuturesAccountUpdateStreamData,
        );
        this.emit('futuresAccountUpdate', dataObj);
        break;
      case 'ORDER_TRADE_UPDATE':
        this.handlersAs<FuturesStreamEventHandlers>().onOrderUpdate?.(
          dataObj as FuturesOrderUpdateStreamData,
        );
        this.emit('futuresOrderUpdate', dataObj);
        break;
      case 'ACCOUNT_CONFIG_UPDATE':
        this.handlersAs<FuturesStreamEventHandlers>().onAccountConfigUpdate?.(
          dataObj as FuturesAccountConfigUpdateStreamData,
        );
        this.emit('futuresAccountConfigUpdate', dataObj);
        break;
      default:
        if (dataObj.u && dataObj.s && dataObj.b && dataObj.a) {
          this.handlersAs<StreamEventHandlers>().onBookTicker?.(dataObj as BookTickerStreamData);
          this.emit('bookTicker', dataObj);
        } else {
          this.emit('data', dataObj);
        }
    }
  }

  /**
   * Handles the closing of the WebSocket connection.
   * @private
   * @param {number} code - The closing code.
   * @param {string} reason - The reason for closing.
   */
  private handleClose(code: number, reason: string): void {
    this.state = WebSocketState.CLOSED;
    this.clearTimers();
    this.handlersAs<StreamEventHandlers>().onClose?.(code, reason);
    this.emit('close', code, reason);
    if (this.config.reconnect && this.reconnectAttempts < this.config.maxReconnectAttempts) {
      this.scheduleReconnect();
    }
  }

  /**
   * Handles WebSocket errors.
   * @private
   * @param {Error} error - The error that occurred.
   */
  private handleError(error: Error): void {
    const wsError = ErrorFactory.fromNetworkError(error);
    this.handlersAs<StreamEventHandlers>().onError?.(wsError);
    this.emit('error', wsError);
  }

  /**
   * Schedules a reconnection attempt.
   * @private
   */
  private scheduleReconnect(): void {
    this.reconnectAttempts++;
    this.reconnectTimeout = setTimeout(() => {
      this.connect()
        .then(async () => {
          if (this.subscriptions.size > 0) {
            await this.subscribe(Array.from(this.subscriptions));
          }
        })
        .catch(() => {
          // Reconnection failed, will try again if attempts remain
        });
    }, this.config.reconnectInterval);
  }

  /**
   * Starts the ping interval to keep the connection alive.
   * @private
   */
  private startPingInterval(): void {
    this.pingInterval = setInterval(() => {
      if (this.isConnected()) {
        this.ws?.ping();
        this.setPongTimeout();
      }
    }, this.config.pingInterval);
  }

  /**
   * Sets a timeout for receiving a pong response.
   * @private
   */
  private setPongTimeout(): void {
    this.pongTimeout = setTimeout(() => {
      this.ws?.terminate();
    }, this.config.pongTimeout);
  }

  /**
   * Clears the pong timeout.
   * @private
   */
  private clearPongTimeout(): void {
    if (this.pongTimeout) {
      clearTimeout(this.pongTimeout);
      this.pongTimeout = undefined;
    }
  }

  /**
   * Clears all active timers.
   * @private
   */
  private clearTimers(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = undefined;
    }
    this.clearPongTimeout();
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = undefined;
    }
  }
}

/**
 * A utility class for creating WebSocket stream names.
 * @class StreamUtils
 */
export class StreamUtils {
  /**
   * Creates an aggregate trade stream name for a given symbol.
   * @param {string} symbol - The trading symbol.
   * @returns {string} The aggregate trade stream name.
   */
  public static aggTrade(symbol: string): string {
    return `${symbol.toLowerCase()}@aggTrade`;
  }

  /**
   * Creates a trade stream name for a given symbol.
   * @param {string} symbol - The trading symbol.
   * @returns {string} The trade stream name.
   */
  public static trade(symbol: string): string {
    return `${symbol.toLowerCase()}@trade`;
  }

  /**
   * Creates a Kline stream name for a given symbol and interval.
   * @param {string} symbol - The trading symbol.
   * @param {KlineInterval} interval - The Kline interval.
   * @returns {string} The Kline stream name.
   */
  public static kline(symbol: string, interval: KlineInterval): string {
    return `${symbol.toLowerCase()}@kline_${interval}`;
  }

  /**
   * Creates a mini-ticker stream name for a given symbol.
   * @param {string} symbol - The trading symbol.
   * @returns {string} The mini-ticker stream name.
   */
  public static miniTicker(symbol: string): string {
    return `${symbol.toLowerCase()}@miniTicker`;
  }

  /**
   * Creates a ticker stream name for a given symbol.
   * @param {string} symbol - The trading symbol.
   * @returns {string} The ticker stream name.
   */
  public static ticker(symbol: string): string {
    return `${symbol.toLowerCase()}@ticker`;
  }

  /**
   * Creates a book ticker stream name for a given symbol.
   * @param {string} symbol - The trading symbol.
   * @returns {string} The book ticker stream name.
   */
  public static bookTicker(symbol: string): string {
    return `${symbol.toLowerCase()}@bookTicker`;
  }

  /**
   * Creates a depth stream name for a given symbol.
   * @param {string} symbol - The trading symbol.
   * @param {number} [levels] - The number of depth levels.
   * @param {'100ms'} [updateSpeed] - The update speed.
   * @returns {string} The depth stream name.
   */
  public static depth(symbol: string, levels?: number, updateSpeed?: '100ms'): string {
    let stream = `${symbol.toLowerCase()}@depth`;
    if (levels) {
      stream += levels;
    }
    if (updateSpeed) {
      stream += `@${updateSpeed}`;
    }
    return stream;
  }

  /**
   * Creates a stream name for all market mini-tickers.
   * @returns {string} The all market mini-tickers stream name.
   */
  public static allMiniTicker(): string {
    return '!miniTicker@arr';
  }

  /**
   * Creates a stream name for all market tickers.
   * @returns {string} The all market tickers stream name.
   */
  public static allTicker(): string {
    return '!ticker@arr';
  }

  /**
   * Creates a stream name for all market book tickers.
   * @returns {string} The all market book tickers stream name.
   */
  public static allBookTicker(): string {
    return '!bookTicker';
  }

  /**
   * Creates a futures mark price stream name for a given symbol.
   * @param {string} symbol - The trading symbol.
   * @returns {string} The futures mark price stream name.
   */
  public static futuresMarkPrice(symbol: string): string {
    return `${symbol.toLowerCase()}@markPrice`;
  }

  /**
   * Creates a stream name for all futures mark prices.
   * @returns {string} The all futures mark prices stream name.
   */
  public static allFuturesMarkPrice(): string {
    return '!markPrice@arr';
  }

  /**
   * Creates a futures liquidation order stream name for a given symbol.
   * @param {string} symbol - The trading symbol.
   * @returns {string} The futures liquidation order stream name.
   */
  public static futuresLiquidation(symbol: string): string {
    return `${symbol.toLowerCase()}@forceOrder`;
  }

  /**
   * Creates a stream name for all futures liquidation orders.
   * @returns {string} The all futures liquidation orders stream name.
   */
  public static allFuturesLiquidation(): string {
    return '!forceOrder@arr';
  }

  /**
   * Creates a futures composite index stream name for a given symbol.
   * @param {string} symbol - The trading symbol.
   * @returns {string} The futures composite index stream name.
   */
  public static futuresCompositeIndex(symbol: string): string {
    return `${symbol.toLowerCase()}@compositeIndex`;
  }
}

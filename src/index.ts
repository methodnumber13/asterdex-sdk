/**
 * @file The main entry point for the AsterDEX TypeScript SDK (Unofficial).
 * @author methodnumber13
 * @version 1.0.0
 * @license MIT
 * @description Unofficial, community-maintained TypeScript SDK for AsterDEX cryptocurrency exchange
 */

import { Config } from './config/config';
import { SpotClient } from './clients/rest/spot';
import { FuturesClient } from './clients/rest/futures';
import { AsterWebSocketClient, StreamUtils as _StreamUtils } from './clients/websocket/websocket';
import type { AsterDEXConfig, Environment as _Environment } from './types/common';
import type {
  StreamEventHandlers,
  FuturesStreamEventHandlers,
  CombinedStreamEventHandlers as _CombinedStreamEventHandlers,
} from './types/websocket';

/**
 * The main class for interacting with the AsterDEX API.
 * This class provides access to all the features of the SDK, including Spot and Futures trading,
 * as well as WebSocket streams for real-time data.
 * @class AsterDEX
 */
class AsterDEX {
  /**
   * The configuration object for the SDK.
   * @private
   * @readonly
   */
  private readonly config: Config;

  /**
   * The Spot trading client.
   * @public
   * @readonly
   */
  public readonly spot: SpotClient;

  /**
   * Creates an instance of the AsterDEX SDK.
   * @param {AsterDEXConfig} [config={}] - The configuration options for the SDK.
   * @example
   * ```typescript
   * // Initialize with credentials
   * const client = new AsterDEX({
   *   apiKey: 'your-api-key',
   *   apiSecret: 'your-api-secret',
   *   environment: 'mainnet'
   * });
   *
   * // Initialize from environment variables
   * const client = AsterDEX.fromEnv();
   * ```
   */
  constructor(config: AsterDEXConfig = {}) {
    this.config = new Config(config);
    this.spot = new SpotClient(this.config);
  }

  /**
   * Creates an SDK instance from environment variables.
   * This method allows for easy configuration in environments where environment variables are used for secrets.
   * @returns {AsterDEX} A new instance of the AsterDEX SDK.
   * @example
   * ```typescript
   * // Make sure to set the following environment variables:
   * // ASTERDEX_API_KEY, ASTERDEX_API_SECRET
   * const client = AsterDEX.fromEnv();
   * ```
   */
  public static fromEnv(): AsterDEX {
    const config = Config.fromEnv();
    return new AsterDEX(config.getConfig());
  }

  /**
   * Creates a WebSocket client for real-time data streams.
   * @param {StreamEventHandlers} [eventHandlers={}] - An object with event handlers for different stream events.
   * @param {string} [path='/ws'] - The WebSocket path to connect to.
   * @returns {AsterWebSocketClient} A new WebSocket client instance.
   * @example
   * ```typescript
   * const ws = client.createWebSocketClient({
   *   onTicker: (data) => console.log('24hr ticker:', data),
   *   onTrade: (data) => console.log('Trade:', data),
   *   onError: (error) => console.error('WebSocket error:', error)
   * });
   *
   * await ws.connect();
   * await ws.subscribe(['btcusdt@ticker', 'ethusdt@trade']);
   * ```
   */
  public createWebSocketClient(
    eventHandlers: StreamEventHandlers = {},
    path = '/ws',
  ): AsterWebSocketClient {
    return new AsterWebSocketClient(this.config.getBaseUrl('websocket'), path, {}, eventHandlers);
  }

  /**
   * Creates a combined WebSocket stream client.
   * This allows subscribing to multiple streams on a single connection.
   * @param {StreamEventHandlers} [eventHandlers={}] - An object with event handlers for different stream events.
   * @returns {AsterWebSocketClient} A new WebSocket client instance for combined streams.
   * @example
   * ```typescript
   * const ws = client.createCombinedStream({
   *   onTicker: (data) => console.log('Ticker:', data),
   *   onDepthUpdate: (data) => console.log('Depth update:', data)
   * });
   *
   * await ws.connect();
   * await ws.subscribe(['btcusdt@ticker', 'ethusdt@depth']);
   * ```
   */
  public createCombinedStream(eventHandlers: StreamEventHandlers = {}): AsterWebSocketClient {
    return new AsterWebSocketClient(
      this.config.getBaseUrl('websocket'),
      '/stream',
      {},
      eventHandlers,
    );
  }

  /**
   * Creates a user data stream WebSocket client.
   * This stream provides real-time updates on the user's account, orders, and trades.
   * @param {string} listenKey - The listen key obtained from the REST API.
   * @param {StreamEventHandlers} [eventHandlers={}] - An object with event handlers for user data stream events.
   * @returns {AsterWebSocketClient} A new WebSocket client instance for user data streams.
   * @example
   * ```typescript
   * const listenKey = await client.spot.startUserDataStream();
   * const userWs = client.createUserDataStream(listenKey.listenKey, {
   *   onAccountUpdate: (data) => console.log('Account update:', data),
   *   onExecutionReport: (data) => console.log('Order update:', data)
   * });
   *
   * await userWs.connect();
   * ```
   */
  public createUserDataStream(
    listenKey: string,
    eventHandlers: StreamEventHandlers = {},
  ): AsterWebSocketClient {
    return new AsterWebSocketClient(
      this.config.getBaseUrl('websocket'),
      `/ws/${listenKey}`,
      {},
      eventHandlers,
    );
  }

  /**
   * Creates a Futures client for derivatives trading.
   * @param {string} userAddress - The user's main account wallet address (0x...).
   * @param {string} signerAddress - The user's API wallet address (0x...).
   * @param {string} privateKey - The private key for signing transactions (0x...).
   * @returns {FuturesClient} A new Futures client instance.
   * @example
   * ```typescript
   * const futures = client.createFuturesClient(
   *   '0x1E09ae6526A70fa26E25112b858DD6927e37655E',
   *   '0x001AA685f118954F5984eb4D000f1a184F3f4aED',
   *   '0x4efec379443ff915877459330cf1a39e045bee0061398fe420924b3be2170aa1'
   * );
   *
   * // Place a futures order
   * const order = await futures.newOrder({
   *   symbol: 'BTCUSDT',
   *   side: 'BUY',
   *   type: 'LIMIT',
   *   quantity: '0.001',
   *   price: '50000'
   * });
   * ```
   */
  public createFuturesClient(
    userAddress: string,
    signerAddress: string,
    privateKey: string,
  ): FuturesClient {
    return new FuturesClient(this.config, userAddress, signerAddress, privateKey);
  }

  /**
   * Creates a Futures WebSocket client for real-time futures data.
   * @param {FuturesStreamEventHandlers} [eventHandlers={}] - An object with event handlers for futures stream events.
   * @param {string} [path='/ws'] - The WebSocket path to connect to.
   * @returns {AsterWebSocketClient<FuturesStreamEventHandlers>} A new WebSocket client instance for futures data.
   * @example
   * ```typescript
   * const futuresWs = client.createFuturesWebSocketClient({
   *   onMarkPrice: (data) => console.log('Mark price:', data),
   *   onLiquidation: (data) => console.log('Liquidation:', data),
   *   onFuturesAccountUpdate: (data) => console.log('Account update:', data)
   * });
   *
   * await futuresWs.connect();
   * await futuresWs.subscribe([
   *   StreamUtils.futuresMarkPrice('BTCUSDT'),
   *   StreamUtils.allFuturesLiquidation()
   * ]);
   * ```
   */
  public createFuturesWebSocketClient(
    eventHandlers: FuturesStreamEventHandlers = {},
    path = '/ws',
  ): AsterWebSocketClient<FuturesStreamEventHandlers> {
    return new AsterWebSocketClient(this.config.getBaseUrl('websocket'), path, {}, eventHandlers);
  }

  /**
   * Creates a Futures user data stream WebSocket client.
   * This stream provides real-time updates on the user's futures account, orders, and trades.
   * @param {string} listenKey - The listen key obtained from the Futures REST API.
   * @param {FuturesStreamEventHandlers} [eventHandlers={}] - An object with event handlers for futures user data stream events.
   * @returns {AsterWebSocketClient<FuturesStreamEventHandlers>} A new WebSocket client instance for futures user data streams.
   * @example
   * ```typescript
   * const futures = client.createFuturesClient(userAddr, signerAddr, privateKey);
   * const listenKey = await futures.startUserDataStream();
   *
   * const futuresUserWs = client.createFuturesUserDataStream(listenKey.listenKey, {
   *   onAccountUpdate: (data) => console.log('Futures account update:', data),
   *   onOrderUpdate: (data) => console.log('Futures order update:', data)
   * });
   *
   * await futuresUserWs.connect();
   * ```
   */
  public createFuturesUserDataStream(
    listenKey: string,
    eventHandlers: FuturesStreamEventHandlers = {},
  ): AsterWebSocketClient<FuturesStreamEventHandlers> {
    return new AsterWebSocketClient(
      this.config.getBaseUrl('websocket'),
      `/ws/${listenKey}`,
      {},
      eventHandlers,
    );
  }

  /**
   * Gets the current configuration of the SDK.
   * @returns {Config} The current configuration object.
   */
  public getConfig(): Config {
    return this.config;
  }

  /**
   * Updates the API credentials for the SDK.
   * @param {string} apiKey - The new API key.
   * @param {string} apiSecret - The new API secret.
   * @example
   * ```typescript
   * client.updateCredentials('new-api-key', 'new-api-secret');
   * ```
   */
  public updateCredentials(apiKey: string, apiSecret: string): void {
    this.config.updateConfig({ apiKey, apiSecret });
    this.spot.updateCredentials(apiKey, apiSecret);
  }

  /**
   * Pings the API to test connectivity.
   * @returns {Promise<Record<string, never>>} A promise that resolves with an empty object if the ping is successful.
   * @example
   * ```typescript
   * try {
   *   await client.ping();
   *   console.log('API is reachable');
   * } catch (error) {
   *   console.error('API unreachable:', error);
   * }
   * ```
   */
  public async ping(): Promise<Record<string, never>> {
    return this.spot.ping();
  }

  /**
   * Gets the server time from the API.
   * @returns {Promise<{ serverTime: number }>} A promise that resolves with the server time.
   * @example
   * ```typescript
   * const serverTime = await client.getServerTime();
   * console.log('Server time:', new Date(serverTime.serverTime));
   * ```
   */
  public async getServerTime(): Promise<{ serverTime: number }> {
    return this.spot.getServerTime();
  }
}

// Re-export types and utilities
export * from './types/common';
export * from './types/spot';
export * from './types/futures';
export * from './types/websocket';
export * from './errors/errors';
export { Config } from './config/config';
export { SpotClient } from './clients/rest/spot';
export { FuturesClient } from './clients/rest/futures';
export { AsterWebSocketClient, StreamUtils } from './clients/websocket/websocket';
export {
  Web3SignatureAuth,
  FuturesAuthManager,
  checkWeb3Dependencies,
  getWeb3InstallationInstructions,
} from './auth/web3signature';

// Main SDK export (named instead of default)
export { AsterDEX };

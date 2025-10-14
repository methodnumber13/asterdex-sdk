/**
 * Tests for main AsterDEX SDK class
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AsterDEX } from './index';
import { Config } from './config/config';
import { SpotClient } from './clients/rest/spot';
import { FuturesClient } from './clients/rest/futures';
import { AsterWebSocketClient } from './clients/websocket/websocket';
import type { AsterDEXConfig } from './types/common';

import dotenv from 'dotenv';
dotenv.config();

// Mock dependencies
vi.mock('./config/config');
vi.mock('./clients/rest/spot');
vi.mock('./clients/rest/futures');
vi.mock('./clients/websocket/websocket');

const MockConfig = Config as any;
const MockSpotClient = SpotClient as any;
const MockFuturesClient = FuturesClient as any;
const MockAsterWebSocketClient = AsterWebSocketClient as any;

describe('AsterDEX', () => {
  let mockConfig: any;
  let mockSpotClient: any;
  let mockFuturesClient: any;
  let mockWebSocketClient: any;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Setup mock config
    mockConfig = {
      getConfig: vi.fn().mockReturnValue({
        apiKey: 'test-key',
        apiSecret: 'test-secret',
        environment: 'testnet',
      }),
      getBaseUrl: vi.fn().mockReturnValue('https://api.test.com'),
      updateConfig: vi.fn(),
    };

    // Setup mock spot client
    mockSpotClient = {
      ping: vi.fn().mockResolvedValue({}),
      getServerTime: vi.fn().mockResolvedValue({ serverTime: 1672531200000 }),
      updateCredentials: vi.fn(),
    };

    // Setup mock futures client
    mockFuturesClient = {
      ping: vi.fn().mockResolvedValue({}),
      getServerTime: vi.fn().mockResolvedValue({ serverTime: 1672531200000 }),
      updateCredentials: vi.fn(),
    };

    // Setup mock WebSocket client
    mockWebSocketClient = {
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn(),
      subscribe: vi.fn().mockResolvedValue(undefined),
      unsubscribe: vi.fn().mockResolvedValue(undefined),
    };

    MockConfig.mockImplementation(() => mockConfig);
    MockConfig.fromEnv = vi.fn().mockReturnValue(mockConfig);
    MockSpotClient.mockImplementation(() => mockSpotClient);
    MockFuturesClient.mockImplementation(() => mockFuturesClient);
    MockAsterWebSocketClient.mockImplementation(() => mockWebSocketClient);
  });

  describe('constructor', () => {
    it('should create instance with default config', () => {
      const client = new AsterDEX();

      expect(MockConfig).toHaveBeenCalledWith({});
      expect(MockSpotClient).toHaveBeenCalledWith(mockConfig);
      expect(client.spot).toBe(mockSpotClient);
    });

    it('should create instance with custom config', () => {
      const config: AsterDEXConfig = {
        apiKey: 'custom-key',
        apiSecret: 'custom-secret',
        environment: 'mainnet',
      };

      const client = new AsterDEX(config);

      expect(MockConfig).toHaveBeenCalledWith(config);
      expect(client.spot).toBe(mockSpotClient);
    });
  });

  describe('fromEnv', () => {
    it('should create instance from environment variables', () => {
      const client = AsterDEX.fromEnv();

      expect(MockConfig.fromEnv).toHaveBeenCalled();
      expect(mockConfig.getConfig).toHaveBeenCalled();
      expect(MockConfig).toHaveBeenCalledWith(mockConfig.getConfig());
      expect(client).toBeInstanceOf(AsterDEX);
    });
  });

  describe('WebSocket clients', () => {
    let client: AsterDEX;

    beforeEach(() => {
      client = new AsterDEX();
      mockConfig.getBaseUrl.mockReturnValue('wss://ws.test.com');
    });

    describe('createWebSocketClient', () => {
      it('should create WebSocket client with default path', () => {
        const eventHandlers = { onTicker: vi.fn() };
        client.createWebSocketClient(eventHandlers);

        expect(MockAsterWebSocketClient).toHaveBeenCalledWith(
          'wss://ws.test.com',
          '/ws',
          {},
          eventHandlers,
        );
        expect(MockAsterWebSocketClient).toHaveBeenCalled();
      });

      it('should create WebSocket client with custom path', () => {
        const eventHandlers = { onTrade: vi.fn() };
        client.createWebSocketClient(eventHandlers, '/custom');

        expect(MockAsterWebSocketClient).toHaveBeenCalledWith(
          'wss://ws.test.com',
          '/custom',
          {},
          eventHandlers,
        );
        expect(MockAsterWebSocketClient).toHaveBeenCalled();
      });

      it('should create WebSocket client with empty handlers', () => {
        client.createWebSocketClient();

        expect(MockAsterWebSocketClient).toHaveBeenCalledWith('wss://ws.test.com', '/ws', {}, {});
      });
    });

    describe('createCombinedStream', () => {
      it('should create combined stream client', () => {
        const eventHandlers = { onDepthUpdate: vi.fn() };
        client.createCombinedStream(eventHandlers);

        expect(MockAsterWebSocketClient).toHaveBeenCalledWith(
          'wss://ws.test.com',
          '/stream',
          {},
          eventHandlers,
        );
      });

      it('should create combined stream with empty handlers', () => {
        client.createCombinedStream();

        expect(MockAsterWebSocketClient).toHaveBeenCalledWith(
          'wss://ws.test.com',
          '/stream',
          {},
          {},
        );
      });
    });

    describe('createUserDataStream', () => {
      it('should create user data stream client', () => {
        const listenKey = 'test-listen-key';
        const eventHandlers = { onAccountUpdate: vi.fn() };
        client.createUserDataStream(listenKey, eventHandlers);

        expect(MockAsterWebSocketClient).toHaveBeenCalledWith(
          'wss://ws.test.com',
          `/ws/${listenKey}`,
          {},
          eventHandlers,
        );
      });

      it('should create user data stream with empty handlers', () => {
        const listenKey = 'test-listen-key';
        client.createUserDataStream(listenKey);

        expect(MockAsterWebSocketClient).toHaveBeenCalledWith(
          'wss://ws.test.com',
          `/ws/${listenKey}`,
          {},
          {},
        );
      });
    });

    describe('createFuturesWebSocketClient', () => {
      it('should create futures WebSocket client with default path', () => {
        const eventHandlers = { onMarkPrice: vi.fn() };
        client.createFuturesWebSocketClient(eventHandlers);

        expect(MockAsterWebSocketClient).toHaveBeenCalledWith(
          'wss://ws.test.com',
          '/ws',
          {},
          eventHandlers,
        );
      });

      it('should create futures WebSocket client with custom path', () => {
        const eventHandlers = { onLiquidation: vi.fn() };
        client.createFuturesWebSocketClient(eventHandlers, '/futures');

        expect(MockAsterWebSocketClient).toHaveBeenCalledWith(
          'wss://ws.test.com',
          '/futures',
          {},
          eventHandlers,
        );
      });
    });

    describe('createFuturesUserDataStream', () => {
      it('should create futures user data stream', () => {
        const listenKey = 'futures-listen-key';
        const eventHandlers = { onAccountUpdate: vi.fn(), onOrderUpdate: vi.fn() };
        client.createFuturesUserDataStream(listenKey, eventHandlers);

        expect(MockAsterWebSocketClient).toHaveBeenCalledWith(
          'wss://ws.test.com',
          `/ws/${listenKey}`,
          {},
          eventHandlers,
        );
      });
    });
  });

  describe('createFuturesClient', () => {
    it('should create futures client with Web3 credentials', () => {
      const client = new AsterDEX();
      const userAddress = process.env.FUTURES_USER_ADDRESS as string;
      const signerAddress = process.env.FUTURES_SIGNER_ADDRESS as string;
      const privateKey = process.env.FUTURES_PRIVATE_KEY as string;

      client.createFuturesClient(userAddress, signerAddress, privateKey);

      expect(MockFuturesClient).toHaveBeenCalledWith(
        mockConfig,
        userAddress,
        signerAddress,
        privateKey,
      );
      expect(MockFuturesClient).toHaveBeenCalled();
    });
  });

  describe('configuration methods', () => {
    let client: AsterDEX;

    beforeEach(() => {
      client = new AsterDEX();
    });

    describe('getConfig', () => {
      it('should return config instance', () => {
        const config = client.getConfig();
        expect(config).toBe(mockConfig);
      });
    });

    describe('updateCredentials', () => {
      it('should update config and spot client credentials', () => {
        const newApiKey = 'new-api-key';
        const newApiSecret = 'new-api-secret';

        client.updateCredentials(newApiKey, newApiSecret);

        expect(mockConfig.updateConfig).toHaveBeenCalledWith({
          apiKey: newApiKey,
          apiSecret: newApiSecret,
        });
        expect(mockSpotClient.updateCredentials).toHaveBeenCalledWith(newApiKey, newApiSecret);
      });
    });
  });

  describe('API methods', () => {
    let client: AsterDEX;

    beforeEach(() => {
      client = new AsterDEX();
    });

    describe('ping', () => {
      it('should call spot client ping', async () => {
        const result = await client.ping();

        expect(mockSpotClient.ping).toHaveBeenCalled();
        expect(result).toEqual({});
      });

      it('should handle ping errors', async () => {
        const error = new Error('Network error');
        mockSpotClient.ping.mockRejectedValue(error);

        await expect(client.ping()).rejects.toThrow('Network error');
      });
    });

    describe('getServerTime', () => {
      it('should call spot client getServerTime', async () => {
        const result = await client.getServerTime();

        expect(mockSpotClient.getServerTime).toHaveBeenCalled();
        expect(result).toEqual({ serverTime: 1672531200000 });
      });

      it('should handle getServerTime errors', async () => {
        const error = new Error('Server error');
        mockSpotClient.getServerTime.mockRejectedValue(error);

        await expect(client.getServerTime()).rejects.toThrow('Server error');
      });
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete trading workflow', async () => {
      const client = new AsterDEX({
        apiKey: 'test-key',
        apiSecret: 'test-secret',
        environment: 'mainnet',
      });

      // Test connectivity
      await client.ping();
      expect(mockSpotClient.ping).toHaveBeenCalled();

      // Get server time
      const serverTime = await client.getServerTime();
      expect(serverTime).toEqual({ serverTime: 1672531200000 });

      // Create WebSocket client
      client.createWebSocketClient({ onTicker: vi.fn() });
      expect(MockAsterWebSocketClient).toHaveBeenCalled();

      // Create futures client
      client.createFuturesClient(
        process.env.FUTURES_USER_ADDRESS as string,
        process.env.FUTURES_SIGNER_ADDRESS as string,
        process.env.FUTURES_PRIVATE_KEY as string,
      );
      expect(MockFuturesClient).toHaveBeenCalled();
    });

    it('should handle environment-based initialization', () => {
      // Mock environment variables
      process.env.ASTERDEX_API_KEY = 'env-key';
      process.env.ASTERDEX_API_SECRET = 'env-secret';
      process.env.ASTERDEX_ENVIRONMENT = 'mainnet';

      const client = AsterDEX.fromEnv();

      expect(MockConfig.fromEnv).toHaveBeenCalled();
      expect(client).toBeInstanceOf(AsterDEX);

      // Clean up
      delete process.env.ASTERDEX_API_KEY;
      delete process.env.ASTERDEX_API_SECRET;
      delete process.env.ASTERDEX_ENVIRONMENT;
    });

    it('should handle credential updates during runtime', () => {
      const client = new AsterDEX();

      // Update credentials
      client.updateCredentials('new-key', 'new-secret');

      expect(mockConfig.updateConfig).toHaveBeenCalledWith({
        apiKey: 'new-key',
        apiSecret: 'new-secret',
      });
      expect(mockSpotClient.updateCredentials).toHaveBeenCalledWith('new-key', 'new-secret');
    });
  });

  describe('error handling', () => {
    it('should handle config initialization errors', () => {
      MockConfig.mockImplementation(() => {
        throw new Error('Invalid configuration');
      });

      expect(() => new AsterDEX()).toThrow('Invalid configuration');
    });

    it('should handle spot client initialization errors', () => {
      MockSpotClient.mockImplementation(() => {
        throw new Error('Failed to initialize spot client');
      });

      expect(() => new AsterDEX()).toThrow('Failed to initialize spot client');
    });

    it('should handle WebSocket client creation errors', () => {
      const client = new AsterDEX();
      mockConfig.getBaseUrl.mockImplementation(() => {
        throw new Error('Invalid WebSocket URL');
      });

      expect(() => client.createWebSocketClient()).toThrow('Invalid WebSocket URL');
    });

    it('should handle futures client creation errors', () => {
      const client = new AsterDEX();

      MockFuturesClient.mockImplementation(() => {
        throw new Error('Invalid Web3 credentials');
      });

      expect(() =>
        client.createFuturesClient('invalid-address', 'invalid-signer', 'invalid-key'),
      ).toThrow('Invalid Web3 credentials');
    });
  });

  describe('type safety', () => {
    it('should accept valid configuration types', () => {
      const validConfig: AsterDEXConfig = {
        apiKey: 'test-key',
        apiSecret: 'test-secret',
        environment: 'mainnet',
        timeout: 10000,
        recvWindow: 5000,
        enableRateLimiting: true,
        baseUrl: {
          spot: 'https://api.example.com',
          futures: 'https://futures.example.com',
          websocket: 'wss://ws.example.com',
        },
        retryConfig: {
          maxRetries: 3,
          retryDelay: 1000,
          backoffMultiplier: 2,
        },
      };

      expect(() => new AsterDEX(validConfig)).not.toThrow();
    });

    it('should handle partial configuration objects', () => {
      const partialConfig: AsterDEXConfig = {
        apiKey: 'test-key',
        environment: 'mainnet',
      };

      expect(() => new AsterDEX(partialConfig)).not.toThrow();
    });

    it('should handle empty configuration object', () => {
      expect(() => new AsterDEX({})).not.toThrow();
    });
  });
});

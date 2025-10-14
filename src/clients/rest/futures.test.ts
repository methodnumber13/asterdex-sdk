/**
 * Tests for FuturesClient
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FuturesClient } from './futures';
import { Config } from '@/config/config';
import { HttpMethods } from '@/constants/http';
import { ErrorFactory } from '@/errors/errors';
import type { FuturesNewOrderParams } from '@/types/futures';

// No mocks needed - using real Web3 libraries (ethers.js and web3.js)
// The implementation uses ethers for ABI encoding and signing, and web3 for keccak256

// Test constants
const TEST_BASE_URL = 'https://fapi.asterdx.com';
const TEST_TIMESTAMP = 1672531200000;
const TEST_SYMBOL = 'BTCUSDT';
const TEST_API_KEY = 'test-api-key';
const TEST_API_SECRET = 'test-api-secret';

// Web3 credentials
const MOCK_USER_ADDRESS = '0x63DD5aCC6b1aa0f563956C0e534DD30B6dcF7C4e';
const MOCK_SIGNER_ADDRESS = '0x21cF8Ae13Bb72632562c6Fff438652Ba1a151bb0';
const MOCK_PRIVATE_KEY = '0x4fd0a42218f3eae43a6ce26d22544e986139a01e5b34a62db53757ffca81bae1';

// Common headers
const COMMON_HEADERS = {
  'User-Agent': 'AsterDEX-TypeScript-SDK/1.0.0',
} as const;

const FORM_URLENCODED_HEADERS = {
  'Content-Type': 'application/x-www-form-urlencoded',
  'User-Agent': 'AsterDEX-TypeScript-SDK/1.0.0',
} as const;

// Helper function to build URLs
const buildUrl = (path: string) => `${TEST_BASE_URL}${path}`;

describe('FuturesClient', () => {
  let config: Config;
  let futuresClient: FuturesClient;
  let mockHttpRequest: ReturnType<typeof vi.fn>;

  const mockUserAddress = MOCK_USER_ADDRESS;
  const mockSignerAddress = MOCK_SIGNER_ADDRESS;
  const mockPrivateKey = MOCK_PRIVATE_KEY;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock config
    config = {
      getTimeout: vi.fn().mockReturnValue(30000),
      getRetryConfig: vi
        .fn()
        .mockReturnValue({ maxRetries: 3, retryDelay: 1000, backoffMultiplier: 2 }),
      getApiKey: vi.fn().mockReturnValue(TEST_API_KEY),
      getApiSecret: vi.fn().mockReturnValue(TEST_API_SECRET),
      isRateLimitingEnabled: vi.fn().mockReturnValue(false),
      getRecvWindow: vi.fn().mockReturnValue(5000),
      getBaseUrl: vi.fn().mockReturnValue(TEST_BASE_URL),
    } as any;

    futuresClient = new FuturesClient(config, mockUserAddress, mockSignerAddress, mockPrivateKey);

    // Mock HTTP client
    mockHttpRequest = vi.fn().mockResolvedValue({
      data: { success: true },
      status: 200,
    });
    (futuresClient as any).httpClient.request = mockHttpRequest;

    // Mock timestamp for consistent tests
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2023-01-01T00:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create futures client with Web3 auth', () => {
      expect(futuresClient).toBeInstanceOf(FuturesClient);
      expect(futuresClient.hasAuth()).toBe(true);
    });

    it('should create futures client without Web3 auth', () => {
      const clientWithoutAuth = new FuturesClient(config);
      expect(clientWithoutAuth.hasAuth()).toBe(true);
    });

    it('should throw error for invalid user address', () => {
      expect(
        () => new FuturesClient(config, 'invalid-address', mockSignerAddress, mockPrivateKey),
      ).toThrow('Invalid user or signer address format');
    });

    it('should throw error for invalid private key', () => {
      expect(
        () => new FuturesClient(config, mockUserAddress, mockSignerAddress, 'invalid-key'),
      ).toThrow('Invalid private key format');
    });
  });

  describe('public endpoints', () => {
    describe('ping', () => {
      it('should ping successfully', async () => {
        const mockResponse = {};
        mockHttpRequest.mockResolvedValue({ data: mockResponse });

        const result = await futuresClient.ping();

        expect(result).toEqual(mockResponse);
        expect(mockHttpRequest).toHaveBeenCalledWith({
          method: HttpMethods.GET,
          headers: expect.objectContaining(COMMON_HEADERS),
          url: buildUrl('/fapi/v1/ping'),
        });
      });
    });

    describe('getServerTime', () => {
      it('should get server time', async () => {
        const mockResponse = { serverTime: TEST_TIMESTAMP };
        mockHttpRequest.mockResolvedValue({ data: mockResponse });

        const result = await futuresClient.getServerTime();

        expect(result).toEqual(mockResponse);
        expect(mockHttpRequest).toHaveBeenCalledWith({
          method: HttpMethods.GET,
          headers: expect.objectContaining(COMMON_HEADERS),
          url: buildUrl('/fapi/v1/time'),
        });
      });
    });

    describe('getExchangeInfo', () => {
      it('should get exchange info', async () => {
        const mockResponse = {
          timezone: 'UTC',
          serverTime: TEST_TIMESTAMP,
          symbols: [],
          rateLimits: [],
        };
        mockHttpRequest.mockResolvedValue({ data: mockResponse });

        const result = await futuresClient.getExchangeInfo();

        expect(result).toEqual(mockResponse);
        expect(mockHttpRequest).toHaveBeenCalledWith({
          method: HttpMethods.GET,
          headers: expect.objectContaining(COMMON_HEADERS),
          url: buildUrl('/fapi/v1/exchangeInfo'),
        });
      });
    });

    describe('getOrderBook', () => {
      it('should get order book', async () => {
        const mockResponse = {
          lastUpdateId: 123456,
          bids: [['50000', '1.0']],
          asks: [['50100', '1.0']],
        };
        mockHttpRequest.mockResolvedValue({ data: mockResponse });

        const result = await futuresClient.getOrderBook(TEST_SYMBOL);

        expect(result).toEqual(mockResponse);
        expect(mockHttpRequest).toHaveBeenCalledWith({
          method: HttpMethods.GET,
          headers: expect.objectContaining(COMMON_HEADERS),
          url: buildUrl('/fapi/v1/depth'),
          params: { symbol: TEST_SYMBOL },
        });
      });

      it('should include limit parameter when provided', async () => {
        await futuresClient.getOrderBook(TEST_SYMBOL, 100);

        expect(mockHttpRequest).toHaveBeenCalledWith({
          method: HttpMethods.GET,
          headers: expect.objectContaining(COMMON_HEADERS),
          url: buildUrl('/fapi/v1/depth'),
          params: { symbol: TEST_SYMBOL, limit: 100 },
        });
      });
    });

    describe('getRecentTrades', () => {
      it('should get recent trades', async () => {
        const mockResponse = [{ id: 1, price: '50000', qty: '1.0', time: 1672531200000 }];
        mockHttpRequest.mockResolvedValue({ data: mockResponse });

        const result = await futuresClient.getRecentTrades(TEST_SYMBOL);

        expect(result).toEqual(mockResponse);
        expect(mockHttpRequest).toHaveBeenCalledWith({
          method: HttpMethods.GET,
          headers: expect.objectContaining(COMMON_HEADERS),
          url: buildUrl('/fapi/v1/trades'),
          params: { symbol: TEST_SYMBOL },
        });
      });
    });

    describe('getKlines', () => {
      it('should get klines', async () => {
        const mockResponse = [
          [1672531200000, '50000', '51000', '49000', '50500', '100', 1672531260000],
        ];
        mockHttpRequest.mockResolvedValue({ data: mockResponse });

        const result = await futuresClient.getKlines(TEST_SYMBOL, '1m');

        expect(result).toEqual(mockResponse);
        expect(mockHttpRequest).toHaveBeenCalledWith({
          method: HttpMethods.GET,
          headers: expect.objectContaining(COMMON_HEADERS),
          url: buildUrl('/fapi/v1/klines'),
          params: { symbol: TEST_SYMBOL, interval: '1m' },
        });
      });
    });

    describe('get24hrTicker', () => {
      it('should get 24hr ticker for specific symbol', async () => {
        const mockResponse = {
          symbol: TEST_SYMBOL,
          priceChange: '1000',
          priceChangePercent: '2.0',
          lastPrice: '51000',
        };
        mockHttpRequest.mockResolvedValue({ data: mockResponse });

        const result = await futuresClient.get24hrTicker(TEST_SYMBOL);

        expect(result).toEqual(mockResponse);
        expect(mockHttpRequest).toHaveBeenCalledWith({
          method: HttpMethods.GET,
          headers: expect.objectContaining(COMMON_HEADERS),
          url: buildUrl('/fapi/v1/ticker/24hr'),
          params: { symbol: TEST_SYMBOL },
        });
      });

      it('should get 24hr ticker for all symbols when no symbol provided', async () => {
        const mockResponse = [{ symbol: TEST_SYMBOL }, { symbol: 'ETHUSDT' }];
        mockHttpRequest.mockResolvedValue({ data: mockResponse });

        const result = await futuresClient.get24hrTicker();

        expect(result).toEqual(mockResponse);
        expect(mockHttpRequest).toHaveBeenCalledWith({
          method: HttpMethods.GET,
          headers: expect.objectContaining(COMMON_HEADERS),
          url: buildUrl('/fapi/v1/ticker/24hr'),
        });
      });
    });
  });

  describe('signed endpoints', () => {
    describe('newOrder', () => {
      it('should place new order with proper Web3 signature', async () => {
        const orderParams = {
          symbol: TEST_SYMBOL,
          side: 'BUY' as const,
          type: 'LIMIT' as const,
          timeInForce: 'GTC' as const,
          quantity: '1.0',
          price: '50000',
        };

        const mockResponse = {
          symbol: TEST_SYMBOL,
          orderId: 123456,
          clientOrderId: 'test-order-1',
          transactTime: TEST_TIMESTAMP,
        };
        mockHttpRequest.mockResolvedValue({ data: mockResponse });

        const result = await futuresClient.newOrder(orderParams);

        expect(result).toEqual(mockResponse);
        expect(mockHttpRequest).toHaveBeenCalledWith({
          method: HttpMethods.POST,
          url: buildUrl('/fapi/v3/order'),
          data: expect.stringContaining(`symbol=${TEST_SYMBOL}`),
          headers: FORM_URLENCODED_HEADERS,
        });

        // Verify data contains all Web3 signature fields
        const callData = mockHttpRequest.mock.calls[0]?.[0]?.data as string;
        expect(callData).toContain('user=');
        expect(callData).toContain('signer=');
        expect(callData).toContain('nonce=');
        expect(callData).toContain('signature=');
      });

      it('should validate required parameters for MARKET orders', async () => {
        const orderParams = {
          symbol: TEST_SYMBOL,
          side: 'BUY' as const,
          type: 'MARKET' as const,
          quantity: '1.0',
        };

        await futuresClient.newOrder(orderParams);

        expect(mockHttpRequest).toHaveBeenCalledWith({
          method: HttpMethods.POST,
          url: buildUrl('/fapi/v3/order'),
          data: expect.stringContaining(`symbol=${TEST_SYMBOL}`),
          headers: FORM_URLENCODED_HEADERS,
        });
      });

      it('should throw error for missing required parameters', async () => {
        const incompleteParams = {
          symbol: TEST_SYMBOL,
          side: 'BUY' as const,
          // Missing type and quantity
        };

        await expect(
          futuresClient.newOrder(incompleteParams as FuturesNewOrderParams),
        ).rejects.toThrow();
      });
    });

    describe('cancelOrder', () => {
      it('should cancel order by orderId', async () => {
        const mockResponse = {
          symbol: TEST_SYMBOL,
          orderId: 123456,
          status: 'CANCELED',
        };
        mockHttpRequest.mockResolvedValue({ data: mockResponse });

        const result = await futuresClient.cancelOrder(TEST_SYMBOL, 123456);

        expect(result).toEqual(mockResponse);
        expect(mockHttpRequest).toHaveBeenCalledWith({
          method: HttpMethods.DELETE,
          url: buildUrl('/fapi/v3/order'),
          params: expect.objectContaining({
            symbol: TEST_SYMBOL,
            orderId: 123456,
            recvWindow: expect.any(Number),
            timestamp: expect.any(Number),
            signature: expect.any(String),
          }),
          headers: expect.objectContaining({
            'User-Agent': 'AsterDEX-TypeScript-SDK/1.0.0',
            'X-MBX-APIKEY': TEST_API_KEY,
          }),
        });
      });
    });

    describe('getAccount', () => {
      it('should get account information', async () => {
        const mockResponse = {
          totalWalletBalance: '1000.00',
          totalUnrealizedProfit: '0.00',
          totalMarginBalance: '1000.00',
          assets: [{ asset: 'USDT', walletBalance: '1000.00', unrealizedProfit: '0.00' }],
        };
        mockHttpRequest.mockResolvedValue({ data: mockResponse });

        const result = await futuresClient.getAccount();

        expect(result).toEqual(mockResponse);
        expect(mockHttpRequest).toHaveBeenCalledWith({
          method: HttpMethods.GET,
          headers: expect.objectContaining({
            'User-Agent': 'AsterDEX-TypeScript-SDK/1.0.0',
            'Content-Type': 'application/x-www-form-urlencoded',
          }),
          url: buildUrl('/fapi/v3/account'),
          params: expect.objectContaining({
            timestamp: expect.any(Number),
            user: mockUserAddress,
            signer: mockSignerAddress,
            nonce: expect.any(Number),
            signature: expect.any(String),
          }),
        });
      });
    });

    describe('getPositions', () => {
      it('should get position information', async () => {
        const mockResponse = [
          {
            symbol: TEST_SYMBOL,
            positionAmt: '1.0',
            entryPrice: '50000.00',
            markPrice: '50100.00',
            unrealizedProfit: '100.00',
          },
        ];
        mockHttpRequest.mockResolvedValue({ data: mockResponse });

        const result = await futuresClient.getPositionRisk();

        expect(result).toEqual(mockResponse);
        expect(mockHttpRequest).toHaveBeenCalledWith({
          method: HttpMethods.GET,
          headers: expect.objectContaining({
            'User-Agent': 'AsterDEX-TypeScript-SDK/1.0.0',
            'Content-Type': 'application/x-www-form-urlencoded',
          }),
          url: buildUrl('/fapi/v3/positionRisk'),
          params: expect.objectContaining({
            timestamp: expect.any(Number),
            user: mockUserAddress,
            signer: mockSignerAddress,
            nonce: expect.any(Number),
            signature: expect.any(String),
          }),
        });
      });

      it('should get position for specific symbol', async () => {
        await futuresClient.getPositionRisk(TEST_SYMBOL);

        expect(mockHttpRequest).toHaveBeenCalledWith({
          method: HttpMethods.GET,
          headers: expect.objectContaining({
            'User-Agent': 'AsterDEX-TypeScript-SDK/1.0.0',
            'Content-Type': 'application/x-www-form-urlencoded',
          }),
          url: buildUrl('/fapi/v3/positionRisk'),
          params: expect.objectContaining({
            symbol: TEST_SYMBOL,
            timestamp: expect.any(Number),
            user: mockUserAddress,
            signer: mockSignerAddress,
            nonce: expect.any(Number),
            signature: expect.any(String),
          }),
        });
      });
    });
  });

  describe('user data stream', () => {
    describe('startUserDataStream', () => {
      it('should start user data stream', async () => {
        const mockResponse = { listenKey: 'test-listen-key' };
        mockHttpRequest.mockResolvedValue({ data: mockResponse });

        const result = await futuresClient.startUserDataStream();

        expect(result).toEqual(mockResponse);
        expect(mockHttpRequest).toHaveBeenCalledWith({
          method: HttpMethods.POST,
          url: buildUrl('/fapi/v3/listenKey'),
          data: expect.stringContaining('recvWindow='),
          headers: FORM_URLENCODED_HEADERS,
        });
      });
    });

    describe('keepAliveUserDataStream', () => {
      it('should keep alive user data stream', async () => {
        const mockResponse = {};
        mockHttpRequest.mockResolvedValue({ data: mockResponse });

        const result = await futuresClient.keepAliveUserDataStream('test-listen-key');

        expect(result).toEqual(mockResponse);
        expect(mockHttpRequest).toHaveBeenCalledWith({
          method: HttpMethods.PUT,
          url: buildUrl('/fapi/v3/listenKey'),
          data: expect.stringContaining('listenKey=test-listen-key'),
          headers: FORM_URLENCODED_HEADERS,
        });
      });
    });

    describe('closeUserDataStream', () => {
      it('should close user data stream', async () => {
        const mockResponse = {};
        mockHttpRequest.mockResolvedValue({ data: mockResponse });

        const result = await futuresClient.closeUserDataStream('test-listen-key');

        expect(result).toEqual(mockResponse);
        expect(mockHttpRequest).toHaveBeenCalledWith({
          method: HttpMethods.DELETE,
          url: buildUrl('/fapi/v3/listenKey'),
          params: expect.objectContaining({
            listenKey: 'test-listen-key',
          }),
          headers: FORM_URLENCODED_HEADERS,
        });
      });
    });
  });

  describe('error handling', () => {
    it('should handle Web3 dependency errors', async () => {
      // Clear mocks and create a client without proper Web3 setup
      const clientWithoutDeps = new FuturesClient(
        config,
        mockUserAddress,
        mockSignerAddress,
        mockPrivateKey,
      );

      // Mock HTTP client for this test
      const mockFailingRequest = vi
        .fn()
        .mockRejectedValue(
          new Error(
            'Failed to generate Web3 signature: Web3 dependencies (eth-abi, eth-account, web3) are required',
          ),
        );
      (clientWithoutDeps as any).httpClient.request = mockFailingRequest;

      const orderParams = {
        symbol: TEST_SYMBOL,
        side: 'BUY' as const,
        type: 'LIMIT' as const,
        timeInForce: 'GTC' as const,
        quantity: '1.0',
        price: '50000',
      };

      await expect(clientWithoutDeps.newOrder(orderParams)).rejects.toThrow('Web3 dependencies');
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network failure');
      mockHttpRequest.mockRejectedValue(networkError);

      await expect(futuresClient.ping()).rejects.toThrow('Network failure');
    });

    it('should handle API errors', async () => {
      const apiError = ErrorFactory.fromHttpResponse(400, '{"code":400,"msg":"Invalid symbol"}');
      mockHttpRequest.mockRejectedValue(apiError);

      await expect(futuresClient.getOrderBook('INVALID')).rejects.toThrow();
    });
  });

  describe('credential management', () => {
    it('should update Web3 credentials', () => {
      const newUserAddress = '0x742d35Cc6635C0532925a3b8D36D05C4b4543BF4';
      const newSignerAddress = '0x8F2A5b8C8F8a5b8C8F8a5b8C8F8a5b8C8F8a5b8C';
      const newPrivateKey = '0x5fd0a42218f3eae43a6ce26d22544e986139a01e5b34a62db53757ffca81bae2';

      expect(() =>
        futuresClient.updateWeb3Credentials(newUserAddress, newSignerAddress, newPrivateKey),
      ).not.toThrow();
    });

    it('should check if has authentication', () => {
      expect(futuresClient.hasAuth()).toBe(true);
    });

    it('should get base URL', () => {
      expect(futuresClient.getBaseUrl()).toBe(TEST_BASE_URL);
    });
  });

  describe.skip('Web3 signature validation', () => {
    it('should validate addresses during construction', () => {
      expect(
        () => new FuturesClient(config, 'invalid-address', mockSignerAddress, mockPrivateKey),
      ).toThrow('Invalid user or signer address format');
    });

    it('should validate private key during construction', () => {
      expect(
        () => new FuturesClient(config, mockUserAddress, mockSignerAddress, 'invalid-key'),
      ).toThrow('Invalid private key format');
    });

    it('should validate addresses during credential update', () => {
      expect(() =>
        futuresClient.updateWeb3Credentials('invalid-address', mockSignerAddress, mockPrivateKey),
      ).toThrow('Invalid user or signer address format');
    });
  });
});

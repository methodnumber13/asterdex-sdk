/**
 * Tests for SpotClient
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SpotClient } from './spot';
import { Config } from '@/config/config';
import { HttpMethods } from '@/constants/http';
import { ErrorFactory } from '@/errors/errors';
import type { NewOrderParams } from '@/types/spot';

// Test constants
const TEST_API_KEY = 'test-api-key';
const TEST_API_SECRET = 'test-api-secret';
const TEST_BASE_URL = 'https://sapi.asterdx.com';
const TEST_RECV_WINDOW = 5000;
const TEST_TIMESTAMP = 1672531200000;
const MOCK_USER_ADDRESS = '0x63DD5aCC6b1aa0f563956C0e534DD30B6dcF7C4e';
const MOCK_SIGNER_ADDRESS = '0x21cF8Ae13Bb72632562c6Fff438652Ba1a151bb0';
const MOCK_PRIVATE_KEY = '0x4fd0a42218f3eae43a6ce26d22544e986139a01e5b34a62db53757ffca81bae1';

const COMMON_HEADERS = {
  'User-Agent': 'AsterDEX-TypeScript-SDK/1.0.0',
} as const;

const SIGNED_HEADERS = {
  ...COMMON_HEADERS,
  'X-MBX-APIKEY': TEST_API_KEY,
} as const;

const FORM_URLENCODED_HEADERS = {
  'Content-Type': 'application/x-www-form-urlencoded',
  'User-Agent': 'AsterDEX-TypeScript-SDK/1.0.0',
} as const;

const SIGNED_FORM_URLENCODED_HEADERS = {
  ...FORM_URLENCODED_HEADERS,
  'X-MBX-APIKEY': TEST_API_KEY,
} as const;

const buildUrl = (path: string) => `${TEST_BASE_URL}${path}`;

describe('SpotClient', () => {
  let config: Config;
  let client: SpotClient;
  let mockHttpRequest: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Mock config
    config = {
      getTimeout: vi.fn().mockReturnValue(30000),
      getRetryConfig: vi
        .fn()
        .mockReturnValue({ maxRetries: 3, retryDelay: 1000, backoffMultiplier: 2 }),
      getApiKey: vi.fn().mockReturnValue(TEST_API_KEY),
      getApiSecret: vi.fn().mockReturnValue(TEST_API_SECRET),
      isRateLimitingEnabled: vi.fn().mockReturnValue(false),
      getRecvWindow: vi.fn().mockReturnValue(TEST_RECV_WINDOW),
      getBaseUrl: vi.fn().mockReturnValue(TEST_BASE_URL),
    } as any;

    client = new SpotClient(config);

    // Mock HTTP client
    mockHttpRequest = vi.fn().mockResolvedValue({
      data: { success: true },
      status: 200,
    });
    (client as any).httpClient.request = mockHttpRequest;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Market Data Endpoints', () => {
    describe('connectivity', () => {
      it('should ping the Spot V3 API', async () => {
        const mockData = {};
        mockHttpRequest.mockResolvedValue({ data: mockData });

        const result = await client.ping();

        expect(result).toEqual(mockData);
        expect(mockHttpRequest).toHaveBeenCalledWith({
          method: HttpMethods.GET,
          url: buildUrl('/api/v3/ping'),
          headers: COMMON_HEADERS,
        });
      });

      it('should get server time from the Spot V3 API', async () => {
        const mockData = { serverTime: 1640995200000 };
        mockHttpRequest.mockResolvedValue({ data: mockData });

        const result = await client.getServerTime();

        expect(result).toEqual(mockData);
        expect(mockHttpRequest).toHaveBeenCalledWith({
          method: HttpMethods.GET,
          url: buildUrl('/api/v3/time'),
          headers: COMMON_HEADERS,
        });
      });
    });

    describe('getExchangeInfo', () => {
      it('should fetch exchange information', async () => {
        const mockData = {
          timezone: 'UTC',
          serverTime: 1640995200000,
          symbols: [],
          assets: [],
        };
        mockHttpRequest.mockResolvedValue({ data: mockData });

        const result = await client.getExchangeInfo();

        expect(result).toEqual(mockData);
        expect(mockHttpRequest).toHaveBeenCalledWith({
          method: HttpMethods.GET,
          url: buildUrl('/api/v3/exchangeInfo'),
          headers: COMMON_HEADERS,
        });
      });
    });

    describe('getOrderBook', () => {
      it('should fetch order book with symbol', async () => {
        const mockData = {
          lastUpdateId: 123456,
          bids: [['50000', '1.0']],
          asks: [['50100', '1.0']],
        };
        mockHttpRequest.mockResolvedValue({ data: mockData });

        const result = await client.getOrderBook('BTCUSDT');

        expect(result).toEqual(mockData);
        expect(mockHttpRequest).toHaveBeenCalledWith({
          method: HttpMethods.GET,
          url: buildUrl('/api/v3/depth'),
          params: { symbol: 'BTCUSDT' },
          headers: COMMON_HEADERS,
        });
      });

      it('should fetch order book with symbol and limit', async () => {
        await client.getOrderBook('BTCUSDT', 100);

        expect(mockHttpRequest).toHaveBeenCalledWith({
          method: HttpMethods.GET,
          url: buildUrl('/api/v3/depth'),
          params: {
            symbol: 'BTCUSDT',
            limit: 100,
          },
          headers: COMMON_HEADERS,
        });
      });

      it('should validate required symbol parameter', async () => {
        await expect(client.getOrderBook('')).rejects.toThrow(
          'Missing required parameters: symbol',
        );
      });
    });

    describe('getRecentTrades', () => {
      it('should fetch recent trades', async () => {
        const mockData = [{ id: 1, price: '50000', qty: '1.0', time: 1640995200000 }];
        mockHttpRequest.mockResolvedValue({ data: mockData });

        const result = await client.getRecentTrades('BTCUSDT');

        expect(result).toEqual(mockData);
        expect(mockHttpRequest).toHaveBeenCalledWith({
          method: HttpMethods.GET,
          url: buildUrl('/api/v3/trades'),
          params: { symbol: 'BTCUSDT' },
          headers: COMMON_HEADERS,
        });
      });

      it('should include limit parameter when provided', async () => {
        await client.getRecentTrades('BTCUSDT', 500);

        expect(mockHttpRequest).toHaveBeenCalledWith({
          method: HttpMethods.GET,
          url: buildUrl('/api/v3/trades'),
          params: { symbol: 'BTCUSDT', limit: 500 },
          headers: COMMON_HEADERS,
        });
      });
    });

    describe('getHistoricalTrades', () => {
      it('should fetch historical trades with API key', async () => {
        const mockData = [{ id: 1, price: '50000', qty: '1.0', time: 1640995200000 }];
        mockHttpRequest.mockResolvedValue({ data: mockData });

        const result = await client.getHistoricalTrades('BTCUSDT');

        expect(result).toEqual(mockData);
        expect(mockHttpRequest).toHaveBeenCalledWith({
          method: HttpMethods.GET,
          url: buildUrl('/api/v3/historicalTrades'),
          params: { symbol: 'BTCUSDT' },
          headers: COMMON_HEADERS,
        });
      });
    });

    describe('getKlines', () => {
      it('should fetch klines with symbol and interval', async () => {
        const mockData = [
          [1640995200000, '50000', '51000', '49000', '50500', '100', 1640995260000],
        ];
        mockHttpRequest.mockResolvedValue({ data: mockData });

        const result = await client.getKlines('BTCUSDT', '1m');

        expect(result).toEqual(mockData);
        expect(mockHttpRequest).toHaveBeenCalledWith({
          method: HttpMethods.GET,
          url: buildUrl('/api/v3/klines'),
          params: {
            symbol: 'BTCUSDT',
            interval: '1m',
          },
          headers: COMMON_HEADERS,
        });
      });

      it('should include optional parameters', async () => {
        await client.getKlines('BTCUSDT', '1h', {
          startTime: 1640995200000,
          endTime: 1641081600000,
          limit: 500,
        });

        expect(mockHttpRequest).toHaveBeenCalledWith({
          method: HttpMethods.GET,
          url: buildUrl('/api/v3/klines'),
          params: {
            symbol: 'BTCUSDT',
            interval: '1h',
            startTime: 1640995200000,
            endTime: 1641081600000,
            limit: 500,
          },
          headers: COMMON_HEADERS,
        });
      });
    });

    describe('get24hrTicker', () => {
      it('should fetch 24hr ticker for specific symbol', async () => {
        const mockData = {
          symbol: 'BTCUSDT',
          priceChange: '1000',
          priceChangePercent: '2.0',
          lastPrice: '51000',
        };
        mockHttpRequest.mockResolvedValue({ data: mockData });

        const result = await client.get24hrTicker('BTCUSDT');

        expect(result).toEqual(mockData);
        expect(mockHttpRequest).toHaveBeenCalledWith({
          method: HttpMethods.GET,
          url: buildUrl('/api/v3/ticker/24hr'),
          params: { symbol: 'BTCUSDT' },
          headers: COMMON_HEADERS,
        });
      });

      it('should fetch 24hr ticker for all symbols when no symbol provided', async () => {
        const mockData = [{ symbol: 'BTCUSDT' }, { symbol: 'ETHUSDT' }];
        mockHttpRequest.mockResolvedValue({ data: mockData });

        const result = await client.get24hrTicker();

        expect(result).toEqual(mockData);
        expect(mockHttpRequest).toHaveBeenCalledWith({
          method: HttpMethods.GET,
          url: buildUrl('/api/v3/ticker/24hr'),
          headers: COMMON_HEADERS,
        });
      });
    });

    describe('additional Spot V3 public endpoints', () => {
      it('should route price, book ticker, commission, and withdraw fee to V3 endpoints', async () => {
        const cases = [
          {
            call: () => client.getPrice('BTCUSDT'),
            url: '/api/v3/ticker/price',
            params: { symbol: 'BTCUSDT' },
          },
          {
            call: () => client.getBookTicker('BTCUSDT'),
            url: '/api/v3/ticker/bookTicker',
            params: { symbol: 'BTCUSDT' },
          },
          {
            call: () => client.getWithdrawFee('56', 'USDT'),
            url: '/api/v3/aster/withdraw/estimateFee',
            params: { chainId: '56', asset: 'USDT' },
          },
        ];

        for (const current of cases) {
          mockHttpRequest.mockClear();

          await current.call();

          expect(mockHttpRequest).toHaveBeenCalledWith({
            method: HttpMethods.GET,
            url: buildUrl(current.url),
            params: current.params,
            headers: COMMON_HEADERS,
          });
        }
      });
    });
  });

  describe('Trading Endpoints', () => {
    beforeEach(() => {
      // Mock signed request - add timestamp and signature
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2023-01-01T00:00:00.000Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    describe('newOrder', () => {
      it('should place a LIMIT order', async () => {
        const orderParams = {
          symbol: 'BTCUSDT',
          side: 'BUY' as const,
          type: 'LIMIT' as const,
          timeInForce: 'GTC' as const,
          quantity: '1.0',
          price: '50000',
        };

        const mockResponse = {
          symbol: 'BTCUSDT',
          orderId: 123456,
          clientOrderId: 'test-order-1',
          transactTime: 1672531200000,
        };
        mockHttpRequest.mockResolvedValue({ data: mockResponse });

        const result = await client.newOrder(orderParams);

        expect(result).toEqual(mockResponse);
        expect(mockHttpRequest).toHaveBeenCalledWith({
          method: HttpMethods.POST,
          url: buildUrl('/api/v1/order'),
          params: expect.objectContaining({
            symbol: 'BTCUSDT',
            side: 'BUY',
            type: 'LIMIT',
            timeInForce: 'GTC',
            quantity: '1.0',
            price: '50000',
            recvWindow: TEST_RECV_WINDOW,
            timestamp: TEST_TIMESTAMP,
            signature: expect.any(String),
          }),
          headers: SIGNED_HEADERS,
        });
      });

      it('should validate required parameters for LIMIT orders', async () => {
        const incompleteParams = {
          symbol: 'BTCUSDT',
          side: 'BUY' as const,
          type: 'LIMIT' as const,
          // Missing timeInForce, quantity, price
        };

        await expect(client.newOrder(incompleteParams as NewOrderParams)).rejects.toThrow();
      });

      it('should place a MARKET order', async () => {
        const orderParams = {
          symbol: 'BTCUSDT',
          side: 'BUY' as const,
          type: 'MARKET' as const,
          quantity: '1.0',
        };

        await client.newOrder(orderParams);

        expect(mockHttpRequest).toHaveBeenCalledWith({
          method: HttpMethods.POST,
          url: buildUrl('/api/v1/order'),
          params: expect.objectContaining({
            symbol: 'BTCUSDT',
            side: 'BUY',
            type: 'MARKET',
            quantity: '1.0',
            recvWindow: TEST_RECV_WINDOW,
            timestamp: TEST_TIMESTAMP,
            signature: expect.any(String),
          }),
          headers: SIGNED_HEADERS,
        });
      });
    });

    describe('cancelOrder', () => {
      it('should cancel order by orderId', async () => {
        const mockResponse = {
          symbol: 'BTCUSDT',
          orderId: 123456,
          status: 'CANCELED',
        };
        mockHttpRequest.mockResolvedValue({ data: mockResponse });

        const result = await client.cancelOrder('BTCUSDT', 123456);

        expect(result).toEqual(mockResponse);
        expect(mockHttpRequest).toHaveBeenCalledWith({
          method: HttpMethods.DELETE,
          url: buildUrl('/api/v1/order'),
          params: expect.objectContaining({
            symbol: 'BTCUSDT',
            orderId: 123456,
            recvWindow: TEST_RECV_WINDOW,
            timestamp: TEST_TIMESTAMP,
            signature: expect.any(String),
          }),
          headers: SIGNED_HEADERS,
        });
      });

      it('should cancel order by origClientOrderId', async () => {
        await client.cancelOrder('BTCUSDT', undefined, 'test-order-1');

        expect(mockHttpRequest).toHaveBeenCalledWith({
          method: HttpMethods.DELETE,
          url: buildUrl('/api/v1/order'),
          params: expect.objectContaining({
            symbol: 'BTCUSDT',
            origClientOrderId: 'test-order-1',
            recvWindow: TEST_RECV_WINDOW,
            timestamp: TEST_TIMESTAMP,
            signature: expect.any(String),
          }),
          headers: SIGNED_HEADERS,
        });
      });

      it('should throw error when neither orderId nor origClientOrderId provided', async () => {
        await expect(client.cancelOrder('BTCUSDT')).rejects.toThrow(
          'Either orderId or origClientOrderId must be provided',
        );
      });
    });

    describe('getOrder', () => {
      it('should get order by orderId', async () => {
        const mockOrder = {
          symbol: 'BTCUSDT',
          orderId: 123456,
          status: 'FILLED',
          side: 'BUY',
          type: 'LIMIT',
        };
        mockHttpRequest.mockResolvedValue({ data: mockOrder });

        const result = await client.getOrder('BTCUSDT', 123456);

        expect(result).toEqual(mockOrder);
        expect(mockHttpRequest).toHaveBeenCalledWith({
          method: HttpMethods.GET,
          url: buildUrl('/api/v1/order'),
          params: expect.objectContaining({
            symbol: 'BTCUSDT',
            orderId: 123456,
            recvWindow: TEST_RECV_WINDOW,
            timestamp: TEST_TIMESTAMP,
            signature: expect.any(String),
          }),
          headers: SIGNED_HEADERS,
        });
      });
    });

    describe('getOpenOrders', () => {
      it('should get open orders for specific symbol', async () => {
        const mockOrders = [{ symbol: 'BTCUSDT', orderId: 123456, status: 'NEW' }];
        mockHttpRequest.mockResolvedValue({ data: mockOrders });

        const result = await client.getOpenOrders('BTCUSDT');

        expect(result).toEqual(mockOrders);
        expect(mockHttpRequest).toHaveBeenCalledWith({
          method: HttpMethods.GET,
          url: buildUrl('/api/v1/openOrders'),
          params: expect.objectContaining({
            symbol: 'BTCUSDT',
            recvWindow: TEST_RECV_WINDOW,
            timestamp: TEST_TIMESTAMP,
            signature: expect.any(String),
          }),
          headers: SIGNED_HEADERS,
        });
      });

      it('should get open orders for all symbols when no symbol provided', async () => {
        await client.getOpenOrders();

        expect(mockHttpRequest).toHaveBeenCalledWith({
          method: HttpMethods.GET,
          url: buildUrl('/api/v1/openOrders'),
          params: expect.objectContaining({
            recvWindow: TEST_RECV_WINDOW,
            timestamp: TEST_TIMESTAMP,
            signature: expect.any(String),
          }),
          headers: SIGNED_HEADERS,
        });
      });
    });
  });

  describe('Account Endpoints', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2023-01-01T00:00:00.000Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    describe('getAccount', () => {
      it('should get account information', async () => {
        const mockAccount = {
          makerCommission: 10,
          takerCommission: 10,
          buyerCommission: 0,
          sellerCommission: 0,
          balances: [{ asset: 'BTC', free: '1.00000000', locked: '0.00000000' }],
        };
        mockHttpRequest.mockResolvedValue({ data: mockAccount });

        const result = await client.getAccount();

        expect(result).toEqual(mockAccount);
        expect(mockHttpRequest).toHaveBeenCalledWith({
          method: HttpMethods.GET,
          url: buildUrl('/api/v1/account'),
          params: expect.objectContaining({
            recvWindow: TEST_RECV_WINDOW,
            timestamp: TEST_TIMESTAMP,
            signature: expect.any(String),
          }),
          headers: SIGNED_HEADERS,
        });
      });
    });

    describe('getMyTrades', () => {
      it('should get trades for specific symbol', async () => {
        const mockTrades = [
          {
            symbol: 'BTCUSDT',
            id: 123456,
            orderId: 789012,
            price: '50000.00',
            qty: '1.00000000',
            commission: '0.00100000',
            commissionAsset: 'BTC',
          },
        ];
        mockHttpRequest.mockResolvedValue({ data: mockTrades });

        const result = await client.getMyTrades('BTCUSDT');

        expect(result).toEqual(mockTrades);
        expect(mockHttpRequest).toHaveBeenCalledWith({
          method: HttpMethods.GET,
          url: buildUrl('/api/v1/userTrades'),
          params: expect.objectContaining({
            symbol: 'BTCUSDT',
            recvWindow: TEST_RECV_WINDOW,
            timestamp: TEST_TIMESTAMP,
            signature: expect.any(String),
          }),
          headers: SIGNED_HEADERS,
        });
      });
    });
  });

  describe('Asset Management', () => {
    describe('Spot V3 account methods', () => {
      let v3Client: SpotClient;

      beforeEach(() => {
        v3Client = new SpotClient(config, MOCK_USER_ADDRESS, MOCK_SIGNER_ADDRESS, MOCK_PRIVATE_KEY);
        (v3Client as any).httpClient.request = mockHttpRequest;
      });

      it('should submit Spot V3 noop with Web3 signature', async () => {
        await v3Client.noop();

        expect(mockHttpRequest).toHaveBeenCalledWith({
          method: HttpMethods.POST,
          url: buildUrl('/api/v3/noop'),
          data: expect.stringContaining('signature='),
          headers: FORM_URLENCODED_HEADERS,
        });
      });

      it('should route Spot V3 order and account methods through Web3 signatures', async () => {
        const orderParams = {
          symbol: 'BTCUSDT',
          side: 'BUY' as const,
          type: 'LIMIT' as const,
          timeInForce: 'GTC' as const,
          quantity: '1.0',
          price: '50000',
        };
        const cases = [
          {
            call: () => v3Client.newOrder(orderParams),
            method: HttpMethods.POST,
            url: '/api/v3/order',
            bodyIncludes: ['symbol=BTCUSDT', 'side=BUY', 'type=LIMIT'],
          },
          {
            call: () => v3Client.cancelOrder('BTCUSDT', undefined, 'client-order-1'),
            method: HttpMethods.DELETE,
            url: '/api/v3/order',
            params: { symbol: 'BTCUSDT', origClientOrderId: 'client-order-1' },
          },
          {
            call: () => v3Client.getOrder('BTCUSDT', 123),
            method: HttpMethods.GET,
            url: '/api/v3/order',
            params: { symbol: 'BTCUSDT', orderId: 123 },
          },
          {
            call: () => v3Client.getCurrentOpenOrder('BTCUSDT', undefined, 'client-open-1'),
            method: HttpMethods.GET,
            url: '/api/v3/openOrder',
            params: { symbol: 'BTCUSDT', origClientOrderId: 'client-open-1' },
          },
          {
            call: () => v3Client.getOpenOrders('BTCUSDT'),
            method: HttpMethods.GET,
            url: '/api/v3/openOrders',
            params: { symbol: 'BTCUSDT' },
          },
          {
            call: () => v3Client.getAllOrders('BTCUSDT', { limit: 10 }),
            method: HttpMethods.GET,
            url: '/api/v3/allOrders',
            params: { symbol: 'BTCUSDT', limit: 10 },
          },
          {
            call: () => v3Client.getAccount(),
            method: HttpMethods.GET,
            url: '/api/v3/account',
            params: {},
          },
          {
            call: () => v3Client.getMyTrades('BTCUSDT', { limit: 10 }),
            method: HttpMethods.GET,
            url: '/api/v3/userTrades',
            params: { symbol: 'BTCUSDT', limit: 10 },
          },
          {
            call: () => v3Client.getCommissionRate('BTCUSDT'),
            method: HttpMethods.GET,
            url: '/api/v3/commissionRate',
            params: { symbol: 'BTCUSDT' },
          },
        ];

        for (const current of cases) {
          mockHttpRequest.mockClear();

          await current.call();

          const request = mockHttpRequest.mock.calls[0]?.[0];
          expect(request).toMatchObject({
            method: current.method,
            url: buildUrl(current.url),
            headers: FORM_URLENCODED_HEADERS,
          });

          if ('bodyIncludes' in current) {
            const requestData = String(request.data);
            current.bodyIncludes.forEach((expected) => {
              expect(requestData).toContain(expected);
            });
            expect(requestData).toContain('signature=');
          } else {
            expect(request.params).toEqual(
              expect.objectContaining({
                ...current.params,
                user: MOCK_USER_ADDRESS,
                signer: MOCK_SIGNER_ADDRESS,
                signature: expect.any(String),
              }),
            );
          }
        }
      });

      it('should cancel all open orders with Web3 signature', async () => {
        const mockResponse = { code: 200, msg: 'The operation of cancel all open order is done.' };
        mockHttpRequest.mockResolvedValue({ data: mockResponse });

        const result = await v3Client.cancelAllOpenOrders('BTCUSDT');

        expect(result).toEqual(mockResponse);
        expect(mockHttpRequest).toHaveBeenCalledWith({
          method: HttpMethods.DELETE,
          url: buildUrl('/api/v3/allOpenOrders'),
          params: expect.objectContaining({
            symbol: 'BTCUSDT',
            user: MOCK_USER_ADDRESS,
            signer: MOCK_SIGNER_ADDRESS,
            nonce: expect.any(Number),
            signature: expect.any(String),
          }),
          headers: FORM_URLENCODED_HEADERS,
        });
      });

      it('should include cancel-all order lists when provided', async () => {
        await v3Client.cancelAllOpenOrders('BTCUSDT', [1, 2], ['client-1']);

        expect(mockHttpRequest).toHaveBeenCalledWith({
          method: HttpMethods.DELETE,
          url: buildUrl('/api/v3/allOpenOrders'),
          params: expect.objectContaining({
            symbol: 'BTCUSDT',
            orderIdList: '[1,2]',
            origClientOrderIdList: '["client-1"]',
            signature: expect.any(String),
          }),
          headers: FORM_URLENCODED_HEADERS,
        });
      });

      it('should get transaction history with Web3 signature', async () => {
        const mockResponse = [{ tranId: 123, asset: 'USDT', type: 'TRANSFER' }];
        mockHttpRequest.mockResolvedValue({ data: mockResponse });

        const result = await v3Client.getTransactionHistory({
          asset: 'USDT',
          type: 'TRANSFER',
          limit: 100,
        });

        expect(result).toEqual(mockResponse);
        expect(mockHttpRequest).toHaveBeenCalledWith({
          method: HttpMethods.GET,
          url: buildUrl('/api/v3/transactionHistory'),
          params: expect.objectContaining({
            asset: 'USDT',
            type: 'TRANSFER',
            limit: 100,
            user: MOCK_USER_ADDRESS,
            signer: MOCK_SIGNER_ADDRESS,
            signature: expect.any(String),
          }),
          headers: FORM_URLENCODED_HEADERS,
        });
      });

      it('should route Spot V3 transfer, withdraw, and listen-key methods through Web3 signatures', async () => {
        const cases = [
          {
            call: () =>
              v3Client.transferAsset({
                asset: 'USDT',
                amount: '10',
                clientTranId: 'transfer-1',
                kindType: 'SPOT_FUTURE',
              }),
            method: HttpMethods.POST,
            url: '/api/v3/asset/wallet/transfer',
            bodyIncludes: ['asset=USDT', 'amount=10', 'clientTranId=transfer-1'],
          },
          {
            call: () =>
              v3Client.withdraw({
                chainId: '56',
                asset: 'USDT',
                amount: '1',
                fee: '0.1',
                receiver: MOCK_USER_ADDRESS,
                nonce: '1672531200000000',
                userSignature: '0xuser',
              }),
            method: HttpMethods.POST,
            url: '/api/v3/aster/user-withdraw',
            bodyIncludes: ['chainId=56', 'asset=USDT', 'receiver=', 'nonce=1672531200000000'],
          },
          {
            call: () => v3Client.startUserDataStream(),
            method: HttpMethods.POST,
            url: '/api/v3/listenKey',
            bodyIncludes: ['signature='],
          },
          {
            call: () => v3Client.keepAliveUserDataStream('listen-key-1'),
            method: HttpMethods.PUT,
            url: '/api/v3/listenKey',
            bodyIncludes: ['listenKey=listen-key-1'],
          },
          {
            call: () => v3Client.closeUserDataStream('listen-key-1'),
            method: HttpMethods.DELETE,
            url: '/api/v3/listenKey',
            params: { listenKey: 'listen-key-1' },
          },
        ];

        for (const current of cases) {
          mockHttpRequest.mockClear();

          await current.call();

          const request = mockHttpRequest.mock.calls[0]?.[0];
          expect(request).toMatchObject({
            method: current.method,
            url: buildUrl(current.url),
            headers: FORM_URLENCODED_HEADERS,
          });

          if ('bodyIncludes' in current) {
            const requestData = String(request.data);
            current.bodyIncludes.forEach((expected) => {
              expect(requestData).toContain(expected);
            });
            expect(requestData).toContain('signature=');
          } else {
            expect(request.params).toEqual(
              expect.objectContaining({
                ...current.params,
                user: MOCK_USER_ADDRESS,
                signer: MOCK_SIGNER_ADDRESS,
                signature: expect.any(String),
              }),
            );
          }
        }
      });

      it('should preserve legacy fallback when Web3 credentials are not configured', async () => {
        await client.cancelAllOpenOrders('BTCUSDT');

        expect(mockHttpRequest).toHaveBeenCalledWith({
          method: HttpMethods.DELETE,
          url: buildUrl('/api/v1/allOpenOrders'),
          params: expect.objectContaining({
            symbol: 'BTCUSDT',
            recvWindow: TEST_RECV_WINDOW,
            timestamp: expect.any(Number),
            signature: expect.any(String),
          }),
          headers: SIGNED_HEADERS,
        });
      });
    });

    describe('transferAsset', () => {
      it('should transfer asset between accounts', async () => {
        const transferParams = {
          asset: 'BTC',
          amount: '1.0',
          clientTranId: 'test-transfer-123',
          kindType: 'SPOT_FUTURE' as const,
        };

        const mockResponse = { tranId: 123456 };
        mockHttpRequest.mockResolvedValue({ data: mockResponse });

        const result = await client.transferAsset(transferParams);

        expect(result).toEqual(mockResponse);
        expect(mockHttpRequest).toHaveBeenCalledWith({
          method: HttpMethods.POST,
          url: buildUrl('/api/v1/asset/wallet/transfer'),
          params: expect.objectContaining({
            ...transferParams,
            recvWindow: TEST_RECV_WINDOW,
            timestamp: expect.any(Number),
            signature: expect.any(String),
          }),
          headers: SIGNED_HEADERS,
        });
      });
    });

    describe('getNonce', () => {
      it('should get nonce for user operation', async () => {
        const mockNonce = 123456;
        mockHttpRequest.mockResolvedValue({ data: mockNonce });

        const result = await client.getNonce('0x123', 'CREATE_API_KEY');

        expect(result).toBe(mockNonce);
        expect(mockHttpRequest).toHaveBeenCalledWith({
          method: HttpMethods.POST,
          url: buildUrl('/api/v1/getNonce'),
          data: 'address=0x123&userOperationType=CREATE_API_KEY',
          headers: FORM_URLENCODED_HEADERS,
        });
      });

      it('should include network parameter when provided', async () => {
        await client.getNonce('0x123', 'CREATE_API_KEY', 'mainnet');

        expect(mockHttpRequest).toHaveBeenCalledWith({
          method: HttpMethods.POST,
          url: buildUrl('/api/v1/getNonce'),
          data: 'address=0x123&userOperationType=CREATE_API_KEY&network=mainnet',
          headers: FORM_URLENCODED_HEADERS,
        });
      });
    });
  });

  describe('User Data Stream', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2023-01-01T00:00:00.000Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    describe('startUserDataStream', () => {
      it('should start user data stream', async () => {
        const mockResponse = { listenKey: 'test-listen-key' };
        mockHttpRequest.mockResolvedValue({ data: mockResponse });

        const result = await client.startUserDataStream();

        expect(result).toEqual(mockResponse);
        expect(mockHttpRequest).toHaveBeenCalledWith({
          method: HttpMethods.POST,
          url: buildUrl('/api/v1/listenKey'),
          headers: SIGNED_HEADERS,
        });
      });
    });

    describe('keepAliveUserDataStream', () => {
      it('should keep alive user data stream', async () => {
        const mockResponse = {};
        mockHttpRequest.mockResolvedValue({ data: mockResponse });

        const result = await client.keepAliveUserDataStream('test-listen-key');

        expect(result).toEqual(mockResponse);
        expect(mockHttpRequest).toHaveBeenCalledWith({
          method: HttpMethods.PUT,
          url: buildUrl('/api/v1/listenKey'),
          data: 'listenKey=test-listen-key',
          headers: SIGNED_FORM_URLENCODED_HEADERS,
        });
      });
    });

    describe('closeUserDataStream', () => {
      it('should close user data stream', async () => {
        const mockResponse = {};
        mockHttpRequest.mockResolvedValue({ data: mockResponse });

        const result = await client.closeUserDataStream('test-listen-key');

        expect(result).toEqual(mockResponse);
        expect(mockHttpRequest).toHaveBeenCalledWith({
          method: HttpMethods.DELETE,
          url: buildUrl('/api/v1/listenKey'),
          params: {
            listenKey: 'test-listen-key',
          },
          headers: SIGNED_HEADERS,
        });
      });
    });
  });

  describe('error handling', () => {
    it('should handle network errors', async () => {
      const networkError = new Error('Network failure');
      mockHttpRequest.mockRejectedValue(networkError);

      await expect(client.getExchangeInfo()).rejects.toThrow('Network failure');
    });

    it('should handle API errors', async () => {
      const apiError = ErrorFactory.fromHttpResponse(400, '{"code":400,"msg":"Invalid symbol"}');
      mockHttpRequest.mockRejectedValue(apiError);

      await expect(client.getOrderBook('INVALID')).rejects.toThrow();
    });

    it('should validate required parameters', async () => {
      await expect(client.getOrderBook('')).rejects.toThrow('Missing required parameters: symbol');
    });
  });

  describe('credential management', () => {
    it('should update credentials', () => {
      const newApiKey = 'new-api-key';
      const newApiSecret = 'new-api-secret';

      expect(() => client.updateCredentials(newApiKey, newApiSecret)).not.toThrow();
    });

    it('should check if has authentication', () => {
      expect(client.hasAuth()).toBe(true);
    });

    it('should get base URL', () => {
      expect(client.getBaseUrl()).toBe('https://sapi.asterdx.com');
    });
  });
});

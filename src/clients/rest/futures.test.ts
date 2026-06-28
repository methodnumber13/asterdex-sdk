/**
 * Tests for FuturesClient
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FuturesClient } from './futures';
import { Config } from '@/config/config';
import { HttpMethods } from '@/constants/http';
import { AutoCloseType } from '@/constants/futures';
import { ErrorFactory } from '@/errors/errors';
import type { FuturesNewOrderParams } from '@/types/futures';

// No mocks needed: V3 signing uses ethers EIP-712 typed-data signatures.

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
          url: buildUrl('/fapi/v3/ping'),
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
          url: buildUrl('/fapi/v3/time'),
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
          url: buildUrl('/fapi/v3/exchangeInfo'),
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
          url: buildUrl('/fapi/v3/depth'),
          params: { symbol: TEST_SYMBOL },
        });
      });

      it('should include limit parameter when provided', async () => {
        await futuresClient.getOrderBook(TEST_SYMBOL, 100);

        expect(mockHttpRequest).toHaveBeenCalledWith({
          method: HttpMethods.GET,
          headers: expect.objectContaining(COMMON_HEADERS),
          url: buildUrl('/fapi/v3/depth'),
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
          url: buildUrl('/fapi/v3/trades'),
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
          url: buildUrl('/fapi/v3/klines'),
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
          url: buildUrl('/fapi/v3/ticker/24hr'),
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
          url: buildUrl('/fapi/v3/ticker/24hr'),
        });
      });
    });

    describe('additional market data endpoints', () => {
      it('should route optional market-data queries to the documented V3 endpoints', async () => {
        const cases = [
          {
            call: () => futuresClient.getRecentTrades(TEST_SYMBOL, 100),
            url: '/fapi/v3/trades',
            params: { symbol: TEST_SYMBOL, limit: 100 },
          },
          {
            call: () => futuresClient.getHistoricalTrades(TEST_SYMBOL, 100, 12345),
            url: '/fapi/v3/historicalTrades',
            params: { symbol: TEST_SYMBOL, limit: 100, fromId: 12345 },
          },
          {
            call: () =>
              futuresClient.getAggregatedTrades(TEST_SYMBOL, {
                startTime: 1672531200000,
                endTime: 1672534800000,
                limit: 250,
              }),
            url: '/fapi/v3/aggTrades',
            params: {
              symbol: TEST_SYMBOL,
              startTime: 1672531200000,
              endTime: 1672534800000,
              limit: 250,
            },
          },
          {
            call: () => futuresClient.getIndexPriceKlines('BTCUSDT', '1h', { limit: 10 }),
            url: '/fapi/v3/indexPriceKlines',
            params: { pair: 'BTCUSDT', interval: '1h', limit: 10 },
          },
          {
            call: () => futuresClient.getMarkPriceKlines(TEST_SYMBOL, '4h', { limit: 20 }),
            url: '/fapi/v3/markPriceKlines',
            params: { symbol: TEST_SYMBOL, interval: '4h', limit: 20 },
          },
          {
            call: () => futuresClient.getMarkPrice(TEST_SYMBOL),
            url: '/fapi/v3/premiumIndex',
            params: { symbol: TEST_SYMBOL },
          },
          {
            call: () => futuresClient.getFundingRate(TEST_SYMBOL, { limit: 5 }),
            url: '/fapi/v3/fundingRate',
            params: { symbol: TEST_SYMBOL, limit: 5 },
          },
          {
            call: () => futuresClient.getPrice(TEST_SYMBOL),
            url: '/fapi/v3/ticker/price',
            params: { symbol: TEST_SYMBOL },
          },
          {
            call: () => futuresClient.getBookTicker(TEST_SYMBOL),
            url: '/fapi/v3/ticker/bookTicker',
            params: { symbol: TEST_SYMBOL },
          },
        ];

        for (const current of cases) {
          mockHttpRequest.mockClear();

          await current.call();

          expect(mockHttpRequest).toHaveBeenCalledWith({
            method: HttpMethods.GET,
            headers: expect.objectContaining(COMMON_HEADERS),
            url: buildUrl(current.url),
            params: current.params,
          });
        }
      });

      it('should omit optional market-data filters when they are not provided', async () => {
        const cases = [
          {
            call: () => futuresClient.getHistoricalTrades(TEST_SYMBOL),
            url: '/fapi/v3/historicalTrades',
            params: { symbol: TEST_SYMBOL },
          },
          {
            call: () => futuresClient.getMarkPrice(),
            url: '/fapi/v3/premiumIndex',
          },
          {
            call: () => futuresClient.getFundingInfo(),
            url: '/fapi/v3/fundingInfo',
          },
          {
            call: () => futuresClient.getPrice(),
            url: '/fapi/v3/ticker/price',
          },
          {
            call: () => futuresClient.getBookTicker(),
            url: '/fapi/v3/ticker/bookTicker',
          },
        ];

        for (const current of cases) {
          mockHttpRequest.mockClear();

          await current.call();

          const expectedRequest: Record<string, unknown> = {
            method: HttpMethods.GET,
            headers: expect.objectContaining(COMMON_HEADERS),
            url: buildUrl(current.url),
          };

          if ('params' in current) {
            expectedRequest.params = current.params;
          }

          expect(mockHttpRequest).toHaveBeenCalledWith(expectedRequest);
        }
      });

      it('should route public Aster deposit and withdrawal query APIs to the web BAPI host', async () => {
        const mockResponse = { code: '000000', data: [], success: true };
        mockHttpRequest.mockResolvedValue({ data: mockResponse });

        const cases = [
          {
            call: () =>
              futuresClient.getAsterDepositAssets({
                chainIds: [56, 1],
                networks: ['EVM', 'SOLANA'],
                accountType: 'spot',
              }),
            url: 'https://www.asterdex.com/bapi/futures/v1/public/future/aster/deposit/assets',
            params: { chainIds: '56,1', networks: 'EVM,SOLANA', accountType: 'spot' },
          },
          {
            call: () =>
              futuresClient.getAsterWithdrawAssets({
                chainIds: 56,
                networks: 'EVM',
                accountType: 'perp',
              }),
            url: 'https://www.asterdex.com/bapi/futures/v1/public/future/aster/withdraw/assets',
            params: { chainIds: '56', networks: 'EVM', accountType: 'perp' },
          },
          {
            call: () =>
              futuresClient.getAsterWithdrawFee({
                chainId: 56,
                network: 'EVM',
                currency: 'USDT',
                accountType: 'spot',
              }),
            url: 'https://www.asterdex.com/bapi/futures/v1/public/future/aster/estimate-withdraw-fee',
            params: { chainId: '56', network: 'EVM', currency: 'USDT', accountType: 'spot' },
          },
        ];

        for (const current of cases) {
          mockHttpRequest.mockClear();

          const result = await current.call();

          expect(result).toEqual(mockResponse);
          expect(mockHttpRequest).toHaveBeenCalledWith({
            method: HttpMethods.GET,
            url: current.url,
            params: current.params,
            headers: COMMON_HEADERS,
          });
        }
      });
    });
  });

  describe('signed endpoints', () => {
    describe('v3 market data additions', () => {
      it('should get funding info', async () => {
        const mockResponse = [{ symbol: TEST_SYMBOL }];
        mockHttpRequest.mockResolvedValue({ data: mockResponse });

        const result = await futuresClient.getFundingInfo(TEST_SYMBOL);

        expect(result).toEqual(mockResponse);
        expect(mockHttpRequest).toHaveBeenCalledWith({
          method: HttpMethods.GET,
          headers: expect.objectContaining(COMMON_HEADERS),
          url: buildUrl('/fapi/v3/fundingInfo'),
          params: { symbol: TEST_SYMBOL },
        });
      });

      it('should get index references', async () => {
        const mockResponse = { symbol: TEST_SYMBOL, indexReferences: [] };
        mockHttpRequest.mockResolvedValue({ data: mockResponse });

        const result = await futuresClient.getIndexReferences(TEST_SYMBOL);

        expect(result).toEqual(mockResponse);
        expect(mockHttpRequest).toHaveBeenCalledWith({
          method: HttpMethods.GET,
          headers: expect.objectContaining(COMMON_HEADERS),
          url: buildUrl('/fapi/v3/indexreferences'),
          params: { symbol: TEST_SYMBOL },
        });
      });
    });

    describe('v3 account and order controls', () => {
      it('should submit noop request with Web3 signature', async () => {
        const mockResponse = { code: 200, msg: 'success' };
        mockHttpRequest.mockResolvedValue({ data: mockResponse });

        const result = await futuresClient.noop();

        expect(result).toEqual(mockResponse);
        expect(mockHttpRequest).toHaveBeenCalledWith({
          method: HttpMethods.POST,
          url: buildUrl('/fapi/v3/noop'),
          data: expect.stringContaining('signature='),
          headers: FORM_URLENCODED_HEADERS,
        });
      });

      it('should change STP mode', async () => {
        await futuresClient.changeStpMode('EXPIRE_TAKER');

        expect(mockHttpRequest).toHaveBeenCalledWith({
          method: HttpMethods.POST,
          url: buildUrl('/fapi/v3/stpMode'),
          data: expect.stringContaining('stpMode=EXPIRE_TAKER'),
          headers: FORM_URLENCODED_HEADERS,
        });
      });

      it('should get current STP mode', async () => {
        const mockResponse = { stpMode: 'EXPIRE_TAKER' };
        mockHttpRequest.mockResolvedValue({ data: mockResponse });

        const result = await futuresClient.getStpMode();

        expect(result).toEqual(mockResponse);
        expect(mockHttpRequest).toHaveBeenCalledWith({
          method: HttpMethods.GET,
          url: buildUrl('/fapi/v3/stpMode'),
          params: expect.objectContaining({
            user: mockUserAddress,
            signer: mockSignerAddress,
            signature: expect.any(String),
          }),
          headers: FORM_URLENCODED_HEADERS,
        });
      });

      it('should route signed account settings endpoints with Web3 auth', async () => {
        const cases = [
          {
            call: () => futuresClient.changePositionMode(true),
            method: HttpMethods.POST,
            url: '/fapi/v3/positionSide/dual',
            bodyIncludes: ['dualSidePosition=true'],
          },
          {
            call: () => futuresClient.getPositionMode(),
            method: HttpMethods.GET,
            url: '/fapi/v3/positionSide/dual',
            params: {},
          },
          {
            call: () => futuresClient.changeMultiAssetsMode(false),
            method: HttpMethods.POST,
            url: '/fapi/v3/multiAssetsMargin',
            bodyIncludes: ['multiAssetsMargin=false'],
          },
          {
            call: () => futuresClient.getMultiAssetsMode(),
            method: HttpMethods.GET,
            url: '/fapi/v3/multiAssetsMargin',
            params: {},
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
            expect(request.data).toEqual(expect.any(String));
            current.bodyIncludes.forEach((expected) => {
              expect(request.data).toContain(expected);
            });
            expect(request.data).toContain('signature=');
          } else {
            expect(request.params).toEqual(
              expect.objectContaining({
                ...current.params,
                user: mockUserAddress,
                signer: mockSignerAddress,
                signature: expect.any(String),
              }),
            );
          }
        }
      });

      it('should send test order request', async () => {
        const orderParams = {
          symbol: TEST_SYMBOL,
          side: 'BUY' as const,
          type: 'LIMIT' as const,
          timeInForce: 'GTC' as const,
          quantity: '1.0',
          price: '50000',
        };

        await futuresClient.testOrder(orderParams);

        expect(mockHttpRequest).toHaveBeenCalledWith({
          method: HttpMethods.POST,
          url: buildUrl('/fapi/v3/order/test'),
          data: expect.stringContaining(`symbol=${TEST_SYMBOL}`),
          headers: FORM_URLENCODED_HEADERS,
        });
      });

      it('should modify an existing order', async () => {
        await futuresClient.modifyOrder({
          symbol: TEST_SYMBOL,
          orderId: 123456,
          quantity: '1.5',
          price: '51000',
        });

        const callData = mockHttpRequest.mock.calls[0]?.[0]?.data as string;
        expect(mockHttpRequest).toHaveBeenCalledWith({
          method: HttpMethods.PUT,
          url: buildUrl('/fapi/v3/order'),
          data: expect.any(String),
          headers: FORM_URLENCODED_HEADERS,
        });
        expect(callData).toContain(`symbol=${TEST_SYMBOL}`);
        expect(callData).toContain('orderId=123456');
        expect(callData).toContain('quantity=1.5');
        expect(callData).toContain('price=51000');
      });

      it('should validate modify order lookup and replacement parameters', async () => {
        await expect(
          futuresClient.modifyOrder({
            symbol: TEST_SYMBOL,
            quantity: '1.5',
            price: '51000',
          }),
        ).rejects.toThrow('Either orderId or origClientOrderId must be provided');

        await expect(
          futuresClient.modifyOrder({
            symbol: TEST_SYMBOL,
            orderId: 123456,
            price: '51000',
          } as Parameters<FuturesClient['modifyOrder']>[0]),
        ).rejects.toThrow('Missing required parameters: quantity');
      });

      it('should route additional signed account and order endpoints', async () => {
        const batchOrder = {
          symbol: TEST_SYMBOL,
          side: 'BUY' as const,
          type: 'LIMIT' as const,
          timeInForce: 'GTC' as const,
          quantity: '1',
          price: '50000',
        };
        const cases = [
          {
            call: () => futuresClient.newBatchOrders({ batchOrders: [batchOrder] }),
            method: HttpMethods.POST,
            url: '/fapi/v3/batchOrders',
            bodyIncludes: ['batchOrders='],
            decodedIncludes: ['"symbol":"BTCUSDT"', '"type":"LIMIT"'],
          },
          {
            call: () =>
              futuresClient.transferAsset({
                asset: 'USDT',
                amount: '25',
                clientTranId: 'transfer-1',
                kindType: 'SPOT_FUTURE',
              }),
            method: HttpMethods.POST,
            url: '/fapi/v3/asset/wallet/transfer',
            bodyIncludes: ['asset=USDT', 'amount=25', 'clientTranId=transfer-1'],
          },
          {
            call: () => futuresClient.getAsterUserWithdrawInfo(),
            method: HttpMethods.POST,
            url: '/fapi/v3/aster/user-withdraw-info',
            bodyIncludes: ['signature='],
          },
          {
            call: () => futuresClient.getAsterDepositWithdrawHistory(),
            method: HttpMethods.POST,
            url: '/fapi/v3/aster/deposit-withdraw-history',
            bodyIncludes: ['signature='],
          },
          {
            call: () => futuresClient.getOrder(TEST_SYMBOL, undefined, 'client-1'),
            method: HttpMethods.GET,
            url: '/fapi/v3/order',
            params: { symbol: TEST_SYMBOL, origClientOrderId: 'client-1' },
          },
          {
            call: () => futuresClient.cancelAllOpenOrders(TEST_SYMBOL),
            method: HttpMethods.DELETE,
            url: '/fapi/v3/allOpenOrders',
            params: { symbol: TEST_SYMBOL },
          },
          {
            call: () => futuresClient.cancelBatchOrders(TEST_SYMBOL, [123, 456]),
            method: HttpMethods.DELETE,
            url: '/fapi/v3/batchOrders',
            params: { symbol: TEST_SYMBOL, orderIdList: '[123,456]' },
          },
          {
            call: () =>
              futuresClient.countdownCancelAll({
                symbol: TEST_SYMBOL,
                countdownTime: 60000,
              }),
            method: HttpMethods.POST,
            url: '/fapi/v3/countdownCancelAll',
            bodyIncludes: [`symbol=${TEST_SYMBOL}`, 'countdownTime=60000'],
          },
          {
            call: () => futuresClient.getCurrentOpenOrder(TEST_SYMBOL, 123),
            method: HttpMethods.GET,
            url: '/fapi/v3/openOrder',
            params: { symbol: TEST_SYMBOL, orderId: 123 },
          },
          {
            call: () => futuresClient.getOpenOrders(TEST_SYMBOL),
            method: HttpMethods.GET,
            url: '/fapi/v3/openOrders',
            params: { symbol: TEST_SYMBOL },
          },
          {
            call: () => futuresClient.getAllOrders(TEST_SYMBOL, { orderId: 123, limit: 50 }),
            method: HttpMethods.GET,
            url: '/fapi/v3/allOrders',
            params: { symbol: TEST_SYMBOL, orderId: 123, limit: 50 },
          },
          {
            call: () => futuresClient.getBalance(),
            method: HttpMethods.GET,
            url: '/fapi/v3/balance',
            params: {},
          },
          {
            call: () => futuresClient.changeLeverage({ symbol: TEST_SYMBOL, leverage: 20 }),
            method: HttpMethods.POST,
            url: '/fapi/v3/leverage',
            bodyIncludes: [`symbol=${TEST_SYMBOL}`, 'leverage=20'],
          },
          {
            call: () =>
              futuresClient.changeMarginType({ symbol: TEST_SYMBOL, marginType: 'ISOLATED' }),
            method: HttpMethods.POST,
            url: '/fapi/v3/marginType',
            bodyIncludes: [`symbol=${TEST_SYMBOL}`, 'marginType=ISOLATED'],
          },
          {
            call: () =>
              futuresClient.modifyPositionMargin({
                symbol: TEST_SYMBOL,
                amount: '10',
                type: 1,
              }),
            method: HttpMethods.POST,
            url: '/fapi/v3/positionMargin',
            bodyIncludes: [`symbol=${TEST_SYMBOL}`, 'amount=10', 'type=1'],
          },
          {
            call: () => futuresClient.getPositionMarginHistory(TEST_SYMBOL, { type: 1, limit: 10 }),
            method: HttpMethods.GET,
            url: '/fapi/v3/positionMargin/history',
            params: { symbol: TEST_SYMBOL, type: 1, limit: 10 },
          },
          {
            call: () => futuresClient.getUserTrades(TEST_SYMBOL, { fromId: 100, limit: 25 }),
            method: HttpMethods.GET,
            url: '/fapi/v3/userTrades',
            params: { symbol: TEST_SYMBOL, fromId: 100, limit: 25 },
          },
          {
            call: () =>
              futuresClient.getIncomeHistory({
                symbol: TEST_SYMBOL,
                incomeType: 'REALIZED_PNL',
                limit: 10,
              }),
            method: HttpMethods.GET,
            url: '/fapi/v3/income',
            params: { symbol: TEST_SYMBOL, incomeType: 'REALIZED_PNL', limit: 10 },
          },
          {
            call: () => futuresClient.getLeverageBracket(TEST_SYMBOL),
            method: HttpMethods.GET,
            url: '/fapi/v3/leverageBracket',
            params: { symbol: TEST_SYMBOL },
          },
          {
            call: () => futuresClient.getADLQuantile(TEST_SYMBOL),
            method: HttpMethods.GET,
            url: '/fapi/v3/adlQuantile',
            params: { symbol: TEST_SYMBOL },
          },
          {
            call: () =>
              futuresClient.getForceOrders({
                symbol: TEST_SYMBOL,
                autoCloseType: AutoCloseType.LIQUIDATION,
                limit: 5,
              }),
            method: HttpMethods.GET,
            url: '/fapi/v3/forceOrders',
            params: { symbol: TEST_SYMBOL, autoCloseType: 'LIQUIDATION', limit: 5 },
          },
          {
            call: () => futuresClient.getCommissionRate(TEST_SYMBOL),
            method: HttpMethods.GET,
            url: '/fapi/v3/commissionRate',
            params: { symbol: TEST_SYMBOL },
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
            expect(requestData).toEqual(expect.any(String));
            current.bodyIncludes.forEach((expected) => {
              expect(requestData).toContain(expected);
            });
            current.decodedIncludes?.forEach((expected) => {
              expect(decodeURIComponent(requestData)).toContain(expected);
            });
            expect(requestData).toContain('signature=');
          } else {
            expect(request.params).toEqual(
              expect.objectContaining({
                ...current.params,
                user: mockUserAddress,
                signer: mockSignerAddress,
                signature: expect.any(String),
              }),
            );
          }
        }
      });

      it('should route optional signed queries without optional filters', async () => {
        const cases = [
          { call: () => futuresClient.getOpenOrders(), url: '/fapi/v3/openOrders' },
          { call: () => futuresClient.getIncomeHistory(), url: '/fapi/v3/income' },
          { call: () => futuresClient.getLeverageBracket(), url: '/fapi/v3/leverageBracket' },
          { call: () => futuresClient.getADLQuantile(), url: '/fapi/v3/adlQuantile' },
          { call: () => futuresClient.getForceOrders(), url: '/fapi/v3/forceOrders' },
          { call: () => futuresClient.getUserMmp(), url: '/fapi/v3/mmp' },
          {
            call: () => futuresClient.getDirectAnnouncements(),
            url: '/fapi/v3/announcement/direct',
          },
        ];

        for (const current of cases) {
          mockHttpRequest.mockClear();

          await current.call();

          expect(mockHttpRequest).toHaveBeenCalledWith({
            method: HttpMethods.GET,
            url: buildUrl(current.url),
            params: expect.objectContaining({
              user: mockUserAddress,
              signer: mockSignerAddress,
              signature: expect.any(String),
            }),
            headers: FORM_URLENCODED_HEADERS,
          });
        }
      });

      it('should validate signed order and strategy edge cases before transport', async () => {
        const batchOrder = {
          symbol: TEST_SYMBOL,
          side: 'BUY' as const,
          type: 'LIMIT' as const,
          timeInForce: 'GTC' as const,
          quantity: '1',
          price: '50000',
        };

        await expect(futuresClient.newBatchOrders({ batchOrders: [] })).rejects.toThrow(
          'batchOrders must be a non-empty array',
        );
        await expect(
          futuresClient.newBatchOrders({
            batchOrders: [batchOrder, batchOrder, batchOrder, batchOrder, batchOrder, batchOrder],
          }),
        ).rejects.toThrow('Maximum 5 orders per batch');
        await expect(futuresClient.getOrder(TEST_SYMBOL)).rejects.toThrow(
          'Either orderId or origClientOrderId must be provided',
        );
        await expect(futuresClient.cancelOrder(TEST_SYMBOL)).rejects.toThrow(
          'Either orderId or origClientOrderId must be provided',
        );

        await futuresClient.cancelOrder(TEST_SYMBOL, undefined, 'client-cancel-1');
        expect(mockHttpRequest).toHaveBeenLastCalledWith({
          method: HttpMethods.DELETE,
          url: buildUrl('/fapi/v3/order'),
          params: expect.objectContaining({
            symbol: TEST_SYMBOL,
            origClientOrderId: 'client-cancel-1',
            signature: expect.any(String),
          }),
          headers: FORM_URLENCODED_HEADERS,
        });

        await expect(futuresClient.cancelBatchOrders(TEST_SYMBOL)).rejects.toThrow(
          'Either orderIdList or origClientOrderIdList must be provided',
        );

        await futuresClient.cancelBatchOrders(TEST_SYMBOL, undefined, ['client-1', 'client-2']);
        expect(mockHttpRequest).toHaveBeenLastCalledWith({
          method: HttpMethods.DELETE,
          url: buildUrl('/fapi/v3/batchOrders'),
          params: expect.objectContaining({
            symbol: TEST_SYMBOL,
            origClientOrderIdList: '["client-1","client-2"]',
            signature: expect.any(String),
          }),
          headers: FORM_URLENCODED_HEADERS,
        });

        await expect(futuresClient.getCurrentOpenOrder(TEST_SYMBOL)).rejects.toThrow(
          'Either orderId or origClientOrderId must be provided',
        );

        await futuresClient.getCurrentOpenOrder(TEST_SYMBOL, undefined, 'open-client-1');
        expect(mockHttpRequest).toHaveBeenLastCalledWith({
          method: HttpMethods.GET,
          url: buildUrl('/fapi/v3/openOrder'),
          params: expect.objectContaining({
            symbol: TEST_SYMBOL,
            origClientOrderId: 'open-client-1',
            signature: expect.any(String),
          }),
          headers: FORM_URLENCODED_HEADERS,
        });

        await expect(
          futuresClient.placeStrategyOrder({ strategyType: 'OTO', subOrderList: [] }),
        ).rejects.toThrow('subOrderList must be a non-empty array');
        await expect(futuresClient.getStrategyOpenOrder({ strategyType: 'OTO' })).rejects.toThrow(
          'Either strategyId or clientStrategyId must be provided',
        );
        await expect(
          futuresClient.getStrategyOpenOrder({
            strategyType: 'OTO',
            strategyId: 123,
            clientStrategyId: 'strategy-client-1',
          }),
        ).rejects.toThrow('strategyId and clientStrategyId are mutually exclusive');
        await expect(
          futuresClient.updateSubAccount({
            subSourceAddr: '0x742d35Cc6635C0532925a3b8D36D05C4b4543BF4',
            nonce: 1672531200000000,
            user: mockUserAddress,
            signer: mockSignerAddress,
            signature: '0xmaster',
          }),
        ).rejects.toThrow('Either subAccountName or status must be provided');

        await futuresClient.updateSubAccount({
          subSourceAddr: '0x742d35Cc6635C0532925a3b8D36D05C4b4543BF4',
          nonce: 1672531200000000,
          user: mockUserAddress,
          signer: mockSignerAddress,
          status: 'FROZEN',
          signature: '0xmaster',
        });
        expect(mockHttpRequest).toHaveBeenLastCalledWith({
          method: HttpMethods.POST,
          url: buildUrl('/fapi/v3/updateSubAccount'),
          data: expect.stringContaining('status=FROZEN'),
          headers: FORM_URLENCODED_HEADERS,
        });
      });
    });

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

    describe('v3 strategy orders', () => {
      const subOrder = {
        strategySubId: '1',
        securityType: 'USDT_FUTURES' as const,
        symbol: TEST_SYMBOL,
        side: 'BUY' as const,
        type: 'LIMIT' as const,
        quantity: '1',
        price: '50000',
        timeInForce: 'GTC' as const,
      };

      it('should place chase order', async () => {
        await futuresClient.placeChaseOrder({
          symbol: TEST_SYMBOL,
          side: 'BUY',
          quantityUnit: 'BASE',
          quantity: '1',
          chaseOffset: '0.5',
        });

        expect(mockHttpRequest).toHaveBeenCalledWith({
          method: HttpMethods.POST,
          url: buildUrl('/fapi/v3/chase'),
          data: expect.stringContaining('quantityUnit=BASE'),
          headers: FORM_URLENCODED_HEADERS,
        });
      });

      it('should place strategy order', async () => {
        await futuresClient.placeStrategyOrder({
          strategyType: 'OTO',
          subOrderList: [subOrder, { ...subOrder, strategySubId: '2', side: 'SELL' }],
        });

        const callData = mockHttpRequest.mock.calls[0]?.[0]?.data as string;
        const decodedBody = decodeURIComponent(callData);

        expect(mockHttpRequest).toHaveBeenCalledWith({
          method: HttpMethods.POST,
          url: buildUrl('/fapi/v3/placeStrategyOrder'),
          data: expect.stringContaining('strategyType=OTO'),
          headers: FORM_URLENCODED_HEADERS,
        });
        expect(decodedBody).toContain('"strategySubId":"1"');
        expect(decodedBody).toContain('"strategySubId":"2"');
      });

      it('should update strategy order', async () => {
        await futuresClient.updateStrategyOrder({
          strategyId: 123456,
          strategyType: 'OTO',
          subOrderList: [subOrder],
        });

        expect(mockHttpRequest).toHaveBeenCalledWith({
          method: HttpMethods.POST,
          url: buildUrl('/fapi/v3/updateStrategyOrder'),
          data: expect.stringContaining('strategyId=123456'),
          headers: FORM_URLENCODED_HEADERS,
        });
      });

      it('should query strategy open order', async () => {
        await futuresClient.getStrategyOpenOrder({ strategyId: 123456, strategyType: 'OTO' });

        expect(mockHttpRequest).toHaveBeenCalledWith({
          method: HttpMethods.GET,
          url: buildUrl('/fapi/v3/strategyOpenOrder'),
          params: expect.objectContaining({
            strategyId: 123456,
            strategyType: 'OTO',
            signature: expect.any(String),
          }),
          headers: FORM_URLENCODED_HEADERS,
        });
      });

      it('should query strategy history order', async () => {
        await futuresClient.getStrategyHistoryOrder({
          clientStrategyId: 'client-strategy-1',
          strategyType: 'OTO',
          limit: 100,
        });

        expect(mockHttpRequest).toHaveBeenCalledWith({
          method: HttpMethods.GET,
          url: buildUrl('/fapi/v3/strategyHistoryOrder'),
          params: expect.objectContaining({
            clientStrategyId: 'client-strategy-1',
            strategyType: 'OTO',
            limit: 100,
            signature: expect.any(String),
          }),
          headers: FORM_URLENCODED_HEADERS,
        });
      });
    });

    describe('v3 MMP controls', () => {
      it('should update user MMP configuration', async () => {
        await futuresClient.updateUserMmp({
          symbol: TEST_SYMBOL,
          windowTimeInMilliseconds: 5000,
          frozenTimeInMilliseconds: 10000,
          qtyLimit: 10,
        });

        expect(mockHttpRequest).toHaveBeenCalledWith({
          method: HttpMethods.POST,
          url: buildUrl('/fapi/v3/mmp'),
          data: expect.stringContaining('windowTimeInMilliseconds=5000'),
          headers: FORM_URLENCODED_HEADERS,
        });
      });

      it('should get user MMP configuration', async () => {
        await futuresClient.getUserMmp(TEST_SYMBOL);

        expect(mockHttpRequest).toHaveBeenCalledWith({
          method: HttpMethods.GET,
          url: buildUrl('/fapi/v3/mmp'),
          params: expect.objectContaining({
            symbol: TEST_SYMBOL,
            signature: expect.any(String),
          }),
          headers: FORM_URLENCODED_HEADERS,
        });
      });

      it('should delete user MMP configuration', async () => {
        await futuresClient.deleteUserMmp(TEST_SYMBOL);

        expect(mockHttpRequest).toHaveBeenCalledWith({
          method: HttpMethods.DELETE,
          url: buildUrl('/fapi/v3/mmp'),
          params: expect.objectContaining({
            symbol: TEST_SYMBOL,
            signature: expect.any(String),
          }),
          headers: FORM_URLENCODED_HEADERS,
        });
      });

      it('should reset user MMP state', async () => {
        await futuresClient.resetUserMmp(TEST_SYMBOL);

        expect(mockHttpRequest).toHaveBeenCalledWith({
          method: HttpMethods.POST,
          url: buildUrl('/fapi/v3/mmpReset'),
          data: expect.stringContaining(`symbol=${TEST_SYMBOL}`),
          headers: FORM_URLENCODED_HEADERS,
        });
      });
    });

    describe('v3 sub-account and migration endpoints', () => {
      it('should bind a sub-account using presigned wallet parameters', async () => {
        await futuresClient.bindSubAccount({
          childAddress: '0x742d35Cc6635C0532925a3b8D36D05C4b4543BF4',
          name: 'desk-1',
          nonce: 1672531200000000,
          user: mockUserAddress,
          childSignature: '0xchild',
          signature: '0xmaster',
        });

        const callData = mockHttpRequest.mock.calls[0]?.[0]?.data as string;
        expect(mockHttpRequest).toHaveBeenCalledWith({
          method: HttpMethods.POST,
          url: buildUrl('/fapi/v3/sub-accounts/bind'),
          data: expect.any(String),
          headers: FORM_URLENCODED_HEADERS,
        });
        expect(callData).toContain('childSignature=0xchild');
        expect(callData).toContain('signature=0xmaster');
      });

      it('should create a sub-account using presigned wallet parameters', async () => {
        await futuresClient.createSubAccount({
          subSourceAddr: '0x742d35Cc6635C0532925a3b8D36D05C4b4543BF4',
          subAccountName: 'desk-1',
          nonce: 1672531200000000,
          user: mockUserAddress,
          signer: mockSignerAddress,
          childSignature: '0xchild',
          signature: '0xmaster',
        });

        expect(mockHttpRequest).toHaveBeenCalledWith({
          method: HttpMethods.POST,
          url: buildUrl('/fapi/v3/createSubAccount'),
          data: expect.stringContaining('subAccountName=desk-1'),
          headers: FORM_URLENCODED_HEADERS,
        });
      });

      it('should get sub-account list with Web3 signature', async () => {
        await futuresClient.getSubAccountList();

        expect(mockHttpRequest).toHaveBeenCalledWith({
          method: HttpMethods.GET,
          url: buildUrl('/fapi/v3/getSubAccountList'),
          params: expect.objectContaining({
            user: mockUserAddress,
            signer: mockSignerAddress,
            signature: expect.any(String),
          }),
          headers: FORM_URLENCODED_HEADERS,
        });
      });

      it('should update a sub-account using presigned wallet parameters', async () => {
        await futuresClient.updateSubAccount({
          subSourceAddr: '0x742d35Cc6635C0532925a3b8D36D05C4b4543BF4',
          nonce: 1672531200000000,
          user: mockUserAddress,
          signer: mockSignerAddress,
          subAccountName: 'desk-2',
          signature: '0xmaster',
        });

        expect(mockHttpRequest).toHaveBeenCalledWith({
          method: HttpMethods.POST,
          url: buildUrl('/fapi/v3/updateSubAccount'),
          data: expect.stringContaining('subAccountName=desk-2'),
          headers: FORM_URLENCODED_HEADERS,
        });
      });

      it('should transfer between sub-accounts using presigned wallet parameters', async () => {
        await futuresClient.subAccountTransfer({
          toAccountAddress: '0x742d35Cc6635C0532925a3b8D36D05C4b4543BF4',
          asset: 'USDT',
          amount: '10',
          kindType: 'FUTURE_FUTURE',
          nonce: 1672531200000000,
          user: mockUserAddress,
          signer: mockSignerAddress,
          signature: '0xmaster',
        });

        expect(mockHttpRequest).toHaveBeenCalledWith({
          method: HttpMethods.POST,
          url: buildUrl('/fapi/v3/subAccountTransfer'),
          data: expect.stringContaining('kindType=FUTURE_FUTURE'),
          headers: FORM_URLENCODED_HEADERS,
        });
      });

      it('should migrate user assets using presigned wallet parameters', async () => {
        await futuresClient.migrateUserAssets({
          user: mockUserAddress,
          nonce: 1672531200000000,
          signature: '0xsource',
        });

        expect(mockHttpRequest).toHaveBeenCalledWith({
          method: HttpMethods.POST,
          url: buildUrl('/fapi/v3/asset/migrateUser'),
          data: expect.stringContaining('signature=0xsource'),
          headers: FORM_URLENCODED_HEADERS,
        });
      });

      it('should get migrate user assets history', async () => {
        await futuresClient.getMigrateUserAssetsHistory('batch-1');

        expect(mockHttpRequest).toHaveBeenCalledWith({
          method: HttpMethods.GET,
          url: buildUrl('/fapi/v3/asset/migrateUser/history'),
          params: expect.objectContaining({
            batchId: 'batch-1',
            signature: expect.any(String),
          }),
          headers: FORM_URLENCODED_HEADERS,
        });
      });
    });

    describe('v3 agent and announcement endpoints', () => {
      it('should register and approve an agent using presigned wallet parameters', async () => {
        await futuresClient.registerAndApproveAgent({
          user: mockUserAddress,
          nonce: 1672531200000000,
          agentName: 'agent-1',
          agentAddress: mockSignerAddress,
          expired: 1893456000000,
          signatureChainId: 56,
          signature: '0xuser',
          canSpotTrade: true,
          canPerpTrade: true,
          canWithdraw: false,
        });

        expect(mockHttpRequest).toHaveBeenCalledWith({
          method: HttpMethods.POST,
          url: buildUrl('/fapi/v3/registerAndApproveAgent'),
          data: expect.stringContaining('agentName=agent-1'),
          headers: FORM_URLENCODED_HEADERS,
        });
      });

      it('should require canWithdraw for agent registration', async () => {
        await expect(
          // @ts-expect-error canWithdraw is required by the official V3 contract.
          futuresClient.registerAndApproveAgent({
            user: mockUserAddress,
            nonce: 1672531200000000,
            agentName: 'agent-1',
            agentAddress: mockSignerAddress,
            expired: 1893456000000,
            signatureChainId: 56,
            signature: '0xuser',
            canSpotTrade: true,
            canPerpTrade: true,
          }),
        ).rejects.toThrow('Missing required parameters: canWithdraw');
      });

      it('should require ipWhitelist when agent withdrawals are enabled', async () => {
        await expect(
          futuresClient.registerAndApproveAgent({
            user: mockUserAddress,
            nonce: 1672531200000000,
            agentName: 'agent-1',
            agentAddress: mockSignerAddress,
            expired: 1893456000000,
            signatureChainId: 56,
            signature: '0xuser',
            canSpotTrade: true,
            canPerpTrade: true,
            canWithdraw: true,
          }),
        ).rejects.toThrow('Missing required parameters: ipWhitelist');
      });

      it('should get direct announcements', async () => {
        await futuresClient.getDirectAnnouncements({ page: 1, size: 10 });

        expect(mockHttpRequest).toHaveBeenCalledWith({
          method: HttpMethods.GET,
          url: buildUrl('/fapi/v3/announcement/direct'),
          params: expect.objectContaining({
            page: 1,
            size: 10,
            signature: expect.any(String),
          }),
          headers: FORM_URLENCODED_HEADERS,
        });
      });

      it('should get direct announcement by id', async () => {
        await futuresClient.getDirectAnnouncementById(1001);

        expect(mockHttpRequest).toHaveBeenCalledWith({
          method: HttpMethods.GET,
          url: buildUrl('/fapi/v3/announcement/directById'),
          params: expect.objectContaining({
            id: 1001,
            signature: expect.any(String),
          }),
          headers: FORM_URLENCODED_HEADERS,
        });
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
            user: mockUserAddress,
            signer: mockSignerAddress,
            nonce: expect.any(Number),
            signature: expect.any(String),
          }),
          headers: FORM_URLENCODED_HEADERS,
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
          url: buildUrl('/fapi/v3/accountWithJoinMargin'),
          params: expect.objectContaining({
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
          data: expect.stringContaining(`signer=${mockSignerAddress}`),
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
    it('should propagate signed request transport errors', async () => {
      const clientWithoutDeps = new FuturesClient(
        config,
        mockUserAddress,
        mockSignerAddress,
        mockPrivateKey,
      );

      const mockFailingRequest = vi.fn().mockRejectedValue(new Error('Signed request failed'));
      (clientWithoutDeps as any).httpClient.request = mockFailingRequest;

      const orderParams = {
        symbol: TEST_SYMBOL,
        side: 'BUY' as const,
        type: 'LIMIT' as const,
        timeInForce: 'GTC' as const,
        quantity: '1.0',
        price: '50000',
      };

      await expect(clientWithoutDeps.newOrder(orderParams)).rejects.toThrow(
        'Signed request failed',
      );
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

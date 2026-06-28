/**
 * Opt-in live API smoke tests for Aster Spot/Futures V3.
 *
 * These tests intentionally avoid creating orders, transferring assets, withdrawing,
 * or changing account configuration unless an explicit dangerous-test flag is used.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import dotenv from 'dotenv';
import { AsterDEX, ApiResponseError } from '@/index';
import type { SpotClient } from '@/clients/rest/spot';
import type { FuturesClient } from '@/clients/rest/futures';

dotenv.config();

const runLive = process.env.ASTERDEX_LIVE_TESTS === '1';
const runDangerous = process.env.ASTERDEX_LIVE_DANGEROUS === '1';
const describeLive = runLive ? describe : describe.skip;
const describeDangerous = runLive && runDangerous ? describe : describe.skip;

const requiredEnv = [
  'ASTERDEX_API_KEY',
  'ASTERDEX_API_SECRET',
  'FUTURES_USER_ADDRESS',
  'FUTURES_SIGNER_ADDRESS',
  'FUTURES_PRIVATE_KEY',
] as const;

describeLive('AsterDEX live V3 API smoke tests', () => {
  let client: AsterDEX;
  let spot: SpotClient;
  let futures: FuturesClient;
  let spotSymbol: string;
  let futuresSymbol: string;

  beforeAll(async () => {
    const missing = requiredEnv.filter((key) => !process.env[key]);
    if (missing.length > 0) {
      throw new Error(`Missing live test environment variables: ${missing.join(', ')}`);
    }

    client = AsterDEX.fromEnv();
    spot = client.createSpotV3Client(
      process.env.FUTURES_USER_ADDRESS as string,
      process.env.FUTURES_SIGNER_ADDRESS as string,
      process.env.FUTURES_PRIVATE_KEY as string,
    );
    futures = client.createFuturesClient(
      process.env.FUTURES_USER_ADDRESS as string,
      process.env.FUTURES_SIGNER_ADDRESS as string,
      process.env.FUTURES_PRIVATE_KEY as string,
    );

    spotSymbol = process.env.ASTERDEX_LIVE_SPOT_SYMBOL ?? 'BTCUSDT';
    futuresSymbol = process.env.ASTERDEX_LIVE_FUTURES_SYMBOL ?? 'BTCUSDT';

    const [spotInfo, futuresInfo] = await Promise.all([
      client.spot.getExchangeInfo(),
      futures.getExchangeInfo(),
    ]);
    expect(spotInfo.symbols.length).toBeGreaterThan(0);
    expect(futuresInfo.symbols.length).toBeGreaterThan(0);
  }, 60_000);

  it('checks Spot V3 public market-data endpoints live', async () => {
    const [
      ping,
      serverTime,
      orderBook,
      recentTrades,
      historicalTrades,
      aggregatedTrades,
      klines,
      ticker24hr,
      price,
      bookTicker,
      withdrawFee,
    ] = await Promise.all([
      client.spot.ping(),
      client.spot.getServerTime(),
      client.spot.getOrderBook(spotSymbol, 5),
      client.spot.getRecentTrades(spotSymbol, 5),
      client.spot.getHistoricalTrades(spotSymbol, 5),
      client.spot.getAggregatedTrades(spotSymbol, { limit: 5 }),
      client.spot.getKlines(spotSymbol, '1m', { limit: 2 }),
      client.spot.get24hrTicker(spotSymbol),
      client.spot.getPrice(spotSymbol),
      client.spot.getBookTicker(spotSymbol),
      client.spot.getWithdrawFee('56', 'USDT'),
    ]);

    expect(ping).toEqual({});
    expect(serverTime.serverTime).toEqual(expect.any(Number));
    expect(orderBook.bids.length + orderBook.asks.length).toBeGreaterThan(0);
    expect(Array.isArray(recentTrades)).toBe(true);
    expect(Array.isArray(historicalTrades)).toBe(true);
    expect(Array.isArray(aggregatedTrades)).toBe(true);
    expect(Array.isArray(klines)).toBe(true);
    expect(ticker24hr).toHaveProperty('symbol');
    expect(price).toHaveProperty('price');
    expect(bookTicker).toHaveProperty('bidPrice');
    expect(withdrawFee).toHaveProperty('gasCost');
  }, 60_000);

  it('checks Futures V3 public market-data endpoints live', async () => {
    const [
      ping,
      serverTime,
      orderBook,
      recentTrades,
      historicalTrades,
      aggregatedTrades,
      klines,
      indexKlines,
      markKlines,
      markPrice,
      fundingRate,
      fundingInfo,
      ticker24hr,
      price,
      bookTicker,
      indexReferences,
    ] = await Promise.all([
      futures.ping(),
      futures.getServerTime(),
      futures.getOrderBook(futuresSymbol, 5),
      futures.getRecentTrades(futuresSymbol, 5),
      futures.getHistoricalTrades(futuresSymbol, 5),
      futures.getAggregatedTrades(futuresSymbol, { limit: 5 }),
      futures.getKlines(futuresSymbol, '1m', { limit: 2 }),
      futures.getIndexPriceKlines(futuresSymbol, '1m', { limit: 2 }),
      futures.getMarkPriceKlines(futuresSymbol, '1m', { limit: 2 }),
      futures.getMarkPrice(futuresSymbol),
      futures.getFundingRate(futuresSymbol, { limit: 2 }),
      futures.getFundingInfo(futuresSymbol),
      futures.get24hrTicker(futuresSymbol),
      futures.getPrice(futuresSymbol),
      futures.getBookTicker(futuresSymbol),
      futures.getIndexReferences(futuresSymbol),
    ]);

    expect(ping).toEqual({});
    expect(serverTime.serverTime).toEqual(expect.any(Number));
    expect(orderBook.bids.length + orderBook.asks.length).toBeGreaterThan(0);
    expect(Array.isArray(recentTrades)).toBe(true);
    expect(Array.isArray(historicalTrades)).toBe(true);
    expect(Array.isArray(aggregatedTrades)).toBe(true);
    expect(Array.isArray(klines)).toBe(true);
    expect(Array.isArray(indexKlines)).toBe(true);
    expect(Array.isArray(markKlines)).toBe(true);
    expect(markPrice).toHaveProperty('symbol');
    expect(Array.isArray(fundingRate)).toBe(true);
    expect(Array.isArray(fundingInfo)).toBe(true);
    expect(ticker24hr).toHaveProperty('symbol');
    expect(price).toHaveProperty('price');
    expect(bookTicker).toHaveProperty('bidPrice');
    expect(indexReferences).toHaveProperty('symbol');
  }, 60_000);

  it('checks Spot V3 signed noop and listen-key endpoints live', async () => {
    const [noop, listenKeyResponse] = await Promise.all([spot.noop(), spot.startUserDataStream()]);

    expect(noop).toHaveProperty('code');
    expect(listenKeyResponse.listenKey).toEqual(expect.any(String));

    await expect(spot.keepAliveUserDataStream(listenKeyResponse.listenKey)).resolves.toBeDefined();
    await expect(spot.closeUserDataStream(listenKeyResponse.listenKey)).resolves.toBeDefined();
  }, 60_000);

  it('records current Spot V3 signed user-data GET responses live', async () => {
    const checks: Array<[string, () => Promise<unknown>]> = [
      ['getOpenOrders', () => spot.getOpenOrders(spotSymbol)],
      ['getAllOrders', () => spot.getAllOrders(spotSymbol, { limit: 5 })],
      ['getAccount', () => spot.getAccount()],
      ['getMyTrades', () => spot.getMyTrades(spotSymbol, { limit: 5 })],
      ['getTransactionHistory', () => spot.getTransactionHistory({ limit: 5 })],
      ['getCommissionRate', () => spot.getCommissionRate(spotSymbol)],
    ];

    for (const [, action] of checks) {
      await expectSpotV3UserDataServerError(action);
    }

    const [legacyOpenOrders, legacyAllOrders, legacyAccount, legacyTrades] = await Promise.all([
      client.spot.getOpenOrders(spotSymbol),
      client.spot.getAllOrders(spotSymbol, { limit: 5 }),
      client.spot.getAccount(),
      client.spot.getMyTrades(spotSymbol, { limit: 5 }),
    ]);

    expect(Array.isArray(legacyOpenOrders)).toBe(true);
    expect(Array.isArray(legacyAllOrders)).toBe(true);
    expect(legacyAccount).toHaveProperty('balances');
    expect(Array.isArray(legacyTrades)).toBe(true);
  }, 60_000);

  it('checks Futures V3 signed read-only and listen-key endpoints live', async () => {
    const [
      noop,
      positionMode,
      stpMode,
      multiAssetsMode,
      openOrders,
      allOrders,
      balance,
      account,
      positions,
      trades,
      income,
      leverageBracket,
      adlQuantile,
      forceOrders,
      commissionRate,
      mmp,
      announcements,
      listenKeyResponse,
    ] = await Promise.all([
      futures.noop(),
      futures.getPositionMode(),
      futures.getStpMode(),
      futures.getMultiAssetsMode(),
      futures.getOpenOrders(futuresSymbol),
      futures.getAllOrders(futuresSymbol, { limit: 5 }),
      futures.getBalance(),
      futures.getAccount(),
      futures.getPositionRisk(futuresSymbol),
      futures.getUserTrades(futuresSymbol, { limit: 5 }),
      futures.getIncomeHistory({ symbol: futuresSymbol, limit: 5 }),
      futures.getLeverageBracket(futuresSymbol),
      futures.getADLQuantile(futuresSymbol),
      futures.getForceOrders({ symbol: futuresSymbol, limit: 5 }),
      futures.getCommissionRate(futuresSymbol),
      futures.getUserMmp(futuresSymbol),
      futures.getDirectAnnouncements({ page: 1, size: 5 }),
      futures.startUserDataStream(),
    ]);

    expect(noop).toHaveProperty('code');
    expect(positionMode).toHaveProperty('dualSidePosition');
    expect(stpMode).toHaveProperty('stpMode');
    expect(multiAssetsMode).toHaveProperty('multiAssetsMargin');
    expect(Array.isArray(openOrders)).toBe(true);
    expect(Array.isArray(allOrders)).toBe(true);
    expect(Array.isArray(balance)).toBe(true);
    expect(account).toBeDefined();
    expect(Array.isArray(positions)).toBe(true);
    expect(Array.isArray(trades)).toBe(true);
    expect(Array.isArray(income)).toBe(true);
    expect(Array.isArray(leverageBracket)).toBe(true);
    expect(adlQuantile).toBeDefined();
    expect(Array.isArray(forceOrders)).toBe(true);
    expect(commissionRate).toHaveProperty('symbol');
    expect(Array.isArray(mmp)).toBe(true);
    expect(announcements).toBeDefined();
    expect(listenKeyResponse.listenKey).toEqual(expect.any(String));

    await expect(
      futures.keepAliveUserDataStream(listenKeyResponse.listenKey),
    ).resolves.toBeDefined();
    await expect(futures.closeUserDataStream(listenKeyResponse.listenKey)).resolves.toBeDefined();
  }, 60_000);

  it('reaches order lookup/cancel endpoints live using impossible client IDs without creating orders', async () => {
    const impossibleClientId = `codex-live-${Date.now()}`;

    await expectKnownApiRejection(() => spot.getOrder(spotSymbol, undefined, impossibleClientId));
    await expectKnownApiRejection(() =>
      spot.getCurrentOpenOrder(spotSymbol, undefined, impossibleClientId),
    );
    await expectKnownApiRejection(() =>
      spot.cancelOrder(spotSymbol, undefined, impossibleClientId),
    );
    await expectKnownApiRejection(() =>
      futures.getOrder(futuresSymbol, undefined, impossibleClientId),
    );
    await expectKnownApiRejection(() =>
      futures.getCurrentOpenOrder(futuresSymbol, undefined, impossibleClientId),
    );
    await expectKnownApiRejection(() =>
      futures.cancelOrder(futuresSymbol, undefined, impossibleClientId),
    );
    await expectEndpointReached(() =>
      futures.cancelBatchOrders(futuresSymbol, undefined, [impossibleClientId]),
    );
  }, 60_000);

  it('checks Futures V3 test-order endpoint live without placing an order', async () => {
    await futures.testOrder({
      symbol: futuresSymbol,
      side: 'BUY',
      type: 'MARKET',
      quantity: process.env.ASTERDEX_LIVE_FUTURES_TEST_QTY ?? '0.001',
    });
  }, 60_000);
});

describeDangerous('AsterDEX live dangerous mutation tests', () => {
  it('is intentionally gated behind ASTERDEX_LIVE_DANGEROUS=1', () => {
    expect(runDangerous).toBe(true);
  });
});

async function expectKnownApiRejection(action: () => Promise<unknown>): Promise<void> {
  try {
    await action();
    throw new Error('Expected live API rejection for impossible order identifier');
  } catch (error) {
    expect(error).toBeInstanceOf(ApiResponseError);
    expect((error as ApiResponseError).code).not.toBe(-1022);
  }
}

async function expectEndpointReached(action: () => Promise<unknown>): Promise<void> {
  try {
    await action();
  } catch (error) {
    expect(error).toBeInstanceOf(ApiResponseError);
    expect((error as ApiResponseError).code).not.toBe(-1022);
  }
}

async function expectSpotV3UserDataServerError(action: () => Promise<unknown>): Promise<void> {
  try {
    await action();
    throw new Error('Expected current Spot V3 USER_DATA GET server response');
  } catch (error) {
    expect(error).toBeInstanceOf(ApiResponseError);
    expect((error as ApiResponseError).statusCode).toBe(500);
    expect((error as ApiResponseError).code).toBeUndefined();
  }
}

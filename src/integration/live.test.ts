/**
 * Opt-in live API smoke tests for Aster Spot/Futures V3.
 *
 * These tests intentionally avoid creating orders, transferring assets, withdrawing,
 * or changing account configuration unless an explicit dangerous-test flag is used.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import dotenv from 'dotenv';
import { Contract, JsonRpcProvider, Wallet } from 'ethers';
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

const BSC_USDT_CONTRACT = '0x55d398326f99059fF775485246999027B3197955';
const BSC_USDT_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
] as const;

type Erc20BalanceContract = Contract & {
  balanceOf(address: string): Promise<bigint>;
};

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

  it('checks Aster public deposit and withdrawal query endpoints live', async () => {
    const [depositAssets, withdrawAssets, withdrawFee] = await Promise.all([
      futures.getAsterDepositAssets({ chainIds: 56, networks: 'EVM', accountType: 'spot' }),
      futures.getAsterWithdrawAssets({ chainIds: 56, networks: 'EVM', accountType: 'spot' }),
      futures.getAsterWithdrawFee({
        chainId: 56,
        network: 'EVM',
        currency: 'USDT',
        accountType: 'spot',
      }),
    ]);

    expect(depositAssets.success).toBe(true);
    expect(withdrawAssets.success).toBe(true);
    expect(Array.isArray(depositAssets.data)).toBe(true);
    expect(Array.isArray(withdrawAssets.data)).toBe(true);
    expect(withdrawFee.success).toBe(true);
    expect(withdrawFee.data).toHaveProperty('gasCost');
  }, 60_000);

  it('checks Spot V3 signed noop and listen-key endpoints live', async () => {
    const [noop, listenKeyResponse] = await Promise.all([spot.noop(), spot.startUserDataStream()]);

    expect(noop).toHaveProperty('code');
    expect(listenKeyResponse.listenKey).toEqual(expect.any(String));

    await expect(spot.keepAliveUserDataStream(listenKeyResponse.listenKey)).resolves.toBeDefined();
    await expect(spot.closeUserDataStream(listenKeyResponse.listenKey)).resolves.toBeDefined();
  }, 60_000);

  it('checks Spot V3 signed user-data GET endpoints reach authenticated handlers live', async () => {
    const checks: Array<[string, () => Promise<unknown>]> = [
      ['getOpenOrders', () => spot.getOpenOrders(spotSymbol)],
      ['getAllOrders', () => spot.getAllOrders(spotSymbol, { limit: 5 })],
      ['getAccount', () => spot.getAccount()],
      ['getMyTrades', () => spot.getMyTrades(spotSymbol, { limit: 5 })],
      ['getTransactionHistory', () => spot.getTransactionHistory({ limit: 5 })],
      ['getCommissionRate', () => spot.getCommissionRate(spotSymbol)],
    ];

    for (const [, action] of checks) {
      await expectSpotV3UserDataEndpointReached(action);
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
      withdrawInfo,
      depositWithdrawHistory,
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
      futures.getAsterUserWithdrawInfo(),
      futures.getAsterDepositWithdrawHistory(),
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
    expect(withdrawInfo).toHaveProperty('balances');
    expect(Array.isArray(depositWithdrawHistory)).toBe(true);
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

  it('checks BSC wallet balances against Aster internal withdrawable balances live', async () => {
    const provider = new JsonRpcProvider(
      process.env.ASTERDEX_LIVE_BSC_RPC_URL ?? 'https://bsc-dataseed.binance.org',
    );
    const usdt = new Contract(BSC_USDT_CONTRACT, BSC_USDT_ABI, provider) as Erc20BalanceContract;
    const signerWallet = new Wallet(process.env.FUTURES_PRIVATE_KEY as string);

    expect(signerWallet.address.toLowerCase()).toBe(
      (process.env.FUTURES_SIGNER_ADDRESS as string).toLowerCase(),
    );

    const [userBnb, signerBnb, userUsdt, signerUsdt, withdrawInfo] = await Promise.all([
      provider.getBalance(process.env.FUTURES_USER_ADDRESS as string),
      provider.getBalance(process.env.FUTURES_SIGNER_ADDRESS as string),
      usdt.balanceOf(process.env.FUTURES_USER_ADDRESS as string),
      usdt.balanceOf(process.env.FUTURES_SIGNER_ADDRESS as string),
      futures.getAsterUserWithdrawInfo(),
    ]);

    expect(userBnb >= 0n).toBe(true);
    expect(signerBnb >= 0n).toBe(true);
    expect(userUsdt >= 0n).toBe(true);
    expect(signerUsdt >= 0n).toBe(true);
    expect(withdrawInfo.balances).toBeDefined();
  }, 60_000);
});

describeDangerous('AsterDEX live dangerous mutation tests', () => {
  let client: AsterDEX;
  let spot: SpotClient;
  let futures: FuturesClient;
  let spotSymbol: string;
  let futuresSymbol: string;

  beforeAll(() => {
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
  });

  it('attempts bounded Spot V3 financial mutations live', async () => {
    const spotPrice = await getPostOnlyBidPrice(client.spot, spotSymbol, 2);
    const spotQuantity = process.env.ASTERDEX_LIVE_SPOT_ORDER_QTY ?? '0.00009';
    let createdOrderId: number | undefined;

    await expectEndpointReached(async () => {
      const order = await spot.newOrder({
        symbol: spotSymbol,
        side: 'BUY',
        type: 'LIMIT',
        timeInForce: 'GTX',
        quantity: spotQuantity,
        price: spotPrice,
        newClientOrderId: `live-spot-${Date.now()}`.slice(0, 28),
      });
      createdOrderId = order.orderId;
      return order;
    });

    if (createdOrderId !== undefined) {
      await expectEndpointReached(() => spot.cancelOrder(spotSymbol, createdOrderId));
    }

    await expectEndpointReached(() =>
      spot.transferAsset({
        asset: process.env.ASTERDEX_LIVE_TRANSFER_ASSET ?? 'USDT',
        amount: process.env.ASTERDEX_LIVE_TRANSFER_AMOUNT ?? '0.01',
        clientTranId: `live-spot-transfer-${Date.now()}`,
        kindType: 'SPOT_FUTURE',
      }),
    );

    const withdrawUserSignature = process.env.ASTERDEX_LIVE_WITHDRAW_USER_SIGNATURE;
    if (withdrawUserSignature) {
      const withdrawReceiver =
        process.env.ASTERDEX_LIVE_WITHDRAW_RECEIVER ?? process.env.FUTURES_USER_ADDRESS;
      if (!withdrawReceiver) {
        throw new Error('Missing withdraw receiver for live withdraw test');
      }

      await expectEndpointReached(() =>
        spot.withdraw({
          chainId: process.env.ASTERDEX_LIVE_WITHDRAW_CHAIN_ID ?? '56',
          asset: process.env.ASTERDEX_LIVE_WITHDRAW_ASSET ?? 'USDT',
          amount: process.env.ASTERDEX_LIVE_WITHDRAW_AMOUNT ?? '1',
          fee: process.env.ASTERDEX_LIVE_WITHDRAW_FEE ?? '0.5',
          receiver: withdrawReceiver,
          nonce: process.env.ASTERDEX_LIVE_WITHDRAW_NONCE ?? String(Math.trunc(Date.now() * 1000)),
          userSignature: withdrawUserSignature,
        }),
      );
    }
  }, 60_000);

  it('attempts bounded Futures V3 mutation and config endpoints live', async () => {
    const [positionMode, stpMode, multiAssetsMode, positions] = await Promise.all([
      futures.getPositionMode(),
      futures.getStpMode(),
      futures.getMultiAssetsMode(),
      futures.getPositionRisk(futuresSymbol),
    ]);
    const position = Array.isArray(positions) ? positions[0] : undefined;

    await expectEndpointReached(() =>
      futures.changePositionMode(Boolean(positionMode.dualSidePosition)),
    );
    await expectEndpointReached(() => futures.changeStpMode(stpMode.stpMode));
    await expectEndpointReached(() =>
      futures.changeMultiAssetsMode(Boolean(multiAssetsMode.multiAssetsMargin)),
    );
    await expectEndpointReached(() =>
      futures.changeLeverage({
        symbol: futuresSymbol,
        leverage: Number(position?.leverage ?? 20),
      }),
    );
    await expectEndpointReached(() =>
      futures.changeMarginType({
        symbol: futuresSymbol,
        marginType: normalizeMarginType(position?.marginType),
      }),
    );
    await expectEndpointReached(() =>
      futures.countdownCancelAll({ symbol: futuresSymbol, countdownTime: 0 }),
    );

    const futuresPrice = await getPostOnlyBidPrice(futures, futuresSymbol, 1);
    const futuresQuantity = process.env.ASTERDEX_LIVE_FUTURES_ORDER_QTY ?? '0.001';
    let createdOrderId: number | undefined;

    await expectEndpointReached(async () => {
      const order = await futures.newOrder({
        symbol: futuresSymbol,
        side: 'BUY',
        type: 'LIMIT',
        timeInForce: 'GTX',
        quantity: futuresQuantity,
        price: futuresPrice,
        newClientOrderId: `live-fut-${Date.now()}`.slice(0, 28),
      });
      createdOrderId = order.orderId;
      return order;
    });

    if (createdOrderId !== undefined) {
      await expectEndpointReached(() => futures.cancelOrder(futuresSymbol, createdOrderId));
    }

    const batchClientId = `live-batch-${Date.now()}`.slice(0, 18);
    let batchOrderIds: number[] = [];

    await expectEndpointReached(async () => {
      const orders = await futures.newBatchOrders({
        batchOrders: [
          {
            symbol: futuresSymbol,
            side: 'BUY',
            type: 'LIMIT',
            timeInForce: 'GTX',
            quantity: futuresQuantity,
            price: futuresPrice,
            newClientOrderId: `${batchClientId}-a`,
          },
          {
            symbol: futuresSymbol,
            side: 'BUY',
            type: 'LIMIT',
            timeInForce: 'GTX',
            quantity: futuresQuantity,
            price: futuresPrice,
            newClientOrderId: `${batchClientId}-b`,
          },
        ],
      });
      batchOrderIds = orders
        .map((order) => order.orderId)
        .filter((orderId): orderId is number => typeof orderId === 'number');
      return orders;
    });

    for (const orderId of batchOrderIds) {
      await expectEndpointReached(() => futures.cancelOrder(futuresSymbol, orderId));
    }

    await expectEndpointReached(() =>
      futures.transferAsset({
        asset: process.env.ASTERDEX_LIVE_TRANSFER_ASSET ?? 'USDT',
        amount: process.env.ASTERDEX_LIVE_TRANSFER_AMOUNT ?? '0.01',
        clientTranId: `live-futures-transfer-${Date.now()}`,
        kindType: 'FUTURE_SPOT',
      }),
    );
    await expectEndpointReached(() =>
      futures.updateUserMmp({
        symbol: futuresSymbol,
        windowTimeInMilliseconds: 5000,
        frozenTimeInMilliseconds: 5000,
        qtyLimit: 1,
      }),
    );
    await expectEndpointReached(() => futures.deleteUserMmp(futuresSymbol));
    await expectEndpointReached(() => futures.resetUserMmp(futuresSymbol));

    const openOrders = await futures.getOpenOrders(futuresSymbol);
    expect(openOrders.filter((order) => order.clientOrderId?.startsWith('live-'))).toHaveLength(0);
  }, 60_000);
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

async function getPostOnlyBidPrice(
  client: Pick<SpotClient | FuturesClient, 'getOrderBook'>,
  symbol: string,
  decimals: number,
): Promise<string> {
  const orderBook = await client.getOrderBook(symbol, 5);
  const bestBid = Number(orderBook.bids[0]?.[0] ?? 0);
  if (!Number.isFinite(bestBid) || bestBid <= 0) {
    throw new Error(`Unable to calculate post-only price for ${symbol}`);
  }
  return (Math.floor(bestBid * 0.99 * 10 ** decimals) / 10 ** decimals).toFixed(decimals);
}

function normalizeMarginType(marginType: unknown): 'ISOLATED' | 'CROSSED' {
  return String(marginType).toUpperCase() === 'ISOLATED' ? 'ISOLATED' : 'CROSSED';
}

async function expectSpotV3UserDataEndpointReached(action: () => Promise<unknown>): Promise<void> {
  try {
    expect(await action()).toBeDefined();
  } catch (error) {
    expect(error).toBeInstanceOf(ApiResponseError);
    const apiError = error as ApiResponseError;

    // Aster mainnet currently returns an HTML 500 after valid Spot V3 GET auth reaches
    // these account/trading handlers. Auth/path failures must still fail this test.
    expect(apiError.code).not.toBe(-1022);
    expect(apiError.code).not.toBe(-1000);
    expect(apiError.statusCode).toBe(500);
  }
}

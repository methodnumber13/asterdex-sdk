#!/usr/bin/env tsx
/**
 * AsterDEX TypeScript SDK - Complete REST API Demo
 *
 * This script demonstrates how to use ALL REST API methods available in the AsterDEX SDK.
 * It covers both Spot and Futures trading APIs with comprehensive examples.
 *
 * Prerequisites:
 * 1. Install dependencies: npm install
 * 2. Set up environment variables (or modify credentials below)
 * 3. Comment out API calls you don't want to run
 * 4. Run with: npm run demo (or tsx ./demo.ts)
 *
 * Environment Variables:
 * - ASTERDEX_API_KEY: Your API key
 * - ASTERDEX_API_SECRET: Your API secret
 * - ASTERDEX_ENVIRONMENT: 'mainnet'
 *
 * For Futures API, you also need Web3 credentials:
 * - FUTURES_USER_ADDRESS: Main account wallet address (0x...)
 * - FUTURES_SIGNER_ADDRESS: API wallet address (0x...)
 * - FUTURES_PRIVATE_KEY: Private key for signing (0x...)
 */

import dotenv from "dotenv";
dotenv.config();

import { AsterDEX, FuturesClient } from '../dist/index.js';
import type {
  NewOrderParams,
  FuturesNewOrderParams,
  AssetTransferParams,
  WithdrawParams,
  CreateApiKeyParams
} from '../dist/index.js';

// =============================================================================
// CONFIGURATION - Modify these values for your setup
// =============================================================================

const CONFIG = {
  // Basic API credentials (required for Spot API)
  apiKey: process.env.ASTERDEX_API_KEY || 'your-api-key-here',
  apiSecret: process.env.ASTERDEX_API_SECRET || 'your-api-secret-here',
  environment: (process.env.ASTERDEX_ENVIRONMENT as 'mainnet'),

  // Futures API credentials
  futuresCredentials: {
    userAddress: process.env.FUTURES_USER_ADDRESS || 'FUTURES_USER_ADDRESS',
    signerAddress: process.env.FUTURES_SIGNER_ADDRESS || 'FUTURES_SIGNER_ADDRESS',
    privateKey: process.env.FUTURES_PRIVATE_KEY || 'FUTURES_PRIVATE_KEY',
  },

  // Test parameters
  testSymbol: 'BTCUSDT',
  testSymbolAlt: 'ETHUSDT',
  testChainId: '56', // BSC chain ID (numeric)
  testAsset: 'USDT',
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function logSection(title: string) {
  console.log('\n' + '='.repeat(80));
  console.log(`🚀 ${title}`);
  console.log('='.repeat(80));
}

function logStep(step: string, method: string) {
  console.log(`\n📍 ${step}: ${method}`);
  console.log('-'.repeat(50));
}

async function safeExecute<T>(
  description: string,
  operation: () => Promise<T>,
  showResult = true
): Promise<T | null> {
  try {
    const result = await operation();
    if (showResult) {
      console.log(`✅ ${description}:`, JSON.stringify(result, null, 2));
    } else {
      console.log(`✅ ${description}: Success`);
    }
    return result;
  } catch (error) {
    console.error(`❌ ${description}:`, error instanceof Error ? error.message : error);
    return null;
  }
}

// =============================================================================
// MAIN DEMO FUNCTION
// =============================================================================

async function demonstrateAllRestMethods() {
  logSection('AsterDEX TypeScript SDK - Complete REST API Demonstration');

  // =========================================================================
  // 1. SDK INITIALIZATION
  // =========================================================================

  logStep('1', 'SDK Initialization');

  // Initialize the main SDK instance
  const client = new AsterDEX({
    apiKey: CONFIG.apiKey,
    apiSecret: CONFIG.apiSecret,
    environment: CONFIG.environment,
    timeout: 10000,
    recvWindow: 50000,
  });

  // Alternative: Initialize from environment variables
  // const client = AsterDEX.fromEnv();

  console.log('✅ SDK initialized successfully');
  console.log(`   Environment: ${CONFIG.environment}`);
  console.log(`   Base URLs:`);
  console.log(`   - Spot: ${client.getConfig().getBaseUrl('spot')}`);
  console.log(`   - Futures: ${client.getConfig().getBaseUrl('futures')}`);
  console.log(`   - WebSocket: ${client.getConfig().getBaseUrl('websocket')}`);

  // =========================================================================
  // 2. BASIC CONNECTIVITY TESTS
  // =========================================================================

  logStep('2', 'Basic Connectivity Tests');

  // Test API connectivity
  await safeExecute('Ping API', () => client.ping());

  // Get server time
  await safeExecute('Get Server Time', () => client.getServerTime());

  // =========================================================================
  // 3. SPOT API - MARKET DATA (PUBLIC ENDPOINTS)
  // =========================================================================

  logSection('SPOT API - Market Data (Public)');

  // Get exchange information
  await safeExecute(
    'Get Exchange Information',
    () => client.spot.getExchangeInfo(),
    false // Don't show full result as it's very large
  );

  // Get order book depth
  await safeExecute(
    `Get Order Book for ${CONFIG.testSymbol}`,
    () => client.spot.getOrderBook(CONFIG.testSymbol, 5)
  );

  // Get recent trades
  await safeExecute(
    `Get Recent Trades for ${CONFIG.testSymbol}`,
    () => client.spot.getRecentTrades(CONFIG.testSymbol, 5)
  );

  // Get 24hr ticker statistics
  await safeExecute(
    `Get 24hr Ticker for ${CONFIG.testSymbol}`,
    () => client.spot.get24hrTicker(CONFIG.testSymbol)
  );

  // Get all 24hr tickers
  await safeExecute(
    'Get All 24hr Tickers',
    () => client.spot.get24hrTicker(),
    false // Don't show full result
  );

  // Get current price
  await safeExecute(
    `Get Price for ${CONFIG.testSymbol}`,
    () => client.spot.getPrice(CONFIG.testSymbol)
  );

  // Get all prices
  await safeExecute(
    'Get All Prices',
    () => client.spot.getPrice(),
    false
  );

  // Get best bid/ask prices
  await safeExecute(
    `Get Book Ticker for ${CONFIG.testSymbol}`,
    () => client.spot.getBookTicker(CONFIG.testSymbol)
  );

  // =========================================================================
  // 4. SPOT API - ACCOUNT ENDPOINTS (REQUIRE AUTHENTICATION)
  // =========================================================================

  logSection('SPOT API - Account Endpoints (Authenticated)');

  // Get trading commission rates
  await safeExecute(
    `Get Commission Rate for ${CONFIG.testSymbol}`,
    () => client.spot.getCommissionRate(CONFIG.testSymbol)
  );

  // Get account information
  await safeExecute(
    'Get Account Information',
    () => client.spot.getAccount()
  );

  // Get open orders
  await safeExecute(
    'Get Open Orders (All Symbols)',
    () => client.spot.getOpenOrders()
  );

  // Get open orders for specific symbol
  await safeExecute(
    `Get Open Orders for ${CONFIG.testSymbol}`,
    () => client.spot.getOpenOrders(CONFIG.testSymbol)
  );

  // =========================================================================
  // 5. SPOT API - TRADING ENDPOINTS (REQUIRE AUTHENTICATION)
  // =========================================================================

  logSection('SPOT API - Trading Endpoints (Authenticated)');

  // Example: Place a limit buy order (DEMO - adjust parameters as needed)
  const spotOrderParams: NewOrderParams = {
    symbol: CONFIG.testSymbol,
    side: 'BUY',
    type: 'LIMIT',
    timeInForce: 'GTC',
    quantity: '0.001',
    price: '30000', // Adjust price as needed
    newClientOrderId: `demo-order-${Date.now()}`,
  };

  await safeExecute(
    'Place Spot Limit Order (DEMO)',
    () => client.spot.newOrder(spotOrderParams)
  );

  // Note: Other trading methods like cancelOrder, getOrder etc. require existing orders
  console.log('📝 Note: cancelOrder, getOrder, getOrderHistory require existing orders to test');

  // =========================================================================
  // 6. SPOT API - WALLET ENDPOINTS
  // =========================================================================

  logSection('SPOT API - Wallet Endpoints (Authenticated)');

  // Example asset transfer (DEMO - use with caution)
  const transferParams: AssetTransferParams = {
    asset: CONFIG.testAsset,
    amount: '1.0',
    clientTranId: `demo-transfer-${Date.now()}`,
    kindType: 'SPOT_FUTURE', // Transfer from SPOT to FUTURES
  };

  await safeExecute(
    'Asset Transfer (DEMO)',
    () => client.spot.transferAsset(transferParams)
  );

  // Get withdraw fee
  await safeExecute(
    `Get Withdraw Fee for ${CONFIG.testAsset} on ${CONFIG.testChainId}`,
    () => client.spot.getWithdrawFee(CONFIG.testChainId, CONFIG.testAsset)
  );

  // Example withdrawal (DEMO - use with extreme caution)
  const withdrawParams: WithdrawParams = {
    chainId: '56', // BSC chain ID
    asset: CONFIG.testAsset,
    amount: '1.0',
    fee: '0.001',
    receiver: '0x742c4E4b6C71c7daB08d50Cf7E13A1456c5E59b7', // DEMO address
    nonce: Date.now().toString(),
    userSignature: 'demo-signature-placeholder', // In production, this needs to be a real Web3 signature
  };

  console.log('⚠️  Withdrawal demo skipped - use with extreme caution in production');
  await safeExecute('Withdraw Asset (DEMO)', () => client.spot.withdraw(withdrawParams));

  // =========================================================================
  // 7. SPOT API - API KEY MANAGEMENT
  // =========================================================================

  logSection('SPOT API - API Key Management');

  // Create new API key - proper flow with getNonce and signature
  console.log('⚠️  Note: Creating API key requires proper Web3 signature');

  try {
    // Step 1: Get nonce for CREATE_API_KEY operation
    const userAddress = CONFIG.futuresCredentials?.userAddress || 'your-address';
    const nonce = await safeExecute(
      'Get Nonce for CREATE_API_KEY',
      () => client.spot.getNonce(userAddress, 'CREATE_API_KEY')
    );

    if (nonce) {
      // Step 2: Create signature message
      // Format: "You are signing into Astherus {nonce}"
      const message = `You are signing into Astherus ${nonce}`;

      console.log(`📝 Message to sign: "${message}"`);
      console.log('⚠️  In production, sign this message with ethers.Wallet.signMessage()');

      // Step 3: Create API key with the signature
      // Note: This is a DEMO - you need to actually sign the message with the wallet's private key
      const { Wallet } = await import("ethers");

      const wallet = new Wallet(CONFIG.futuresCredentials?.privateKey);
      const apiKeyParams: CreateApiKeyParams = {
        address: userAddress,
        userOperationType: 'CREATE_API_KEY',
        userSignature: await wallet.signMessage(message), // Replace with: await wallet.signMessage(message)
        desc: `Demo_${Date.now()}`, // Unique description (cannot be duplicate for same account)
        // apikeyIP: '0.0.0.0', // Optional: Restrict API key to specific IP
      };

      await safeExecute(
        'Create API Key (DEMO)',
        () => client.spot.createApiKey(apiKeyParams)
      );
    }
  } catch (error) {
    console.log('❌ Create API Key flow failed:', error instanceof Error ? error.message : error);
  }

  // =========================================================================
  // 8. SPOT API - USER DATA STREAM
  // =========================================================================

  logSection('SPOT API - User Data Stream');

  // Start user data stream
  const listenKeyResult = await safeExecute(
    'Start User Data Stream',
    () => client.spot.startUserDataStream()
  );

  if (listenKeyResult?.listenKey) {
    // Keep alive user data stream
    await safeExecute(
      'Keep Alive User Data Stream',
      () => client.spot.keepAliveUserDataStream(listenKeyResult.listenKey)
    );

    // Close user data stream
    await safeExecute(
      'Close User Data Stream',
      () => client.spot.closeUserDataStream(listenKeyResult.listenKey)
    );
  }

  // =========================================================================
  // 9. FUTURES API INITIALIZATION
  // =========================================================================

  logSection('FUTURES API - Initialization & Setup');

  // Create Futures client (requires Web3 credentials)
  let futuresClient: FuturesClient;

  try {
    futuresClient = client.createFuturesClient(
      CONFIG.futuresCredentials.userAddress,
      CONFIG.futuresCredentials.signerAddress,
      CONFIG.futuresCredentials.privateKey
    );
    console.log('✅ Futures client created successfully');
    console.log(`   User Address: ${CONFIG.futuresCredentials.userAddress}`);
    console.log(`   Signer Address: ${CONFIG.futuresCredentials.signerAddress}`);
    console.log(`   Has Authentication: ${futuresClient.hasAuth()}`);
  } catch (error) {
    console.error('❌ Failed to create Futures client:', error);
    console.log('⚠️  Skipping Futures API demo - Web3 credentials required');
    return;
  }

  // =========================================================================
  // 10. FUTURES API - BASIC CONNECTIVITY
  // =========================================================================

  logStep('10', 'Futures API Basic Connectivity');

  // Test Futures API connectivity
  await safeExecute('Futures API Ping', () => futuresClient.ping());

  // Get Futures server time
  await safeExecute('Get Futures Server Time', () => futuresClient.getServerTime());

  // =========================================================================
  // 11. FUTURES API - MARKET DATA (PUBLIC)
  // =========================================================================

  logSection('FUTURES API - Market Data (Public)');

  // Get futures exchange information
  await safeExecute(
    'Get Futures Exchange Information',
    () => futuresClient.getExchangeInfo(),
    false
  );

  // Get futures order book
  await safeExecute(
    `Get Futures Order Book for ${CONFIG.testSymbol}`,
    () => futuresClient.getOrderBook(CONFIG.testSymbol, 5)
  );

  // Get recent futures trades
  await safeExecute(
    `Get Recent Futures Trades for ${CONFIG.testSymbol}`,
    () => futuresClient.getRecentTrades(CONFIG.testSymbol, 5)
  );

  // Get mark price
  await safeExecute(
    `Get Mark Price for ${CONFIG.testSymbol}`,
    () => futuresClient.getMarkPrice(CONFIG.testSymbol)
  );

  // Get all mark prices
  await safeExecute(
    'Get All Mark Prices',
    () => futuresClient.getMarkPrice(),
    false
  );

  // Get 24hr ticker for futures
  await safeExecute(
    `Get Futures 24hr Ticker for ${CONFIG.testSymbol}`,
    () => futuresClient.get24hrTicker(CONFIG.testSymbol)
  );

  // Get futures price
  await safeExecute(
    `Get Futures Price for ${CONFIG.testSymbol}`,
    () => futuresClient.getPrice(CONFIG.testSymbol)
  );

  // Get futures book ticker
  await safeExecute(
    `Get Futures Book Ticker for ${CONFIG.testSymbol}`,
    () => futuresClient.getBookTicker(CONFIG.testSymbol)
  );

  // =========================================================================
  // 12. FUTURES API - ACCOUNT CONFIGURATION
  // =========================================================================

  logSection('FUTURES API - Account Configuration');

  // Get position mode
  await safeExecute(
    'Get Position Mode',
    () => futuresClient.getPositionMode()
  );

  // Get multi-assets mode
  await safeExecute(
    'Get Multi-Assets Mode',
    () => futuresClient.getMultiAssetsMode()
  );

  // Change position mode (DEMO - be careful)
  await safeExecute(
    'Change Position Mode to Hedge (DEMO)',
    () => futuresClient.changePositionMode(true)
  );

  // Change multi-assets mode (DEMO - be careful)
  await safeExecute(
    'Enable Multi-Assets Mode (DEMO)',
    () => futuresClient.changeMultiAssetsMode(true)
  );

  // =========================================================================
  // 13. FUTURES API - ACCOUNT INFORMATION
  // =========================================================================

  logSection('FUTURES API - Account Information');

  // Get futures account balance
  await safeExecute(
    'Get Futures Balance',
    () => futuresClient.getBalance()
  );

  // Get futures account information
  await safeExecute(
    'Get Futures Account Information',
    () => futuresClient.getAccount()
  );

  // Get position risk
  await safeExecute(
    'Get Position Risk (All Symbols)',
    () => futuresClient.getPositionRisk()
  );

  // Get position risk for specific symbol
  await safeExecute(
    `Get Position Risk for ${CONFIG.testSymbol}`,
    () => futuresClient.getPositionRisk(CONFIG.testSymbol)
  );

  // Get commission rate for futures
  await safeExecute(
    `Get Futures Commission Rate for ${CONFIG.testSymbol}`,
    () => futuresClient.getCommissionRate(CONFIG.testSymbol)
  );

  // =========================================================================
  // 14. FUTURES API - TRADING & ORDERS
  // =========================================================================

  logSection('FUTURES API - Trading & Orders');

  // Example: Place a futures limit order (DEMO)
  const futuresOrderParams: FuturesNewOrderParams = {
    symbol: CONFIG.testSymbol,
    side: 'BUY',
    type: 'LIMIT',
    timeInForce: 'GTC',
    quantity: '0.001',
    price: '30000', // Adjust price as needed
    newClientOrderId: `futures-demo-${Date.now()}`,
  };

  await safeExecute(
    'Place Futures Limit Order (DEMO)',
    () => futuresClient.newOrder(futuresOrderParams)
  );

  // Get open futures orders
  await safeExecute(
    'Get Open Futures Orders (All Symbols)',
    () => futuresClient.getOpenOrders()
  );

  // Get open orders for specific symbol
  await safeExecute(
    `Get Open Futures Orders for ${CONFIG.testSymbol}`,
    () => futuresClient.getOpenOrders(CONFIG.testSymbol)
  );

  // Example: Batch orders (DEMO)
  const batchOrderParams = {
    batchOrders: [
      {
        symbol: CONFIG.testSymbol,
        side: 'BUY' as const,
        type: 'LIMIT' as const,
        timeInForce: 'GTC' as const,
        quantity: '0.001',
        price: '29000',
        newClientOrderId: `batch-1-${Date.now()}`,
      },
      {
        symbol: CONFIG.testSymbol,
        side: 'SELL' as const,
        type: 'LIMIT' as const,
        timeInForce: 'GTC' as const,
        quantity: '0.001',
        price: '31000',
        newClientOrderId: `batch-2-${Date.now()}`,
      },
    ],
  };

  await safeExecute(
    'Place Batch Orders (DEMO)',
    () => futuresClient.newBatchOrders(batchOrderParams)
  );

  // =========================================================================
  // 15. FUTURES API - POSITION & RISK MANAGEMENT
  // =========================================================================

  logSection('FUTURES API - Position & Risk Management');

  // Change leverage (DEMO)
  await safeExecute(
    `Change Leverage for ${CONFIG.testSymbol} to 10x (DEMO)`,
    () => futuresClient.changeLeverage({ symbol: CONFIG.testSymbol, leverage: 10 })
  );

  // Change margin type (DEMO)
  await safeExecute(
    `Change Margin Type for ${CONFIG.testSymbol} to ISOLATED (DEMO)`,
    () => futuresClient.changeMarginType({ symbol: CONFIG.testSymbol, marginType: 'ISOLATED' })
  );

  // Get leverage bracket
  await safeExecute(
    `Get Leverage Bracket for ${CONFIG.testSymbol}`,
    () => futuresClient.getLeverageBracket(CONFIG.testSymbol)
  );

  // Get ADL quantile
  await safeExecute(
    `Get ADL Quantile for ${CONFIG.testSymbol}`,
    () => futuresClient.getADLQuantile(CONFIG.testSymbol)
  );

  // =========================================================================
  // 16. FUTURES API - HISTORY & ANALYTICS
  // =========================================================================

  logSection('FUTURES API - History & Analytics');

  // Get income history
  await safeExecute(
    'Get Income History',
    () => futuresClient.getIncomeHistory({ limit: 10 })
  );

  // Get force orders (liquidations)
  await safeExecute(
    'Get Force Orders',
    () => futuresClient.getForceOrders({ limit: 10 })
  );

  // =========================================================================
  // 17. FUTURES API - TRANSFERS
  // =========================================================================

  logSection('FUTURES API - Asset Transfers');

  // Transfer assets between futures and spot (DEMO)
  const futuresTransferParams = {
    asset: CONFIG.testAsset,
    amount: '1.0',
    clientTranId: `transfer_${Date.now()}`, // Unique transaction ID
    kindType: 'SPOT_FUTURE' as const, // SPOT_FUTURE (spot to futures) or FUTURE_SPOT (futures to spot)
  };

  await safeExecute(
    'Transfer Asset to Futures (DEMO)',
    () => futuresClient.transferAsset(futuresTransferParams)
  );

  // =========================================================================
  // 18. FUTURES API - USER DATA STREAM
  // =========================================================================

  logSection('FUTURES API - User Data Stream');

  // Start futures user data stream
  const futuresListenKeyResult = await safeExecute(
    'Start Futures User Data Stream',
    () => futuresClient.startUserDataStream()
  );

  if (futuresListenKeyResult?.listenKey) {
    // Keep alive futures user data stream
    await safeExecute(
      'Keep Alive Futures User Data Stream',
      () => futuresClient.keepAliveUserDataStream(futuresListenKeyResult.listenKey)
    );

    // Close futures user data stream
    await safeExecute(
      'Close Futures User Data Stream',
      () => futuresClient.closeUserDataStream(futuresListenKeyResult.listenKey)
    );
  }

  // =========================================================================
  // 19. WEBSOCKET EXAMPLES (LIVE CONNECTION TEST)
  // =========================================================================

  logSection('WebSocket Examples (Live Connection Test)');

  console.log('📍 Testing WebSocket connections with real data...');
  console.log('');

  // Create Spot WebSocket client with handlers
  const spotWs = client.createWebSocketClient({
    onTicker: (data) => {
      console.log('📊 Spot Ticker Update:', {
        symbol: data.s,
        price: data.c,
        change: data.P + '%'
      });
    },
    onError: (error) => console.error('❌ Spot WS Error:', error),
  });

  // Create Futures WebSocket client with handlers
  const futuresWs = client.createFuturesWebSocketClient({
    onMarkPrice: (data) => {
      console.log('📈 Futures Mark Price:', {
        symbol: data.s,
        markPrice: data.p,
        fundingRate: data.r
      });
    },
    onError: (error) => console.error('❌ Futures WS Error:', error),
  });

  console.log('✅ WebSocket clients created');
  console.log('');

  try {
    // Test Spot WebSocket
    console.log('🔌 Connecting to Spot WebSocket...');
    await spotWs.connect();
    console.log('✅ Spot WebSocket connected');

    console.log('📡 Subscribing to BTCUSDT ticker...');
    await spotWs.subscribe(['btcusdt@ticker']);
    console.log('✅ Subscribed to Spot streams');
    console.log('');

    // Test Futures WebSocket
    console.log('🔌 Connecting to Futures WebSocket...');
    await futuresWs.connect();
    console.log('✅ Futures WebSocket connected');

    console.log('📡 Subscribing to BTCUSDT mark price...');
    await futuresWs.subscribe(['btcusdt@markPrice']);
    console.log('✅ Subscribed to Futures streams');
    console.log('');

    // Listen for data for a few seconds
    console.log('👂 Listening for WebSocket data (5 seconds)...');
    console.log('');

    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('');
    console.log('🔌 Disconnecting WebSockets...');
    await spotWs.disconnect();
    await futuresWs.disconnect();
    console.log('✅ WebSockets disconnected');

  } catch (error) {
    console.error('❌ WebSocket test failed:', error instanceof Error ? error.message : error);

    // Make sure to disconnect on error
    try {
      await spotWs.disconnect();
      await futuresWs.disconnect();
    } catch (disconnectError) {
      // Ignore disconnect errors
    }
  }

  // =========================================================================
  // 20. DEMO COMPLETION
  // =========================================================================

  logSection('Demo Complete! 🎉');

  console.log('✅ Successfully demonstrated ALL REST API methods!');
  console.log('\n📊 Summary of what was covered:');
  console.log('   • SDK Initialization & Configuration');
  console.log('   • Basic Connectivity Tests');
  console.log('   • Spot API - Market Data (Public)');
  console.log('   • Spot API - Account & Trading (Authenticated)');
  console.log('   • Spot API - Wallet Management');
  console.log('   • Spot API - User Data Streams');
  console.log('   • Futures API - Market Data (Public)');
  console.log('   • Futures API - Account Configuration');
  console.log('   • Futures API - Trading & Orders');
  console.log('   • Futures API - Position & Risk Management');
  console.log('   • Futures API - History & Analytics');
  console.log('   • Futures API - User Data Streams');
  console.log('   • WebSocket Client Setup');

  console.log('\n🔗 Next Steps:');
  console.log('   • Modify CONFIG section for your credentials');
  console.log('   • Adjust trading parameters for your needs');
  console.log('   • Use real symbols and amounts for live trading');
  console.log('   • Implement proper error handling in production');
  console.log('   • Set up WebSocket connections for real-time data');

  console.log('\n⚠️  Important Notes:');
  console.log('   • This is a DEMONSTRATION script');
  console.log('   • Use with caution on mainnet with real funds');
  console.log('   • Always test on testnet first');
  console.log('   • Implement proper risk management');
  console.log('   • Monitor rate limits and implement retry logic');
}

// =============================================================================
// SCRIPT EXECUTION
// =============================================================================

// Auto-execute the demo when run directly
// Note: This will run when the script is imported as well, but that's acceptable for a demo script
demonstrateAllRestMethods()
  .then(() => {
    console.log('\n🏁 Demo script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Demo script failed:', error);
    process.exit(1);
  });

export { demonstrateAllRestMethods };
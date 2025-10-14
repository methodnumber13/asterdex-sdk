# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-01-14

### Added

#### Core Features
- **Spot Trading API** - Complete implementation with 30+ methods
  - Market data endpoints (order book, trades, klines, tickers)
  - Trading operations (place, cancel, query orders)
  - Account management (balance, trades, transfers)
  - Withdrawal and deposit functionality
  - User data streams for real-time updates

- **Futures Trading API** - Complete implementation with 50+ methods
  - All spot features plus futures-specific functionality
  - Position management (leverage, margin type, position margin)
  - Advanced order types (STOP, TAKE_PROFIT, TRAILING_STOP_MARKET)
  - Batch order operations (place/cancel multiple orders)
  - Funding rate and mark price endpoints
  - Web3 signature authentication

- **WebSocket Streams** - Real-time data streaming
  - Market data streams (ticker, trades, depth, klines)
  - User data streams (account updates, order execution)
  - Futures streams (mark price, liquidations)
  - Automatic reconnection with exponential backoff
  - Stream utilities for easy subscription management

#### Developer Experience
- **TypeScript Support** - Full TypeScript with strict type checking
  - Complete type definitions for all API responses
  - IntelliSense support in all major IDEs
  - Type-safe parameters and return values

- **Error Handling** - Comprehensive error types
  - ApiResponseError for API errors
  - NetworkError for connection issues
  - ValidationError for parameter validation
  - RateLimitError for rate limit handling

- **Configuration** - Flexible configuration system
  - Environment-based configuration
  - Custom endpoint support
  - Retry logic with exponential backoff
  - Built-in rate limiting

#### Testing & Quality
- **Test Coverage** - 89.78% code coverage
  - 347 passing tests
  - Unit tests for all components
  - Integration tests for critical paths
  - Vitest test framework

- **Code Quality**
  - ESLint configuration
  - Prettier formatting
  - TypeScript strict mode
  - Comprehensive JSDoc documentation

#### Documentation
- Complete README with examples
- API reference documentation
- Configuration guide
- Contributing guidelines
- MIT License

### Technical Details
- **Build System**: Vite for fast builds
- **Package Formats**: CommonJS and ESM
- **Node.js**: >= 18.0.0
- **Dependencies**: Minimal production dependencies (dotenv, ws, web3-eth-accounts)

### Notes
This is an **unofficial SDK** and is not affiliated with or endorsed by AsterDEX.

[1.0.0]: https://github.com/methodnumber13/asterdex-sdk/releases/tag/v1.0.0

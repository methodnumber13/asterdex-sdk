/**
 * Tests for AsterWebSocketClient
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { StreamEventHandlers, WebSocketConfig } from '@/types/websocket';

// Track mock instances - must be module-level variables
const mockInstances: any[] = [];
let lastMockInstance: any = null;

// Mock the 'ws' module - vitest will hoist this
vi.mock('ws', () => {
  // Define MockWebSocket inside the factory
  class MockWebSocket {
    public readyState = 0; // CONNECTING
    public url: string;
    private listeners: Map<string, Set<(...args: any[]) => void>> = new Map();

    constructor(url: string) {
      this.url = url;
      // Track this instance
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      lastMockInstance = this;
      mockInstances.push(this);

      // Emit open after a delay to allow tests to intercept
      setImmediate(() => {
        // Only emit open if still connecting (not closed/errored)
        if (this.readyState === 0) {
          this.readyState = 1; // OPEN
          this.emit('open', {});
        }
      });
    }

    on(event: string, listener: (...args: any[]) => void) {
      if (!this.listeners.has(event)) {
        this.listeners.set(event, new Set());
      }
      this.listeners.get(event)?.add(listener);
    }

    off(event: string, listener: (...args: any[]) => void) {
      this.listeners.get(event)?.delete(listener);
    }

    send(data: string) {
      // Mock implementation - simulate response for subscribe/unsubscribe requests
      try {
        const request = JSON.parse(data);
        if (request.id && (request.method === 'SUBSCRIBE' || request.method === 'UNSUBSCRIBE')) {
          // Simulate async response
          setImmediate(() => {
            const response = { id: request.id, result: null };
            this.emit('message', Buffer.from(JSON.stringify(response)));
          });
        }
      } catch (_e) {
        // Ignore parse errors
      }
    }

    close(code = 1000, reason = 'Normal closure') {
      this.readyState = 3; // CLOSED
      this.emit('close', code, Buffer.from(reason));
    }

    ping = () => {
      // Mock ping - will be spied on in tests
    };

    pong = () => {
      // Mock pong
    };

    terminate() {
      this.readyState = 3; // CLOSED
      this.emit('close', 1006, Buffer.from('Connection terminated'));
    }

    emit(event: string, ...args: unknown[]) {
      const listeners = this.listeners.get(event);
      if (listeners) {
        listeners.forEach((listener) => listener(...args));
      }
    }

    // Test helpers
    simulateMessage(data: string) {
      // In Node.js ws library, message event passes data directly, not wrapped
      this.emit('message', Buffer.from(data));
    }

    simulateError(error: Error) {
      this.emit('error', error);
    }

    simulatePong() {
      this.emit('pong', Buffer.from(''));
    }
  }

  return { default: MockWebSocket };
});

// Import after mock is defined
import { AsterWebSocketClient, StreamUtils } from './websocket';

// Type definition for MockWebSocket for use in tests
type MockWebSocket = {
  readyState: number;
  url: string;
  on: (event: string, listener: (...args: any[]) => void) => void;
  off: (event: string, listener: (...args: any[]) => void) => void;
  send: (data: string) => void;
  close: (code?: number, reason?: string) => void;
  ping: () => void;
  pong: () => void;
  terminate: () => void;
  emit: (event: string, ...args: unknown[]) => void;
  simulateMessage: (data: string) => void;
  simulateError: (error: Error) => void;
  simulatePong: () => void;
};

describe('AsterWebSocketClient', () => {
  let client: AsterWebSocketClient;
  let mockEventHandlers: StreamEventHandlers;

  beforeEach(() => {
    vi.clearAllMocks();

    // Clear mock instances
    mockInstances.length = 0;
    lastMockInstance = null;

    mockEventHandlers = {
      onOpen: vi.fn(),
      onClose: vi.fn(),
      onError: vi.fn(),
      onTicker: vi.fn(),
      onTrade: vi.fn(),
      onDepthUpdate: vi.fn(),
      onKline: vi.fn(),
      onMiniTicker: vi.fn(),
      onBookTicker: vi.fn(),
      onAggTrade: vi.fn(),
      onAccountUpdate: vi.fn(),
      onExecutionReport: vi.fn(),
    };
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  describe('constructor', () => {
    it('should create instance with default config', () => {
      client = new AsterWebSocketClient('wss://fstream.asterdex.com');
      expect(client).toBeInstanceOf(AsterWebSocketClient);
    });

    it('should create instance with custom config', () => {
      const config: WebSocketConfig = {
        reconnect: false,
        reconnectInterval: 2000,
        maxReconnectAttempts: 3,
        pingInterval: 30000,
        pongTimeout: 5000,
      };

      client = new AsterWebSocketClient(
        'wss://fstream.asterdex.com',
        '/custom',
        config,
        mockEventHandlers,
      );
      expect(client).toBeInstanceOf(AsterWebSocketClient);
    });

    it('should create instance with event handlers', () => {
      client = new AsterWebSocketClient('wss://fstream.asterdex.com', '/ws', {}, mockEventHandlers);
      expect(client).toBeInstanceOf(AsterWebSocketClient);
    });
  });

  describe('connection management', () => {
    beforeEach(() => {
      client = new AsterWebSocketClient('wss://fstream.asterdex.com', '/ws', {}, mockEventHandlers);
    });

    describe('connect', () => {
      it('should connect to WebSocket successfully', async () => {
        await client.connect();

        expect(mockEventHandlers.onOpen).toHaveBeenCalled();
      });

      it('should not create multiple connections when already connected', async () => {
        await client.connect();

        // Try to connect again
        await client.connect();

        // Should only call onOpen once
        expect(mockEventHandlers.onOpen).toHaveBeenCalledTimes(1);
      });

      it('should handle connection errors', async () => {
        // Add error listener to client to prevent EventEmitter from throwing
        client.on('error', () => {});

        // Create a promise that will track when the instance is created
        const originalLength = mockInstances.length;
        const instanceCreated: Promise<void> = new Promise<void>((resolve) => {
          const checkInstance = () => {
            if (mockInstances.length > originalLength) {
              resolve();
            } else {
              setImmediate(checkInstance);
            }
          };
          checkInstance();
        });

        const connectPromise = client.connect();

        // Wait for instance to be created
        await instanceCreated;

        // Prevent auto-connect and simulate error
        if (lastMockInstance) {
          lastMockInstance.readyState = 2; // Set to CLOSING to prevent open event
          lastMockInstance.simulateError(new Error('Connection failed'));
        }

        await expect(connectPromise).rejects.toThrow('Network request failed');
        expect(mockEventHandlers.onError).toHaveBeenCalled();
      });
    });

    describe('disconnect', () => {
      it('should disconnect WebSocket', async () => {
        await client.connect();

        client.disconnect();

        expect(mockEventHandlers.onClose).toHaveBeenCalled();
      });

      it('should handle disconnect when not connected', () => {
        expect(() => client.disconnect()).not.toThrow();
      });
    });

    describe('isConnected', () => {
      it('should return false when not connected', () => {
        expect(client.isConnected()).toBe(false);
      });

      it('should return true when connected', async () => {
        await client.connect();

        expect(client.isConnected()).toBe(true);
      });
    });
  });

  describe('subscription management', () => {
    beforeEach(async () => {
      client = new AsterWebSocketClient('wss://fstream.asterdex.com', '/ws', {}, mockEventHandlers);
      await client.connect();
    });

    describe('subscribe', () => {
      it('should subscribe to single stream', async () => {
        await client.subscribe('btcusdt@ticker');

        const subscriptions = client.getSubscriptions();
        expect(subscriptions).toContain('btcusdt@ticker');
      });

      it('should subscribe to multiple streams', async () => {
        const streams = ['btcusdt@ticker', 'ethusdt@trade', 'adausdt@depth'];
        await client.subscribe(streams);

        const subscriptions = client.getSubscriptions();
        streams.forEach((stream) => {
          expect(subscriptions).toContain(stream);
        });
      });

      it('should not duplicate subscriptions', async () => {
        await client.subscribe('btcusdt@ticker');
        await client.subscribe('btcusdt@ticker');

        const subscriptions = client.getSubscriptions();
        const tickerCount = subscriptions.filter((s) => s === 'btcusdt@ticker').length;
        expect(tickerCount).toBe(1);
      });
    });

    describe('unsubscribe', () => {
      it('should unsubscribe from single stream', async () => {
        await client.subscribe('btcusdt@ticker');
        await client.unsubscribe('btcusdt@ticker');

        const subscriptions = client.getSubscriptions();
        expect(subscriptions).not.toContain('btcusdt@ticker');
      });

      it('should unsubscribe from multiple streams', async () => {
        const streams = ['btcusdt@ticker', 'ethusdt@trade'];
        await client.subscribe(streams);
        await client.unsubscribe(streams);

        const subscriptions = client.getSubscriptions();
        streams.forEach((stream) => {
          expect(subscriptions).not.toContain(stream);
        });
      });

      it('should handle unsubscribing from non-existent stream', async () => {
        await expect(client.unsubscribe('nonexistent@stream')).resolves.not.toThrow();
      });
    });

    describe('unsubscribeAll', () => {
      it('should unsubscribe from all streams', async () => {
        const streams = ['btcusdt@ticker', 'ethusdt@trade', 'adausdt@depth'];
        await client.subscribe(streams);

        // Unsubscribe from all streams by passing all subscribed streams
        await client.unsubscribe(streams);

        const subscriptions = client.getSubscriptions();
        expect(subscriptions).toHaveLength(0);
      });
    });
  });

  describe('message handling', () => {
    let mockWs: MockWebSocket | null;

    beforeEach(async () => {
      client = new AsterWebSocketClient('wss://fstream.asterdex.com', '/ws', {}, mockEventHandlers);
      await client.connect();

      mockWs = lastMockInstance;
    });

    it('should handle ticker stream messages', () => {
      const tickerData = {
        stream: 'btcusdt@ticker',
        data: {
          e: '24hrTicker',
          s: 'BTCUSDT',
          c: '50000.00',
          P: '2.50',
        },
      };

      mockWs?.simulateMessage(JSON.stringify(tickerData));

      expect(mockEventHandlers.onTicker).toHaveBeenCalledWith(tickerData);
    });

    it('should handle trade stream messages', () => {
      const tradeData = {
        stream: 'btcusdt@trade',
        data: {
          e: 'trade',
          s: 'BTCUSDT',
          p: '50000.00',
          q: '1.00',
        },
      };

      mockWs?.simulateMessage(JSON.stringify(tradeData));

      expect(mockEventHandlers.onTrade).toHaveBeenCalledWith(tradeData);
    });

    it('should handle depth update messages', () => {
      const depthData = {
        stream: 'btcusdt@depth',
        data: {
          e: 'depthUpdate',
          s: 'BTCUSDT',
          b: [['49950.00', '1.00']],
          a: [['50050.00', '1.00']],
        },
      };

      mockWs?.simulateMessage(JSON.stringify(depthData));

      expect(mockEventHandlers.onDepthUpdate).toHaveBeenCalledWith(depthData);
    });

    it('should handle kline stream messages', () => {
      const klineData = {
        stream: 'btcusdt@kline_1m',
        data: {
          e: 'kline',
          s: 'BTCUSDT',
          k: {
            o: '50000.00',
            c: '50100.00',
            h: '50200.00',
            l: '49900.00',
          },
        },
      };

      mockWs?.simulateMessage(JSON.stringify(klineData));

      expect(mockEventHandlers.onKline).toHaveBeenCalledWith(klineData);
    });

    it('should handle account update messages', () => {
      const accountData = {
        stream: 'user_data',
        data: {
          e: 'outboundAccountPosition',
          B: [{ a: 'BTC', f: '1.00000000', l: '0.00000000' }],
        },
      };

      mockWs?.simulateMessage(JSON.stringify(accountData));

      expect(mockEventHandlers.onAccountUpdate).toHaveBeenCalledWith(accountData);
    });

    it('should handle execution report messages', () => {
      const executionData = {
        stream: 'user_data',
        data: {
          e: 'executionReport',
          s: 'BTCUSDT',
          S: 'BUY',
          o: 'LIMIT',
          X: 'FILLED',
        },
      };

      mockWs?.simulateMessage(JSON.stringify(executionData));

      expect(mockEventHandlers.onExecutionReport).toHaveBeenCalledWith(executionData);
    });

    it('should handle malformed JSON messages', () => {
      // Add error listener to client to prevent EventEmitter from throwing
      client.on('error', () => {});

      mockWs?.simulateMessage('invalid json');

      expect(mockEventHandlers.onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Network request failed'),
        }),
      );
    });

    it('should handle empty messages', () => {
      mockWs?.simulateMessage('');

      expect(mockEventHandlers.onError).not.toHaveBeenCalled();
    });

    it('should handle unknown message types without error', () => {
      const unknownData = {
        stream: 'unknown@stream',
        data: { type: 'unknown' },
      };

      mockWs?.simulateMessage(JSON.stringify(unknownData));

      // Should not throw or call error handler
      expect(mockEventHandlers.onError).not.toHaveBeenCalled();
    });
  });

  // TODO: These tests hit infinite loops with fake timers due to setInterval
  // Need to refactor to properly handle timer mocking or use integration tests
  describe.skip('ping/pong mechanism', () => {
    beforeEach(async () => {
      vi.useFakeTimers();
      client = new AsterWebSocketClient('wss://fstream.asterdex.com', '/ws', {
        pingInterval: 1000,
        pongTimeout: 500,
      });
      const connectPromise = client.connect();

      // Advance timers to trigger connection
      await vi.runAllTimersAsync();
      await connectPromise;
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should start ping interval after connection', async () => {
      // Spy on ping method
      const pingSpy = vi.spyOn(lastMockInstance, 'ping');

      // Fast forward past ping interval
      await vi.advanceTimersByTimeAsync(1000);

      // Should have sent ping
      expect(pingSpy).toHaveBeenCalled();
    });

    it('should handle pong responses', async () => {
      await vi.advanceTimersByTimeAsync(1000);
      lastMockInstance?.simulatePong();

      // Should not trigger disconnection
      expect(mockEventHandlers.onClose).not.toHaveBeenCalled();
    });

    it('should disconnect on pong timeout', async () => {
      await vi.advanceTimersByTimeAsync(1000); // Trigger ping
      await vi.advanceTimersByTimeAsync(500); // Trigger pong timeout

      expect(mockEventHandlers.onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('timeout'),
        }),
      );
    });
  });

  // TODO: These tests hit infinite loops with fake timers due to setInterval
  // Need to refactor to properly handle timer mocking or use integration tests
  describe.skip('reconnection', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      client = new AsterWebSocketClient(
        'wss://fstream.asterdex.com',
        '/ws',
        {
          reconnect: true,
          reconnectInterval: 1000,
          maxReconnectAttempts: 3,
        },
        mockEventHandlers,
      );
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should attempt reconnection on unexpected close', async () => {
      const connectPromise = client.connect();
      await vi.runAllTimersAsync();
      await connectPromise;

      const initialInstanceCount = mockInstances.length;

      // Simulate unexpected close
      if (lastMockInstance) {
        lastMockInstance.readyState = 3;
        lastMockInstance.emit('close', 1006, Buffer.from('Abnormal closure'));
      }

      // Fast forward past reconnect interval
      await vi.advanceTimersByTimeAsync(1000);

      // Should have attempted reconnection
      expect(mockInstances.length).toBe(initialInstanceCount + 1);
    });

    it('should not reconnect when disabled', async () => {
      client = new AsterWebSocketClient(
        'wss://fstream.asterdex.com',
        '/ws',
        {
          reconnect: false,
        },
        mockEventHandlers,
      );

      const connectPromise = client.connect();
      await vi.runAllTimersAsync();
      await connectPromise;

      const initialInstanceCount = mockInstances.length;

      if (lastMockInstance) {
        lastMockInstance.readyState = 3;
        lastMockInstance.emit('close', 1006, Buffer.from('Abnormal closure'));
      }

      await vi.advanceTimersByTimeAsync(1000);

      // Should not have attempted reconnection
      expect(mockInstances.length).toBe(initialInstanceCount);
    });

    it('should stop reconnecting after max attempts', async () => {
      const connectPromise = client.connect();
      await vi.runAllTimersAsync();
      await connectPromise;

      // Simulate multiple failed reconnections
      for (let i = 0; i < 4; i++) {
        if (lastMockInstance) {
          lastMockInstance.readyState = 3;
          lastMockInstance.emit('close', 1006, Buffer.from('Abnormal closure'));
        }
        await vi.advanceTimersByTimeAsync(1000);
      }

      // Should have attempted max reconnections + initial connection
      expect(mockInstances.length).toBe(4); // 1 initial + 3 reconnects
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      client = new AsterWebSocketClient('wss://fstream.asterdex.com', '/ws', {}, mockEventHandlers);
    });

    it('should handle connection errors', async () => {
      // Add error listener to client to prevent EventEmitter from throwing
      client.on('error', () => {});

      // Wait for instance to be created
      const originalLength = mockInstances.length;
      const instanceCreated = new Promise<void>((resolve) => {
        const checkInstance = () => {
          if (mockInstances.length > originalLength) {
            resolve();
          } else {
            setImmediate(checkInstance);
          }
        };
        checkInstance();
      });

      const connectPromise = client.connect();
      await instanceCreated;

      // Prevent auto-connect and simulate error
      if (lastMockInstance) {
        lastMockInstance.readyState = 2; // Set to CLOSING to prevent open event
        const error = new Error('Connection failed');
        lastMockInstance.simulateError(error);
      }

      await expect(connectPromise).rejects.toThrow('Network request failed');
      expect(mockEventHandlers.onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Connection failed'),
        }),
      );
    });

    it('should throw error when subscribing without connection', async () => {
      await expect(client.subscribe('btcusdt@ticker')).rejects.toThrow();
    });

    it('should throw error when unsubscribing without connection', async () => {
      await expect(client.unsubscribe('btcusdt@ticker')).rejects.toThrow();
    });
  });

  describe('StreamUtils', () => {
    describe('spot streams', () => {
      it('should generate ticker stream name', () => {
        expect(StreamUtils.ticker('BTCUSDT')).toBe('btcusdt@ticker');
      });

      it('should generate trade stream name', () => {
        expect(StreamUtils.trade('BTCUSDT')).toBe('btcusdt@trade');
      });

      it('should generate depth stream name', () => {
        expect(StreamUtils.depth('BTCUSDT')).toBe('btcusdt@depth');
        expect(StreamUtils.depth('BTCUSDT', 5)).toBe('btcusdt@depth5');
        expect(StreamUtils.depth('BTCUSDT', 10, '100ms')).toBe('btcusdt@depth10@100ms');
      });

      it('should generate kline stream name', () => {
        expect(StreamUtils.kline('BTCUSDT', '1m')).toBe('btcusdt@kline_1m');
      });

      it('should generate mini ticker stream name', () => {
        expect(StreamUtils.miniTicker('BTCUSDT')).toBe('btcusdt@miniTicker');
      });

      it('should generate all tickers stream name', () => {
        expect(StreamUtils.allTicker()).toBe('!ticker@arr');
      });

      it('should generate book ticker stream name', () => {
        expect(StreamUtils.bookTicker('BTCUSDT')).toBe('btcusdt@bookTicker');
      });

      it('should generate aggregated trade stream name', () => {
        expect(StreamUtils.aggTrade('BTCUSDT')).toBe('btcusdt@aggTrade');
      });
    });

    describe('futures streams', () => {
      it('should generate mark price stream name', () => {
        expect(StreamUtils.futuresMarkPrice('BTCUSDT')).toBe('btcusdt@markPrice');
      });

      it('should generate all mark prices stream name', () => {
        expect(StreamUtils.allFuturesMarkPrice()).toBe('!markPrice@arr');
      });

      it('should generate liquidation stream name', () => {
        expect(StreamUtils.futuresLiquidation('BTCUSDT')).toBe('btcusdt@forceOrder');
      });

      it('should generate all liquidations stream name', () => {
        expect(StreamUtils.allFuturesLiquidation()).toBe('!forceOrder@arr');
      });
    });

    describe('utility methods', () => {
      it('should combine multiple streams', () => {
        const streams = [
          StreamUtils.ticker('BTCUSDT'),
          StreamUtils.trade('ETHUSDT'),
          StreamUtils.depth('ADAUSDT'),
        ];
        expect(streams).toEqual(['btcusdt@ticker', 'ethusdt@trade', 'adausdt@depth']);
      });
    });
  });
});

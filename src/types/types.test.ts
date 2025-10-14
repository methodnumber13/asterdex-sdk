/**
 * Tests for type definitions and interfaces
 */

import { describe, it, expect } from 'vitest';
import type {
  BaseUserOperationParams,
  TimeRangeOptions,
  TradeQueryOptions,
  KlineOptions,
  OrderLookupParams,
  ApiSuccessResponse,
  ServerTimeResponse,
  EmptyResponse,
} from '@/types/futures-options';
import type { HttpMethod, OrderType, OrderSide, KlineInterval, ApiAuthType } from '@/types/common';

describe('Futures Options Types', () => {
  describe('BaseUserOperationParams', () => {
    it('should have correct structure', () => {
      const params: BaseUserOperationParams = {
        address: '0x123',
        userOperationType: 'CREATE_API_KEY',
        network: 'mainnet',
      };

      expect(params.address).toBe('0x123');
      expect(params.userOperationType).toBe('CREATE_API_KEY');
      expect(params.network).toBe('mainnet');
    });

    it('should allow optional network field', () => {
      const params: BaseUserOperationParams = {
        address: '0x123',
        userOperationType: 'CREATE_API_KEY',
      };

      expect(params.network).toBeUndefined();
    });
  });

  describe('TimeRangeOptions', () => {
    it('should have correct optional fields', () => {
      const options: TimeRangeOptions = {};
      expect(options.startTime).toBeUndefined();
      expect(options.endTime).toBeUndefined();
      expect(options.limit).toBeUndefined();
    });

    it('should accept all fields', () => {
      const options: TimeRangeOptions = {
        startTime: 1640995200000,
        endTime: 1641081600000,
        limit: 100,
      };

      expect(options.startTime).toBe(1640995200000);
      expect(options.endTime).toBe(1641081600000);
      expect(options.limit).toBe(100);
    });
  });

  describe('TradeQueryOptions', () => {
    it('should extend TimeRangeOptions with fromId', () => {
      const options: TradeQueryOptions = {
        startTime: 1640995200000,
        endTime: 1641081600000,
        limit: 100,
        fromId: 12345,
      };

      expect(options.fromId).toBe(12345);
      expect(options.startTime).toBe(1640995200000);
    });
  });

  describe('KlineOptions type alias', () => {
    it('should be equivalent to TimeRangeOptions', () => {
      const options: KlineOptions = {
        startTime: 1640995200000,
        endTime: 1641081600000,
        limit: 500,
      };

      // Should have same structure as TimeRangeOptions
      const timeRangeOptions: TimeRangeOptions = options;
      expect(timeRangeOptions.startTime).toBe(1640995200000);
    });
  });

  describe('OrderLookupParams', () => {
    it('should have required symbol and optional order identifiers', () => {
      const params: OrderLookupParams = {
        symbol: 'BTCUSDT',
        orderId: 12345,
        origClientOrderId: 'myOrder123',
      };

      expect(params.symbol).toBe('BTCUSDT');
      expect(params.orderId).toBe(12345);
      expect(params.origClientOrderId).toBe('myOrder123');
    });

    it('should allow only symbol', () => {
      const params: OrderLookupParams = {
        symbol: 'ETHUSDT',
      };

      expect(params.symbol).toBe('ETHUSDT');
      expect(params.orderId).toBeUndefined();
      expect(params.origClientOrderId).toBeUndefined();
    });
  });

  describe('Response Types', () => {
    it('should have correct ApiSuccessResponse structure', () => {
      const response: ApiSuccessResponse = {
        code: 200,
        msg: 'Success',
      };

      expect(response.code).toBe(200);
      expect(response.msg).toBe('Success');
    });

    it('should have correct ServerTimeResponse structure', () => {
      const response: ServerTimeResponse = {
        serverTime: 1640995200000,
      };

      expect(response.serverTime).toBe(1640995200000);
    });

    it('should handle EmptyResponse as empty object', () => {
      const response: EmptyResponse = {};
      expect(Object.keys(response)).toHaveLength(0);
    });
  });
});

describe('Common Types', () => {
  describe('HttpMethod', () => {
    it('should accept valid HTTP methods', () => {
      const methods: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE'];

      methods.forEach((method) => {
        expect(['GET', 'POST', 'PUT', 'DELETE']).toContain(method);
      });
    });
  });

  describe('OrderType', () => {
    it('should have all valid order types', () => {
      const orderTypes: OrderType[] = [
        'LIMIT',
        'MARKET',
        'STOP',
        'TAKE_PROFIT',
        'STOP_MARKET',
        'TAKE_PROFIT_MARKET',
        'TRAILING_STOP_MARKET',
      ];

      orderTypes.forEach((type) => {
        expect([
          'LIMIT',
          'MARKET',
          'STOP',
          'TAKE_PROFIT',
          'STOP_MARKET',
          'TAKE_PROFIT_MARKET',
          'TRAILING_STOP_MARKET',
        ]).toContain(type);
      });
    });
  });

  describe('OrderSide', () => {
    it('should have BUY and SELL', () => {
      const sides: OrderSide[] = ['BUY', 'SELL'];

      expect(sides).toContain('BUY');
      expect(sides).toContain('SELL');
    });
  });

  describe('ApiAuthType', () => {
    it('should have all authentication types', () => {
      const authTypes: ApiAuthType[] = ['NONE', 'TRADE', 'USER_DATA', 'USER_STREAM', 'MARKET_DATA'];

      authTypes.forEach((type) => {
        expect(['NONE', 'TRADE', 'USER_DATA', 'USER_STREAM', 'MARKET_DATA']).toContain(type);
      });
    });
  });

  describe('KlineInterval', () => {
    it('should have valid interval values', () => {
      const intervals: KlineInterval[] = [
        '1m',
        '3m',
        '5m',
        '15m',
        '30m',
        '1h',
        '2h',
        '4h',
        '6h',
        '8h',
        '12h',
        '1d',
        '3d',
        '1w',
        '1M',
      ];

      intervals.forEach((interval) => {
        expect(typeof interval).toBe('string');
        expect(interval.length).toBeGreaterThan(0);
      });
    });
  });
});

describe('Type Compatibility', () => {
  it('should allow interface extension compatibility', () => {
    // Test that extending interfaces works as expected
    interface ExtendedUserParams extends BaseUserOperationParams {
      additionalField: string;
    }

    const extended: ExtendedUserParams = {
      address: '0x123',
      userOperationType: 'TEST',
      additionalField: 'test',
    };

    expect(extended.address).toBe('0x123');
    expect(extended.additionalField).toBe('test');
  });

  it('should allow type unions to work correctly', () => {
    const method: HttpMethod = 'GET';
    const authType: ApiAuthType = 'TRADE';

    expect(typeof method).toBe('string');
    expect(typeof authType).toBe('string');
  });
});

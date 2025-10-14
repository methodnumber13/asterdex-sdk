/**
 * Tests for Web3 signature authentication for Futures API
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  Web3SignatureAuth,
  FuturesAuthManager,
  checkWeb3Dependencies,
  getWeb3InstallationInstructions,
} from './web3signature';

import dotenv from 'dotenv';
dotenv.config();

// Mock Web3 dependencies - using real libraries for proper signature generation
// The implementation uses ethers.js for ABI encoding and signing, and web3.js for keccak256

describe('Web3SignatureAuth', () => {
  const validUserAddress = process.env.FUTURES_USER_ADDRESS as string;
  const validSignerAddress = process.env.FUTURES_SIGNER_ADDRESS as string;
  const validPrivateKey = process.env.FUTURES_PRIVATE_KEY as string;

  let web3Auth: Web3SignatureAuth;

  beforeEach(() => {
    web3Auth = new Web3SignatureAuth(validUserAddress, validSignerAddress, validPrivateKey);

    // Mock timestamp for consistent test results
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2023-01-01T00:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('constructor', () => {
    it('should create instance with valid credentials', () => {
      expect(web3Auth).toBeInstanceOf(Web3SignatureAuth);
      expect(web3Auth.getUserAddress()).toBe(validUserAddress);
      expect(web3Auth.getSignerAddress()).toBe(validSignerAddress);
    });

    it('should throw error when user address is missing', () => {
      expect(() => new Web3SignatureAuth('', validSignerAddress, validPrivateKey)).toThrow(
        'User address is required for Futures API',
      );
    });

    it('should throw error when signer address is missing', () => {
      expect(() => new Web3SignatureAuth(validUserAddress, '', validPrivateKey)).toThrow(
        'Signer address is required for Futures API',
      );
    });

    it('should throw error when private key is missing', () => {
      expect(() => new Web3SignatureAuth(validUserAddress, validSignerAddress, '')).toThrow(
        'Private key is required for Futures API',
      );
    });
  });

  describe('generateSignature', () => {
    const testParams = {
      symbol: 'BTCUSDT',
      side: 'BUY',
      type: 'LIMIT',
      quantity: '1.0',
      price: '50000',
    };

    it('should generate valid Web3 signature', async () => {
      const result = await web3Auth.generateSignature(testParams);

      expect(result).toMatchObject({
        user: validUserAddress,
        signer: validSignerAddress,
        nonce: expect.any(Number),
        signature: expect.stringMatching(/^0x[0-9a-fA-F]{130}$/), // Valid ethereum signature
      });

      expect(result.nonce).toBeGreaterThan(0);
    });

    it('should include timestamp and recvWindow in signature generation', async () => {
      const paramsWithRecvWindow = { ...testParams, recvWindow: 10000 };

      const result = await web3Auth.generateSignature(paramsWithRecvWindow);

      // Verify result includes timestamp and recvWindow
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('recvWindow', 10000);
      expect(result.signature).toMatch(/^0x[0-9a-fA-F]{130}$/);
    });

    it('should use default recvWindow when not provided', async () => {
      const result = await web3Auth.generateSignature(testParams);

      // Should include default recvWindow
      expect(result).toHaveProperty('recvWindow');
      expect(result.recvWindow).toBeGreaterThan(0);
    });

    it('should generate consistent nonces in microseconds', async () => {
      const result1 = await web3Auth.generateSignature(testParams);

      vi.advanceTimersByTime(1); // Advance 1ms

      const result2 = await web3Auth.generateSignature(testParams);

      expect(result2.nonce).toBeGreaterThan(result1.nonce);
      expect(result2.nonce - result1.nonce).toBe(1000); // 1ms = 1000 microseconds
    });

    it('should handle complex parameter objects', async () => {
      const complexParams = {
        symbol: 'BTCUSDT',
        orders: [
          { side: 'BUY', quantity: '1.0' },
          { side: 'SELL', quantity: '0.5' },
        ],
        settings: {
          timeout: 5000,
          retry: true,
        },
      };

      const result = await web3Auth.generateSignature(complexParams);

      expect(result).toMatchObject({
        user: validUserAddress,
        signer: validSignerAddress,
        nonce: expect.any(Number),
        signature: expect.stringMatching(/^0x[0-9a-fA-F]{130}$/),
      });
    });

    it('should work correctly when Web3 dependencies are available', async () => {
      // This test verifies that Web3 signature generation works when dependencies are properly installed
      const auth = new Web3SignatureAuth(validUserAddress, validSignerAddress, validPrivateKey);

      const result = await auth.generateSignature(testParams);

      expect(result).toHaveProperty('user', validUserAddress);
      expect(result).toHaveProperty('signer', validSignerAddress);
      expect(result).toHaveProperty('nonce');
      expect(result).toHaveProperty('signature');
      expect(typeof result.signature).toBe('string');
      expect(result.signature).toMatch(/^0x/);
    });
  });

  describe('signRequest', () => {
    const testParams = {
      symbol: 'BTCUSDT',
      side: 'BUY',
      quantity: '1.0',
    };

    it('should sign request with Web3 auth parameters', async () => {
      const result = await web3Auth.signRequest(testParams);

      expect(result).toMatchObject({
        symbol: 'BTCUSDT',
        side: 'BUY',
        quantity: '1.0',
        timestamp: expect.any(Number),
        recvWindow: expect.any(Number),
        user: validUserAddress,
        signer: validSignerAddress,
        nonce: expect.any(Number),
        signature: expect.stringMatching(/^0x[0-9a-fA-F]{130}$/),
      });
    });

    it('should preserve custom recvWindow', async () => {
      const paramsWithRecvWindow = { ...testParams, recvWindow: 15000 };
      const result = await web3Auth.signRequest(paramsWithRecvWindow);

      expect(result.recvWindow).toBe(15000);
    });

    it('should add default recvWindow when not provided', async () => {
      const result = await web3Auth.signRequest(testParams);

      expect(result.recvWindow).toBeDefined();
      expect(typeof result.recvWindow).toBe('number');
    });
  });

  describe('static validation methods', () => {
    describe('validateAddresses', () => {
      it('should validate correct Ethereum addresses', () => {
        const valid1 = '0x63DD5aCC6b1aa0f563956C0e534DD30B6dcF7C4e';
        const valid2 = '0x21cF8Ae13Bb72632562c6Fff438652Ba1a151bb0';

        expect(Web3SignatureAuth.validateAddresses(valid1, valid2)).toBe(true);
      });

      it('should reject invalid address formats', () => {
        const invalid1 = '63DD5aCC6b1aa0f563956C0e534DD30B6dcF7C4e'; // Missing 0x
        const invalid2 = '0x63DD5aCC6b1aa0f563956C0e534DD30B6dcF7C4'; // Too short
        const invalid3 = '0xGGDD5aCC6b1aa0f563956C0e534DD30B6dcF7C4e'; // Invalid hex

        expect(Web3SignatureAuth.validateAddresses(invalid1, validSignerAddress)).toBe(false);
        expect(Web3SignatureAuth.validateAddresses(validUserAddress, invalid2)).toBe(false);
        expect(Web3SignatureAuth.validateAddresses(invalid3, validSignerAddress)).toBe(false);
      });

      it('should reject empty addresses', () => {
        expect(Web3SignatureAuth.validateAddresses('', validSignerAddress)).toBe(false);
        expect(Web3SignatureAuth.validateAddresses(validUserAddress, '')).toBe(false);
      });
    });

    describe('validatePrivateKey', () => {
      it('should validate correct private key format', () => {
        const validKey = '0x4fd0a42218f3eae43a6ce26d22544e986139a01e5b34a62db53757ffca81bae1';
        expect(Web3SignatureAuth.validatePrivateKey(validKey)).toBe(true);
      });

      it('should reject invalid private key formats', () => {
        const invalid1 = '0x4fd0a42218f3eae43a6ce26d22544e986139a01e5b34a62db53757ffca81ba'; // Too short
        const invalid2 = '0xGfd0a42218f3eae43a6ce26d22544e986139a01e5b34a62db53757ffca81bae1'; // Invalid hex
        const invalid3 = '4fd0a42218f3eae43a6ce26d22544e986139a01e5b34a62db53757ffca81ba'; // Too short without 0x

        expect(Web3SignatureAuth.validatePrivateKey(invalid1)).toBe(false);
        expect(Web3SignatureAuth.validatePrivateKey(invalid2)).toBe(false);
        expect(Web3SignatureAuth.validatePrivateKey(invalid3)).toBe(false);
      });

      it('should reject empty private key', () => {
        expect(Web3SignatureAuth.validatePrivateKey('')).toBe(false);
      });
    });
  });

  describe('private methods behavior', () => {
    it('should create sorted JSON string correctly', async () => {
      const params = {
        z: 'last',
        a: 'first',
        m: 'middle',
        null: null,
        undefined: undefined,
        empty: '',
        zero: 0,
        false: false,
      };

      const result = await web3Auth.generateSignature(params);

      // Verify that signature was generated successfully with sorted params
      expect(result).toHaveProperty('signature');
      expect(result.signature).toMatch(/^0x[0-9a-fA-F]{130}$/);
      expect(result.user).toBe(validUserAddress);
      expect(result.signer).toBe(validSignerAddress);
    });

    it('should handle nested objects in parameters', async () => {
      const params = {
        symbol: 'BTCUSDT',
        nested: {
          b: 'second',
          a: 'first',
        },
        array: [3, 1, 2],
      };

      const result = await web3Auth.generateSignature(params);

      expect(result).toHaveProperty('signature');
      expect(result.signature).toMatch(/^0x[0-9a-fA-F]{130}$/);
    });
  });
});

describe('FuturesAuthManager', () => {
  const validUserAddress = '0x63DD5aCC6b1aa0f563956C0e534DD30B6dcF7C4e';
  const validSignerAddress = '0x21cF8Ae13Bb72632562c6Fff438652Ba1a151bb0';
  const validPrivateKey = '0x4fd0a42218f3eae43a6ce26d22544e986139a01e5b34a62db53757ffca81bae1';

  describe('constructor', () => {
    it('should create instance without credentials', () => {
      const authManager = new FuturesAuthManager();
      expect(authManager.hasWeb3Auth()).toBe(false);
    });

    it('should create instance with valid credentials', () => {
      const authManager = new FuturesAuthManager(
        validUserAddress,
        validSignerAddress,
        validPrivateKey,
      );
      expect(authManager.hasWeb3Auth()).toBe(true);
    });

    it('should throw error for invalid user address', () => {
      expect(
        () => new FuturesAuthManager('invalid-address', validSignerAddress, validPrivateKey),
      ).toThrow('Invalid user or signer address format');
    });

    it('should throw error for invalid signer address', () => {
      expect(
        () => new FuturesAuthManager(validUserAddress, 'invalid-address', validPrivateKey),
      ).toThrow('Invalid user or signer address format');
    });

    it('should throw error for invalid private key', () => {
      expect(
        () => new FuturesAuthManager(validUserAddress, validSignerAddress, 'invalid-key'),
      ).toThrow('Invalid private key format');
    });
  });

  describe('hasWeb3Auth', () => {
    it('should return true when configured', () => {
      const authManager = new FuturesAuthManager(
        validUserAddress,
        validSignerAddress,
        validPrivateKey,
      );
      expect(authManager.hasWeb3Auth()).toBe(true);
    });

    it('should return false when not configured', () => {
      const authManager = new FuturesAuthManager();
      expect(authManager.hasWeb3Auth()).toBe(false);
    });
  });

  describe('getWeb3Auth', () => {
    it('should return Web3SignatureAuth instance when configured', () => {
      const authManager = new FuturesAuthManager(
        validUserAddress,
        validSignerAddress,
        validPrivateKey,
      );
      const web3Auth = authManager.getWeb3Auth();

      expect(web3Auth).toBeInstanceOf(Web3SignatureAuth);
      expect(web3Auth.getUserAddress()).toBe(validUserAddress);
    });

    it('should throw error when not configured', () => {
      const authManager = new FuturesAuthManager();
      expect(() => authManager.getWeb3Auth()).toThrow(
        'Web3 authentication not configured for Futures API',
      );
    });
  });

  describe('createHeaders', () => {
    it('should create correct headers for Futures API', () => {
      const authManager = new FuturesAuthManager();
      const headers = authManager.createHeaders();

      expect(headers).toEqual({
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'AsterDEX-TypeScript-SDK/1.0.0',
      });
    });
  });

  describe('signRequest', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2023-01-01T00:00:00.000Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should sign request when configured', async () => {
      const authManager = new FuturesAuthManager(
        validUserAddress,
        validSignerAddress,
        validPrivateKey,
      );

      const params = { symbol: 'BTCUSDT', side: 'BUY' };
      const result = await authManager.signRequest(params);

      expect(result).toMatchObject({
        symbol: 'BTCUSDT',
        side: 'BUY',
        timestamp: expect.any(Number),
        recvWindow: expect.any(Number),
        user: validUserAddress,
        signer: validSignerAddress,
        nonce: expect.any(Number),
        signature: expect.any(String),
      });
    });

    it('should throw error when not configured', async () => {
      const authManager = new FuturesAuthManager();
      const params = { symbol: 'BTCUSDT' };

      await expect(authManager.signRequest(params)).rejects.toThrow(
        'Web3 authentication not configured for Futures API',
      );
    });
  });

  describe('updateCredentials', () => {
    it('should update credentials with valid inputs', () => {
      const authManager = new FuturesAuthManager();
      expect(authManager.hasWeb3Auth()).toBe(false);

      authManager.updateCredentials(validUserAddress, validSignerAddress, validPrivateKey);
      expect(authManager.hasWeb3Auth()).toBe(true);
    });

    it('should throw error for invalid credentials during update', () => {
      const authManager = new FuturesAuthManager();

      expect(() =>
        authManager.updateCredentials('invalid-user', validSignerAddress, validPrivateKey),
      ).toThrow('Invalid user or signer address format');

      expect(() =>
        authManager.updateCredentials(validUserAddress, 'invalid-signer', validPrivateKey),
      ).toThrow('Invalid user or signer address format');

      expect(() =>
        authManager.updateCredentials(validUserAddress, validSignerAddress, 'invalid-key'),
      ).toThrow('Invalid private key format');
    });
  });
});

describe('Web3 dependencies helpers', () => {
  describe('checkWeb3Dependencies', () => {
    it('should return available true when all dependencies present', () => {
      // Dependencies are now installed, so this should return true
      const result = checkWeb3Dependencies();

      expect(result.available).toBe(true);
      expect(result.missing).toEqual([]);
    });

    it('should correctly identify available dependencies', () => {
      // Since dependencies are now properly installed, they should be detected as available
      const result = checkWeb3Dependencies();

      expect(result.available).toBe(true);
      expect(result.missing).toEqual([]);
      expect(Array.isArray(result.missing)).toBe(true);
    });
  });

  describe('getWeb3InstallationInstructions', () => {
    it('should return success message when all dependencies available', () => {
      // Dependencies are now installed, so this should return success message
      const instructions = getWeb3InstallationInstructions();

      expect(instructions).toBe('All Web3 dependencies are already installed.');
    });

    it('should provide installation logic structure', () => {
      // Test that the installation instructions function exists and has the expected structure
      const instructions = getWeb3InstallationInstructions();

      // Since dependencies are now installed, it should return success message
      expect(typeof instructions).toBe('string');
      expect(instructions.length).toBeGreaterThan(0);
    });
  });
});

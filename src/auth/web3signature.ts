/**
 * @file Implements the Web3 signature authentication required for the AsterDEX Futures API.
 * @author AsterDEX
 * @version 1.0.0
 * @license MIT
 */

import { ErrorFactory } from '@/errors/errors';
import type { Web3AuthParams } from '@/types/futures';
import { TIME_CONSTANTS, VALIDATION_CONSTANTS } from '@/config/constants';

/**
 * Handles Web3 signature generation for the Futures API.
 * This class implements the complex signature scheme required by the Futures API,
 * which involves ABI encoding, Keccak hashing, and message signing.
 * @class Web3SignatureAuth
 */
export class Web3SignatureAuth {
  private readonly userAddress: string;
  private readonly signerAddress: string;
  private readonly privateKey: string;

  /**
   * Creates a new Web3SignatureAuth instance.
   * @param {string} userAddress - The user's main account wallet address.
   * @param {string} signerAddress - The user's API wallet address.
   * @param {string} privateKey - The private key for signing transactions.
   * @throws {AuthError} If any of the required parameters are missing.
   */
  constructor(userAddress: string, signerAddress: string, privateKey: string) {
    if (!userAddress) {
      throw ErrorFactory.authError('User address is required for Futures API');
    }
    if (!signerAddress) {
      throw ErrorFactory.authError('Signer address is required for Futures API');
    }
    if (!privateKey) {
      throw ErrorFactory.authError('Private key is required for Futures API');
    }

    this.userAddress = userAddress;
    this.signerAddress = signerAddress;
    this.privateKey = privateKey;
  }

  /**
   * Generates a Web3 signature for a given set of parameters.
   * @param {Record<string, any>} params - The request parameters to sign.
   * @returns {Promise<Web3AuthParams>} A promise that resolves with the Web3 authentication parameters.
   * @throws {AuthError} If Web3 dependencies are not available or if the signature generation fails.
   */
  public async generateSignature(params: Record<string, any>): Promise<Web3AuthParams> {
    try {
      if (!this.isWeb3Available()) {
        throw ErrorFactory.authError(
          'Web3 dependencies (web3, web3-eth-accounts) are required for Futures API. ' +
            'Please install: npm install web3 web3-eth-accounts',
        );
      }

      const nonce = this.generateNonce();
      const signParams = {
        ...params,
        timestamp: Date.now(),
        ...(params.recvWindow
          ? { recvWindow: params.recvWindow }
          : { recvWindow: TIME_CONSTANTS.DEFAULT_WEB3_RECV_WINDOW }),
      };

      const sortedJsonString = this.createSortedJsonString(signParams);
      const encoded = await this.abiEncode(sortedJsonString, nonce);
      const hash = await this.keccakHash(encoded);
      const signedSignature = await this.signAndVerify(hash, this.privateKey);

      return {
        user: this.userAddress,
        signer: this.signerAddress,
        nonce,
        signature: signedSignature.signature,
        timestamp: signParams.timestamp,
        recvWindow: signParams.recvWindow,
      };
    } catch (error) {
      throw ErrorFactory.authError(
        `Failed to generate Web3 signature: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Creates a signed parameter object for a Futures API request.
   * @param {Record<string, any>} params - The request parameters to sign.
   * @returns {Promise<Record<string, any>>} A promise that resolves with the signed parameters object.
   */
  public async signRequest(params: Record<string, any>): Promise<Record<string, any>> {
    const web3Auth = await this.generateSignature(params);
    return {
      ...params,
      ...(params.recvWindow
        ? { recvWindow: params.recvWindow }
        : { recvWindow: TIME_CONSTANTS.DEFAULT_WEB3_RECV_WINDOW }),
      ...web3Auth,
    };
  }

  /**
   * Generates a nonce, which is the current timestamp in microseconds.
   * @private
   * @returns {number} The generated nonce.
   */
  private generateNonce(): number {
    return Math.trunc(Date.now() * TIME_CONSTANTS.MICROSECONDS_IN_MILLISECOND);
  }

  /**
   * Converts a parameter object to a sorted JSON string.
   * @private
   * @param {Record<string, any>} params - The parameters to convert.
   * @returns {string} The sorted JSON string.
   */
  private createSortedJsonString(params: Record<string, any>): string {
    const cleanedParams = Object.fromEntries(
      Object.entries(params).filter(
        ([, value]) => value !== null && value !== undefined && value !== '',
      ),
    );
    const stringifiedParams = this.trimDict(cleanedParams);
    return JSON.stringify(stringifiedParams, Object.keys(stringifiedParams).sort())
      .replace(/\s/g, '')
      .replace(/'/g, '"');
  }

  /**
   * Recursively converts all values in an object to strings.
   * @private
   * @param {any} obj - The object to process.
   * @returns {Record<string, any>} The object with all values converted to strings.
   */
  private trimDict(obj: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (Array.isArray(value)) {
        const newValue: string[] = [];
        for (const item of value) {
          if (typeof item === 'object' && item !== null) {
            newValue.push(JSON.stringify(this.trimDict(item as Record<string, any>)));
          } else {
            newValue.push(String(item));
          }
        }
        result[key] = JSON.stringify(newValue);
        continue;
      }
      if (typeof value === 'object' && value !== null) {
        result[key] = JSON.stringify(this.trimDict(value as Record<string, any>));
        continue;
      }
      result[key] = String(value);
    }
    return result;
  }

  /**
   * ABI-encodes the given parameters.
   * @private
   * @param {string} jsonString - The sorted JSON string of parameters.
   * @param {number} nonce - The nonce to include in the encoding.
   * @returns {Promise<string>} A promise that resolves with the ABI-encoded string.
   */
  private async abiEncode(jsonString: string, nonce: number): Promise<string> {
    try {
      const { utils } = await import('ethers');
      const encoded = utils.defaultAbiCoder.encode(
        ['string', 'address', 'address', 'uint256'],
        [jsonString, this.userAddress, this.signerAddress, nonce],
      );
      return encoded.slice(2);
    } catch (error) {
      throw new Error(`ABI encoding failed: ${(error as Error).message}`);
    }
  }

  /**
   * Generates a Keccak hash of the given data.
   * @private
   * @param {string} encodedHex - The ABI-encoded hex string.
   * @returns {Promise<string>} A promise that resolves with the Keccak hash.
   */
  private async keccakHash(encodedHex: string): Promise<string> {
    try {
      const { Web3 } = await import('web3');
      const web3 = new Web3();
      const hex = encodedHex.startsWith('0x') ? encodedHex : '0x' + encodedHex;
      const hash = web3.utils.keccak256(hex);
      return hash;
    } catch (error) {
      throw new Error(`Keccak hashing failed: ${(error as Error).message}`);
    }
  }

  /**
   * Signs a hash with the provided private key and verifies the signature.
   * @private
   * @param {string} hash - The hash to sign.
   * @param {string} privateKey - The private key to use for signing.
   * @returns {Promise<any>} A promise that resolves with the signature details.
   */
  private async signAndVerify(hash: string, privateKey: string) {
    try {
      const { Wallet, utils } = await import('ethers');
      if (!hash.startsWith('0x')) {
        hash = `0x${hash}`;
      }
      if (!/^0x[0-9a-fA-F]{64}$/.test(hash)) {
        throw new Error('hash must be 0x + 64 hex chars');
      }

      const wallet = new Wallet(privateKey);
      const hashBytes = utils.arrayify(hash);
      const signature = await wallet.signMessage(hashBytes);
      const sigObj = utils.splitSignature(signature);
      const messageHash = utils.hashMessage(hashBytes);
      const recoveredAddress = utils.recoverAddress(messageHash, signature);
      const recoveredPubKey = utils.recoverPublicKey(messageHash, signature);

      return {
        signature,
        r: sigObj.r,
        s: sigObj.s,
        v: sigObj.v,
        recoveredAddress,
        recoveredPubKey,
        expectedAddress: await wallet.getAddress(),
      };
    } catch (error) {
      throw new Error(`Hash signing failed: ${(error as Error).message}`);
    }
  }

  /**
   * Checks if the required Web3 dependencies are available.
   * @private
   * @returns {boolean} `true` if the dependencies are available, `false` otherwise.
   */
  private isWeb3Available(): boolean {
    try {
      require.resolve('web3');
      require.resolve('web3-eth-accounts');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Gets the user address.
   * @returns {string} The user address.
   */
  public getUserAddress(): string {
    return this.userAddress;
  }

  /**
   * Gets the signer address.
   * @returns {string} The signer address.
   */
  public getSignerAddress(): string {
    return this.signerAddress;
  }

  /**
   * Validates the format of Ethereum addresses.
   * @param {string} userAddress - The user address to validate.
   * @param {string} signerAddress - The signer address to validate.
   * @returns {boolean} `true` if the addresses are valid, `false` otherwise.
   */
  public static validateAddresses(userAddress: string, signerAddress: string): boolean {
    const addressRegex = new RegExp(
      `^0x[a-fA-F0-9]{${VALIDATION_CONSTANTS.ETHEREUM_ADDRESS_LENGTH}}`,
    );
    return addressRegex.test(userAddress) && addressRegex.test(signerAddress);
  }

  /**
   * Validates the format of a private key.
   * @param {string} privateKey - The private key to validate.
   * @returns {boolean} `true` if the private key is valid, `false` otherwise.
   */
  public static validatePrivateKey(privateKey: string): boolean {
    const withoutPrefixRegex = new RegExp(
      `^[a-fA-F0-9]{${VALIDATION_CONSTANTS.PRIVATE_KEY_LENGTH}}`,
    );
    const withPrefixRegex = new RegExp(
      `^0x[a-fA-F0-9]{${VALIDATION_CONSTANTS.PRIVATE_KEY_LENGTH}}`,
    );
    return withoutPrefixRegex.test(privateKey) || withPrefixRegex.test(privateKey);
  }
}

/**
 * Manages Web3 authentication for the Futures API.
 * @class FuturesAuthManager
 */
export class FuturesAuthManager {
  private web3Auth?: Web3SignatureAuth;

  /**
   * Creates a new FuturesAuthManager instance.
   * @param {string} [userAddress] - The user's main account wallet address.
   * @param {string} [signerAddress] - The user's API wallet address.
   * @param {string} [privateKey] - The private key for signing transactions.
   * @throws {AuthError} If the address or private key format is invalid.
   */
  constructor(userAddress?: string, signerAddress?: string, privateKey?: string) {
    if (userAddress && signerAddress && privateKey) {
      if (!Web3SignatureAuth.validateAddresses(userAddress, signerAddress)) {
        throw ErrorFactory.authError('Invalid user or signer address format');
      }
      if (!Web3SignatureAuth.validatePrivateKey(privateKey)) {
        throw ErrorFactory.authError('Invalid private key format');
      }
      this.web3Auth = new Web3SignatureAuth(userAddress, signerAddress, privateKey);
    }
  }

  /**
   * Checks if Web3 authentication is configured.
   * @returns {boolean} `true` if Web3 authentication is configured, `false` otherwise.
   */
  public hasWeb3Auth(): boolean {
    return !!this.web3Auth;
  }

  /**
   * Gets the Web3SignatureAuth instance.
   * @returns {Web3SignatureAuth} The Web3SignatureAuth instance.
   * @throws {AuthError} If Web3 authentication is not configured.
   */
  public getWeb3Auth(): Web3SignatureAuth {
    if (!this.web3Auth) {
      throw ErrorFactory.authError('Web3 authentication not configured for Futures API');
    }
    return this.web3Auth;
  }

  /**
   * Creates the headers for a Futures API request.
   * @returns {Record<string, string>} An object containing the required headers.
   */
  public createHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'AsterDEX-TypeScript-SDK/1.0.0',
    };
  }

  /**
   * Signs a request's parameters for the Futures API.
   * @param {Record<string, any>} params - The parameters to sign.
   * @returns {Promise<Record<string, any>>} A promise that resolves with the signed parameters object.
   * @throws {AuthError} If Web3 authentication is not configured.
   */
  public async signRequest(params: Record<string, any>): Promise<Record<string, any>> {
    if (!this.web3Auth) {
      throw ErrorFactory.authError('Web3 authentication not configured for Futures API');
    }
    return this.web3Auth.signRequest(params);
  }

  /**
   * Updates the Web3 authentication credentials.
   * @param {string} userAddress - The new user address.
   * @param {string} signerAddress - The new signer address.
   * @param {string} privateKey - The new private key.
   * @throws {AuthError} If the address or private key format is invalid.
   */
  public updateCredentials(userAddress: string, signerAddress: string, privateKey: string): void {
    if (!Web3SignatureAuth.validateAddresses(userAddress, signerAddress)) {
      throw ErrorFactory.authError('Invalid user or signer address format');
    }
    if (!Web3SignatureAuth.validatePrivateKey(privateKey)) {
      throw ErrorFactory.authError('Invalid private key format');
    }
    this.web3Auth = new Web3SignatureAuth(userAddress, signerAddress, privateKey);
  }
}

/**
 * Checks if the required Web3 dependencies are installed.
 * @returns {{ available: boolean; missing: string[] }} An object indicating if the dependencies are available and a list of any missing dependencies.
 */
export function checkWeb3Dependencies(): { available: boolean; missing: string[] } {
  const requiredPackages = ['web3', 'web3-eth-accounts'];
  const missing: string[] = [];
  for (const pkg of requiredPackages) {
    try {
      require.resolve(pkg);
    } catch {
      missing.push(pkg);
    }
  }
  return {
    available: missing.length === 0,
    missing,
  };
}

/**
 * Gets installation instructions for the required Web3 dependencies.
 * @returns {string} A string containing the installation instructions.
 */
export function getWeb3InstallationInstructions(): string {
  const deps = checkWeb3Dependencies();
  if (deps.available) {
    return 'All Web3 dependencies are already installed.';
  }
  return `
To use the Futures API, please install the required Web3 dependencies:

npm install ${deps.missing.join(' ')}

Or with yarn:
yarn add ${deps.missing.join(' ')}

Required packages:
- web3: For ABI encoding and Keccak hashing
- web3-eth-accounts: For message signing

These packages are required for the Web3 signature authentication used by the Futures API v3.
  `.trim();
}

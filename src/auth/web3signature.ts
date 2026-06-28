/**
 * @file Implements the Web3 signature authentication required for the AsterDEX Futures API.
 * @author AsterDEX
 * @version 1.0.0
 * @license MIT
 */

import { ErrorFactory } from '@/errors/errors';
import type { Web3AuthParams } from '@/types/futures';
import { TIME_CONSTANTS, VALIDATION_CONSTANTS } from '@/config/constants';

const ASTER_EIP712_DOMAIN = {
  name: 'AsterSignTransaction',
  version: '1',
  chainId: 1666,
  verifyingContract: '0x0000000000000000000000000000000000000000',
};

const ASTER_EIP712_TYPES = {
  Message: [{ name: 'msg', type: 'string' }],
};

/**
 * Handles Web3 signature generation for the Futures API.
 * This class implements Aster's V3 EIP-712 signature scheme over the outgoing
 * application/x-www-form-urlencoded request payload.
 * @class Web3SignatureAuth
 */
export class Web3SignatureAuth {
  private readonly userAddress: string;
  private readonly signerAddress: string;
  private readonly privateKey: string;
  private lastNonce = 0;

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
          'Web3 dependency (ethers) is required for Aster V3 API signing. ' +
            'Please install: npm install ethers',
        );
      }

      const nonce = this.generateNonce();
      const signParams = this.cleanParams({
        ...params,
        user: this.userAddress,
        nonce,
        signer: this.signerAddress,
      });
      const signedMessage = this.createUrlEncodedPayload(signParams);
      const signature = await this.signTypedMessage(signedMessage);

      return {
        user: this.userAddress,
        signer: this.signerAddress,
        nonce,
        signature,
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
      ...this.cleanParams(params),
      user: web3Auth.user,
      nonce: web3Auth.nonce,
      signer: web3Auth.signer,
      signature: web3Auth.signature,
    };
  }

  /**
   * Generates a nonce, which is the current timestamp in microseconds.
   * @private
   * @returns {number} The generated nonce.
   */
  private generateNonce(): number {
    const nowNonce = Math.trunc(Date.now() * TIME_CONSTANTS.MICROSECONDS_IN_MILLISECOND);
    this.lastNonce = nowNonce > this.lastNonce ? nowNonce : this.lastNonce + 1;
    return this.lastNonce;
  }

  /**
   * Removes parameters that will not be sent in the signed request payload.
   * @private
   * @param {Record<string, any>} params - The parameters to clean.
   * @returns {Record<string, unknown>} The cleaned parameters object.
   */
  private cleanParams(params: Record<string, any>): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(params).filter(
        ([, value]) => value !== null && value !== undefined && value !== '',
      ),
    );
  }

  /**
   * Converts request parameters to Aster's EIP-712 message body.
   * @private
   * @param {Record<string, unknown>} params - The parameters to encode.
   * @returns {string} The URL-encoded message body.
   */
  private createUrlEncodedPayload(params: Record<string, unknown>): string {
    const encoded = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        encoded.append(key, this.stringifyFormValue(value));
      }
    });
    return encoded.toString();
  }

  /**
   * Converts nested values to the JSON string form used in form-encoded requests.
   * @private
   * @param {unknown} value - The value to stringify.
   * @returns {string} The form-compatible string value.
   */
  private stringifyFormValue(value: unknown): string {
    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value);
    }
    return String(value);
  }

  /**
   * Signs the URL-encoded request payload with Aster's EIP-712 structure.
   * @private
   * @param {string} message - The URL-encoded request payload.
   * @returns {Promise<string>} A promise that resolves with the EIP-712 signature.
   */
  private async signTypedMessage(message: string): Promise<string> {
    try {
      const { Wallet } = await import('ethers');
      const wallet = new Wallet(this.privateKey);
      return await wallet.signTypedData(ASTER_EIP712_DOMAIN, ASTER_EIP712_TYPES, {
        msg: message,
      });
    } catch (error) {
      throw new Error(`EIP-712 signing failed: ${(error as Error).message}`);
    }
  }

  /**
   * Checks if the required Web3 dependencies are available.
   * @private
   * @returns {boolean} `true` if the dependencies are available, `false` otherwise.
   */
  private isWeb3Available(): boolean {
    try {
      require.resolve('ethers');
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
  const requiredPackages = ['ethers'];
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
To use the Aster V3 APIs, please install the required Web3 dependency:

npm install ${deps.missing.join(' ')}

Or with yarn:
yarn add ${deps.missing.join(' ')}

Required package:
- ethers: For EIP-712 typed-data signing

This package is required for the Web3 signature authentication used by Aster V3 APIs.
  `.trim();
}

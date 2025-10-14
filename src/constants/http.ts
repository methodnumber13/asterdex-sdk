/**
 * @file Defines HTTP method constants for API requests.
 * @author AsterDEX
 * @version 1.0.0
 * @license MIT
 */

import type { HttpMethod } from '@/types/common';

/**
 * An object containing the supported HTTP methods as reusable constants.
 * @constant {object}
 */
export const HttpMethods = {
  GET: 'GET' as HttpMethod,
  POST: 'POST' as HttpMethod,
  PUT: 'PUT' as HttpMethod,
  DELETE: 'DELETE' as HttpMethod,
} as const;

/**
 * A type representing the possible values of the HTTP method constants.
 * @typedef {('GET' | 'POST' | 'PUT' | 'DELETE')} HttpMethodConstant
 */
export type HttpMethodConstant = (typeof HttpMethods)[keyof typeof HttpMethods];

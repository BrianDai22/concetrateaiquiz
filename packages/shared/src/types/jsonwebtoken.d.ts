/**
 * Type declarations for 'jsonwebtoken' module
 * Custom declarations to avoid requiring @types/jsonwebtoken (SPECS.md compliance)
 */

declare module 'jsonwebtoken' {
  export interface SignOptions {
    expiresIn?: string | number
    algorithm?: string
    issuer?: string
    audience?: string | string[]
    subject?: string
    notBefore?: string | number
  }

  export interface VerifyOptions {
    algorithms?: string[]
    audience?: string | string[]
    issuer?: string | string[]
    ignoreExpiration?: boolean
    ignoreNotBefore?: boolean
    subject?: string
    clockTolerance?: number
    maxAge?: string | number
  }

  export interface JwtPayload {
    [key: string]: unknown
    iss?: string
    sub?: string
    aud?: string | string[]
    exp?: number
    nbf?: number
    iat?: number
    jti?: string
  }

  export class JsonWebTokenError extends Error {
    constructor(message: string)
  }

  export class TokenExpiredError extends JsonWebTokenError {
    expiredAt: Date
    constructor(message: string, expiredAt: Date)
  }

  export class NotBeforeError extends JsonWebTokenError {
    date: Date
    constructor(message: string, date: Date)
  }

  export function sign(
    payload: string | object | Buffer,
    secretOrPrivateKey: string | Buffer,
    options?: SignOptions
  ): string

  export function verify(
    token: string,
    secretOrPublicKey: string | Buffer,
    options?: VerifyOptions
  ): JwtPayload | string

  export function decode(
    token: string,
    options?: { complete?: boolean; json?: boolean }
  ): null | JwtPayload | string | { header: object; payload: JwtPayload; signature: string }
}

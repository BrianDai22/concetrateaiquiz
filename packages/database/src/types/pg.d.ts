// Type declarations for 'pg' module (node-postgres)
// This allows us to use pg without @types/pg (per SPECS.md compliance)

declare module 'pg' {
  export interface PoolConfig {
    connectionString?: string
    max?: number
    idleTimeoutMillis?: number
    connectionTimeoutMillis?: number
  }

  export interface PoolClient {
    query(queryText: string, values?: unknown[]): Promise<unknown>
    release(): void
  }

  export class Pool {
    constructor(config?: PoolConfig)
    query(queryText: string, values?: unknown[]): Promise<unknown>
    connect(): Promise<PoolClient>
    end(): Promise<void>
  }

  export class Client {
    constructor(config?: PoolConfig)
    connect(): Promise<void>
    query(queryText: string, values?: unknown[]): Promise<unknown>
    end(): Promise<void>
  }
}

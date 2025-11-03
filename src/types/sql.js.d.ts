declare module 'sql.js' {
  export interface Database {
    run(sql: string, params?: any[]): void;
    exec(sql: string): QueryExecResult[];
    prepare(sql: string): Statement;
    export(): Uint8Array;
    close(): void;
    getRowsModified(): number;
  }

  export interface Statement {
    bind(params?: any[] | Record<string, unknown>): boolean;
    step(): boolean;
    get(params?: any[]): any[];
    getAsObject(params?: any[]): any;
    getColumnNames(): string[];
    run(params?: any[]): void;
    reset(): void;
    free(): void;
  }

  export interface QueryExecResult {
    columns: string[];
    values: any[][];
  }

  export interface SqlJsConfig {
    locateFile?: (file: string) => string;
  }

  export interface SqlJsStatic {
    Database: {
      new(): Database;
      new(data: ArrayLike<number> | Buffer | Uint8Array): Database;
    };
  }

  export default function initSqlJs(config?: SqlJsConfig): Promise<SqlJsStatic>;
}

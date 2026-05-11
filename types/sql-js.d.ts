declare module "sql.js" {
  type SqlJsStatic = {
    Database: new (data?: Uint8Array) => {
      run: (sql: string) => void;
      export: () => Uint8Array;
    };
  };

  export default function initSqlJs(): Promise<SqlJsStatic>;
}

declare module 'pg' {
  export class Client {
    constructor(config?: any);
    connect(): Promise<void>;
    query(text: string, values?: any[]): Promise<{ rows: any[]; rowCount: number }>;
    end(): Promise<void>;
  }
  const pg: {
    Client: typeof Client;
  };
  export default pg;
}

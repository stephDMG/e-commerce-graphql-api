declare namespace NodeJS {
  interface ProcessEnv {
    REDIS_URL?: string;
  }
}

export interface RedisConfig {
  url?: string;
  socket?: {
    connectTimeout: number;
    reconnectStrategy: (retries: number) => number;
  };
}

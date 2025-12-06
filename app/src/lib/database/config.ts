// Database configuration module

export interface DatabaseConfig {
  type: 'sqlite' | 'postgres';
  sqlite?: {
    path: string;
  };
  postgres?: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
    ssl: boolean;
  };
}

export function getDatabaseConfig(): DatabaseConfig {
  const type = (process.env.DATABASE_TYPE || 'sqlite') as 'sqlite' | 'postgres';

  const config: DatabaseConfig = { type };

  if (type === 'sqlite') {
    config.sqlite = {
      path: process.env.SQLITE_DB_PATH || './data/blockchess.db',
    };
  } else if (type === 'postgres') {
    config.postgres = {
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      database: process.env.POSTGRES_DB || 'blockchess_db',
      user: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || '',
      ssl: process.env.POSTGRES_SSL === 'true',
    };
  }

  return config;
}
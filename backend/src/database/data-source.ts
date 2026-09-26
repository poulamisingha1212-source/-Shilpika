import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { APP_ENTITIES } from './database.helper';

dotenv.config();

const isCloudOrSsl =
  process.env.DATABASE_SSL === 'true' ||
  (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('tsdb.cloud.timescale.com')) ||
  (process.env.DATABASE_HOST && process.env.DATABASE_HOST.includes('tsdb.cloud.timescale.com'));

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  username: process.env.DATABASE_USER || 'tsdbadmin',
  password: process.env.DATABASE_PASSWORD || '',
  database: process.env.DATABASE_NAME || 'tsdb',
  entities: APP_ENTITIES,
  migrations: ['src/database/migrations/*.ts'],
  synchronize: process.env.NODE_ENV !== 'production',
  ssl: isCloudOrSsl ? { rejectUnauthorized: false } : false,
});

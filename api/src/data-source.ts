import 'reflect-metadata';
import 'dotenv/config';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DataSource, DataSourceOptions } from 'typeorm';
import { Lead } from './leads/entities/lead.entity.js';
import { User } from './users/entities/user.entity.js';

const currentDir = dirname(fileURLToPath(import.meta.url));

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [Lead, User],
  migrations: [join(currentDir, 'migrations', '*.{ts,js}')],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
};

const dataSource = new DataSource(dataSourceOptions);
export default dataSource;

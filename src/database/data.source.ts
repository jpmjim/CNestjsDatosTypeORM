import { DataSource } from 'typeorm';

export const dataSource = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'root',
  password: '123456',
  database: 'my_db',
  logging: true,
  synchronize: false,
  entities: ['src/**/**/*.entity.ts'],
  migrations: ['src/database/migrations/*.ts'],
});
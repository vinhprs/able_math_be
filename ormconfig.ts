import 'reflect-metadata';
import 'tsconfig-paths/register';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import {
  User,
  Test,
  TestQuestion,
  StudentAssignment,
  StudentSubmission,
  StudentAnswer,
  AdtmSubmission,
  ReportCard,
} from './src/database/entities';

dotenv.config();

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'able_math',
  entities: [
    User,
    Test,
    TestQuestion,
    StudentAssignment,
    StudentSubmission,
    StudentAnswer,
    AdtmSubmission,
    ReportCard,
  ],
  migrations: ['src/migrations/**/*{.ts,.js}'],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
});

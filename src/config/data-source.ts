import { DataSource, DataSourceOptions } from 'typeorm';
import * as dotenv from 'dotenv';
// Register tsconfig-paths to resolve @shared/* imports
import 'tsconfig-paths/register';

dotenv.config();

// Import entities after path registration
import {
  User,
  Test,
  TestQuestion,
  StudentAssignment,
  StudentSubmission,
  StudentAnswer,
  AdtmSubmission,
  ReportCard,
} from '../database/entities';

export const dataSourceOptions: DataSourceOptions = {
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
  migrations: [__dirname + '/../migrations/**/*{.ts,.js}'],
  synchronize: false,
  logging: false,
};

const dataSource = new DataSource(dataSourceOptions);

export default dataSource;

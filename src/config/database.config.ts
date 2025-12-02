import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
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

export default registerAs(
  'database',
  (): TypeOrmModuleOptions => ({
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
    synchronize: process.env.NODE_ENV === 'development',
    logging: false,
    migrations: [__dirname + '/../migrations/**/*{.ts,.js}'],
    migrationsRun: false,
    ssl: false, // Set to false for now, enable in production if needed
  }),
);

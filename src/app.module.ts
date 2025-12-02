import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

// Config imports
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import jwtConfig, { jwtRefreshConfig } from './config/jwt.config';

// Module imports
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { TestsModule } from './modules/tests/tests.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { GradingModule } from './modules/grading/grading.module';
import { ReportsModule } from './modules/reports/reports.module';

// Guards

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, jwtConfig, jwtRefreshConfig],
      envFilePath: ['.env.local', '.env'],
    }),

    // Database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        ...configService.get('database'),
      }),
    }),

    // Feature modules
    UsersModule,
    AuthModule,
    TestsModule,
    DashboardModule,
    GradingModule,
    ReportsModule,
  ],
  providers: [
    // Global guards are set up in main.ts, but we can also provide them here
    // {
    //   provide: APP_GUARD,
    //   useClass: JwtAuthGuard,
    // },
    // {
    //   provide: APP_GUARD,
    //   useClass: RolesGuard,
    // },
  ],
})
export class AppModule {}

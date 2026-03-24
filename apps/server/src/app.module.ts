import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AppController } from './app.controller';
import { validateEnv } from './common/config/env.validation';
import { DatabaseModule } from './common/database/database.module';
import { JwtStrategy } from './common/strategies/jwt.strategy';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: () => validateEnv(),
    }),
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '1h' },
    }),
    DatabaseModule,
  ],
  controllers: [AppController],
  providers: [JwtStrategy],
})
export class AppModule {}

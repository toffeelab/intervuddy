import type { Database } from '@intervuddy/database';
import { Controller, Get, Inject, UseGuards, Req } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { Pool } from 'pg';
import { DATABASE_TOKEN } from './common/database/database.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';

@Controller()
export class AppController {
  constructor(
    @Inject(DATABASE_TOKEN)
    private readonly dbConn: { db: Database; pool: Pool }
  ) {}

  @Get('health')
  async getHealth() {
    try {
      await this.dbConn.pool.query('SELECT 1');
      return { status: 'ok', db: 'connected' };
    } catch {
      return { status: 'degraded', db: 'disconnected' };
    }
  }

  @Get('auth/me')
  @UseGuards(JwtAuthGuard)
  getMe(@Req() req: FastifyRequest) {
    return { userId: (req as FastifyRequest & { user: { userId: string } }).user.userId };
  }
}

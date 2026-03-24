import type { Database } from '@intervuddy/database';
import { Controller, Get, Inject, UseGuards, Req, Logger } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { Pool } from 'pg';
import { DATABASE_TOKEN } from './common/database/database.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(
    @Inject(DATABASE_TOKEN)
    private readonly dbConn: { db: Database; pool: Pool }
  ) {}

  @Get('health')
  async getHealth() {
    try {
      await this.dbConn.pool.query('SELECT 1');
      return { status: 'ok', db: 'connected' };
    } catch (error) {
      this.logger.error('DB health check failed', error);
      return { status: 'degraded', db: 'disconnected' };
    }
  }

  @Get('auth/me')
  @UseGuards(JwtAuthGuard)
  getMe(@Req() req: FastifyRequest & { user: { userId: string } }) {
    return { userId: req.user.userId };
  }
}

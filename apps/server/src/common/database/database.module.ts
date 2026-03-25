import { createDb, type Database } from '@intervuddy/database';
import { Module, Global, OnModuleDestroy, Inject } from '@nestjs/common';
import { Pool } from 'pg';

export const DATABASE_TOKEN = 'DATABASE';

@Global()
@Module({
  providers: [
    {
      provide: DATABASE_TOKEN,
      useFactory: () => {
        const { db, pool } = createDb(process.env.DATABASE_URL!);
        return { db, pool };
      },
    },
  ],
  exports: [DATABASE_TOKEN],
})
export class DatabaseModule implements OnModuleDestroy {
  constructor(
    @Inject(DATABASE_TOKEN)
    private readonly dbConn: { db: Database; pool: Pool }
  ) {}

  async onModuleDestroy() {
    await this.dbConn.pool.end();
  }
}

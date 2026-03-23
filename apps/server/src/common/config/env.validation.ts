export interface EnvConfig {
  DATABASE_URL: string;
  PORT: number;
  JWT_SECRET: string;
  WEB_URL: string;
}

export function validateEnv(): EnvConfig {
  const config: EnvConfig = {
    DATABASE_URL: process.env.DATABASE_URL!,
    PORT: parseInt(process.env.PORT || '4000', 10),
    JWT_SECRET: process.env.JWT_SECRET!,
    WEB_URL: process.env.WEB_URL || 'http://localhost:3000',
  };

  const missing: string[] = [];
  if (!config.DATABASE_URL) missing.push('DATABASE_URL');
  if (!config.JWT_SECRET) missing.push('JWT_SECRET');

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  return config;
}

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

export function createServiceToken(userId: string): string {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is not set');
  }

  return jwt.sign({ sub: userId }, JWT_SECRET, {
    expiresIn: '1h',
    algorithm: 'HS256',
  });
}

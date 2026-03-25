import NextAuth from 'next-auth';
import authConfig from '@/auth.config';

const { auth } = NextAuth(authConfig);

// Next.js 16 proxy function — Edge Runtime 호환
export default auth;

export const config = {
  matcher: ['/interviews/:path*', '/study/:path*'],
};

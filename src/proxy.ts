export { auth as proxy } from '@/auth';

export const config = {
  matcher: ['/interviews/:path*', '/study/:path*'],
};

import createMiddleware from 'next-intl/middleware';
import { updateSession } from '@/lib/supabase/middleware';
import { NextRequest } from 'next/server';

const intlMiddleware = createMiddleware({
  locales: ['en', 'lo'],
  defaultLocale: 'en',
  localePrefix: 'always',
});

export default async function middleware(request: NextRequest) {
  // Handle Supabase auth
  const authResponse = await updateSession(request);
  if (authResponse.status !== 200) return authResponse;

  // Handle i18n
  return intlMiddleware(request);
}

export const config = {
  matcher: ['/', '/(en|lo)/:path*'],
};
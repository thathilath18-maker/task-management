import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { Toaster } from '@/components/ui/sonner';

const locales = ['en', 'lo'];

export const metadata: Metadata = {
  title: 'Task Management System',
  description: 'Comprehensive task management and tracking system',
};

export default async function LocaleLayout({
  children,
  params,  // ✅ ປ່ຽນຈາກ params: { locale }
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;  // ✅ ເປັນ Promise
}) {
  const { locale } = await params;  // ✅ await ກ່ອນໃຊ້!

  if (!locales.includes(locale)) notFound();

  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Noto+Sans+Lao:wght@300;400;500;600;700&family=Roboto:wght@300;400;500;700&family=Open+Sans:wght@300;400;500;600;700&family=Poppins:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-background antialiased" style={{ fontFamily: 'var(--font-family)' }}>
        <NextIntlClientProvider messages={messages}>
          <AuthProvider>
            <ThemeProvider>
              {children}
              <Toaster />
            </ThemeProvider>
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
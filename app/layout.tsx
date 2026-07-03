import type { Metadata } from 'next';
import { Inter, Grand_Hotel } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

const grandHotel = Grand_Hotel({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-logo',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://gadogaucho.com'),
  title: 'Gado Gaúcho - Anúncios de Gado',
  description: 'A maior plataforma de compra e venda de gado do RS. Anuncie seu gado e encontre o que precisa.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

import { LoadingProvider } from '@/components/LoadingProvider';
import { UserProvider } from '@/context/UserContext';
import { ToastContainer } from '@/components/ConfirmModal';
import { AuthModal } from '@/components/AuthModal';
import { GoogleAnalytics } from '@/components/GoogleAnalytics';
import { Footer } from '@/components/Footer';
import { AdModal } from '@/components/AdModal';
import { CookieBanner } from '@/components/CookieBanner';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning className={`${inter.variable} ${grandHotel.variable}`}>
      <body suppressHydrationWarning className="font-sans antialiased bg-[#F8F9FA] text-[#333] min-h-screen flex flex-col">
        <UserProvider>
          <LoadingProvider>
            <div className="flex-1 flex flex-col">
              {children}
            </div>
            <Footer />
            <AuthModal />
            <AdModal />
            <CookieBanner />
            <ToastContainer />
          </LoadingProvider>
        </UserProvider>
        <GoogleAnalytics />
      </body>
    </html>
  );
}

import type {Metadata} from 'next';
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
  title: 'Gado Gaúcho - Anúncios de Gado',
  description: 'A maior plataforma de compra e venda de gado.',
};

import { LoadingProvider } from '@/components/LoadingProvider';
import { UserProvider } from '@/context/UserContext';

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${grandHotel.variable}`}>
      <body suppressHydrationWarning className="font-sans antialiased bg-[#F8F9FA] text-[#333]">
        <UserProvider>
          <LoadingProvider>
            {children}
          </LoadingProvider>
        </UserProvider>
      </body>
    </html>
  );
}

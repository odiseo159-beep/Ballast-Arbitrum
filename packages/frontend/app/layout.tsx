import './globals.css';
import { Manrope, Inter, JetBrains_Mono } from 'next/font/google';
import { Providers } from '@/components/providers';
import clsx from 'clsx';
import type { Metadata } from 'next';

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-manrope',
  display: 'swap',
});
const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
});
const mono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Ballast — protect your savings with US stocks',
  description:
    'An AI agent that helps people outside the US move into a basket of tokenized US blue-chip stocks on Robinhood Chain — in plain language, in your local currency.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={clsx(manrope.variable, inter.variable, mono.variable)}>
      <body className="font-sans bg-deep-ocean text-mist antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

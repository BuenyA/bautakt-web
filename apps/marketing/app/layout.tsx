import './globals.css';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Bautakt | Marketing Website',
  description:
    'Bautakt marketing website built with Next.js for deployment on Vercel and bautakt.com.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

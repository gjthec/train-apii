'use client';

import type { AppProps } from 'next/app';
import AuthGate from '@/components/AuthGate';
import '@/styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AuthGate>
      <Component {...pageProps} />
    </AuthGate>
  );
}

import { useEffect } from 'react';
import { initAnalytics } from '@/lib/firebase';
import '@/styles/globals.css';

export default function App({ Component, pageProps }) {
  useEffect(() => {
    initAnalytics().catch((err) => {
      console.error('Falha ao iniciar o Firebase Analytics', err);
    });
  }, []);

  return <Component {...pageProps} />;
}

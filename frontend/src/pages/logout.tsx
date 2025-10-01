'use client';

import Head from 'next/head';
import { useCallback, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import { signOutClient } from '@/lib/firebase';
import styles from '@/styles/Logout.module.css';

export default function LogoutPage() {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogout = useCallback(async () => {
    if (isProcessing) {
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      await signOutClient();
      await router.push('/login');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Não foi possível encerrar a sessão.';
      setError(message);
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, router]);

  return (
    <Layout title="Encerrar sessão">
      <Head>
        <title>Train API - Logout</title>
      </Head>
      <div className={styles.wrapper}>
        <div className={styles.panel}>
          <button type="button" className={styles.logoutButton} onClick={handleLogout} disabled={isProcessing}>
            {isProcessing ? 'Encerrando sessão...' : 'Encerrar sessão atual'}
          </button>
          {error ? <p className={styles.errorMessage}>{error}</p> : null}
        </div>
      </div>
    </Layout>
  );
}

'use client';

import Head from 'next/head';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useState } from 'react';
import { getClientAuth, requireUid, signInWithGoogle } from '@/lib/firebase';
import styles from '@/styles/Login.module.css';

import type { Unsubscribe } from 'firebase/auth';

type AuthStatus = 'loading' | 'signed-in' | 'signed-out';

type AuthError = Error | null;

export default function LoginPage() {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [error, setError] = useState<AuthError>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasRedirected, setHasRedirected] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let unsubscribe: Unsubscribe | undefined;
    let active = true;

    (async () => {
      try {
        const auth = await getClientAuth();
        const { onAuthStateChanged } = await import('firebase/auth');

        unsubscribe = onAuthStateChanged(auth, (user) => {
          if (!active) {
            return;
          }

          if (user) {
            setStatus('signed-in');
            setError(null);
            void requireUid().catch(() => {
              // ignore errors because we already have a user session
            });
          } else {
            setStatus('signed-out');
          }
        });
      } catch (authError) {
        if (!active) {
          return;
        }
        const message = authError instanceof Error ? authError.message : 'Não foi possível carregar a autenticação.';
        setError(new Error(message));
        setStatus('signed-out');
      }
    })();

    return () => {
      active = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const handleGoogleLogin = useCallback(async () => {
    setIsProcessing(true);
    setError(null);
    try {
      await signInWithGoogle();
      setStatus('signed-in');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Não foi possível autenticar com o Google.';
      setError(new Error(message));
    } finally {
      setIsProcessing(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'signed-in' && !hasRedirected) {
      setHasRedirected(true);
      void router.replace('/');
    }
  }, [status, hasRedirected, router]);

  const statusMessage = status === 'loading' ? 'Verificando sessão...' : status === 'signed-in' ? 'Redirecionando...' : null;

  return (
    <>
      <Head>
        <title>Onemorerep - Login</title>
      </Head>
      <div className={styles.pageBackground}>
        <div className={styles.panel}>
          <span className={styles.brandChip}>Onemorerep</span>
          <h1>Acesse sua conta</h1>
          <p className={styles.subtitle}>
            Entre com o Google para sincronizar treinos e continuar de onde parou.
          </p>
          <button
            type="button"
            className={styles.googleButton}
            onClick={handleGoogleLogin}
            disabled={isProcessing}
          >
            <svg
              aria-hidden="true"
              focusable="false"
              role="img"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 533.5 544.3"
              className={styles.googleIcon}
            >
              <path
                fill="#4285F4"
                d="M533.5 278.4c0-17.4-1.6-34.1-4.7-50.2H272v95h147.5c-6.4 34.7-25.9 64.1-55.2 83.8v69.7h89.2c52.2-48.1 80-119.1 80-198.3"
              />
              <path
                fill="#34A853"
                d="M272 544.3c74.7 0 137.4-24.7 183.2-67.6l-89.2-69.7c-24.7 16.6-56.4 26.4-94 26.4-72 0-132.9-48.6-154.7-113.9H27.1v71.6C72.8 483.2 166.1 544.3 272 544.3"
              />
              <path
                fill="#FBBC05"
                d="M117.3 319.5c-5.6-16.6-8.8-34.4-8.8-52.5s3.2-35.9 8.6-52.5v-71.6H27.1C9.9 191 0 232.4 0 274.9c0 42.5 9.9 83.9 27.1 121.9l90.2-71.5"
              />
              <path
                fill="#EA4335"
                d="M272 107.7c40.6 0 77 14 105.7 41.5l79.1-79.1C409.3 24.8 346.6 0 272 0 166.1 0 72.8 61.1 27.1 152.5l90.2 71.6C139.1 156.3 200 107.7 272 107.7"
              />
            </svg>
            <span>{isProcessing ? 'Processando...' : 'Entrar com Google'}</span>
          </button>
          <a
            className={styles.secondaryLink}
            href="https://accounts.google.com/signup"
            target="_blank"
            rel="noreferrer"
          >
            Cadastrar nova conta
          </a>
          {error ? <p className={styles.errorMessage}>{error.message}</p> : null}
          {statusMessage ? <p className={styles.statusMessage}>{statusMessage}</p> : null}
        </div>
      </div>
    </>
  );
}

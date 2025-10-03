'use client';

import Image from 'next/image';
import Head from 'next/head';
import { useCallback, useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import {
  getClientAuth,
  requireUid,
  signInWithGoogle,
  signOutClient,
  type AuthenticatedUserProfile
} from '@/lib/firebase';
import styles from '@/styles/Login.module.css';

import type { Unsubscribe } from 'firebase/auth';

interface DisplayUserInfo {
  uid: string;
  displayName?: string;
  email?: string;
  photoURL?: string;
  isAnonymous: boolean;
  providerIds: readonly string[];
}

type AuthStatus = 'loading' | 'signed-in' | 'signed-out';

type AuthError = Error | null;

const toDisplayUserInfo = (profile: AuthenticatedUserProfile): DisplayUserInfo => ({
  uid: profile.uid,
  displayName: profile.displayName ?? undefined,
  email: profile.email ?? undefined,
  photoURL: profile.photoURL ?? undefined,
  isAnonymous: profile.isAnonymous,
  providerIds: profile.providerIds
});

const statusMessages: Record<AuthStatus, string> = {
  loading: 'Carregando sessão...',
  'signed-in': 'Sessão autenticada',
  'signed-out': 'Nenhum usuário conectado'
};

const getInitials = (info: DisplayUserInfo): string => {
  const fromName = info.displayName
    ?.split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  if (fromName && fromName.trim().length > 0) {
    return fromName;
  }

  if (info.email && info.email.length > 0) {
    const firstChar = info.email[0];
    if (firstChar) {
      return firstChar.toUpperCase();
    }
  }

  return 'U';
};

export default function LoginPage() {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [userInfo, setUserInfo] = useState<DisplayUserInfo | null>(null);
  const [error, setError] = useState<AuthError>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const statusLabel = statusMessages[status];

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
            const profile: AuthenticatedUserProfile = {
              uid: user.uid,
              displayName: user.displayName,
              email: user.email,
              photoURL: user.photoURL,
              providerIds: user.providerData
                .map((info) => info?.providerId)
                .filter((providerId): providerId is string => Boolean(providerId)),
              isAnonymous: user.isAnonymous
            };
            setUserInfo(toDisplayUserInfo(profile));
            setStatus('signed-in');
            setError(null);
            void requireUid().catch(() => {
              // ignore errors because we already have a user session
            });
          } else {
            setUserInfo(null);
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
      const profile = await signInWithGoogle();
      setUserInfo(toDisplayUserInfo(profile));
      setStatus('signed-in');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Não foi possível autenticar com o Google.';
      setError(new Error(message));
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    setIsProcessing(true);
    setError(null);
    try {
      await signOutClient();
      setUserInfo(null);
      setStatus('signed-out');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Não foi possível encerrar a sessão.';
      setError(new Error(message));
    } finally {
      setIsProcessing(false);
    }
  }, []);

  return (
    <Layout title="Autenticação" description="Conecte-se com sua conta Google para sincronizar seus dados.">
      <Head>
        <title>Train API - Login</title>
      </Head>
      <div className={styles.page}>
        <section className={styles.copy}>
          <span className={styles.badge}>Área exclusiva</span>
          <h1>Entre para acompanhar seus treinos em tempo real</h1>
          <p>
            Centralize seu histórico de treinos, acompanhe a evolução das turmas e mantenha seus dados em sincronia com todos os
            dispositivos conectados.
          </p>
          <ul className={styles.benefits}>
            <li>Sincronize treinos e sessões automaticamente em qualquer lugar.</li>
            <li>Garanta histórico contínuo mesmo quando alternar entre dispositivos.</li>
            <li>Desbloqueie relatórios completos e dashboards personalizados.</li>
          </ul>
        </section>

        <section className={styles.panel} aria-labelledby="auth-panel-title">
          <header className={styles.panelHeader}>
            <div>
              <h2 id="auth-panel-title">Autenticação</h2>
              <p>Conecte sua conta Google para salvar progresso e desbloquear recursos avançados.</p>
            </div>
            <span className={styles.statusBadge} data-status={status}>
              {statusLabel}
            </span>
          </header>

          {error ? (
            <div className={styles.errorBanner} role="alert">
              {error.message}
            </div>
          ) : null}

          <div className={styles.actions}>
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
              <span>{isProcessing ? 'Conectando...' : 'Entrar com Google'}</span>
            </button>
            {status === 'signed-in' ? (
              <button type="button" className={styles.signOutButton} onClick={handleSignOut} disabled={isProcessing}>
                Encerrar sessão
              </button>
            ) : null}
          </div>

          <div className={styles.sessionCard}>
            {userInfo ? (
              <>
                <div className={styles.userPreview}>
                  {userInfo.photoURL ? (
                    <Image
                      src={userInfo.photoURL}
                      alt={userInfo.displayName ?? 'Foto do usuário'}
                      width={64}
                      height={64}
                      className={styles.avatar}
                    />
                  ) : (
                    <div className={styles.avatarFallback} aria-hidden="true">
                      {getInitials(userInfo)}
                    </div>
                  )}
                  <div>
                    <h3>{userInfo.displayName ?? 'Sessão autenticada'}</h3>
                    <p>{userInfo.email ?? 'Conta Google conectada com sucesso.'}</p>
                  </div>
                </div>

                <dl className={styles.profileDetails}>
                  <div>
                    <dt>UID</dt>
                    <dd>{userInfo.uid}</dd>
                  </div>
                  <div>
                    <dt>Tipo de conta</dt>
                    <dd>{userInfo.isAnonymous ? 'Anônima' : 'Google'}</dd>
                  </div>
                  {userInfo.displayName ? (
                    <div>
                      <dt>Nome</dt>
                      <dd>{userInfo.displayName}</dd>
                    </div>
                  ) : null}
                  {userInfo.email ? (
                    <div>
                      <dt>Email</dt>
                      <dd>{userInfo.email}</dd>
                    </div>
                  ) : null}
                </dl>

                {userInfo.providerIds.length > 0 ? (
                  <div className={styles.providerList}>
                    {userInfo.providerIds.map((providerId) => (
                      <span key={providerId} className={styles.providerChip}>
                        {providerId}
                      </span>
                    ))}
                  </div>
                ) : null}
              </>
            ) : (
              <div className={styles.emptyState}>
                <h3>Nenhum usuário conectado</h3>
                <p>
                  Clique em &ldquo;Entrar com Google&rdquo; para converter a sessão anônima em uma conta que guarda seus treinos e
                  dashboards favoritos.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </Layout>
  );
}

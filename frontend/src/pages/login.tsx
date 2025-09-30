'use client';

import Image from 'next/image';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getClientAuth,
  requireUid,
  signInWithGoogle,
  signOutClient,
  type AuthenticatedUserProfile
} from '@/lib/firebase';

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

export default function LoginPage() {
  const router = useRouter();
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [userInfo, setUserInfo] = useState<DisplayUserInfo | null>(null);
  const [error, setError] = useState<AuthError>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [shouldRedirect, setShouldRedirect] = useState(false);

  const isFullyAuthenticated = useMemo(
    () => status === 'signed-in' && Boolean(userInfo) && !userInfo?.isAnonymous,
    [status, userInfo]
  );

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
      setShouldRedirect(true);
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

  useEffect(() => {
    if (shouldRedirect && isFullyAuthenticated) {
      void router.replace('/');
    }
  }, [shouldRedirect, isFullyAuthenticated, router]);

  const statusAccent =
    status === 'signed-in'
      ? 'text-emerald-300'
      : status === 'signed-out'
        ? 'text-amber-300'
        : 'text-slate-300';

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950">
      <Head>
        <title>Train API - Login</title>
      </Head>
      <div className="absolute -left-32 top-16 h-[520px] w-[520px] rounded-full bg-brand-500/30 blur-3xl" aria-hidden />
      <div className="absolute right-[-20%] top-1/3 h-[580px] w-[580px] rounded-full bg-indigo-500/20 blur-3xl" aria-hidden />
      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 py-20 lg:flex-row lg:items-center lg:justify-between lg:gap-16">
        <section className="max-w-2xl text-center lg:text-left">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-brand-100 shadow-lg shadow-brand-500/20">
            Train API
          </div>
          <h1 className="mt-8 text-4xl font-semibold leading-tight text-white sm:text-5xl">
            Seu hub inteligente de treinos
          </h1>
          <p className="mt-4 text-lg text-slate-300">
            Planeje, acompanhe e sincronize os treinos da sua equipe com uma experiência envolvente e sem complicações.
          </p>
          <ul className="mt-10 grid gap-6 text-left sm:grid-cols-2">
            <li className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200 shadow-xl shadow-slate-900/30 backdrop-blur">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-500/20 text-brand-200">
                <svg viewBox="0 0 24 24" role="img" className="h-5 w-5 fill-current">
                  <path d="M9 12.75 6.75 10.5 5.69 11.56 9 14.87 18.31 5.56 17.25 4.5z" />
                </svg>
              </span>
              <span>Sincronização segura entre usuários convidados e treinadores.</span>
            </li>
            <li className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200 shadow-xl shadow-slate-900/30 backdrop-blur">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-500/20 text-brand-200">
                <svg viewBox="0 0 24 24" role="img" className="h-5 w-5 fill-current">
                  <path d="M12 3a9 9 0 1 0 9 9h-2a7 7 0 1 1-7-7z" />
                </svg>
              </span>
              <span>Histórico completo para você continuar exatamente de onde parou.</span>
            </li>
            <li className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200 shadow-xl shadow-slate-900/30 backdrop-blur sm:col-span-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-500/20 text-brand-200">
                <svg viewBox="0 0 24 24" role="img" className="h-5 w-5 fill-current">
                  <path d="M5 5h14v2H5zm2 6h10v2H7zm-2 6h14v2H5z" />
                </svg>
              </span>
              <span>Interface pensada para deixar o foco no desempenho da equipe.</span>
            </li>
          </ul>
        </section>

        <div className="w-full max-w-xl rounded-[2.5rem] border border-white/10 bg-white/10 p-10 shadow-2xl shadow-slate-950/40 backdrop-blur">
          <header className="space-y-3 text-center">
            <h2 className="text-2xl font-semibold text-white">Autenticação</h2>
            <p className="text-sm text-slate-300">
              Conecte-se com sua conta Google para desbloquear a melhor experiência da plataforma.
            </p>
          </header>
          <div className="mt-10 grid gap-8">
            <section className="space-y-6 rounded-3xl border border-white/10 bg-slate-900/60 p-8 shadow-lg shadow-slate-950/50">
              <div className="space-y-2">
                <h3 className="text-xl font-medium text-white">Entrar com Google</h3>
                <p className="text-sm text-slate-300">
                  Você pode continuar utilizando a autenticação anônima automática ou conectar sua conta Google para sincronizar seus
                  treinos com um usuário permanente.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  className="group inline-flex items-center justify-center gap-3 rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-900 shadow-lg shadow-brand-500/30 transition hover:-translate-y-0.5 hover:shadow-brand-500/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400 disabled:pointer-events-none disabled:opacity-70"
                  onClick={handleGoogleLogin}
                  disabled={isProcessing}
                >
                  <span className="flex h-5 w-5 items-center justify-center">
                    <svg
                      aria-hidden="true"
                      focusable="false"
                      role="img"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 533.5 544.3"
                      className="h-full w-full"
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
                  </span>
                  <span>{isProcessing ? 'Processando...' : 'Entrar com Google'}</span>
                </button>
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-full border border-white/20 px-6 py-3 text-sm font-medium text-slate-200 transition hover:border-white/40 hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:pointer-events-none disabled:opacity-60"
                  onClick={handleSignOut}
                  disabled={isProcessing}
                >
                  Sair da conta
                </button>
                {isFullyAuthenticated ? (
                  <Link
                    href="/"
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-500/20 px-6 py-3 text-sm font-semibold text-brand-100 transition hover:bg-brand-500/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400"
                  >
                    Ir para o app
                  </Link>
                ) : null}
              </div>
              {error ? (
                <p className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {error.message}
                </p>
              ) : null}
            </section>

            <section className="space-y-6 rounded-3xl border border-white/10 bg-slate-900/60 p-8 shadow-lg shadow-slate-950/50">
              <div className="space-y-2">
                <h3 className="text-xl font-medium text-white">Status da sessão</h3>
                <p className={`text-sm font-medium ${statusAccent}`}>
                  {status === 'loading' && 'Carregando sessão...'}
                  {status === 'signed-in' && 'Sessão autenticada'}
                  {status === 'signed-out' && 'Nenhum usuário conectado'}
                </p>
              </div>

              {userInfo ? (
                <div className="flex flex-col gap-6 rounded-2xl border border-white/5 bg-slate-950/40 p-6 shadow-inner shadow-slate-900/60">
                  {userInfo.photoURL ? (
                    <Image
                      src={userInfo.photoURL}
                      alt={userInfo.displayName ?? 'Foto do usuário'}
                      width={64}
                      height={64}
                      className="h-16 w-16 rounded-full border border-white/10 object-cover shadow-lg shadow-slate-950/50"
                    />
                  ) : null}
                  <dl className="grid gap-4 text-sm text-slate-200 sm:grid-cols-2">
                    <div className="space-y-1">
                      <dt className="text-xs uppercase tracking-wide text-slate-400">UID</dt>
                      <dd className="font-mono text-xs text-slate-200 break-all">{userInfo.uid}</dd>
                    </div>
                    {userInfo.displayName ? (
                      <div className="space-y-1">
                        <dt className="text-xs uppercase tracking-wide text-slate-400">Nome</dt>
                        <dd>{userInfo.displayName}</dd>
                      </div>
                    ) : null}
                    {userInfo.email ? (
                      <div className="space-y-1">
                        <dt className="text-xs uppercase tracking-wide text-slate-400">Email</dt>
                        <dd>{userInfo.email}</dd>
                      </div>
                    ) : null}
                    <div className="space-y-1">
                      <dt className="text-xs uppercase tracking-wide text-slate-400">Tipo de conta</dt>
                      <dd>{userInfo.isAnonymous ? 'Anônima' : 'Google'}</dd>
                    </div>
                    {userInfo.providerIds.length > 0 ? (
                      <div className="space-y-1 sm:col-span-2">
                        <dt className="text-xs uppercase tracking-wide text-slate-400">Provedores</dt>
                        <dd>{userInfo.providerIds.join(', ')}</dd>
                      </div>
                    ) : null}
                  </dl>
                </div>
              ) : (
                <p className="rounded-2xl border border-white/5 bg-slate-950/30 p-6 text-sm text-slate-300">
                  Nenhuma informação de usuário disponível.
                </p>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

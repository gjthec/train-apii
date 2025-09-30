'use client';

import { useRouter } from 'next/router';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { getClientAuth } from '@/lib/firebase';
import styles from '@/styles/AuthGate.module.css';

import type { Unsubscribe } from 'firebase/auth';

type AuthState = 'loading' | 'authenticated' | 'unauthenticated';

const PUBLIC_ROUTES = new Set(['/login', '/_error']);

interface AuthGateProps {
  children: ReactNode;
}

const isPublicRoute = (pathname: string): boolean => {
  return PUBLIC_ROUTES.has(pathname);
};

export default function AuthGate({ children }: AuthGateProps) {
  const router = useRouter();
  const [status, setStatus] = useState<AuthState>('loading');

  useEffect(() => {
    let active = true;
    let unsubscribe: Unsubscribe | undefined;

    (async () => {
      try {
        const auth = await getClientAuth();
        const { onAuthStateChanged } = await import('firebase/auth');

        unsubscribe = onAuthStateChanged(auth, (user) => {
          if (!active) {
            return;
          }

          if (user && !user.isAnonymous) {
            setStatus('authenticated');
          } else {
            setStatus('unauthenticated');
          }
        });
      } catch (error) {
        if (!active) {
          return;
        }
        console.error('Falha ao inicializar a autenticação.', error);
        setStatus('unauthenticated');
      }
    })();

    return () => {
      active = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const pathname = router.pathname;
  const routeIsPublic = useMemo(() => isPublicRoute(pathname), [pathname]);

  useEffect(() => {
    if (status === 'authenticated' && pathname === '/login') {
      void router.replace('/');
      return;
    }

    if (status === 'unauthenticated' && !routeIsPublic) {
      void router.replace('/login');
    }
  }, [pathname, routeIsPublic, router, status]);

  if (routeIsPublic) {
    if (status === 'authenticated') {
      return <div className={styles.loading}>Redirecionando...</div>;
    }
    return <>{children}</>;
  }

  if (status !== 'authenticated') {
    return <div className={styles.loading}>Carregando sessão...</div>;
  }

  return <>{children}</>;
}

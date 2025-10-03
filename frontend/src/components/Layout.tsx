'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import type { ReactNode } from 'react';
import { useAuth } from '@/components/AuthGate';
import styles from '@/styles/Layout.module.css';

interface LayoutProps {
  title: string;
  description?: string;
  children?: ReactNode;
}

const navLinks: Array<{ href: string; label: string }> = [
  { href: '/', label: 'Visão geral' },
  { href: '/exercise-classes', label: 'Aulas' },
  { href: '/workouts', label: 'Treinos' },
  { href: '/dashboards', label: 'Dashboards' },
  { href: '/muscle-groups', label: 'Grupos musculares' },
  { href: '/exercises', label: 'Exercícios' },
  { href: '/sessions', label: 'Sessões' }
];

const isLinkActive = (pathname: string, href: string): boolean => {
  if (href === '/') {
    return pathname === '/';
  }

  return pathname === href || pathname.startsWith(`${href}/`);
};

export default function Layout({ title, description, children }: LayoutProps) {
  const { pathname } = useRouter();
  const { user, signOut, isProcessing } = useAuth();

  const userInitials = user
    ? (() => {
        if (user.displayName) {
          const initials = user.displayName
            .split(' ')
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0]?.toUpperCase())
            .join('');
          if (initials) {
            return initials;
          }
        }

        if (user.email && user.email.length > 0) {
          const first = user.email[0];
          if (first) {
            return first.toUpperCase();
          }
        }

        return 'U';
      })()
    : 'U';

  return (
    <div className={styles.appShell}>
      <aside className={styles.sidebar}>
        <Link href="/" className={styles.brand} aria-label="Train API">
          <span className={styles.brandTitle}>Train API</span>
          <span className={styles.brandTagline}>Painel de treinos atualizado</span>
        </Link>
        <nav className={styles.nav} aria-label="Menu principal">
          <ul>
            {navLinks.map((link) => {
              const active = isLinkActive(pathname, link.href);

              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={active ? 'page' : undefined}
                    className={`${styles.navLink} ${active ? styles.navLinkActive : ''}`.trim()}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
      <main className={styles.contentArea}>
        <div className={styles.contentInner}>
          <header className={styles.pageHeader}>
            <div className={styles.pageHeading}>
              <h2>{title}</h2>
              {description ? <p>{description}</p> : null}
            </div>
            {user ? (
              <div className={styles.userBadge}>
                {user.photoURL ? (
                  <Image
                    src={user.photoURL}
                    alt={user.displayName ?? 'Foto do usuário'}
                    width={40}
                    height={40}
                    className={styles.userAvatar}
                  />
                ) : (
                  <div className={styles.userAvatarFallback} aria-hidden="true">
                    {userInitials}
                  </div>
                )}
                <div className={styles.userMeta}>
                  <span className={styles.userName}>{user.displayName ?? user.email ?? 'Conta conectada'}</span>
                  <button
                    type="button"
                    className={styles.userSignOut}
                    onClick={() => {
                      void signOut();
                    }}
                    disabled={isProcessing}
                  >
                    {isProcessing ? 'Saindo...' : 'Sair'}
                  </button>
                </div>
              </div>
            ) : null}
          </header>
          <section className={styles.pageBody}>{children}</section>
        </div>
      </main>
    </div>
  );
}

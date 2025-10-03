'use client';

import Link from 'next/link';
import { useRouter } from 'next/router';
import type { ReactNode } from 'react';
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
  { href: '/sessions', label: 'Sessões' },
  { href: '/login', label: 'Login' }
];

const isLinkActive = (pathname: string, href: string): boolean => {
  if (href === '/') {
    return pathname === '/';
  }

  return pathname === href || pathname.startsWith(`${href}/`);
};

export default function Layout({ title, description, children }: LayoutProps) {
  const { pathname } = useRouter();

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
            <h2>{title}</h2>
            {description ? <p>{description}</p> : null}
          </header>
          <section className={styles.pageBody}>{children}</section>
        </div>
      </main>
    </div>
  );
}

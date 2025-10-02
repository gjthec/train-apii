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
        <div className={styles.sidebarInner}>
          <Link href="/" className={styles.brand} aria-label="Train API">
            <span className={styles.brandIcon}>🏋️‍♂️</span>
            <span className={styles.brandText}>Train API</span>
          </Link>
          <p className={styles.tagline}>Treinos inteligentes, progresso constante.</p>
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
                      <span>{link.label}</span>
                      <span className={styles.navIndicator} aria-hidden="true" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
        <footer className={styles.sidebarFooter}>
          <p>Atualizado diariamente com os dados mais recentes dos alunos.</p>
        </footer>
      </aside>
      <main className={styles.contentArea}>
        <div className={styles.contentWrapper}>
          <header className={styles.pageHeader}>
            <div>
              <h2>{title}</h2>
              {description ? <p>{description}</p> : null}
            </div>
            <div className={styles.pageAccent}>
              <span className={styles.pageAccentGlow} aria-hidden="true" />
              <span className={styles.pageAccentLabel}>Painel Train API</span>
            </div>
          </header>
          <section className={styles.pageBody}>{children}</section>
        </div>
      </main>
    </div>
  );
}

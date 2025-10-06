'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
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

export default function Layout({ title, description, children }: LayoutProps) {
  const pathname = usePathname();

  return (
    <div className={styles.appShell}>
      <aside className={styles.sidebar}>
        <div className={styles.brandBlock}>
          <h1 className={styles.brand}>Train API</h1>
          <p className={styles.brandTagline}>Planeje, acompanhe e evolua seus treinos com clareza.</p>
        </div>
        <nav aria-label="Navegação principal" className={styles.nav}>
          <ul className={styles.navList}>
            {navLinks.map((link) => {
              const isRoot = link.href === '/';
              const isActive = isRoot ? pathname === '/' : pathname?.startsWith(link.href);
              const linkClassName = isActive
                ? `${styles.navLink} ${styles.navLinkActive}`
                : styles.navLink;

              return (
                <li key={link.href}>
                  <Link href={link.href} className={linkClassName}>
                    <span className={styles.navLinkIndicator} aria-hidden="true" />
                    <span className={styles.navLinkLabel}>{link.label}</span>
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
            <h2 className={styles.pageTitle}>{title}</h2>
            {description ? <p className={styles.pageDescription}>{description}</p> : null}
          </header>
          <section className={styles.pageBody}>{children}</section>
        </div>
      </main>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div
      className={
        isSidebarOpen
          ? styles.appShell
          : `${styles.appShell} ${styles.appShellCollapsed}`
      }
    >
      <aside
        className={
          isSidebarOpen
            ? styles.sidebar
            : `${styles.sidebar} ${styles.sidebarCollapsed}`
        }
      >
        <button
          type="button"
          className={styles.toggleButton}
          aria-expanded={isSidebarOpen}
          aria-controls="sidebar-navigation"
          onClick={() => setIsSidebarOpen((open) => !open)}
        >
          {isSidebarOpen ? 'Recolher menu' : 'Expandir menu'}
        </button>
        {isSidebarOpen ? (
          <h1 className={styles.brand}>Train API</h1>
        ) : (
          <span className={styles.collapsedBrand} aria-hidden="true">
            TA
          </span>
        )}
        <nav id="sidebar-navigation" aria-hidden={!isSidebarOpen}>
          <ul>
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href}>{link.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
      <main className={styles.contentArea}>
        <header className={styles.pageHeader}>
          <h2>{title}</h2>
          {description ? <p>{description}</p> : null}
        </header>
        <section className={styles.pageBody}>{children}</section>
      </main>
    </div>
  );
}

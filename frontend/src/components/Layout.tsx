'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  { href: '/logout', label: 'Logout' }
];

export default function Layout({ title, description, children }: LayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const pathname = usePathname();

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
          className={`${styles.toggleButton} ${
            isSidebarOpen ? styles.toggleButtonOpen : styles.toggleButtonClosed
          }`}
          aria-expanded={isSidebarOpen}
          aria-controls="sidebar-navigation"
          onClick={() => setIsSidebarOpen((open) => !open)}
        >
          <span className={styles.srOnly}>
            {isSidebarOpen ? 'Recolher menu' : 'Expandir menu'}
          </span>
          <span className={styles.hamburgerIcon} aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        </button>
        {isSidebarOpen ? <h1 className={styles.brand}>Train API</h1> : null}
        <nav
          id="sidebar-navigation"
          className={isSidebarOpen ? undefined : styles.navHidden}
          aria-hidden={!isSidebarOpen}
        >
          <ul>
            {navLinks.map((link) => {
              const isActive =
                pathname === link.href ||
                (link.href !== '/' && pathname.startsWith(`${link.href}/`));

              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={isActive ? styles.activeLink : undefined}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
      <main
        className={
          isSidebarOpen
            ? styles.contentArea
            : `${styles.contentArea} ${styles.contentAreaCollapsed}`
        }
      >
        <header className={styles.pageHeader}>
          <h2>{title}</h2>
          {description ? <p>{description}</p> : null}
        </header>
        <section className={styles.pageBody}>{children}</section>
      </main>
    </div>
  );
}

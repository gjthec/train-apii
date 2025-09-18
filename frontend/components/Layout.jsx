import Link from 'next/link';
import styles from '@/styles/Layout.module.css';

const navLinks = [
  { href: '/', label: 'Visão geral' },
  { href: '/exercise-classes', label: 'Aulas' },
  { href: '/workouts', label: 'Treinos' },
  { href: '/exercises', label: 'Exercícios' },
  { href: '/sessions', label: 'Sessões' }
];

export default function Layout({ title, description, children }) {
  return (
    <div className={styles.appShell}>
      <aside className={styles.sidebar}>
        <h1 className={styles.brand}>Train API</h1>
        <nav>
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

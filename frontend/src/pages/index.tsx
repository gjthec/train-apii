'use client';

import Head from 'next/head';
import Link from 'next/link';
import Layout from '@/components/Layout';
import styles from '@/styles/Home.module.css';

const cards: ReadonlyArray<{
  href: string;
  title: string;
  description: string;
  icon: string;
}> = [
  {
    href: '/exercise-classes',
    title: 'Aulas',
    description: 'Visualize todas as aulas cadastradas para o aluno atual.',
    icon: '🎓'
  },
  {
    href: '/workouts',
    title: 'Treinos',
    description: 'Confira a estrutura completa dos treinos e suas sessões.',
    icon: '💪'
  },
  {
    href: '/exercises',
    title: 'Exercícios',
    description: 'Veja os exercícios disponíveis e detalhes de execução.',
    icon: '🏋️'
  },
  {
    href: '/sessions',
    title: 'Sessões',
    description: 'Acompanhe as sessões agendadas em cada aula.',
    icon: '🗓️'
  }
];

export default function HomePage() {
  return (
    <Layout title="Painel do aluno" description="Escolha um módulo para começar.">
      <Head>
        <title>Onemorerep - Painel</title>
      </Head>
      <div className={styles.grid}>
        {cards.map((card) => (
          <Link key={card.href} href={card.href} className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={styles.cardIcon} aria-hidden="true">
                {card.icon}
              </span>
              <h3>{card.title}</h3>
            </div>
            <p>{card.description}</p>
            <span className={styles.cardCta}>
              Acessar módulo
              <svg
                className={styles.cardCtaIcon}
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M7.5 4.5L12.5 9.5L7.5 14.5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </Link>
        ))}
      </div>
    </Layout>
  );
}

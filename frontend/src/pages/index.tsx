'use client';

import Head from 'next/head';
import Link from 'next/link';
import Layout from '@/components/Layout';
import styles from '@/styles/Home.module.css';

const cards: ReadonlyArray<{ href: string; title: string; description: string }> = [
  {
    href: '/exercise-classes',
    title: 'Aulas',
    description: 'Visualize todas as aulas cadastradas para o aluno atual.'
  },
  {
    href: '/workouts',
    title: 'Treinos',
    description: 'Confira a estrutura completa dos treinos e suas sessões.'
  },
  {
    href: '/exercises',
    title: 'Exercícios',
    description: 'Veja os exercícios disponíveis e detalhes de execução.'
  },
  {
    href: '/sessions',
    title: 'Sessões',
    description: 'Acompanhe as sessões agendadas em cada aula.'
  }
];

export default function HomePage() {
  return (
    <Layout title="Painel do aluno" description="Escolha um módulo para começar.">
      <Head>
        <title>Train API - Painel</title>
      </Head>
      <div className={styles.grid}>
        {cards.map((card) => (
          <Link key={card.href} href={card.href} className={styles.card}>
            <h3>{card.title}</h3>
            <p>{card.description}</p>
          </Link>
        ))}
      </div>
    </Layout>
  );
}

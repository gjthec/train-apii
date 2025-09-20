'use client';

import Head from 'next/head';
import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import ResourceList from '@/components/ResourceList';
import { fetchExerciseClasses, type ExerciseClass } from '@/lib/api';
import styles from '@/styles/ExerciseClasses.module.css';

const formatDateTime = (value?: string): string => {
  if (!value) {
    return '–';
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '–' : date.toLocaleString('pt-BR');
};

const formatSessionsCount = (sessions?: string[]): number => sessions?.length ?? 0;

export default function ExerciseClassesPage() {
  const [classes, setClasses] = useState<ExerciseClass[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    fetchExerciseClasses()
      .then((data) => {
        if (isMounted) {
          setClasses(data);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        const message = err instanceof Error ? err.message : 'Não foi possível carregar as aulas.';
        setError(message);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <Layout title="Aulas do aluno" description="Lista das aulas obtidas via API de backend.">
      <Head>
        <title>Train API - Aulas</title>
      </Head>
      {error ? <p className={styles.error}>{error}</p> : null}
      <ResourceList
        items={classes}
        emptyLabel="Nenhuma aula encontrada."
        renderItem={(item) => (
          <article>
            <header className={styles.cardHeader}>
              <h3>{item.name}</h3>
              <time>{formatDateTime(item.createdAt)}</time>
            </header>
            {item.description ? <p>{item.description}</p> : null}
            <footer className={styles.cardFooter}>
              <span>
                Sessões: <strong>{formatSessionsCount(item.sessions)}</strong>
              </span>
              <span>
                Duração total: <strong>{item.totalDuration ?? '–'}</strong>
              </span>
            </footer>
          </article>
        )}
      />
    </Layout>
  );
}

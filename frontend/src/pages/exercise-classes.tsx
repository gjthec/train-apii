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
        <title>Onemorerep - Aulas</title>
      </Head>
      {error ? <p className={styles.error}>{error}</p> : null}
      <ResourceList
        items={classes}
        emptyLabel="Nenhuma aula encontrada."
        renderItem={(item) => {
          const formattedDate = formatDateTime(item.createdAt);
          const sessionsCount = formatSessionsCount(item.sessions);

          return (
            <article className={styles.card}>
              <header className={styles.cardHeader}>
                <div>
                  <h3 className={styles.cardTitle}>{item.name}</h3>
                  <time
                    className={styles.cardMeta}
                    dateTime={item.createdAt ?? undefined}
                  >
                    Criada em {formattedDate}
                  </time>
                </div>
                <span className={styles.cardBadge}>Sessões: {sessionsCount}</span>
              </header>
              {item.description ? (
                <p className={styles.cardDescription}>{item.description}</p>
              ) : null}
              <footer className={styles.cardFooter}>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Duração total</span>
                  <span className={styles.metaValue}>{item.totalDuration ?? '–'}</span>
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Código da aula</span>
                  <span className={styles.metaValue}>{item.id ?? '–'}</span>
                </div>
              </footer>
            </article>
          );
        }}
      />
    </Layout>
  );
}

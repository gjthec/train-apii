'use client';

import Head from 'next/head';
import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import ResourceList from '@/components/ResourceList';
import { fetchSessions, type Session } from '@/lib/api';
import styles from '@/styles/Sessions.module.css';

const formatDateTime = (value?: string): string => {
  if (!value) {
    return '–';
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '–' : date.toLocaleString('pt-BR');
};

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    fetchSessions()
      .then((data) => {
        if (!isMounted) return;
        setSessions(data);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        const message = err instanceof Error ? err.message : 'Não foi possível carregar as sessões.';
        setError(message);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <Layout title="Sessões" description="Sessões planejadas para cada aula e treino.">
      <Head>
        <title>Onemorerep - Sessões</title>
      </Head>
      {error ? <p className={styles.error}>{error}</p> : null}
      <ResourceList
        items={sessions}
        emptyLabel="Nenhuma sessão cadastrada."
        renderItem={(item) => (
          <article className={styles.card}>
            <header className={styles.cardHeader}>
              <div>
                <h3 className={styles.cardTitle}>{item.title}</h3>
                {item.description ? (
                  <p className={styles.cardDescription}>{item.description}</p>
                ) : null}
              </div>
              {item.status ? <span className={styles.status}>{item.status}</span> : null}
            </header>
            <dl className={styles.metrics}>
              <div className={styles.metricItem}>
                <dt className={styles.metricLabel}>Data</dt>
                <dd className={styles.metricValue}>{formatDateTime(item.start)}</dd>
              </div>
              <div className={styles.metricItem}>
                <dt className={styles.metricLabel}>Duração</dt>
                <dd className={styles.metricValue}>{item.duration ?? '–'}</dd>
              </div>
              <div className={styles.metricItem}>
                <dt className={styles.metricLabel}>Aula</dt>
                <dd className={styles.metricValue}>{item.className ?? '–'}</dd>
              </div>
            </dl>
          </article>
        )}
      />
    </Layout>
  );
}

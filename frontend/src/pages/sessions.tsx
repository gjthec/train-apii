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
          <article>
            <header className={styles.cardHeader}>
              <h3>{item.title}</h3>
              {item.status ? <span>{item.status}</span> : null}
            </header>
            {item.description ? <p>{item.description}</p> : null}
            <dl className={styles.metrics}>
              <div>
                <dt>Data</dt>
                <dd>{formatDateTime(item.start)}</dd>
              </div>
              <div>
                <dt>Duração</dt>
                <dd>{item.duration ?? '–'}</dd>
              </div>
              <div>
                <dt>Aula</dt>
                <dd>{item.className ?? '–'}</dd>
              </div>
            </dl>
          </article>
        )}
      />
    </Layout>
  );
}

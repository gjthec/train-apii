import { useEffect, useState } from 'react';
import Head from 'next/head';
import Layout from '@/components/Layout';
import ResourceList from '@/components/ResourceList';
import { fetchSessions } from '@/lib/api';
import styles from '@/styles/Sessions.module.css';

export default function SessionsPage() {
  const [sessions, setSessions] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSessions()
      .then((data) => setSessions(data))
      .catch((err) => setError(err.message));
  }, []);

  return (
    <Layout
      title="Sessões"
      description="Sessões planejadas para cada aula e treino."
    >
      <Head>
        <title>Train API - Sessões</title>
      </Head>
      {error ? <p className={styles.error}>{error}</p> : null}
      <ResourceList
        items={sessions}
        emptyLabel="Nenhuma sessão cadastrada."
        renderItem={(item) => (
          <article>
            <header className={styles.cardHeader}>
              <h3>{item.title}</h3>
              <span>{item.status}</span>
            </header>
            <p>{item.description}</p>
            <dl className={styles.metrics}>
              <div>
                <dt>Data</dt>
                <dd>{item.start ? new Date(item.start).toLocaleString('pt-BR') : '–'}</dd>
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

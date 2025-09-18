import { useEffect, useState } from 'react';
import Head from 'next/head';
import Layout from '@/components/Layout';
import ResourceList from '@/components/ResourceList';
import { fetchExerciseClasses } from '@/lib/api';
import styles from '@/styles/ExerciseClasses.module.css';

export default function ExerciseClassesPage() {
  const [classes, setClasses] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchExerciseClasses()
      .then((data) => setClasses(data))
      .catch((err) => setError(err.message));
  }, []);

  return (
    <Layout
      title="Aulas do aluno"
      description="Lista das aulas obtidas via API de backend."
    >
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
              <time>{new Date(item.createdAt).toLocaleString('pt-BR')}</time>
            </header>
            <p>{item.description}</p>
            <footer className={styles.cardFooter}>
              <span>
                Sessões: <strong>{item.sessions?.length ?? 0}</strong>
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

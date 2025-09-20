'use client';

import Head from 'next/head';
import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import ResourceList from '@/components/ResourceList';
import { fetchWorkouts, type Workout } from '@/lib/api';
import styles from '@/styles/Workouts.module.css';

export default function WorkoutsPage() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    fetchWorkouts()
      .then((data) => {
        if (!isMounted) return;
        setWorkouts(data);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        const message = err instanceof Error ? err.message : 'Não foi possível carregar os treinos.';
        setError(message);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <Layout title="Treinos" description="Treinos montados com base nos dados recebidos da API.">
      <Head>
        <title>Train API - Treinos</title>
      </Head>
      {error ? <p className={styles.error}>{error}</p> : null}
      <ResourceList
        items={workouts}
        emptyLabel="Nenhum treino cadastrado."
        renderItem={(item) => (
          <article>
            <header className={styles.cardHeader}>
              <div>
                <h3>{item.name}</h3>
                {item.focus ? <p>{item.focus}</p> : null}
              </div>
              {item.difficulty ? <span className={styles.difficulty}>{item.difficulty}</span> : null}
            </header>
            <p className={styles.metrics}>
              Exercícios: <strong>{item.exerciseCount ?? '–'}</strong> · Duração:{' '}
              <strong>{item.estimatedDuration ?? '–'}</strong>
            </p>
            {item.summary ? <p>{item.summary}</p> : null}
          </article>
        )}
      />
    </Layout>
  );
}

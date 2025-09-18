import { useEffect, useState } from 'react';
import Head from 'next/head';
import Layout from '@/components/Layout';
import ResourceList from '@/components/ResourceList';
import { fetchWorkouts } from '@/lib/api';
import styles from '@/styles/Workouts.module.css';

export default function WorkoutsPage() {
  const [workouts, setWorkouts] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchWorkouts()
      .then((data) => setWorkouts(data))
      .catch((err) => setError(err.message));
  }, []);

  return (
    <Layout
      title="Treinos"
      description="Treinos montados com base nos dados recebidos da API."
    >
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
                <p>{item.focus}</p>
              </div>
              <span className={styles.difficulty}>{item.difficulty}</span>
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

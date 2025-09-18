import { useEffect, useState } from 'react';
import Head from 'next/head';
import Layout from '@/components/Layout';
import ResourceList from '@/components/ResourceList';
import { fetchExercises } from '@/lib/api';
import styles from '@/styles/Exercises.module.css';

export default function ExercisesPage() {
  const [exercises, setExercises] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchExercises()
      .then((data) => setExercises(data))
      .catch((err) => setError(err.message));
  }, []);

  return (
    <Layout
      title="Exercícios"
      description="Detalhes dos exercícios disponíveis para montar os treinos."
    >
      <Head>
        <title>Train API - Exercícios</title>
      </Head>
      {error ? <p className={styles.error}>{error}</p> : null}
      <ResourceList
        items={exercises}
        emptyLabel="Nenhum exercício cadastrado."
        renderItem={(item) => (
          <article>
            <header className={styles.cardHeader}>
              <div>
                <h3>{item.name}</h3>
                <p>{item.muscleGroup}</p>
              </div>
              <span className={styles.modality}>{item.modality}</span>
            </header>
            <p>{item.description}</p>
            <dl className={styles.metrics}>
              <div>
                <dt>Equipamento</dt>
                <dd>{item.equipment ?? 'Livre'}</dd>
              </div>
              <div>
                <dt>Séries x Repetições</dt>
                <dd>
                  {item.sets ?? '–'} x {item.repetitions ?? '–'}
                </dd>
              </div>
              <div>
                <dt>Descanso</dt>
                <dd>{item.rest ?? '–'}</dd>
              </div>
            </dl>
          </article>
        )}
      />
    </Layout>
  );
}

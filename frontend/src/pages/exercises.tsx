'use client';

import Head from 'next/head';
import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import ResourceList from '@/components/ResourceList';
import { fetchExercises, type Exercise } from '@/lib/api';
import styles from '@/styles/Exercises.module.css';

const formatNullableNumber = (value?: number): string => (typeof value === 'number' ? String(value) : '–');

export default function ExercisesPage() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    fetchExercises()
      .then((data) => {
        if (!isMounted) return;
        setExercises(data);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        const message = err instanceof Error ? err.message : 'Não foi possível carregar os exercícios.';
        setError(message);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <Layout title="Exercícios" description="Detalhes dos exercícios disponíveis para montar os treinos.">
      <Head>
        <title>Onemorerep - Exercícios</title>
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
                {item.muscleGroup ? <p>{item.muscleGroup}</p> : null}
              </div>
              {item.modality ? <span className={styles.modality}>{item.modality}</span> : null}
            </header>
            {item.description ? <p>{item.description}</p> : null}
            <dl className={styles.metrics}>
              <div>
                <dt>Equipamento</dt>
                <dd>{item.equipment ?? 'Livre'}</dd>
              </div>
              <div>
                <dt>Séries x Repetições</dt>
                <dd>
                  {formatNullableNumber(item.sets)} x {formatNullableNumber(item.repetitions)}
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

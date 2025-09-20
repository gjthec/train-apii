'use client';

import Head from 'next/head';
import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import WorkoutClassForm from '@/components/workouts/WorkoutClassForm';
import WorkoutClassList from '@/components/workouts/WorkoutClassList';
import {
  createWorkoutClass,
  fetchWorkoutClasses,
  type NewWorkoutClassInput,
  type WorkoutClass
} from '@/lib/api';
import styles from '@/styles/Workouts.module.css';

export default function WorkoutsPage() {
  const [workouts, setWorkouts] = useState<WorkoutClass[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    fetchWorkoutClasses()
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

  const handleCreateWorkout = async (input: NewWorkoutClassInput) => {
    setError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      const newWorkout = await createWorkoutClass(input);
      setWorkouts((previous) => [newWorkout, ...previous]);
      setSuccessMessage('Treino do dia cadastrado com sucesso!');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Não foi possível salvar o treino.';
      setError(message);
      throw (err instanceof Error ? err : new Error(message));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout title="Treinos" description="Cadastre e acompanhe seus treinos diários personalizados.">
      <Head>
        <title>Train API - Treinos</title>
      </Head>
      <section className={styles.formSection}>
        <WorkoutClassForm onSubmit={handleCreateWorkout} isSubmitting={isSubmitting} />
        {successMessage ? <p className={styles.success}>{successMessage}</p> : null}
        {error ? <p className={styles.error}>{error}</p> : null}
      </section>
      <section>
        <WorkoutClassList classes={workouts} emptyLabel="Nenhum treino cadastrado." />
      </section>
    </Layout>
  );
}

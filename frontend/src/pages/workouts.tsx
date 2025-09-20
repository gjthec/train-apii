'use client';

import Head from 'next/head';
import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import ResourceList from '@/components/ResourceList';
import { createWorkout, fetchWorkouts, type Workout } from '@/lib/api';
import styles from '@/styles/Workouts.module.css';

type FieldChangeEvent = {
  target: {
    name: string;
    value: string;
  };
};

type FormSubmitEvent = {
  preventDefault: () => void;
};

export default function WorkoutsPage() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formValues, setFormValues] = useState({
    name: '',
    focus: '',
    difficulty: '',
    exerciseCount: '',
    estimatedDuration: '',
    summary: ''
  });

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

  const handleInputChange = (event: FieldChangeEvent) => {
    const { name, value } = event.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: FormSubmitEvent) => {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    const exerciseCount = Number.parseInt(formValues.exerciseCount, 10);

    try {
      const newWorkout = await createWorkout({
        name: formValues.name,
        focus: formValues.focus,
        difficulty: formValues.difficulty,
        exerciseCount: Number.isNaN(exerciseCount) ? undefined : exerciseCount,
        estimatedDuration: formValues.estimatedDuration,
        summary: formValues.summary
      });

      setWorkouts((prev) => [newWorkout, ...prev]);
      setSuccessMessage('Treino cadastrado com sucesso!');
      setFormValues({
        name: '',
        focus: '',
        difficulty: '',
        exerciseCount: '',
        estimatedDuration: '',
        summary: ''
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Não foi possível salvar o treino.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout title="Treinos" description="Treinos montados com base nos dados recebidos da API.">
      <Head>
        <title>Train API - Treinos</title>
      </Head>
      <section className={styles.formSection}>
        <h2>Novo treino</h2>
        <p>Cadastre treinos personalizados que ficam disponíveis apenas para o seu usuário.</p>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.fieldGroup}>
            <label htmlFor="name">Nome *</label>
            <input
              id="name"
              name="name"
              value={formValues.name}
              onChange={handleInputChange}
              placeholder="Ex.: Treino de Força"
              required
            />
          </div>
          <div className={styles.inlineFields}>
            <div className={styles.fieldGroup}>
              <label htmlFor="focus">Foco</label>
              <input
                id="focus"
                name="focus"
                value={formValues.focus}
                onChange={handleInputChange}
                placeholder="Ex.: Membros superiores"
              />
            </div>
            <div className={styles.fieldGroup}>
              <label htmlFor="difficulty">Dificuldade</label>
              <select
                id="difficulty"
                name="difficulty"
                value={formValues.difficulty}
                onChange={handleInputChange}
              >
                <option value="">Selecione</option>
                <option value="Iniciante">Iniciante</option>
                <option value="Intermediário">Intermediário</option>
                <option value="Avançado">Avançado</option>
              </select>
            </div>
          </div>
          <div className={styles.inlineFields}>
            <div className={styles.fieldGroup}>
              <label htmlFor="exerciseCount">Quantidade de exercícios</label>
              <input
                id="exerciseCount"
                name="exerciseCount"
                inputMode="numeric"
                pattern="[0-9]*"
                value={formValues.exerciseCount}
                onChange={handleInputChange}
                placeholder="Ex.: 6"
              />
            </div>
            <div className={styles.fieldGroup}>
              <label htmlFor="estimatedDuration">Duração estimada</label>
              <input
                id="estimatedDuration"
                name="estimatedDuration"
                value={formValues.estimatedDuration}
                onChange={handleInputChange}
                placeholder="Ex.: 45 minutos"
              />
            </div>
          </div>
          <div className={styles.fieldGroup}>
            <label htmlFor="summary">Resumo</label>
            <textarea
              id="summary"
              name="summary"
              value={formValues.summary}
              onChange={handleInputChange}
              placeholder="Inclua instruções gerais sobre o treino."
              rows={3}
            />
          </div>
          <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
            {isSubmitting ? 'Salvando...' : 'Cadastrar treino'}
          </button>
        </form>
        {successMessage ? <p className={styles.success}>{successMessage}</p> : null}
        {error ? <p className={styles.error}>{error}</p> : null}
      </section>
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

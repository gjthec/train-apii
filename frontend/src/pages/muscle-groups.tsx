'use client';

import Head from 'next/head';
import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import ResourceList from '@/components/ResourceList';
import {
  createMuscleGroupClass,
  fetchMuscleGroupClasses,
  type MuscleGroupClass,
  type NewMuscleGroupClassInput
} from '@/lib/api';
import styles from '@/styles/MuscleGroups.module.css';

interface MuscleGroupFormState {
  name: string;
  description: string;
}

type FormEvent = { preventDefault: () => void };
type InputEvent = { target: { value: string } };

const formatDate = (value?: string): string => {
  if (!value) {
    return '–';
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '–' : date.toLocaleString('pt-BR');
};

export default function MuscleGroupsPage() {
  const [groups, setGroups] = useState<MuscleGroupClass[]>([]);
  const [formState, setFormState] = useState<MuscleGroupFormState>({ name: '', description: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadGroups = async () => {
      try {
        const data = await fetchMuscleGroupClasses();
        if (!isMounted) return;
        setGroups(data);
        setError(null);
      } catch (err) {
        if (!isMounted) return;
        const message = err instanceof Error ? err.message : 'Não foi possível carregar os grupos musculares.';
        setError(message);
      }
    };

    void loadGroups();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleChange = (field: keyof MuscleGroupFormState) => (event: InputEvent) => {
    setFormState((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    const payload: NewMuscleGroupClassInput = {
      name: formState.name,
      description: formState.description
    };

    try {
      const newGroup = await createMuscleGroupClass(payload);
      setGroups((prev) => [newGroup, ...prev]);
      setFormState({ name: '', description: '' });
      setSuccessMessage('Grupo muscular cadastrado com sucesso!');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Não foi possível cadastrar o grupo muscular.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout
      title="Grupos musculares"
      description="Cadastre e organize os grupos musculares utilizados nos seus treinos."
    >
      <Head>
        <title>Train API - Grupos musculares</title>
      </Head>
      <section className={styles.formSection}>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.fieldGroup}>
            <label htmlFor="muscle-group-name">Nome *</label>
            <input
              id="muscle-group-name"
              value={formState.name}
              onChange={handleChange('name')}
              placeholder="Ex.: Peito, Costas, Quadríceps"
              required
            />
          </div>
          <div className={styles.fieldGroup}>
            <label htmlFor="muscle-group-description">Descrição</label>
            <textarea
              id="muscle-group-description"
              value={formState.description}
              onChange={handleChange('description')}
              placeholder="Observações sobre exercícios relacionados, variações, etc."
              rows={3}
            />
          </div>
          <div className={styles.actions}>
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : 'Cadastrar grupo'}
            </button>
          </div>
        </form>
        {successMessage ? <p className={styles.success}>{successMessage}</p> : null}
        {error ? <p className={styles.error}>{error}</p> : null}
      </section>

      <section>
        <ResourceList
          items={groups}
          emptyLabel="Nenhum grupo muscular cadastrado."
          renderItem={(group) => (
            <article className={styles.card}>
              <header className={styles.cardHeader}>
                <h3>{group.name}</h3>
                <time>{formatDate(group.createdAt)}</time>
              </header>
              {group.description ? <p className={styles.cardDescription}>{group.description}</p> : null}
            </article>
          )}
        />
      </section>
    </Layout>
  );
}

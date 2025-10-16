'use client';

import Head from 'next/head';
import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import ResourceList from '@/components/ResourceList';
import {
  createMuscleGroupClass,
  deleteMuscleGroupClass,
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

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
});

const formatDate = (value?: string): string => {
  if (!value) {
    return '–';
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '–' : dateFormatter.format(date);
};

export default function MuscleGroupsPage() {
  const [groups, setGroups] = useState<MuscleGroupClass[]>([]);
  const [formState, setFormState] = useState<MuscleGroupFormState>({ name: '', description: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(() => new Set());

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

  const handleDeleteGroup = async (group: MuscleGroupClass) => {
    if (!group.id) {
      return;
    }

    if (typeof window !== 'undefined') {
      const confirmed = window.confirm(`Deseja realmente excluir o grupo "${group.name}"?`);
      if (!confirmed) {
        return;
      }
    }

    setError(null);
    setSuccessMessage(null);
    setDeletingIds((previous) => {
      const next = new Set(previous);
      next.add(group.id);
      return next;
    });

    try {
      await deleteMuscleGroupClass(group.id);
      setGroups((prev) => prev.filter((item) => item.id !== group.id));
      setSuccessMessage('Grupo muscular removido com sucesso.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Não foi possível remover o grupo muscular.';
      setError(message);
    } finally {
      setDeletingIds((previous) => {
        const next = new Set(previous);
        next.delete(group.id);
        return next;
      });
    }
  };

  return (
    <Layout
      title="Grupos musculares"
      description="Cadastre e organize os grupos musculares utilizados nos seus treinos."
    >
      <Head>
        <title>Onemorerep - Grupos musculares</title>
      </Head>
      <div className={styles.page}>
        <section className={styles.formSection}>
          <header className={styles.sectionHeader}>
            <h2>Cadastre um grupo muscular</h2>
            <p>Mantenha a biblioteca de treinos organizada com nomes claros e descrições objetivas.</p>
          </header>
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
            <div className={`${styles.fieldGroup} ${styles.fullWidth}`}>
              <label htmlFor="muscle-group-description">Descrição</label>
              <textarea
                id="muscle-group-description"
                value={formState.description}
                onChange={handleChange('description')}
                placeholder="Detalhes opcionais para orientar o time"
                rows={3}
              />
            </div>
            <div className={`${styles.actions} ${styles.fullWidth}`}>
              <button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Salvando...' : 'Adicionar grupo'}
              </button>
            </div>
          </form>
          {successMessage ? (
            <p className={`${styles.statusMessage} ${styles.success}`} role="status" aria-live="polite">
              {successMessage}
            </p>
          ) : null}
          {error ? (
            <p className={`${styles.statusMessage} ${styles.error}`} role="alert" aria-live="assertive">
              {error}
            </p>
          ) : null}
        </section>

        <section className={styles.listSection}>
          <header className={styles.sectionHeader}>
            <div>
              <h2>Grupos cadastrados</h2>
              <p>Revise ou remova grupos existentes sempre que necessário.</p>
            </div>
            <span className={styles.countBadge}>{groups.length}</span>
          </header>
          <ResourceList
            items={groups}
            emptyLabel="Nenhum grupo muscular cadastrado."
            renderItem={(group) => (
              <article className={styles.card}>
                <header className={styles.cardHeader}>
                  <h3>{group.name}</h3>
                  <time dateTime={group.updatedAt ?? group.createdAt}>
                    Atualizado {formatDate(group.updatedAt ?? group.createdAt)}
                  </time>
                </header>
                {group.description ? (
                  <p className={styles.cardDescription}>{group.description}</p>
                ) : (
                  <p className={`${styles.cardDescription} ${styles.muted}`}>
                    Nenhuma descrição informada.
                  </p>
                )}
                <footer className={styles.cardFooter}>
                  <button
                    type="button"
                    onClick={() => handleDeleteGroup(group)}
                    disabled={deletingIds.has(group.id)}
                  >
                    {deletingIds.has(group.id) ? 'Excluindo...' : 'Excluir'}
                  </button>
                </footer>
              </article>
            )}
          />
        </section>
      </div>
    </Layout>
  );
}

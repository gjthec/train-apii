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
          <header className={styles.formHeader}>
            <span className={styles.formEyebrow}>Novo cadastro</span>
            <div className={styles.formTitleWrapper}>
              <h3 className={styles.formTitle}>Adicionar grupo muscular</h3>
              <p className={styles.formSubtitle}>Preencha os campos abaixo para registrar um grupo.</p>
            </div>
            <p className={styles.formDescription}>
              Organize seus treinos mantendo um catálogo atualizado de grupos musculares. Informe
              um nome claro e adicione observações importantes para o time.
            </p>
          </header>
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.fieldGroup}>
              <label htmlFor="muscle-group-name">Nome *</label>
              <p id="muscle-group-name-hint" className={styles.fieldHint}>
                Utilize um nome objetivo. Ele aparecerá nos planos de treino e relatórios.
              </p>
              <input
                id="muscle-group-name"
                value={formState.name}
                onChange={handleChange('name')}
                placeholder="Ex.: Peito, Costas, Quadríceps"
                aria-describedby="muscle-group-name-hint"
                required
              />
            </div>
            <div className={`${styles.fieldGroup} ${styles.fullWidth}`}>
              <label htmlFor="muscle-group-description">Descrição</label>
              <p id="muscle-group-description-hint" className={styles.fieldHint}>
                Compartilhe detalhes úteis para a equipe, como exercícios sugeridos ou alertas.
              </p>
              <textarea
                id="muscle-group-description"
                value={formState.description}
                onChange={handleChange('description')}
                placeholder="Observações sobre exercícios relacionados, variações, etc."
                aria-describedby="muscle-group-description-hint"
                rows={3}
              />
            </div>
            <footer className={`${styles.actions} ${styles.fullWidth}`}>
              <button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Salvando...' : 'Cadastrar grupo'}
              </button>
              <span className={styles.actionsHint}>Campos obrigatórios estão sinalizados com “*”.</span>
            </footer>
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
          <header className={styles.listHeader}>
            <div className={styles.listHeaderContent}>
              <span className={styles.listEyebrow}>Grupos cadastrados</span>
              <h3>Gerencie sua base de conhecimento</h3>
              <p>
                Revise, atualize ou remova rapidamente os grupos musculares para manter o material
                de treino alinhado.
              </p>
            </div>
            <dl className={styles.listStats}>
              <div>
                <dt>Total ativos</dt>
                <dd>{groups.length}</dd>
              </div>
              <div>
                <dt>Atualizado em</dt>
                <dd>
                  {formatDate(groups.length > 0 ? groups[0]?.updatedAt ?? groups[0]?.createdAt : undefined)}
                </dd>
              </div>
            </dl>
          </header>
          <ResourceList
            items={groups}
            emptyLabel="Nenhum grupo muscular cadastrado."
            renderItem={(group) => (
              <article className={styles.card}>
                <header className={styles.cardHeader}>
                  <div>
                    <span className={styles.cardEyebrow}>Grupo muscular</span>
                    <h4>{group.name}</h4>
                  </div>
                  <time className={styles.cardMeta}>{formatDate(group.updatedAt ?? group.createdAt)}</time>
                </header>
                <div className={styles.cardBody}>
                  {group.description ? (
                    <p className={styles.cardDescription}>{group.description}</p>
                  ) : (
                    <p className={`${styles.cardDescription} ${styles.cardDescriptionMuted}`}>
                      Nenhuma descrição adicional cadastrada.
                    </p>
                  )}
                  <dl className={styles.cardMetaList}>
                    <div>
                      <dt>Criado em</dt>
                      <dd>{formatDate(group.createdAt)}</dd>
                    </div>
                    <div>
                      <dt>Atualizado em</dt>
                      <dd>{formatDate(group.updatedAt)}</dd>
                    </div>
                  </dl>
                </div>
                <footer className={styles.cardActions}>
                  <button
                    type="button"
                    className={styles.deleteButton}
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

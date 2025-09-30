'use client';

import Head from 'next/head';
import Link from 'next/link';
import { FormEvent, useCallback, useState } from 'react';
import { useRouter } from 'next/router';

import { addRegisteredAccount } from '@/lib/localAccounts';

import styles from '@/styles/Register.module.css';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setError(null);

      const trimmedName = name.trim();
      const trimmedEmail = email.trim();

      if (!trimmedName || !trimmedEmail) {
        setError('Preencha nome e e-mail para cadastrar a conta.');
        return;
      }

      setIsSubmitting(true);
      try {
        addRegisteredAccount({ name: trimmedName, email: trimmedEmail });
        await router.push({ pathname: '/login', query: { registered: '1' } });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Não foi possível cadastrar a conta.';
        setError(message);
      } finally {
        setIsSubmitting(false);
      }
    },
    [name, email, router]
  );

  return (
    <div className={styles.page}>
      <Head>
        <title>Train API - Cadastrar conta</title>
      </Head>
      <div className={styles.backdrop} aria-hidden />
      <main className={styles.container}>
        <header className={styles.header}>
          <span className={styles.logoMark}>Train API</span>
          <h1 className={styles.title}>Cadastrar nova conta</h1>
          <p className={styles.subtitle}>
            Informe seus dados para deixar a conta salva e acessá-la facilmente na tela de
            login.
          </p>
        </header>

        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Nome completo</span>
            <input
              type="text"
              name="name"
              autoComplete="name"
              placeholder="Ex.: Ana Souza"
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={isSubmitting}
              className={styles.fieldInput}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>E-mail</span>
            <input
              type="email"
              name="email"
              autoComplete="email"
              placeholder="Ex.: ana@exemplo.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={isSubmitting}
              className={styles.fieldInput}
            />
          </label>

          {error ? <p className={styles.errorMessage}>{error}</p> : null}

          <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
            {isSubmitting ? 'Cadastrando...' : 'Salvar conta'}
          </button>
        </form>

        <div className={styles.footerActions}>
          <Link href="/login" className={styles.backLink}>
            Voltar para login
          </Link>
        </div>
      </main>
    </div>
  );
}

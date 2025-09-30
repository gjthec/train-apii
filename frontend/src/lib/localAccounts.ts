export interface RegisteredAccount {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export const REGISTERED_ACCOUNTS_STORAGE_KEY = 'train-api.registeredAccounts';

const parseAccounts = (raw: string | null): RegisteredAccount[] => {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((entry) => {
        if (!entry || typeof entry !== 'object') {
          return null;
        }

        const { id, name, email, createdAt } = entry as Partial<RegisteredAccount>;
        if (
          typeof id !== 'string' ||
          typeof name !== 'string' ||
          typeof email !== 'string' ||
          typeof createdAt !== 'string'
        ) {
          return null;
        }

        return { id, name, email, createdAt } satisfies RegisteredAccount;
      })
      .filter((entry): entry is RegisteredAccount => Boolean(entry));
  } catch (error) {
    console.warn('Não foi possível interpretar as contas cadastradas.', error);
    return [];
  }
};

export const loadRegisteredAccounts = (): RegisteredAccount[] => {
  if (typeof window === 'undefined') {
    return [];
  }

  const raw = window.localStorage.getItem(REGISTERED_ACCOUNTS_STORAGE_KEY);
  return parseAccounts(raw);
};

const saveRegisteredAccounts = (accounts: RegisteredAccount[]) => {
  if (typeof window === 'undefined') {
    throw new Error('O ambiente atual não suporta armazenamento local.');
  }

  window.localStorage.setItem(
    REGISTERED_ACCOUNTS_STORAGE_KEY,
    JSON.stringify(accounts)
  );
};

const generateAccountId = (): string => {
  if (typeof globalThis.crypto !== 'undefined' && 'randomUUID' in globalThis.crypto) {
    return globalThis.crypto.randomUUID();
  }

  return `account-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const addRegisteredAccount = (input: { name: string; email: string }): RegisteredAccount => {
  const name = input.name.trim();
  const email = input.email.trim();

  if (!name || !email) {
    throw new Error('Nome e e-mail são obrigatórios para cadastrar uma conta.');
  }

  const accounts = loadRegisteredAccounts();
  const newAccount: RegisteredAccount = {
    id: generateAccountId(),
    name,
    email,
    createdAt: new Date().toISOString()
  };

  const nextAccounts = [...accounts, newAccount];

  try {
    saveRegisteredAccounts(nextAccounts);
  } catch (error) {
    console.error('Falha ao salvar a nova conta cadastrada.', error);
    throw new Error('Não foi possível salvar a conta cadastrada.');
  }

  return newAccount;
};

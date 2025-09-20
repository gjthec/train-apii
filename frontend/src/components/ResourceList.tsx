'use client';

import type { ReactNode } from 'react';
import styles from '@/styles/ResourceList.module.css';

type Identifiable = {
  id?: string;
  documentId?: string;
  slug?: string;
  name?: string;
};

const getKey = <T extends Identifiable>(item: T, index: number): string => {
  if (item.id) return item.id;
  if (item.documentId) return item.documentId;
  if (item.slug) return item.slug;
  if (item.name) return `${item.name}-${index}`;
  return `item-${index}`;
};

interface ResourceListProps<T extends Identifiable> {
  items: readonly T[];
  renderItem: (item: T) => ReactNode;
  emptyLabel: string;
}

export default function ResourceList<T extends Identifiable>({
  items,
  renderItem,
  emptyLabel
}: ResourceListProps<T>) {
  if (items.length === 0) {
    return <p className={styles.emptyState}>{emptyLabel}</p>;
  }

  return (
    <ul className={styles.list}>
      {items.map((item, index) => (
        <li key={getKey(item, index)} className={styles.listItem}>
          {renderItem(item)}
        </li>
      ))}
    </ul>
  );
}

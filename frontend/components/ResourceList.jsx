import styles from '@/styles/ResourceList.module.css';

const getKey = (item, index) => item.id ?? item.documentId ?? item.slug ?? `${item.name ?? 'item'}-${index}`;

export default function ResourceList({ items, renderItem, emptyLabel }) {
  if (!items.length) {
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

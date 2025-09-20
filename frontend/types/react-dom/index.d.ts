declare module 'react-dom' {
  import type { ReactNode, ReactPortal } from 'react';
  export function createPortal(children: ReactNode, container: Element | DocumentFragment): ReactPortal;
  export function render(children: ReactNode, container: Element | DocumentFragment | null): void;
  export function hydrate(children: ReactNode, container: Element | DocumentFragment | null): void;
}

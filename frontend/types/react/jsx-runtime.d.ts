declare module 'react/jsx-runtime' {
  export namespace JSX {
    type Element = import('react').ReactElement;
    interface IntrinsicElements {
      [elemName: string]: Record<string, unknown>;
    }
  }
}

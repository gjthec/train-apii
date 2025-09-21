declare namespace React {
  type Key = string | number;
  type ReactText = string | number;
  type ReactFragment = Iterable<ReactNode>;
  interface ReactPortal {
    key: Key | null;
    children: ReactNode;
  }
  interface ReactElement<P = unknown, T = unknown> {
    type: T;
    props: P;
    key: Key | null;
  }
  type ReactNode = ReactElement | ReactText | ReactFragment | ReactPortal | boolean | null | undefined;
  interface Attributes {
    key?: Key | null;
  }
  interface ClassAttributes<T> extends Attributes {
    ref?: Ref<T>;
  }
  interface RefObject<T> {
    readonly current: T | null;
  }
  type MutableRefObject<T> = { current: T };
  type RefCallback<T> = (instance: T | null) => void;
  type Ref<T> = RefCallback<T> | RefObject<T> | null | undefined;
  type Dispatch<A> = (value: A) => void;
  type SetStateAction<S> = S | ((prevState: S) => S);
  interface FunctionComponent<P = Record<string, unknown>> {
    (props: P & { children?: ReactNode }): ReactElement | null;
    displayName?: string;
  }
  type FC<P = Record<string, unknown>> = FunctionComponent<P>;
  type PropsWithChildren<P = Record<string, unknown>> = P & { children?: ReactNode };
  type JSXElementConstructor<P> = ((props: P) => ReactElement | null) | (new (props: P) => unknown);
  type ComponentType<P = Record<string, unknown>> = (props: P & { children?: ReactNode }) => ReactElement | null;
  type ComponentProps<T extends JSXElementConstructor<unknown>> = T extends JSXElementConstructor<infer P> ? P : never;
  type ComponentPropsWithRef<T extends JSXElementConstructor<unknown>> = ComponentProps<T> & { ref?: Ref<unknown> };
  type PromiseLikeOfReactNode = PromiseLike<ReactNode>;
  type PropsWithoutRef<P> = P;
  type PropsWithRef<P> = P & { ref?: Ref<unknown> };
  interface RefAttributes<T> {
    ref?: Ref<T>;
  }
  type ForwardRefRenderFunction<T, P> = (props: P, ref: Ref<T>) => ReactElement | null;
  interface ForwardRefExoticComponent<P> {
    (props: PropsWithChildren<P>): ReactElement | null;
    defaultProps?: Partial<P>;
    displayName?: string;
  }
  function forwardRef<T, P>(render: ForwardRefRenderFunction<T, P>): ForwardRefExoticComponent<P & RefAttributes<T>>;
  interface DOMAttributes<T> {
    onClick?: (event: unknown) => void;
    onMouseEnter?: MouseEventHandler<T>;
    onTouchStart?: TouchEventHandler<T>;
    [key: string]: unknown;
  }
  interface CSSProperties {
    [property: string]: string | number | undefined;
  }
  interface HTMLAttributes<T> extends DOMAttributes<T> {
    className?: string;
    id?: string;
    style?: CSSProperties;
    title?: string;
  }
  interface ImgHTMLAttributes<T> extends HTMLAttributes<T> {
    alt?: string;
    src?: string;
    width?: number | string;
    height?: number | string;
    loading?: 'eager' | 'lazy';
    srcSet?: string;
    sizes?: string;
  }
  interface AnchorHTMLAttributes<T> extends HTMLAttributes<T> {
    href?: string;
    target?: string;
    rel?: string;
  }
  interface ScriptHTMLAttributes<T> extends HTMLAttributes<T> {
    async?: boolean;
    defer?: boolean;
    type?: string;
    src?: string;
    dangerouslySetInnerHTML?: { __html: string };
  }
  interface SyntheticEvent<T = Element> {
    target: T;
    currentTarget: T;
    preventDefault(): void;
    stopPropagation(): void;
  }
  interface MouseEvent<T = Element> extends SyntheticEvent<T> {}
  type MouseEventHandler<T = Element> = (event: MouseEvent<T>) => void;
  interface TouchEvent<T = Element> extends SyntheticEvent<T> {}
  type TouchEventHandler<T = Element> = (event: TouchEvent<T>) => void;
  type DetailedHTMLProps<E extends HTMLAttributes<T>, T> = E & RefAttributes<T>;
  class Component<P = Record<string, unknown>, S = Record<string, unknown>> {
    constructor(props: P);
    setState(state: Partial<S> | ((prevState: S, props: P) => Partial<S> | null)): void;
    forceUpdate(callback?: () => void): void;
    render(): ReactNode | PromiseLikeOfReactNode;
    props: Readonly<P & { children?: ReactNode }>;
    state: Readonly<S>;
  }
  function useState<S>(initialState: S | (() => S)): [S, Dispatch<SetStateAction<S>>];
  function useEffect(effect: () => void | (() => void), deps?: ReadonlyArray<unknown>): void;
  function useRef<T>(initialValue: T | null): MutableRefObject<T | null>;
  function useMemo<T>(factory: () => T, deps: ReadonlyArray<unknown> | undefined): T;
  function useCallback<T extends (...args: unknown[]) => unknown>(callback: T, deps: ReadonlyArray<unknown> | undefined): T;
  interface Context<T> {
    Provider: FunctionComponent<{ value: T }>;
    Consumer: FunctionComponent<{ children: (value: T) => ReactNode }>;
  }
  function createContext<T>(defaultValue: T): Context<T>;
  function createElement<P>(
    type: JSXElementConstructor<P> | string,
    props?: (P & { children?: ReactNode }) | null,
    ...children: ReactNode[]
  ): ReactElement<P>;
  const Fragment: unique symbol;
}

declare const React: {
  createElement: typeof React.createElement;
  Fragment: typeof React.Fragment;
};

export = React;
export as namespace React;

declare global {
  namespace JSX {
    type Element = React.ReactElement;
    interface IntrinsicAttributes extends React.Attributes {}
    interface IntrinsicClassAttributes<T> extends React.ClassAttributes<T> {}
    interface ElementChildrenAttribute {
      children: {};
    }
    interface IntrinsicElements {
      [elemName: string]: Record<string, unknown>;
    }
  }
}

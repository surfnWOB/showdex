/**
 * @file `ps-preact.d.ts` - Adapted from `pokemon-showdown-client/play.pokemonshowdown.com/js/lib/preact.d.ts`.
 * @author Keith Choison <keith@tize.io>
 * @author Guangcong Luo <guangcongluo@gmail.com>
 * @license AGPLv3
 * @since 1.2.6
 */

declare namespace Showdown {
  namespace Preact {
    type RenderableProps<
      TProps extends object = object,
    > = Readonly<TProps & React.Attributes>;

    interface FunctionalComponent<
      TProps extends object = object,
      TContext = object,
    > {
      (props: RenderableProps<TProps>, context: TContext): VNode;
      displayName?: string;
      defaultProps?: Partial<TProps>;
    }

    abstract class Component<
      TProps extends object = object,
      TState extends object = object,
      TContext = object,
      TRef = HTMLElement,
    > {
      public static displayName?: string;
      public static defaultProps?: TProps;

      public state: Readonly<TState>;
      public props: RenderableProps<TProps>;
      public context: TContext;
      public base?: TRef;

      public constructor(props?: TProps, context?: TContext): void;
      public componentWillMount?(): void;
      public componentDidMount?(): void;
      public componentWillReceiveProps?(nextProps: Readonly<TProps>): void;
      public shouldComponentUpdate?(nextProps: Readonly<TProps>, nextState: Readonly<TState>, nextContext: TContext): boolean;
      public componentWillUpdate?(nextProps: Readonly<TProps>, nextState: Readonly<TState>, nextContext: TContext): void;
      public componentDidUpdate?(prevProps: Readonly<TProps>, prevState: Readonly<TState>, prevContext: TContext): void;
      public componentWillUnmount?(): void;
      public getChildContext?(): TContext;
      public setState<K extends keyof TState>(
        state: ((prevState: Readonly<TState>, props: Readonly<TProps>) => (Pick<TState, K> | TState)) | (Pick<TState, K> | TState),
        callback?: () => void,
      ): void;
      public forceUpdate(callback?: () => void): void;
      public abstract render(
        props?: RenderableProps<TProps>,
        state?: Readonly<TState>,
        context?: TContext,
      ): JSX.Element | VNode | JSX.Element[] | VNode[];
    }

    interface ComponentConstructor<
      TProps extends object = object,
      TState extends object = object,
      TContext = object,
    > {
      new (props: RenderableProps<TProps>, context: TContext): Component<TProps, TState, TContext>;
      displayName?: string;
      defaultProps?: Partial<TProps>;
    }

    type ComponentFactory<TProps extends object = object> =
      | ComponentConstructor<TProps>
      | FunctionalComponent<TProps>;

    /** Preact virtual node. */
    interface VNode<TProps = unknown> {
      key?: string | number;
      nodeName: ComponentFactory<TProps> | string;
      attributes: TProps;
      children: (VNode | string)[];
    }

    function h<TProps extends object = object>(
      nodeName: ComponentFactory<TProps> | string,
      attributes?: React.Attributes & TProps,
      ...children: (VNode | string)[]
    ): VNode;
    function h(
      nodeName: string,
      params?: Record<string, unknown>,
      ...children: (VNode | string)[]
    ): VNode;

    function render(
      element: VNode | JSX.Element,
      container: Element | Document | ShadowRoot | DocumentFragment,
      mergeWith?: Element,
    ): Element;
    function rerender(): void;

    function cloneElement(element: JSX.Element, props?: unknown): JSX.Element;
    function createRef<TRef>(): React.RefObject<TRef>;

    interface Globals {
      Component: ComponentConstructor;
      Fragment: ComponentConstructor;
      cloneElement: typeof cloneElement;
      createElement: unknown;
      createRef: typeof createRef;
      h: typeof h;
      hydrate: unknown;
      isValidElement: unknown;
      options: Record<string, unknown>;
      render: typeof render;
      toChildArray: unknown;
    }
  }
}

/**
 * @file `ps-preact.d.ts` - Adapted from `pokemon-showdown-client/play.pokemonshowdown.com/js/lib/preact.d.ts`.
 * @author Keith Choison <keith@tize.io>
 * @author Guangcong Luo <guangcongluo@gmail.com>
 * @license AGPLv3
 * @since 1.2.6
 */

declare namespace Showdown {
  declare namespace Preact {
    type RenderableProps<
      TProps extends object = object,
    > = Readonly<TProps & React.Attributes>;

    abstract class Component<
      TProps extends object = object,
      TState extends object = object,
      TContext = unknown,
      TRef = HTMLElement,
    > {
      public static displayName?: string;
      public static defaultProps?: TProps;

      public state: Readonly<TState>;
      public props: RenderableProps<TProps>;
      public context: TContext;
      public base?: TRef;

      public constructor(props?: TProps, context?: TContext): void;
      public componentWillMount(): void;
      public componentDidMount(): void;
      public componentWillReceiveProps(nextProps: Readonly<TProps>): void;
      public shouldComponentUpdate(nextProps: Readonly<TProps>, nextState: Readonly<TState>, nextContext: TContext): boolean;
      public componentWillUpdate(nextProps: Readonly<TProps>, nextState: Readonly<TState>, nextContext: TContext): void;
      public componentDidUpdate(prevProps: Readonly<TProps>, prevState: Readonly<TState>, prevContext: TContext): void;
      public componentWillUnmount(): void;
      public setState<K extends keyof TState>(
        state: ((prevState: Readonly<TState>, props: Readonly<TProps>) => (Pick<TState, K> | TState)) | (Pick<TState, K> | TState),
        callback?: () => void,
      ): void;
      public forceUpdate(callback?: () => void): void;
      public abstract render(
        props?: RenderableProps<TProps>,
        state?: Readonly<TState>,
        context?: TContext,
      ): JSX.Element;
    }
  }
}

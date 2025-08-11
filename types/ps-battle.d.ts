/**
 * @file `ps-battle.d.ts` - Adapted from `pokemon-showdown-client/play.pokemonshowdown.com/src/panel-battle.tsx`.
 * @author Guangcong Luo <guangcongluo@gmail.com>
 * @author Keith Choison <keith@tize.io>
 * @license AGPLv3
 * @since 1.2.6
 */

/* eslint-disable max-classes-per-file */

declare namespace Showdown {
  class BattlesRoom extends PSRoom {
    public override readonly classType = 'battle' as const;
    /** `null` = still loading. */
    public formats = '';
    public filters = '';
    public battles: BattleDesc[] = [];

    public setFormat(format: string): void;
    public refresh(): void;
  }

  class BattlesPanel extends PSRoomPanel<BattlesRoom> {
    public static readonly id = 'battles' as const;
    public static readonly routes = ['battles'] as const;
    public static readonly model = BattlesRoom as const;
    public static readonly location = 'right' as const;
    public static readonly icon: JSX.Element;
    public static readonly title = 'Battles' as const;

    public refresh: () => void;
    public changeFormat: (event: Event) => void;
    public applyFilters: (event: Event) => void;

    public renderBattleLink(battle: BattleDesc): JSX.Element;
  }

  class BattleRoom extends ChatRoom {
    public readonly classType = 'battle' as const;
    public declare pmTarget: null;
    public declare challengeMenuOpen: false;
    public declare challengingFormat: null;
    public declare challengedFormat: null;
    public override battle: Battle;
    /** `null` if a spectator, otherwise the current player's info. */
    public side?: BattleRequestSideInfo = null;
    public request?: BattleRequest = null;
    public choices?: BattleChoiceBuilder = null;
    public autoTimerActivated?: boolean = null;

    public loadReplay(): void;
  }

  interface BattleDivProps {
    room: BattleRoom;
  }

  class BattleDiv extends Preact.Component<BattleDivProps> {
    public override shouldComponentUpdate(): false;
  }

  interface TimerButtonProps {
    room: BattleRoom;
  }

  class TimerButton extends Preact.Component<TimerButtonProps> {
    public timerInterval?: number = null;

    public secondsToTime(seconds: number | true): string;
  }

  class BattlePanel extends PSRoomPanel<BattleRoom> {
    public static readonly id = 'battle' as const;
    public static readonly routes = ['battle-*'] as const;
    public static readonly model = BattleRoom as const;

    /** Last displayed team. Won't show the most recent request until the last one is gone. */
    public team?: ServerPokemon[] = null;
    public battleHeight = 360;

    public static handleDrop(event: DragEvent): void;

    public send: (text: string, element?: HTMLElement) => void;
    public focusIfNoSelection: () => void;
    public onKey: (event: KeyboardEvent) => boolean;
    public toggleBoostedMove: (event: Event) => void;
    public handleDownloadReplay: (event: MouseEvent) => void;

    public updateLayout(): void;
    public receiveRequest(request?: BattleRequest): void;
    public notifyRequest(): void;
    public renderControls(): JSX.Element;
    public renderMoveButton(
      props?: {
        name: string;
        cmd: string;
        type: TypeName;
        tooltip: string;
        moveData: {
          pp?: number;
          maxpp?: number;
          disabled?: boolean;
        };
      },
    ): JSX.Element;
    public renderPokemonButton(
      props: {
        pokemon?: Pokemon | ServerPokemon;
        cmd: string;
        noHPBar?: boolean;
        disabled?: boolean | 'fade';
        tooltip: string;
      },
    ): JSX.Element;
    public renderMoveMenu(choices: BattleChoiceBuilder): JSX.Element;
    public renderMoveControls(active: BattleRequestActivePokemon, choices: BattleChoiceBuilder): JSX.Element[];
    public renderMoveTargetControls(request: BattleMoveRequest, choices: BattleChoiceBuilder): JSX.Element[];
    public renderSwitchMenu(
      request: BattleMoveRequest | BattleSwitchRequest,
      choices: BattleChoiceBuilder,
      ignoreTrapping?: boolean,
    ): JSX.Element;
    public renderTeamPreviewChooser(request: BattleTeamRequest, choices: BattleChoiceBuilder): JSX.Element;
    public renderTeamList(): JSX.Element;
    public renderChosenTeam(request: BattleTeamRequest, choices: BattleChoiceBuilder): JSX.Element[];
    public renderOldChoices(request: BattleRequest, choices: BattleChoiceBuilder): JSX.Element[];
    public renderPlayerWaitingControls(): JSX.Element;
    public renderPlayerControls(request: BattleRequest): JSX.Element;
    public renderAfterBattleControls(): JSX.Element;
  }
}

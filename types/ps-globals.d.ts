/**
 * @file `ps-globals.d.ts` - `window` globals exposed by the Preact Showdown client.
 * @author Keith Choison <keith@tize.io>
 * @since 1.2.6
 */

declare namespace Showdown {
  interface PSGlobals {
    /**
     * Preact Showdown client's `PS` global.
     *
     * * Typically won't exist when the `__SHOWDEX_HOST` is the `'classic'` (Backbone.js-based) Showdown client.
     *
     * @since 1.2.6
     */
    PS: PS;
    PSBackground: PSBackground;
    PSConnection: PSConnection;
    PSHeader: unknown;
    PSIcon: PSIcon;
    PSLoginServer: PSLoginServer;
    PSMiniHeader: unknown;
    PSModel: PSModel;
    PSPanelWrapper: PSPanelWrapper;
    PSPrefs: PSPrefs;
    PSPrefsDefaults: Record<string, unknown>;
    PSRoom: PSRoom;
    PSRoomPanel: PSRoomPanel;
    PSRouter: PSRouter;
    PSSearchResults: unknown;
    PSServer: PSServer;
    PSStorage: PSStorage;
    PSStreamModel: PSStreamModel;
    PSSubscription: PSSubscription;
    PSTeambuilder: PSTeambuilder;
    PSTeams: PSTeams;
    PSURL: string;
    PSUser: PSUser;
    PSUtils: unknown;
    PSView: PSView;

    BattleDiv: BattleDiv;
    BattleForfeitPanel: unknown;
    BattleOptionsPanel: unknown;
    BattlePanel: BattlePanel;
    BattleRoom: BattleRoom;
    BattlesPanel: BattlesPanel;
    BattlesRoom: BattlesRoom;
    ChangePasswordPanel: unknown;
    ChatFormattingPanel: unknown;
    ChatLog: ChatLog;
    ChatPanel: ChatPanel;
    ChatRoom: ChatRoom;
    ChatTextBox: ChatTextBox;
    ChatTextEntry: ChatTextEntry;
    ChatTournament: ChatTournament;
    ChatUserList: ChatUserList;
    CopyableURLBox: CopyableURLBox;
    DetailsForm: unknown;
    FormatDropdown: FormatDropdown;
    FormatDropdownPanel: FormatDropdownPanel;
    GetParams: unknown;
    GooglePasswordBox: unknown;
    HttpError: HttpError;
    LadderFormatPanel: unknown;
    LadderFormatRoom: unknown;
    LadderListPanel: unknown;
    LeaveRoomPanel: unknown;
    LoginPanel: unknown;
    MAX_UNDO_HISTORY: typeof MAX_UNDO_HISTORY;
    MainMenuPanel: MainMenuPanel;
    MainMenuRoom: MainMenuRoom;
    NARROW_MODE_HEADER_WIDTH: number;
    Net: Net;
    NetRequest: NetRequest;
    NewsPanel: NewsPanel;
    OptionsPanel: unknown;
    PageLadderHelp: unknown;
    PagePanel: PagePanel;
    PageRoom: PageRoom;
    PlaceholderRoom: PlaceholderRoom;
    PopupPanel: unknown;
    PopupRoom: unknown;
    RegisterPanel: unknown;
    ReplacePlayerPanel: unknown;
    ResourcePanel: unknown;
    RoomTabListPanel: unknown;
    RoomsPanel: RoomsPanel;
    RoomsRoom: RoomsRoom;
    RulesPanel: unknown;
    SanitizedHTML: SanitizedHTML;
    StatForm: unknown;
    TeamBox: unknown;
    TeamDropdown: TeamDropdown;
    TeamDropdownPanel: TeamDropdownPanel;
    TeamEditor: unknown;
    TeamEditorState: unknown;
    TeamForm: TeamForm;
    TeamPanel: TeamPanel;
    TeamStoragePanel: TeamStoragePanel;
    TeamTextbox: unknown;
    TeamWizard: unknown;
    TeambuilderPanel: TeambuilderPanel;
    TeambuilderRoom: TeambuilderRoom;
    TimerButton: TimerButton;
    TourPopOutPanel: TourPopOutPanel;
    TournamentBox: TournamentBox;
    TournamentBracket: TournamentBracket;
    TournamentTreeBracket: TournamentTreeBracket;
    UserListPanel: unknown;
    UserOptionsPanel: unknown;
    UserPanel: unknown;
    UserRoom: unknown;
    VERTICAL_HEADER_WIDTH: number;
    ViewTeamPanel: ViewTeamPanel;
    VolumePanel: unknown;
  }
}

export type GameSettings = {
  maxPlayers: number;
  rounds: number;
  roundTimeSeconds: number;
  difficulty: number;
  isPrivate: boolean;
};

export type GameProperties = GameSettings & {
  lobbyName: string;
};

export enum RoundActionType {
  SKIP = "skip",
  GUESS = "guess",
}

export type GameRanking = {
  [userId: number]: {
    username: string;
    totalScore: number;
    lastRound: {
      [attempt: number]: {
        action: RoundActionType;
        guessResult?: number[];
      };
    };
  };
};

export enum GuessCategory {
  GAME,
  FRANCHISE,
  DEVELOPER,
  PUBLISHER,
  RELEASE_YEAR,
  THEME,
  GENRE,
}

export type NormalizationSettings = Record<string, Array<number | null>>;

export type PlayerGuessData = {};

export type RoundData = GameData & {
  round: number;
  endTimestamp: number;
};

export type GameData = Partial<
  {
    value: number;
    label: string;
    s3_id: string;
    releaseYear: string;
    collection: number;
    [key: string]: unknown;
  } & BaseGameInfo
>;

export type IGDBGameInfo = Partial<
  {
    id: number;
    release_dates: IGDBReleaseDates;
    collections?: IdWithName[];
  } & BaseGameInfo
>;

export type IGDBReleaseDates = {
  id: number;
  y: number;
}[];

export type BaseGameInfo = {
  genres: IdWithName[];
  themes: IdWithName[];
  franchises: IdWithName[];
  involved_companies: InvolvedCompany[];
};

export type IdWithName = {
  id: number;
  name: string;
};

export type InvolvedCompany = {
  id: number;
  company: number;
  developer: boolean;
  publisher: boolean;
};

export type GamedleLegendBoard = {
  shuffleOrder: number[];
  [key: string]: unknown;
};

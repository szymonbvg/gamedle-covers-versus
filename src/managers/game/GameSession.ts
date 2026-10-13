import axios from "axios";
import { Globals } from "../../globals";
import {
  GamedleLegendBoard,
  GameProperties,
  GameRanking,
  GuessCategory,
  RoundActionType,
  RoundData,
} from "../../types/game";
import { MessageType, WSMessage } from "../../types/websocket";
import { WSError } from "../../util/WSError";
import { PlayerSession } from "../ws/PlayerSession";
import { getGamedleUrl, getHostConfirmationTimeout } from "../../util/common";
import { EvaluationResult, GuessEvaluator } from "./GuessEvaluator";
import { Logger } from "../../util/Logger";

export enum UpdateAction {
  ADD,
  REMOVE,
}

export class GameSession {
  public readonly properties: GameProperties;
  public readonly adminToken: string;

  private readonly guessEvaluator = new GuessEvaluator();
  private readonly players = new Map<string, PlayerSession>();
  private readonly lobbyCode?: string;

  private lastPlayerId: number = 0;
  private ranking: GameRanking = {};
  private gamedleLegendBoard?: GamedleLegendBoard;
  private currentRoundData?: RoundData;

  private endRoundTimeout?: NodeJS.Timeout;
  private hostConfirmationTimeout?: NodeJS.Timeout;
  private onCloseCallback?: () => void;

  private readyCount = 0;
  private roundFinishedCount = 0;
  private isWaiting = false;

  constructor(gameProperties: GameProperties, onClose?: () => void) {
    this.onCloseCallback = onClose;

    this.properties = gameProperties;
    this.normalizeProperties();

    this.adminToken = this.generateToken();

    if (this.properties.isPrivate) {
      this.lobbyCode = this.generateLobbyCode();
    }

    this.hostConfirmationTimeout = setTimeout(() => {
      const adminSession = this.players.get(this.properties.lobbyName);
      if (!adminSession || adminSession.adminToken !== this.adminToken) {
        this.closeAllSessions();
      }
    }, getHostConfirmationTimeout() * 1000);
  }

  public updatePlayers(action: UpdateAction.REMOVE, key: string): void;
  public updatePlayers(action: UpdateAction.ADD, key: string, value: PlayerSession): void;
  public updatePlayers(action: UpdateAction, key: string, value?: PlayerSession): void {
    switch (action) {
      case UpdateAction.ADD: {
        this.players.set(key, value!);
        break;
      }
      case UpdateAction.REMOVE: {
        this.players.delete(key);
        break;
      }
    }

    this.sendToAll({ type: MessageType.PLAYERS_LIST_UPDATED, data: this.getUsernames() });
    this.tryStartRound();
  }

  public handlePlayerStatusUpdated(playerSession: PlayerSession, byRoundEnd: boolean = false) {
    const isReady = playerSession.isReady();
    const prevCount = this.readyCount;

    this.readyCount += isReady ? 1 : -1;

    if (this.readyCount > prevCount && this.tryStartRound()) return;

    if (this.isWaiting && (this.currentRoundData?.round ?? 0) > 0 && !byRoundEnd) {
      this.sendToAll({
        type: MessageType.PLAYER_STATUS_UPDATED,
        data: { username: playerSession.username, isReady },
      });
    }
  }

  public handlePlayerFinishedRound() {
    this.roundFinishedCount++;

    if (this.roundFinishedCount >= this.players.size) {
      this.endRound();
      return;
    }

    this.sendToAll({ type: MessageType.ROUND_PROGRESS_UPDATED, data: this.roundFinishedCount });
  }

  public async handlePlayerAction(
    playerSession: PlayerSession,
    type: RoundActionType,
    gameId?: number,
    gameTitle?: string
  ) {
    if (!playerSession.id || playerSession.getCurrentAttempt() >= 4) return;

    let result: EvaluationResult | undefined = undefined;

    if (type === RoundActionType.GUESS) {
      if (gameId === undefined) {
        playerSession.send({ type: MessageType.GUESS_RESULT, data: { guessedCategories: null } });
        return;
      }

      result = await this.guessEvaluator.evaluate(playerSession, gameId);

      playerSession.send({
        type: MessageType.GUESS_RESULT,
        data: { title: gameTitle ?? "Unknown Title", guessedCategories: result.categoryValues ?? null },
      });
    }

    const currAttempt = playerSession.getCurrentAttempt();
    playerSession.roundPoints += result?.totalScore ?? 0;

    let limit = GuessEvaluator.CATEGORY_SCORING_RULES[GuessCategory.GAME].points - currAttempt * 2;
    if (GuessCategory.GAME in (result?.categoryValues ?? {})) {
      limit -= (playerSession.guessedCategories.size - 1) * 2;
    }

    const cappedPoints = Math.min(playerSession.roundPoints, limit);

    this.ranking[playerSession.id].totalScore += cappedPoints - playerSession.prevCappedPoints;
    this.ranking[playerSession.id].lastRound[currAttempt] = { action: type, guessResult: result?.categories };

    playerSession.prevCappedPoints = cappedPoints;

    playerSession.incrementAttempt();
    if (playerSession.getCurrentAttempt() >= 4 || playerSession.guessedCategories.has(GuessCategory.GAME)) {
      playerSession.markRoundAsFinished();
    }
  }

  public joinPlayer(username: string, session: PlayerSession): WSError | undefined {
    if (!this.isUsernameAvailable(username)) return WSError.USERNAME_UNAVAILABLE;

    if (session.adminToken === this.adminToken) {
      clearTimeout(this.hostConfirmationTimeout);
    }

    this.updatePlayers(UpdateAction.ADD, username, session);

    this.lastPlayerId++;
    session.id = this.lastPlayerId;
    session.username = username;
    session.currentGame = this;

    return undefined;
  }

  public waitForPlayers(skipWSMessage: boolean = false) {
    this.isWaiting = true;
    if (skipWSMessage) return;
    this.sendToAll({ type: MessageType.WAITING_FOR_PLAYERS });
  }

  public hasGameStarted(): boolean {
    return this.currentRoundData !== undefined || this.isWaiting;
  }

  public isLobbyCodeValid(code?: string): boolean {
    if (!this.properties.isPrivate || !this.lobbyCode) return true;

    return this.lobbyCode === code;
  }

  public isLobbyFull(): boolean {
    return this.players.size >= this.properties.maxPlayers;
  }

  public isUsernameAvailable(username: string): boolean {
    return !this.players.has(username);
  }

  public getRoundData(): RoundData | undefined {
    return this.currentRoundData;
  }

  public getLobbyCode(): string | undefined {
    return this.lobbyCode;
  }

  public sendToAll(message: WSMessage, beforeEachRequest?: (session: PlayerSession) => void) {
    this.players.forEach((playerSession) => {
      beforeEachRequest?.(playerSession);
      playerSession.send(message);
    });
  }

  public closeAllSessions() {
    this.players.forEach((playerSession) => {
      playerSession.cleanup(true);
    });
    this.onCloseCallback?.();
  }

  private async startNextRound() {
    try {
      let round = 0;
      if (this.currentRoundData) {
        round = this.currentRoundData.round;
      }

      round++;
      if (round > this.properties.rounds) return;

      const res = await axios.post(
        `${getGamedleUrl()}/${this.gamedleLegendBoard ? "nextLegend" : "legendBoardLoad"}`,
        {
          legendBoardAC: this.gamedleLegendBoard,
          index: round,
          settings: {
            startYear: "1970",
            endYear: "2030",
            sportsIncluded: true,
            indieIncluded: true,
            racingIncluded: true,
            level: this.properties.difficulty,
          },
          gameStatus: round <= 1 ? "RESTART" : "T_WON",
        }
      );

      if (!this.gamedleLegendBoard) {
        this.gamedleLegendBoard = res.data.legendBoardAC;
      }

      let roundData: RoundData | undefined = undefined;
      const gamedleData = res.data.gameLegendAC;

      if (gamedleData) {
        roundData = { round, endTimestamp: 0 };
        [
          "value",
          "label",
          "s3_id",
          "genres",
          "themes",
          "franchises",
          "involved_companies",
          "releaseYear",
          "collection",
        ].forEach((key) => {
          if (!(key in gamedleData) || !roundData) return;
          roundData[key] = gamedleData[key];
        });
      }

      if (!roundData || !roundData.value) {
        this.closeAllSessions();
        return;
      }

      const roundTimeMs = this.properties.roundTimeSeconds * 1000;
      roundData.endTimestamp = Date.now() + roundTimeMs;

      clearTimeout(this.endRoundTimeout);
      this.endRoundTimeout = setTimeout(this.endRound.bind(this), roundTimeMs);

      this.currentRoundData = roundData;

      this.sendToAll(
        {
          type: MessageType.ROUND_STARTED,
          data: {
            round,
            coverId: this.currentRoundData.s3_id,
            endTime: this.currentRoundData.endTimestamp,
          },
        },
        (playerSession) => {
          if (round <= 1) {
            this.ranking[playerSession.id!] = {
              username: playerSession.username!,
              totalScore: 0,
              lastRound: {},
            };
          } else {
            this.ranking[playerSession.id!].lastRound = {};
          }
        }
      );
    } catch (e) {
      this.closeAllSessions();
      Logger.error(e);
    }
  }

  private endRound() {
    clearTimeout(this.endRoundTimeout);

    const final: boolean = this.currentRoundData!.round >= this.properties.rounds;
    if (!final) this.waitForPlayers(true);

    this.roundFinishedCount = 0;

    this.sendToAll(
      {
        type: MessageType.ROUND_ENDED,
        data: {
          gameTitle: this.currentRoundData!.label,
          final,
          round: this.currentRoundData!.round,
          ranking: this.ranking,
        },
      },
      (playerSession) => {
        playerSession.resetRoundState();
        playerSession.setReadyStatus(false, { byRoundEnd: true });
      }
    );
  }

  private tryStartRound(): boolean {
    if (this.isWaiting && this.readyCount >= this.players.size) {
      this.isWaiting = false;
      this.startNextRound();
      return true;
    }
    return false;
  }

  private generateLobbyCode(): string {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      const toUpper = Math.random() < 0.5;
      let randChar = chars[Math.floor(Math.random() * chars.length)];
      if (toUpper) randChar = randChar.toUpperCase();
      code += randChar;
    }
    return code;
  }

  private generateToken(): string {
    const randIndex = Math.floor(Math.random() * this.properties.lobbyName.length);
    const randLetter = this.properties.lobbyName[randIndex];
    return `${randLetter}-${Math.floor(Date.now() / 1000).toString(36)}`;
  }

  private getUsernames(): string[] {
    return Array.from(this.players.keys());
  }

  private setProperty<K extends keyof GameProperties>(key: K, value: GameProperties[K]) {
    this.properties[key] = value;
  }

  // Example settings (game-properties.settings.json)
  // {
  //           [default, min, max] null = no limit
  //   "maxPlayers": [3, 1, null],
  //   "rounds": [10, 1, 512],
  //   "roundTimeSeconds": [60.0, 15.0, 300.0],
  //   "difficulty": [2, 1, 3]
  // }
  private normalizeProperties() {
    Object.entries(Globals.propertiesNormalizationSettings).forEach(([k, value]) => {
      if (!(k in this.properties) || value.length < 3) return;

      const key = k as keyof GameProperties;
      const defaultValue = value[0];
      const min = value[1];
      const max = value[2];

      if (defaultValue === null || typeof this.properties[key] !== "number") return;

      const property = this.properties[key];
      if ((min !== null && property < min) || (max !== null && property > max)) {
        this.setProperty(key, defaultValue);
      }
    });
  }
}

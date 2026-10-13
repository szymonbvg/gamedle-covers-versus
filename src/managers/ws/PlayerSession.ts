import { WebSocket } from "ws";
import type { GameRegistry } from "../game/GameRegistry";
import { MessageType, type WSMessage } from "../../types/websocket";
import { WSError } from "../../util/WSError";
import { GameSession, UpdateAction } from "../game/GameSession";
import { GuessCategory } from "../../types/game";

export class PlayerSession {
  public readonly gameRegistry: GameRegistry;
  public currentGame?: GameSession;
  public username?: string;
  public adminToken?: string;
  public id?: number;
  public guessedCategories = new Set<GuessCategory>();

  public roundPoints = 0;
  public prevCappedPoints = 0;

  private readonly ws: WebSocket;

  private readyStatus = false;
  private _hasFinishedRound = false;
  private attempt = 0;

  constructor(ws: WebSocket, gameRegistry: GameRegistry) {
    this.ws = ws;
    this.gameRegistry = gameRegistry;
  }

  public setReadyStatus(status: boolean, options?: { byRoundEnd: boolean }): boolean {
    if (!this.currentGame) return false;

    const prev = this.readyStatus;
    this.readyStatus = status;
    if (prev !== status) {
      this.currentGame.handlePlayerStatusUpdated(this, options?.byRoundEnd ?? false);
    }
    return true;
  }

  public markRoundAsFinished() {
    this._hasFinishedRound = true;
    this.currentGame?.handlePlayerFinishedRound();
  }

  public incrementAttempt() {
    if (this.attempt >= 4) return;
    this.attempt++;
  }

  public getCurrentAttempt() {
    return this.attempt;
  }

  public hasAdminAccess(): boolean {
    if (!this.currentGame || !this.adminToken || !this.username) return false;

    return (
      this.adminToken === this.currentGame.adminToken &&
      this.username === this.currentGame.properties.lobbyName
    );
  }

  public hasFinishedRound(): boolean {
    return this._hasFinishedRound;
  }

  public isReady(): boolean {
    return this.readyStatus;
  }

  public send(message: WSMessage) {
    this.ws.send(JSON.stringify(message));
  }

  public sendError(code: WSError, additionalData?: unknown) {
    this.send({ type: MessageType.ERROR, data: { code, additionalData } });
  }

  public resetRoundState() {
    this.roundPoints = 0;
    this.prevCappedPoints = 0;
    this._hasFinishedRound = false;
    this.attempt = 0;
    this.guessedCategories.clear();
  }

  public cleanup(onError: boolean = false) {
    if (!onError && this.hasAdminAccess()) {
      this.currentGame?.closeAllSessions();
      return;
    }

    this.setReadyStatus(false);
    if (!this.username) return;
    this.currentGame?.updatePlayers(UpdateAction.REMOVE, this.username);
    if (onError) {
      this.ws.close(4001);
    }
  }
}

export enum WSError {
  NONE,
  DEFAULT,
  LOBBY_NOT_FOUND,
  LOBBY_IS_FULL,
  INVALID_LOBBY_CODE,
  INVALID_USERNAME,
  UNKNOWN_ACTION,
  NO_MORE_ATTEMPTS,
  GAME_ALREADY_STARTED,
  ROUND_ALREADY_ENDED,
  USERNAME_UNAVAILABLE,
  PLAYER_NOT_IN_GAME,
  GAME_NOT_READY,
  UNAUTHORIZED,
}

export class WebSocketError {
  public readonly code: WSError;
  public readonly additionalData?: unknown;

  constructor(code?: WSError, data?: unknown) {
    this.code = code ?? WSError.DEFAULT;
    this.additionalData = data;
  }
}

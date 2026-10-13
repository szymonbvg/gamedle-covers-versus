export enum MessageType {
  ERROR = "error",
  JOIN_GAME = "join.game",
  JOIN_SUCCESS = "join.success",
  PLAYERS_LIST_UPDATED = "players.list.updated",
  PLAYER_STATUS_UPDATED = "player.status.updated",
  PLAYER_ROUND_ACTION = "player.round.action",
  GUESS_RESULT = "guess.result",
  PLAYER_READY = "player.ready",
  START_GAME = "start.game",
  WAITING_FOR_PLAYERS = "waiting.for.players",
  ROUND_PROGRESS_UPDATED = "round.progress.updated",
  ROUND_STARTED = "round.started",
  ROUND_ENDED = "round.ended",
  PING = "ping",
  PONG = "pong",
}

export type WSMessage = {
  type: MessageType;
  data?: unknown;
};

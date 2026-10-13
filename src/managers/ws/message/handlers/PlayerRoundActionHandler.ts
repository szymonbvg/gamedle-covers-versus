import { Type } from "@sinclair/typebox";
import { MessageType } from "../../../../types/websocket";
import { SchemaValidator } from "../../../../util/SchemaValidator";
import { PlayerSession } from "../../PlayerSession";
import { MessageHandler } from "../MessageHandler";
import { RoundActionType } from "../../../../types/game";
import { WebSocketError, WSError } from "../../../../util/WSError";

export class PlayerRoundActionHandler extends MessageHandler {
  readonly messageType = MessageType.PLAYER_ROUND_ACTION;
  readonly validator = new SchemaValidator(
    Type.Object({
      type: Type.String(),
      gameId: Type.Optional(Type.Number()),
      gameTitle: Type.Optional(Type.String()),
    })
  );

  async handle(session: PlayerSession, messageData?: unknown): Promise<void> {
    if (!session.currentGame || !session.username || !session.id) {
      throw new WebSocketError(WSError.PLAYER_NOT_IN_GAME);
    }

    if (!session.currentGame.hasGameStarted()) throw new WebSocketError(WSError.GAME_NOT_READY);

    if (Date.now() >= (session.currentGame.getRoundData()?.endTimestamp ?? 0)) {
      throw new WebSocketError(WSError.ROUND_ALREADY_ENDED);
    }

    if (session.hasFinishedRound()) throw new WebSocketError(WSError.NO_MORE_ATTEMPTS);

    const data = this.validator.validate(messageData);
    if (data.type !== RoundActionType.GUESS && data.type !== RoundActionType.SKIP) {
      throw new WebSocketError(WSError.UNKNOWN_ACTION);
    }

    session.currentGame.handlePlayerAction(session, data.type, data.gameId, data.gameTitle);
  }
}

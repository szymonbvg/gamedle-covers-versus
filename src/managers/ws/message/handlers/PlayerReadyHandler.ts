import { MessageType } from "../../../../types/websocket";
import { WebSocketError, WSError } from "../../../../util/WSError";
import { PlayerSession } from "../../PlayerSession";
import { MessageHandler } from "../MessageHandler";

export class PlayerReadyHandler extends MessageHandler {
  messageType = MessageType.PLAYER_READY;

  async handle(session: PlayerSession, _messageData: undefined): Promise<void> {
    const success = session.setReadyStatus(true);
    if (!success) throw new WebSocketError(WSError.PLAYER_NOT_IN_GAME);
  }
}

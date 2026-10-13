import { MessageType } from "../../../../types/websocket";
import { PlayerSession } from "../../PlayerSession";
import { MessageHandler } from "../MessageHandler";
import { WebSocketError, WSError } from "../../../../util/WSError";

export class StartGameHandler extends MessageHandler {
  readonly messageType = MessageType.START_GAME;

  async handle(session: PlayerSession, _messageData: undefined): Promise<void> {
    if (!session.hasAdminAccess()) throw new WebSocketError(WSError.UNAUTHORIZED);
    session.currentGame?.waitForPlayers();
  }
}

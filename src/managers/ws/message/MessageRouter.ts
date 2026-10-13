import { MessageType, WSMessage } from "../../../types/websocket";
import { WebSocketError, WSError } from "../../../util/WSError";
import { MessageHandler } from "./MessageHandler";
import { PlayerSession } from "../PlayerSession";
import { JoinGameHandler } from "./handlers/JoinGameHandler";
import { StartGameHandler } from "./handlers/StartGameHandler";
import { PlayerReadyHandler } from "./handlers/PlayerReadyHandler";
import { PlayerRoundActionHandler } from "./handlers/PlayerRoundActionHandler";
import { PingHandler } from "./handlers/PingHandler";

export class MessageRouter {
  private readonly handlers = new Map<MessageType, MessageHandler>();

  constructor() {
    (
      [JoinGameHandler, StartGameHandler, PlayerReadyHandler, PlayerRoundActionHandler, PingHandler] as Array<
        new () => MessageHandler
      >
    ).forEach((Handler) => {
      const handler = new Handler();
      this.handlers.set(handler.messageType, handler);
    });
  }

  public async route(session: PlayerSession, message: Partial<WSMessage>) {
    if (!message.type) {
      throw new WebSocketError(WSError.DEFAULT);
    }

    await this.handlers.get(message.type)?.handle(session, message.data);
  }
}
